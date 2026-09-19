/**
 * Navigation Type Definitions
 * Single Responsibility: Define all navigation param lists
 *
 * Une seule pile (`AppNavigator`), dont les écrans dépendent du rôle : auth (non connecté),
 * élève, instructeur. `studentId` = users.id partout (D-28).
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  InstructorRegistration: undefined;
};

export type StudentStackParamList = {
  StudentDashboard: undefined;
  SchoolsList: undefined;
  SchoolDetail: { schoolId: string };
  /** L2 : l'instructeur n'est qu'une préférence facultative (D-32). */
  BookLesson: { schoolId: string; preferredInstructorId?: string; instructorName?: string };
  MyLessons: undefined;
  RequestExam: undefined;
  MyExams: undefined;
  MyEnrollmentRequests: undefined;
  /** P8–P11 : l'école de l'inscription approuvée (E3). */
  MyProfile: { schoolId: string };
};

export type InstructorStackParamList = {
  InstructorDashboard: undefined;
  TodayLessons: undefined;
  LessonRequests: undefined;
  BookForStudent: undefined;
  TodayExams: undefined;
  ExamRequests: undefined;
  /** E4–E6 : `schoolId` de l'instructeur (A3). */
  EnrollmentRequests: { schoolId: string };
  /** P1–P7 : `studentId` = users.id, école de l'instructeur. */
  StudentProfile: { studentId: string; schoolId: string; studentName: string };
};

export type AppStackParamList = AuthStackParamList &
  StudentStackParamList &
  InstructorStackParamList;
