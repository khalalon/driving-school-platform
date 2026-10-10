/**
 * D'une destination de notification (`data.screen`, posée par le serveur) à une route de l'app
 * (17.7). Les noms des destinations **sont** les noms des routes (`AppNavigator`, inchangés
 * depuis 13.7 pour ça) ; il reste à savoir lesquelles sont des **onglets** (on y va par la
 * barre `StudentTabs` / `InstructorTabs`) et lesquelles demandent un paramètre.
 *
 * Une destination inconnue, ou qui n'existe pas pour ce rôle, ouvre l'écran « Notifications » :
 * l'utilisateur y retrouve toujours le message, jamais un écran vide ou une erreur.
 */

import { NotificationTarget } from '../models/Notification';
import { UserRole } from '../models/User';

export interface NavigationTarget {
  name: string;
  params?: Record<string, unknown>;
}

const STUDENT_TABS = ['StudentDashboard', 'MyLessons', 'MyExams', 'MyProfile'];
const INSTRUCTOR_TABS = ['InstructorDashboard', 'Agenda', 'LessonRequests', 'ExamRequests'];
const STUDENT_STACK = ['MyEnrollmentRequests'];

export const NOTIFICATIONS_ROUTE: NavigationTarget = { name: 'Notifications' };

export function routeForTarget(
  target: NotificationTarget | null,
  user: { role: UserRole | string; schoolId?: string | null } | null
): NavigationTarget {
  if (!target || !user) {
    return NOTIFICATIONS_ROUTE;
  }
  const { screen } = target;

  if (user.role === UserRole.STUDENT) {
    if (STUDENT_TABS.includes(screen)) {
      return { name: 'StudentTabs', params: { screen } };
    }
    if (STUDENT_STACK.includes(screen)) {
      return { name: screen };
    }
  }

  if (user.role === UserRole.INSTRUCTOR) {
    if (INSTRUCTOR_TABS.includes(screen)) {
      return { name: 'InstructorTabs', params: { screen } };
    }
    // E4–E6 : l'écran des inscriptions prend l'école de l'instructeur (A3)
    if (screen === 'EnrollmentRequests' && user.schoolId) {
      return { name: 'EnrollmentRequests', params: { schoolId: user.schoolId } };
    }
  }

  return NOTIFICATIONS_ROUTE;
}
