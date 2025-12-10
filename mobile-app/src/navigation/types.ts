/**
 * Navigation Type Definitions
 * Single Responsibility: Define all navigation param lists
 */

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  StudentStack: undefined;
  InstructorStack: undefined;
};

export type InstructorStackParamList = {
  InstructorDashboard: undefined;
  StudentsList: { schoolId: string };
  StudentProfile: { studentId: string; schoolId: string; studentName: string };
  BookLesson: undefined;
  RequestExam: undefined;
  ExamsList: { schoolId: string };
};
