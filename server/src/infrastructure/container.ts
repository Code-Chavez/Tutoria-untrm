import { prisma } from './database/prisma';
import { PrismaUserRepository } from './repositories/PrismaUserRepository';
import { PrismaRoleRepository } from './repositories/PrismaRoleRepository';
import { PrismaRefreshTokenRepository } from './repositories/PrismaRefreshTokenRepository';
import { PrismaAuditLogRepository } from './repositories/PrismaAuditLogRepository';
import { PrismaPasswordResetTokenRepository } from './repositories/PrismaPasswordResetTokenRepository';
import { PrismaStudentRepository } from './repositories/PrismaStudentRepository';
import { PrismaTutorAssignmentHistoryRepository } from './repositories/PrismaTutorAssignmentHistoryRepository';
import { PrismaTutorInterviewRepository } from './repositories/PrismaTutorInterviewRepository';
import { PrismaTutorFollowUpRepository } from './repositories/PrismaTutorFollowUpRepository';
import { PrismaTutoringRequestRepository } from './repositories/PrismaTutoringRequestRepository';
import { PrismaSessionRepository } from './repositories/PrismaSessionRepository';
import { PrismaStudentReferralRepository } from './repositories/PrismaStudentReferralRepository';
import { PrismaSystemParameterRepository } from './repositories/PrismaSystemParameterRepository';
import { PrismaSupportContactRepository } from './repositories/PrismaSupportContactRepository';
import { PrismaSchoolRepository } from './repositories/PrismaSchoolRepository';
import { PrismaFacultyRepository } from './repositories/PrismaFacultyRepository';
import { PrismaWorkPlanRepository } from './repositories/PrismaWorkPlanRepository';
import { PrismaTutorSemesterReportRepository } from './repositories/PrismaTutorSemesterReportRepository';
import { PrismaNotificationRepository } from './repositories/PrismaNotificationRepository';
import { PrismaAcademicPeriodRepository } from './repositories/PrismaAcademicPeriodRepository';
import { PrismaTutorEvaluationRepository } from './repositories/PrismaTutorEvaluationRepository';
import { PrismaEvaluationWindowRepository } from './repositories/PrismaEvaluationWindowRepository';
import { BcryptPasswordHasher } from './services/BcryptPasswordHasher';
import { JwtTokenService } from './services/JwtTokenService';
import { LocalEvidenceStorage } from './services/LocalEvidenceStorage';
import { LoginUseCase } from '@application/use-cases/auth/LoginUseCase';
import { RequestPasswordResetUseCase } from '@application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '@application/use-cases/auth/ResetPasswordUseCase';

// Composition root: única pieza que conoce todas las implementaciones.
// El dominio y la aplicación solo ven interfaces (puertos).

const userRepository = new PrismaUserRepository(prisma);
const roleRepository = new PrismaRoleRepository(prisma);
const refreshTokenRepository = new PrismaRefreshTokenRepository(prisma);
const auditLogRepository = new PrismaAuditLogRepository(prisma);
const passwordResetTokenRepository = new PrismaPasswordResetTokenRepository(prisma);
const studentRepository = new PrismaStudentRepository(prisma);
const tutorAssignmentHistoryRepository = new PrismaTutorAssignmentHistoryRepository(prisma);
const tutorInterviewRepository = new PrismaTutorInterviewRepository(prisma);
const tutorFollowUpRepository = new PrismaTutorFollowUpRepository(prisma);
const tutoringRequestRepository = new PrismaTutoringRequestRepository(prisma);
const sessionRepository = new PrismaSessionRepository(prisma);
const studentReferralRepository = new PrismaStudentReferralRepository(prisma);
const systemParameterRepository = new PrismaSystemParameterRepository(prisma);
const supportContactRepository = new PrismaSupportContactRepository(prisma);
const schoolRepository = new PrismaSchoolRepository(prisma);
const facultyRepository = new PrismaFacultyRepository(prisma);
const workPlanRepository = new PrismaWorkPlanRepository(prisma);
const tutorSemesterReportRepository = new PrismaTutorSemesterReportRepository(prisma);
const notificationRepository = new PrismaNotificationRepository(prisma);
const academicPeriodRepository = new PrismaAcademicPeriodRepository(prisma);
const tutorEvaluationRepository = new PrismaTutorEvaluationRepository(prisma);
const evaluationWindowRepository = new PrismaEvaluationWindowRepository(prisma);

const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const evidenceStorage = new LocalEvidenceStorage();

const loginUseCase = new LoginUseCase(
  userRepository,
  roleRepository,
  refreshTokenRepository,
  auditLogRepository,
  passwordHasher,
  tokenService,
);

const requestPasswordResetUseCase = new RequestPasswordResetUseCase(
  userRepository,
  passwordResetTokenRepository
);

const resetPasswordUseCase = new ResetPasswordUseCase(
  userRepository,
  passwordResetTokenRepository,
  passwordHasher
);

import { CreateUserUseCase } from '@application/use-cases/users/CreateUserUseCase';
import { UpdateUserUseCase } from '@application/use-cases/users/UpdateUserUseCase';
import { ToggleUserStatusUseCase } from '@application/use-cases/users/ToggleUserStatusUseCase';
import { ListUsersUseCase } from '@application/use-cases/users/ListUsersUseCase';
import { ListRolesUseCase } from '@application/use-cases/roles/ListRolesUseCase';
import { CreateRoleUseCase } from '@application/use-cases/roles/CreateRoleUseCase';
import { AssignRoleUseCase } from '@application/use-cases/roles/AssignRoleUseCase';
import { GetProfileUseCase } from '@application/use-cases/profile/GetProfileUseCase';
import { UpdateProfileUseCase } from '@application/use-cases/profile/UpdateProfileUseCase';
import { ChangePasswordUseCase } from '@application/use-cases/profile/ChangePasswordUseCase';
import { CreateStudentUseCase } from '@application/use-cases/students/CreateStudentUseCase';
import { UpdateStudentUseCase } from '@application/use-cases/students/UpdateStudentUseCase';
import { ListStudentsUseCase } from '@application/use-cases/students/ListStudentsUseCase';
import { ImportStudentsUseCase } from '@application/use-cases/students/ImportStudentsUseCase';
import { MarkStudentRiskUseCase } from '@application/use-cases/students/MarkStudentRiskUseCase';
import { LinkStudentPortalAccountUseCase } from '@application/use-cases/students/LinkStudentPortalAccountUseCase';
import { AssignStudentsUseCase } from '@application/use-cases/assignments/AssignStudentsUseCase';
import { GetTutorWorkloadUseCase } from '@application/use-cases/assignments/GetTutorWorkloadUseCase';
import { ReassignStudentUseCase } from '@application/use-cases/assignments/ReassignStudentUseCase';
import { CreateInterviewUseCase } from '@application/use-cases/interviews/CreateInterviewUseCase';
import { ListInterviewsByStudentUseCase } from '@application/use-cases/interviews/ListInterviewsByStudentUseCase';
import { CreateFollowUpUseCase } from '@application/use-cases/follow-ups/CreateFollowUpUseCase';
import { ListFollowUpsByStudentUseCase } from '@application/use-cases/follow-ups/ListFollowUpsByStudentUseCase';
import { UpsertSupportContactUseCase } from '@application/use-cases/support-contacts/UpsertSupportContactUseCase';
import { GetSupportContactUseCase } from '@application/use-cases/support-contacts/GetSupportContactUseCase';
import { GetStudentRecordUseCase } from '@application/use-cases/student-record/GetStudentRecordUseCase';
import { CreateTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateTutoringRequestUseCase';
import { CreateOwnTutoringRequestUseCase } from '@application/use-cases/tutoring-requests/CreateOwnTutoringRequestUseCase';
import { ListTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';
import { ScheduleSessionUseCase } from '@application/use-cases/sessions/ScheduleSessionUseCase';
import { ListSessionsUseCase } from '@application/use-cases/sessions/ListSessionsUseCase';
import { RegisterAttendanceUseCase } from '@application/use-cases/sessions/RegisterAttendanceUseCase';
import { RescheduleSessionUseCase } from '@application/use-cases/sessions/RescheduleSessionUseCase';
import { CancelSessionUseCase } from '@application/use-cases/sessions/CancelSessionUseCase';
import { UploadSessionEvidenceUseCase } from '@application/use-cases/sessions/UploadSessionEvidenceUseCase';
import { ListSessionEvidenceUseCase } from '@application/use-cases/sessions/ListSessionEvidenceUseCase';
import { GetSessionEvidenceFileUseCase } from '@application/use-cases/sessions/GetSessionEvidenceFileUseCase';
import { ListSchoolsUseCase } from '@application/use-cases/schools/ListSchoolsUseCase';
import { ListFacultiesUseCase } from '@application/use-cases/faculties/ListFacultiesUseCase';
import { ListWorkPlansUseCase } from '@application/use-cases/work-plans/ListWorkPlansUseCase';
import { GetWorkPlanUseCase } from '@application/use-cases/work-plans/GetWorkPlanUseCase';
import { SaveWorkPlanUseCase } from '@application/use-cases/work-plans/SaveWorkPlanUseCase';
import { GetMySemesterReportUseCase } from '@application/use-cases/semester-reports/GetMySemesterReportUseCase';
import { SaveMySemesterReportUseCase } from '@application/use-cases/semester-reports/SaveMySemesterReportUseCase';
import { GetSemesterReportForExportUseCase } from '@application/use-cases/semester-reports/GetSemesterReportForExportUseCase';
import { UploadWorkPlanResolutionUseCase } from '@application/use-cases/work-plans/UploadWorkPlanResolutionUseCase';
import { GetWorkPlanResolutionFileUseCase } from '@application/use-cases/work-plans/GetWorkPlanResolutionFileUseCase';
import { GetRiskAlertsUseCase } from '@application/use-cases/alerts/GetRiskAlertsUseCase';
import { GetScheduleAttendanceReportUseCase } from '@application/use-cases/reports/GetScheduleAttendanceReportUseCase';
import { CreateReferralUseCase } from '@application/use-cases/referrals/CreateReferralUseCase';
import { GetReferralConstanciaUseCase } from '@application/use-cases/referrals/GetReferralConstanciaUseCase';
import { GetReferralsUseCase } from '@application/use-cases/referrals/GetReferralsUseCase';
import { GetReferralByIdUseCase } from '@application/use-cases/referrals/GetReferralByIdUseCase';
import { UpdateReferralStatusUseCase } from '@application/use-cases/referrals/UpdateReferralStatusUseCase';
import { GetReferralTrackingUseCase } from '@application/use-cases/referrals/GetReferralTrackingUseCase';
import { SubmitEvaluationUseCase } from '@application/use-cases/evaluation/SubmitEvaluationUseCase';
import { GetEvaluationStatusUseCase } from '@application/use-cases/evaluation/GetEvaluationStatusUseCase';
import { GetEvaluationResultsUseCase } from '@application/use-cases/evaluation/GetEvaluationResultsUseCase';
import { GetEvaluationStatisticsUseCase } from '@application/use-cases/evaluation/GetEvaluationStatisticsUseCase';
import { GetEvaluationSuggestionsUseCase } from '@application/use-cases/evaluation/GetEvaluationSuggestionsUseCase';
import { ListEvaluationWindowsUseCase } from '@application/use-cases/evaluation/ListEvaluationWindowsUseCase';
import { SetEvaluationWindowUseCase } from '@application/use-cases/evaluation/SetEvaluationWindowUseCase';
import { GetNotificationsUseCase } from '@application/use-cases/notifications/GetNotificationsUseCase';
import { MarkNotificationReadUseCase } from '@application/use-cases/notifications/MarkNotificationReadUseCase';

const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const toggleUserStatusUseCase = new ToggleUserStatusUseCase(userRepository);
const listUsersUseCase = new ListUsersUseCase(userRepository);
const listRolesUseCase = new ListRolesUseCase(roleRepository);
const createRoleUseCase = new CreateRoleUseCase(roleRepository);
const assignRoleUseCase = new AssignRoleUseCase(userRepository, roleRepository, auditLogRepository);

const getProfileUseCase = new GetProfileUseCase(userRepository, roleRepository);
const updateProfileUseCase = new UpdateProfileUseCase(userRepository, roleRepository);
const changePasswordUseCase = new ChangePasswordUseCase(
  userRepository,
  refreshTokenRepository,
  auditLogRepository,
  passwordHasher,
);

const createStudentUseCase = new CreateStudentUseCase(studentRepository, schoolRepository);
const updateStudentUseCase = new UpdateStudentUseCase(studentRepository, schoolRepository);
const listStudentsUseCase = new ListStudentsUseCase(studentRepository);
const importStudentsUseCase = new ImportStudentsUseCase(studentRepository, schoolRepository);
const markStudentRiskUseCase = new MarkStudentRiskUseCase(studentRepository);
const linkStudentPortalAccountUseCase = new LinkStudentPortalAccountUseCase(
  studentRepository,
  userRepository,
  roleRepository,
);
const assignStudentsUseCase = new AssignStudentsUseCase(
  studentRepository,
  userRepository,
  roleRepository,
);
const getTutorWorkloadUseCase = new GetTutorWorkloadUseCase(
  studentRepository,
  userRepository,
  roleRepository,
);
const reassignStudentUseCase = new ReassignStudentUseCase(
  studentRepository,
  userRepository,
  roleRepository,
  tutorAssignmentHistoryRepository,
);
const createInterviewUseCase = new CreateInterviewUseCase(
  tutorInterviewRepository,
  studentRepository,
);
const listInterviewsByStudentUseCase = new ListInterviewsByStudentUseCase(
  tutorInterviewRepository,
);
const createFollowUpUseCase = new CreateFollowUpUseCase(tutorFollowUpRepository, studentRepository);
const listFollowUpsByStudentUseCase = new ListFollowUpsByStudentUseCase(tutorFollowUpRepository);
const upsertSupportContactUseCase = new UpsertSupportContactUseCase(
  supportContactRepository,
  studentRepository,
);
const getSupportContactUseCase = new GetSupportContactUseCase(supportContactRepository);
const getStudentRecordUseCase = new GetStudentRecordUseCase(
  studentRepository,
  schoolRepository,
  userRepository,
  roleRepository,
  tutorInterviewRepository,
  tutorAssignmentHistoryRepository,
  supportContactRepository,
  sessionRepository,
  tutorFollowUpRepository,
  studentReferralRepository,
);
const createTutoringRequestUseCase = new CreateTutoringRequestUseCase(
  tutoringRequestRepository,
  studentRepository,
  schoolRepository,
  userRepository,
  roleRepository,
);
const listTutoringRequestsUseCase = new ListTutoringRequestsUseCase(tutoringRequestRepository);
const createOwnTutoringRequestUseCase = new CreateOwnTutoringRequestUseCase(
  studentRepository,
  createTutoringRequestUseCase,
);
const scheduleSessionUseCase = new ScheduleSessionUseCase(
  sessionRepository,
  studentRepository,
  systemParameterRepository,
);
const listSessionsUseCase = new ListSessionsUseCase(sessionRepository);
const registerAttendanceUseCase = new RegisterAttendanceUseCase(
  sessionRepository,
  systemParameterRepository,
);
const rescheduleSessionUseCase = new RescheduleSessionUseCase(sessionRepository);
const cancelSessionUseCase = new CancelSessionUseCase(sessionRepository);
const uploadSessionEvidenceUseCase = new UploadSessionEvidenceUseCase(
  sessionRepository,
  evidenceStorage,
);
const listSessionEvidenceUseCase = new ListSessionEvidenceUseCase(sessionRepository, userRepository);
const getSessionEvidenceFileUseCase = new GetSessionEvidenceFileUseCase(
  sessionRepository,
  evidenceStorage,
);
const listSchoolsUseCase = new ListSchoolsUseCase(schoolRepository);
const listFacultiesUseCase = new ListFacultiesUseCase(facultyRepository);
const listWorkPlansUseCase = new ListWorkPlansUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  workPlanRepository,
);
const getWorkPlanUseCase = new GetWorkPlanUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  workPlanRepository,
);
const saveWorkPlanUseCase = new SaveWorkPlanUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  workPlanRepository,
);
const uploadWorkPlanResolutionUseCase = new UploadWorkPlanResolutionUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  workPlanRepository,
  evidenceStorage,
);
const getWorkPlanResolutionFileUseCase = new GetWorkPlanResolutionFileUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  workPlanRepository,
  evidenceStorage,
);
const getMySemesterReportUseCase = new GetMySemesterReportUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  sessionRepository,
  studentRepository,
  schoolRepository,
  facultyRepository,
  tutorFollowUpRepository,
  tutorSemesterReportRepository,
);
const saveMySemesterReportUseCase = new SaveMySemesterReportUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  tutorSemesterReportRepository,
);
const getSemesterReportForExportUseCase = new GetSemesterReportForExportUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  tutorSemesterReportRepository,
);
const getRiskAlertsUseCase = new GetRiskAlertsUseCase(
  studentRepository,
  sessionRepository,
  userRepository,
  systemParameterRepository,
);
const getScheduleAttendanceReportUseCase = new GetScheduleAttendanceReportUseCase(
  userRepository,
  roleRepository,
  sessionRepository,
  studentRepository,
);
const createReferralUseCase = new CreateReferralUseCase(
  studentReferralRepository,
  studentRepository,
  userRepository,
  roleRepository,
  notificationRepository,
);
const getReferralConstanciaUseCase = new GetReferralConstanciaUseCase(
  studentReferralRepository,
  studentRepository,
  userRepository,
  schoolRepository,
);
const getReferralsUseCase = new GetReferralsUseCase(
  studentReferralRepository,
  userRepository,
  roleRepository,
);
const getReferralByIdUseCase = new GetReferralByIdUseCase(
  studentReferralRepository,
  userRepository,
  roleRepository,
);
const updateReferralStatusUseCase = new UpdateReferralStatusUseCase(
  studentReferralRepository,
  notificationRepository,
);
const getReferralTrackingUseCase = new GetReferralTrackingUseCase(
  studentReferralRepository,
  userRepository,
  roleRepository,
  systemParameterRepository,
);
const submitEvaluationUseCase = new SubmitEvaluationUseCase(
  studentRepository,
  academicPeriodRepository,
  tutorEvaluationRepository,
  evaluationWindowRepository,
);
const getEvaluationStatusUseCase = new GetEvaluationStatusUseCase(
  studentRepository,
  academicPeriodRepository,
  tutorEvaluationRepository,
  evaluationWindowRepository,
);
const getEvaluationResultsUseCase = new GetEvaluationResultsUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  tutorEvaluationRepository,
);
const getEvaluationStatisticsUseCase = new GetEvaluationStatisticsUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  tutorEvaluationRepository,
);
const getEvaluationSuggestionsUseCase = new GetEvaluationSuggestionsUseCase(
  userRepository,
  roleRepository,
  academicPeriodRepository,
  tutorEvaluationRepository,
);
const listEvaluationWindowsUseCase = new ListEvaluationWindowsUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  evaluationWindowRepository,
);
const setEvaluationWindowUseCase = new SetEvaluationWindowUseCase(
  userRepository,
  roleRepository,
  schoolRepository,
  academicPeriodRepository,
  evaluationWindowRepository,
);
const getNotificationsUseCase = new GetNotificationsUseCase(notificationRepository);
const markNotificationReadUseCase = new MarkNotificationReadUseCase(notificationRepository);

export const container = {
  repositories: {
    userRepository,
    roleRepository,
    refreshTokenRepository,
    auditLogRepository,
    passwordResetTokenRepository,
    studentRepository,
    schoolRepository,
    facultyRepository,
    notificationRepository,
    tutorAssignmentHistoryRepository,
    tutorInterviewRepository,
    tutorFollowUpRepository,
    supportContactRepository,
    tutoringRequestRepository,
    sessionRepository,
    systemParameterRepository,
    studentReferralRepository,
    academicPeriodRepository,
    tutorEvaluationRepository,
    evaluationWindowRepository,
  },
  services: {
    passwordHasher,
    tokenService,
    evidenceStorage,
  },
  useCases: {
    loginUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
    createUserUseCase,
    updateUserUseCase,
    toggleUserStatusUseCase,
    listUsersUseCase,
    listRolesUseCase,
    createRoleUseCase,
    assignRoleUseCase,
    getProfileUseCase,
    updateProfileUseCase,
    changePasswordUseCase,
    createStudentUseCase,
    updateStudentUseCase,
    listStudentsUseCase,
    importStudentsUseCase,
    markStudentRiskUseCase,
    linkStudentPortalAccountUseCase,
    assignStudentsUseCase,
    getTutorWorkloadUseCase,
    reassignStudentUseCase,
    createInterviewUseCase,
    listInterviewsByStudentUseCase,
    createFollowUpUseCase,
    listFollowUpsByStudentUseCase,
    upsertSupportContactUseCase,
    getSupportContactUseCase,
    getStudentRecordUseCase,
    createTutoringRequestUseCase,
    createOwnTutoringRequestUseCase,
    listTutoringRequestsUseCase,
    scheduleSessionUseCase,
    listSessionsUseCase,
    registerAttendanceUseCase,
    rescheduleSessionUseCase,
    cancelSessionUseCase,
    uploadSessionEvidenceUseCase,
    listSessionEvidenceUseCase,
    getSessionEvidenceFileUseCase,
    listSchoolsUseCase,
    listFacultiesUseCase,
    listWorkPlansUseCase,
    getWorkPlanUseCase,
    saveWorkPlanUseCase,
    uploadWorkPlanResolutionUseCase,
    getWorkPlanResolutionFileUseCase,
    getMySemesterReportUseCase,
    saveMySemesterReportUseCase,
    getSemesterReportForExportUseCase,
    getRiskAlertsUseCase,
    getScheduleAttendanceReportUseCase,
    createReferralUseCase,
    getReferralConstanciaUseCase,
    getReferralsUseCase,
    getReferralByIdUseCase,
    updateReferralStatusUseCase,
    getReferralTrackingUseCase,
    getNotificationsUseCase,
    markNotificationReadUseCase,
    submitEvaluationUseCase,
    getEvaluationStatusUseCase,
    getEvaluationResultsUseCase,
    listEvaluationWindowsUseCase,
    setEvaluationWindowUseCase,
    getEvaluationStatisticsUseCase,
    getEvaluationSuggestionsUseCase,
  },
} as const;
