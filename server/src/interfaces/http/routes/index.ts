import { Router, type IRouter } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import profileRoutes from './profile.routes';
import studentRoutes from './student.routes';
import schoolRoutes from './school.routes';
import assignmentRoutes from './assignment.routes';
import interviewRoutes from './interview.routes';
import supportContactRoutes from './supportContact.routes';
import studentRecordRoutes from './studentRecord.routes';
import tutoringRequestRoutes from './tutoringRequest.routes';
import sessionRoutes from './session.routes';
import followUpRoutes from './followUp.routes';
import alertRoutes from './alert.routes';
import reportRoutes from './report.routes';

const router: IRouter = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(userRoutes);
router.use(roleRoutes);
router.use(profileRoutes);
router.use(studentRoutes);
router.use(schoolRoutes);
router.use(assignmentRoutes);
router.use(interviewRoutes);
router.use(supportContactRoutes);
router.use(studentRecordRoutes);
router.use(tutoringRequestRoutes);
router.use(sessionRoutes);
router.use(followUpRoutes);
router.use(alertRoutes);
router.use(reportRoutes);

export default router;
