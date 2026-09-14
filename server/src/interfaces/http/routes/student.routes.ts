import { Router, type IRouter } from 'express';
import { container } from '../../../infrastructure/container';
import { StudentController } from '../controllers/StudentController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router: IRouter = Router();
const studentController = new StudentController(
  container.useCases.createStudentUseCase,
  container.useCases.updateStudentUseCase,
  container.useCases.listStudentsUseCase,
);

// Todas las rutas de estudiantes requieren autenticación.
router.use('/students', authenticate(container.services.tokenService));

// Listar estudiantes (con filtros por escuela, ciclo, estado y búsqueda).
router.get('/students', authorize(['students:read']), studentController.list);

// Registrar un estudiante individual.
router.post('/students', authorize(['students:write']), studentController.create);

// Editar los datos de filiación de un estudiante.
router.patch('/students/:id', authorize(['students:write']), studentController.update);

export default router;
