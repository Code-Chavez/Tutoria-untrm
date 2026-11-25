import {
  CLOUDINARY_KEY_PREFIX,
  CloudinaryEvidenceStorage,
  CloudinaryGateway,
} from '../../src/infrastructure/services/CloudinaryEvidenceStorage';

describe('CloudinaryEvidenceStorage', () => {
  const gateway: jest.Mocked<CloudinaryGateway> = {
    upload: jest.fn().mockResolvedValue(undefined),
    signedUrl: jest.fn((id: string) => `https://res.cloudinary.test/signed/${id}`),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  const legacy = {
    save: jest.fn(),
    resolvePath: jest.fn((key: string) => `/disk/${key}`),
    read: jest.fn().mockResolvedValue(Buffer.from('disk')),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const fetchFile = jest.fn();
  const storage = new CloudinaryEvidenceStorage(gateway, legacy, fetchFile as unknown as typeof fetch);

  beforeEach(() => jest.clearAllMocks());

  it('uploads with a generated id that keeps only the extension, and returns a prefixed key', async () => {
    const key = await storage.save(Buffer.from('x'), '../../Evil Name.PDF');
    expect(key).toMatch(/^cld:sit\/[0-9a-f-]{36}\.pdf$/);
    expect(key).not.toContain('Evil');
    expect(gateway.upload).toHaveBeenCalledWith(Buffer.from('x'), key.slice(CLOUDINARY_KEY_PREFIX.length));
  });

  it('resolves a Cloudinary key to a signed URL and an old key to the disk path', () => {
    expect(storage.resolvePath('cld:sit/a.png')).toBe('https://res.cloudinary.test/signed/sit/a.png');
    expect(storage.resolvePath('old.pdf')).toBe('/disk/old.pdf');
  });

  it('reads Cloudinary files through the signed URL and old files from disk', async () => {
    fetchFile.mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('remote').buffer });
    expect((await storage.read('cld:sit/a.pdf')).toString()).toBe('remote');
    expect(fetchFile).toHaveBeenCalledWith('https://res.cloudinary.test/signed/sit/a.pdf');
    expect((await storage.read('old.pdf')).toString()).toBe('disk');
  });

  it('reports a missing remote file as ENOENT and other failures as errors', async () => {
    fetchFile.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(storage.read('cld:sit/gone.pdf')).rejects.toMatchObject({ code: 'ENOENT' });
    fetchFile.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(storage.read('cld:sit/bad.pdf')).rejects.toThrow('500');
  });

  it('deletes remote assets in Cloudinary and old files on disk', async () => {
    await storage.delete('cld:sit/a.png');
    expect(gateway.destroy).toHaveBeenCalledWith('sit/a.png');
    await storage.delete('old.png');
    expect(legacy.delete).toHaveBeenCalledWith('old.png');
    expect(gateway.destroy).toHaveBeenCalledTimes(1);
  });
});
