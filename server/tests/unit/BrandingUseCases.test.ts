import { Request, Response } from 'express';
import {
  BrandingLogoNotFoundError,
  BrandingValidationError,
  GetBrandingLogoFileUseCase,
  GetBrandingUseCase,
  RemoveBrandingLogoUseCase,
  ResetBrandingUseCase,
  UpdateBrandingUseCase,
  UploadBrandingLogoUseCase,
} from '@application/use-cases/branding/BrandingUseCases';
import { contrastRatio } from '@application/use-cases/branding/colorContrast';
import { BrandingController } from '@interfaces/http/controllers/BrandingController';
import { BrandingRepository } from '@domain/repositories/BrandingRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { BrandingSettings, DEFAULT_BRANDING } from '@domain/entities/BrandingSettings';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(16)]);

const stored = (over: Partial<BrandingSettings> = {}): BrandingSettings => ({
  ...DEFAULT_BRANDING,
  updatedAt: new Date('2026-10-07T10:00:00Z'),
  ...over,
});

describe('Identidad visual institucional (HU-50)', () => {
  let repo: jest.Mocked<BrandingRepository>;
  let storage: jest.Mocked<EvidenceStorage>;
  let audit: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (d) => stored(d)),
      setLogo: jest.fn().mockImplementation(async (key, mime) => stored({ logoStorageKey: key, logoMimeType: mime })),
      clearLogo: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    storage = {
      save: jest.fn().mockResolvedValue('new-key.png'),
      resolvePath: jest.fn().mockReturnValue('/data/new-key.png'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    audit = { create: jest.fn(), findAll: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
  });

  describe('contraste', () => {
    it('calcula la relación WCAG: negro/blanco = 21 y el azul UNTRM supera AA con texto blanco', () => {
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
      expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
      expect(contrastRatio(DEFAULT_BRANDING.primaryColor, '#FFFFFF')).toBeGreaterThan(10);
    });
  });

  describe('lectura', () => {
    it('sin configuración rige la identidad UNTRM por defecto', async () => {
      const view = await new GetBrandingUseCase(repo).execute();
      expect(view).toMatchObject({ shortName: 'SIT · UNTRM', primaryColor: '#14315F', accentColor: '#D9A404', hasCustomLogo: false, updatedAt: null });
    });

    it('con logotipo personalizado lo indica sin exponer la clave de almacenamiento', async () => {
      repo.find.mockResolvedValue(stored({ logoStorageKey: 'secreto.png', logoMimeType: 'image/png' }));
      const view = await new GetBrandingUseCase(repo).execute();
      expect(view.hasCustomLogo).toBe(true);
      expect(JSON.stringify(view)).not.toContain('secreto.png');
    });
  });

  describe('actualización de nombres y colores', () => {
    const update = () => new UpdateBrandingUseCase(repo, audit);
    const valid = { institutionName: ' UNTRM ', shortName: ' SIT ', primaryColor: '#1a3a6e', accentColor: '#c9a100' };

    it('guarda normalizado (sin espacios, colores en mayúsculas) y deja constancia en la bitácora', async () => {
      const view = await update().execute('admin-1', valid);

      expect(repo.save).toHaveBeenCalledWith({ institutionName: 'UNTRM', shortName: 'SIT', primaryColor: '#1A3A6E', accentColor: '#C9A100' });
      expect(view.primaryColor).toBe('#1A3A6E');
      expect(audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', action: 'UPDATE_BRANDING', details: '#14315F/#D9A404 → #1A3A6E/#C9A100' }),
      );
    });

    it.each(['#FFFFFF', '#FFE08A', '#CCCCCC'])('rechaza un color principal demasiado claro (%s) para texto blanco', async (primaryColor) => {
      await expect(update().execute('admin-1', { ...valid, primaryColor })).rejects.toThrow(/demasiado claro/);
      expect(repo.save).not.toHaveBeenCalled();
      expect(audit.create).not.toHaveBeenCalled();
    });

    it('acepta el color más claro que aún cumple AA', async () => {
      // #767676 es el gris más claro con contraste 4.5:1 sobre blanco.
      await expect(update().execute('admin-1', { ...valid, primaryColor: '#767676' })).resolves.toBeDefined();
    });

    it('rechaza colores con formato inválido o nombres vacíos', async () => {
      await expect(update().execute('a', { ...valid, primaryColor: 'azul' })).rejects.toBeInstanceOf(BrandingValidationError);
      await expect(update().execute('a', { ...valid, accentColor: '#FFF' })).rejects.toBeInstanceOf(BrandingValidationError);
      await expect(update().execute('a', { ...valid, shortName: '   ' })).rejects.toBeInstanceOf(BrandingValidationError);
    });

    it('el color de acento no necesita contraste con el blanco', async () => {
      await expect(update().execute('a', { ...valid, accentColor: '#FFEE00' })).resolves.toBeDefined();
    });
  });

  describe('logotipo', () => {
    const upload = () => new UploadBrandingLogoUseCase(repo, storage, audit);

    it.each([
      ['image/png', PNG],
      ['image/jpeg', JPEG],
      ['image/webp', WEBP],
    ])('acepta %s válido', async (mimeType, buffer) => {
      const view = await upload().execute('admin-1', { buffer, fileName: 'logo.x', mimeType });
      expect(storage.save).toHaveBeenCalledWith(buffer, 'logo.x');
      expect(repo.setLogo).toHaveBeenCalledWith('new-key.png', mimeType);
      expect(view.hasCustomLogo).toBe(true);
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE_BRANDING_LOGO' }));
    });

    it('descarta el logotipo anterior al reemplazarlo', async () => {
      repo.find.mockResolvedValue(stored({ logoStorageKey: 'old.png', logoMimeType: 'image/png' }));
      await upload().execute('admin-1', { buffer: PNG, fileName: 'n.png', mimeType: 'image/png' });
      expect(storage.delete).toHaveBeenCalledWith('old.png');
    });

    it.each([
      ['image/svg+xml', Buffer.from('<svg onload="alert(1)"/>')],
      ['application/pdf', Buffer.from('%PDF-1.4')],
      ['text/html', Buffer.from('<script>')],
    ])('rechaza %s: solo imágenes PNG, JPEG o WebP', async (mimeType, buffer) => {
      await expect(upload().execute('a', { buffer, fileName: 'x', mimeType })).rejects.toThrow(/PNG, JPEG o WebP/);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rechaza un archivo cuyo contenido no corresponde al tipo declarado', async () => {
      await expect(upload().execute('a', { buffer: Buffer.from('<svg onload=alert(1)>'), fileName: 'x.png', mimeType: 'image/png' })).rejects.toThrow(/no es una imagen válida/);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('rechaza más de 1 MB', async () => {
      const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);
      await expect(upload().execute('a', { buffer: big, fileName: 'x.png', mimeType: 'image/png' })).rejects.toThrow(/1 MB/);
    });

    it('quitar el logotipo borra el archivo y es idempotente', async () => {
      repo.find.mockResolvedValue(stored({ logoStorageKey: 'old.png', logoMimeType: 'image/png' }));
      const remove = new RemoveBrandingLogoUseCase(repo, storage, audit);
      await remove.execute('admin-1');
      expect(repo.clearLogo).toHaveBeenCalled();
      expect(storage.delete).toHaveBeenCalledWith('old.png');

      jest.clearAllMocks();
      repo.find.mockResolvedValue(stored());
      await remove.execute('admin-1');
      expect(repo.clearLogo).not.toHaveBeenCalled();
    });
  });

  describe('restablecer', () => {
    it('vuelve a la identidad por defecto y borra el logotipo guardado', async () => {
      repo.find.mockResolvedValue(stored({ primaryColor: '#1A3A6E', logoStorageKey: 'old.png', logoMimeType: 'image/png' }));
      const view = await new ResetBrandingUseCase(repo, storage, audit).execute('admin-1');

      expect(repo.reset).toHaveBeenCalled();
      expect(storage.delete).toHaveBeenCalledWith('old.png');
      expect(view).toMatchObject({ primaryColor: '#14315F', hasCustomLogo: false });
      expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'RESET_BRANDING' }));
    });
  });

  describe('servir el logotipo', () => {
    it('devuelve la ruta y el tipo; si no hay logotipo personalizado, no encontrado', async () => {
      const useCase = new GetBrandingLogoFileUseCase(repo, storage);
      await expect(useCase.execute()).rejects.toBeInstanceOf(BrandingLogoNotFoundError);

      repo.find.mockResolvedValue(stored({ logoStorageKey: 'k.png', logoMimeType: 'image/png' }));
      await expect(useCase.execute()).resolves.toEqual({ absolutePath: '/data/new-key.png', mimeType: 'image/png' });
    });
  });

  describe('controlador', () => {
    const res = () => {
      const r = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn(), sendFile: jest.fn() };
      r.status.mockReturnValue(r);
      return r;
    };
    const controller = () =>
      new BrandingController(
        new GetBrandingUseCase(repo),
        new UpdateBrandingUseCase(repo, audit),
        new UploadBrandingLogoUseCase(repo, storage, audit),
        new RemoveBrandingLogoUseCase(repo, storage, audit),
        new ResetBrandingUseCase(repo, storage, audit),
        new GetBrandingLogoFileUseCase(repo, storage),
      );
    const req = (over: object = {}) => ({ auth: { sub: 'a' }, body: {}, ...over }) as unknown as Request;

    it('200 en la lectura pública', async () => {
      const r = res();
      await controller().get(req(), r as unknown as Response);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('PUT: 400 con un color mal formado (Zod) y 400 con un color muy claro (contraste)', async () => {
      const bad = res();
      await controller().update(req({ body: { institutionName: 'UNTRM', shortName: 'SIT', primaryColor: 'rojo', accentColor: '#C9A100' } }), bad as unknown as Response);
      expect(bad.status).toHaveBeenCalledWith(400);

      const light = res();
      await controller().update(req({ body: { institutionName: 'UNTRM', shortName: 'SIT', primaryColor: '#FFFFFF', accentColor: '#C9A100' } }), light as unknown as Response);
      expect(light.status).toHaveBeenCalledWith(400);
      expect(JSON.stringify(light.json.mock.calls[0][0])).toMatch(/demasiado claro/);

      const ok = res();
      await controller().update(req({ body: { institutionName: 'UNTRM', shortName: 'SIT', primaryColor: '#14315F', accentColor: '#C9A100' } }), ok as unknown as Response);
      expect(ok.status).toHaveBeenCalledWith(200);
    });

    it('subir logotipo sin archivo es 400', async () => {
      const r = res();
      await controller().uploadLogo(req(), r as unknown as Response);
      expect(r.status).toHaveBeenCalledWith(400);
    });

    it('sirve el logotipo con cabeceras seguras y 404 si no hay uno personalizado', async () => {
      const none = res();
      await controller().logo(req(), none as unknown as Response);
      expect(none.status).toHaveBeenCalledWith(404);

      repo.find.mockResolvedValue(stored({ logoStorageKey: 'k.png', logoMimeType: 'image/png' }));
      const ok = res();
      await controller().logo(req(), ok as unknown as Response);
      expect(ok.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
      expect(ok.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(ok.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
      expect(ok.sendFile).toHaveBeenCalledWith('/data/new-key.png');
    });
  });
});
