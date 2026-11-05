import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { ExcelTutorParser } from '../../../infrastructure/parsers/ExcelTutorParser';
import { TutorRoleMissingError } from '@application/use-cases/users/ImportTutorsUseCase';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireFileSignature } from '../middleware/fileSignature';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype === XLSX_MIME || file.originalname.toLowerCase().endsWith('.xlsx')),
});

const router: IRouter = Router();
const parser = new ExcelTutorParser();
const requireAuth = authenticate(container.services.tokenService);

// Alta masiva de docentes tutores (cuentas con su escuela + invitación de acceso único): solo quien administra usuarios.
router.get('/tutors/import/template', requireAuth, authorize(['users:write']), async (_req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-docentes-tutores.xlsx"');
    res.status(200).send(await parser.buildTemplate());
  } catch {
    res.status(500).json({ error: 'No se pudo generar la plantilla' });
  }
});

router.post('/tutors/import', requireAuth, authorize(['users:write']), upload.single('file'), requireFileSignature(['xlsx']), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Debe adjuntar un archivo Excel (.xlsx) en el campo «file»' });
      return;
    }
    const rows = await parser.parse(req.file.buffer);
    if (rows.length === 0) {
      res.status(400).json({ error: 'El archivo no contiene filas de datos o los encabezados no coinciden con la plantilla' });
      return;
    }
    const report = await container.useCases.importTutorsUseCase.execute(rows, req.auth?.sub as string, req.ip);
    res.status(200).json({ message: 'Carga de docentes procesada', report });
  } catch (error) {
    if (error instanceof TutorRoleMissingError) {
      res.status(500).json({ error: error.message });
      return;
    }
    console.error('Error en la carga de docentes tutores', error);
    res.status(500).json({ error: 'No se pudo procesar el archivo. Verifique que sea un .xlsx válido.' });
  }
});

export default router;
