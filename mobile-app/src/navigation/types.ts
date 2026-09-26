/**
 * Navigation Type Definitions
 * Single Responsibility: Define all navigation param lists
 *
 * Une seule pile (`AppNavigator`), dont les écrans dépendent du rôle : auth (non connecté),
 * élève, instructeur. Depuis 8.4, la racine de chaque rôle est une barre d'onglets
 * (`StudentTabs` / `InstructorTabs`) ; les autres écrans s'empilent au-dessus.
 * `studentId` = users.id partout (D-28).
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  InstructorRegistration: undefined;
};

/** Onglets élève : Home, Lessons, Exams, Profile. */
export type StudentTabParamList = {
  StudentDashboard: undefined;
  MyLessons: undefined;
  MyExams: undefined;
  /** P8–P11 : l'école de l'inscription approuvée (E3) ; résolue par l'écran si absente (onglet). */
  MyProfile: { schoolId: string } | undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList> | undefined;
  SchoolsList: undefined;
  SchoolDetail: { schoolId: string };
  /** L2 : l'instructeur n'est qu'une préférence facultative (D-32). */
  BookLesson: { schoolId: string; preferredInstructorId?: string; instructorName?: string };
  RequestExam: undefined;
  MyEnrollmentRequests: undefined;
};

/** Onglets instructeur : Today, Requests, Exams, Students. */
export type InstructorTabParamList = {
  InstructorDashboard: undefined;
  LessonRequests: undefined;
  ExamRequests: undefined;
  BookForStudent: undefined;
};

export type InstructorStackParamList = {
  InstructorTabs: NavigatorScreenParams<InstructorTabParamList> | undefined;
  TodayLessons: undefined;
  TodayExams: undefined;
  /** E4–E6 : `schoolId` de l'instructeur (A3). */
  EnrollmentRequests: { schoolId: string };
  /** P1–P7 : `studentId` = users.id, école de l'instructeur. */
  StudentProfile: { studentId: string; schoolId: string; studentName: string };
  /** S2, S7–S9 : l'école vient de A3, l'écran n'a pas de paramètre (D-51). */
  MySchool: undefined;
};

export type AppStackParamList = AuthStackParamList &
  StudentStackParamList &
  InstructorStackParamList;
