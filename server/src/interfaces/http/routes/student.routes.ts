import { Router, type IRouter } from 'express';
import multer from 'multer';
import { container } from '../../../infrastructure/container';
import { StudentController } from '../controllers/StudentController';
import { ExcelStudentParser } from '../../../infrastructure/parsers/ExcelStudentParser';
import { ImportReportWorkbook } from '../../../infrastructure/parsers/ImportReportWorkbook';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Recibe el .xlsx en memoria (máx. 5 MB) y rechaza cualquier otro tipo.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isXlsx = file.mimetype === XLSX_MIME || file.originalname.toLowerCase().endsWith('.xlsx');
    cb(null, isXlsx);
  },
});

const router: IRouter = Router();
const studentController = new StudentController(
  container.useCases.createStudentUseCase,
  container.useCases.updateStudentUseCase,
  container.useCases.listStudentsUseCase,
  container.useCases.importStudentsUseCase,
  new ExcelStudentParser(),
  new ImportReportWorkbook(),
  container.useCases.markStudentRiskUseCase,
);

// Todas las rutas de estudiantes requieren autenticación.
router.use('/students', authenticate(container.services.tokenService));

// Listar estudiantes (con filtros por escuela, ciclo, estado y búsqueda).
router.get('/students', authorize(['students:read']), studentController.list);

// Descargar la plantilla de carga masiva.
router.get('/students/import/template', authorize(['students:import']), studentController.downloadTemplate);

// Carga masiva de estudiantes desde Excel (HU-08).
router.post(
  '/students/import',
  authorize(['students:import']),
  upload.single('file'),
  studentController.bulkImport,
);

// Exportar a Excel el resultado de la carga masiva (HU-09).
router.post('/students/import/report', authorize(['students:import']), studentController.downloadReport);

// Registrar un estudiante individual.
router.post('/students', authorize(['students:write']), studentController.create);

// Marcar/quitar riesgo académico de un estudiante (HU-11).
router.patch('/students/:id/risk', authorize(['students:write']), studentController.markRisk);

// Editar los datos de filiación de un estudiante.
router.patch('/students/:id', authorize(['students:write']), studentController.update);

export default router;
