/**
 * Destination d'une notification → route de l'app (17.7). Les destinations sont posées par le
 * serveur (17.4) ; ce test en fixe la correspondance pour chacune, et le repli : une destination
 * inconnue ou d'un autre rôle ouvre l'historique, jamais un écran inexistant.
 */
import { routeForTarget, NOTIFICATIONS_ROUTE } from '../notificationRoutes';
import { UserRole } from '../../models/User';

const student = { role: UserRole.STUDENT };
const instructor = { role: UserRole.INSTRUCTOR, schoolId: 'school-1' };

describe('routeForTarget (17.7)', () => {
  it('élève : onglets par la barre, écrans de pile par leur nom', () => {
    expect(routeForTarget({ screen: 'MyLessons', id: 'l1' }, student)).toEqual({
      name: 'StudentTabs',
      params: { screen: 'MyLessons' },
    });
    expect(routeForTarget({ screen: 'MyExams' }, student)).toEqual({
      name: 'StudentTabs',
      params: { screen: 'MyExams' },
    });
    expect(routeForTarget({ screen: 'MyEnrollmentRequests' }, student)).toEqual({
      name: 'MyEnrollmentRequests',
    });
  });

  it('instructeur : files et agenda par la barre, inscriptions avec l’école de A3', () => {
    for (const screen of ['LessonRequests', 'ExamRequests', 'Agenda']) {
      expect(routeForTarget({ screen }, instructor)).toEqual({
        name: 'InstructorTabs',
        params: { screen },
      });
    }
    expect(routeForTarget({ screen: 'EnrollmentRequests' }, instructor)).toEqual({
      name: 'EnrollmentRequests',
      params: { schoolId: 'school-1' },
    });
  });

  it('repli sur l’historique : destination inconnue, d’un autre rôle, ou sans école', () => {
    expect(routeForTarget({ screen: 'Inexistant' }, student)).toBe(NOTIFICATIONS_ROUTE);
    expect(routeForTarget({ screen: 'LessonRequests' }, student)).toBe(NOTIFICATIONS_ROUTE);
    expect(routeForTarget({ screen: 'MyLessons' }, instructor)).toBe(NOTIFICATIONS_ROUTE);
    expect(
      routeForTarget({ screen: 'EnrollmentRequests' }, { role: UserRole.INSTRUCTOR })
    ).toBe(NOTIFICATIONS_ROUTE);
    expect(routeForTarget(null, student)).toBe(NOTIFICATIONS_ROUTE);
    expect(routeForTarget({ screen: 'MyLessons' }, null)).toBe(NOTIFICATIONS_ROUTE);
  });
});
