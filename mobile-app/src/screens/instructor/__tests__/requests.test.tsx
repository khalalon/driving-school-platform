/**
 * Écrans instructeur « demandes et réservation » refaits (13.18, D-52) : demandes de leçon,
 * demandes d'inscription, demandes d'examen (libellés par type, D-42), réservation directe pour
 * un élève, et la fenêtre de présence — en clair, en sombre et en arabe, textes clés présents,
 * cibles tactiles suffisantes.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { LessonRequestsScreen } from '../LessonRequestsScreen';
import { EnrollmentRequestsScreen } from '../EnrollmentRequestsScreen';
import { ExamRequestsScreen } from '../ExamRequestsScreen';
import { BookForStudentScreen } from '../BookForStudentScreen';
import { AttendanceModal } from '../components/AttendanceModal';
import { lessonService } from '../../../services/api/LessonService';
import { examService } from '../../../services/api/ExamService';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { schoolService } from '../../../services/api/SchoolService';
import { LessonStatus, LessonType } from '../../../models/Lesson';
import { ExamResult, ExamStatus, ExamType } from '../../../models/Exam';
import { EnrollmentStatus } from '../../../models/Enrollment';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/LessonService', () => ({
  lessonService: {
    getMyLessons: jest.fn(),
    approveLesson: jest.fn(),
    approveLessons: jest.fn(),
    rejectLesson: jest.fn(),
    bookLessonForStudent: jest.fn(),
  },
}));
jest.mock('../../../services/api/ExamService', () => ({
  examService: { getMyExams: jest.fn(), scheduleExam: jest.fn(), rejectExamRequest: jest.fn() },
}));
jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: { getSchoolRequests: jest.fn(), approveRequest: jest.fn(), rejectRequest: jest.fn() },
}));
jest.mock('../../../services/api/SchoolService', () => ({
  schoolService: {
    getSchoolInstructors: jest.fn(),
    getSchoolPricing: jest.fn(),
    getSchoolStudents: jest.fn(),
  },
}));
jest.mock('../../../hooks/useSchoolCurrency', () => ({ useSchoolCurrency: () => 'TND' }));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { firstName: 'Karim', lastName: 'Ben Salah', schoolId: 'school-1', instructorId: 'i1' },
  }),
}));
jest.mock('../../../context/LanguageContext', () => {
  const i18n = jest.requireActual('../../../i18n');
  return {
    useI18n: () => ({ t: i18n.t, language: i18n.getLanguage(), isRTL: i18n.isRTL() }),
  };
});
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = jest.requireActual('react');
  return { ...actual, useFocusEffect: (effect: () => void) => useEffect(effect, []) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
const student = { id: 'u1', firstName: 'Yasmine', lastName: 'Amri' };

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  (lessonService.getMyLessons as jest.Mock).mockResolvedValue([
    {
      id: 'l1',
      schoolId: 'school-1',
      type: LessonType.MANOEUVRE,
      status: LessonStatus.PENDING,
      requestedDate: inTwoDays,
      scheduledDate: null,
      durationMinutes: null,
      preferredInstructorId: 'i1',
      notes: 'Plutôt le matin si possible.',
      student,
      instructor: null,
    },
  ]);
  (examService.getMyExams as jest.Mock).mockResolvedValue([
    {
      id: 'x1',
      schoolId: 'school-1',
      type: ExamType.PRACTICAL,
      status: ExamStatus.PENDING,
      result: ExamResult.PENDING,
      preferredDate: inTwoDays,
      message: 'Prête pour la conduite.',
      studentFirstName: 'Yasmine',
      studentLastName: 'Amri',
      studentCompletedLessons: 14,
      createdAt: '2026-09-20T10:00:00.000Z',
    },
  ]);
  (enrollmentService.getSchoolRequests as jest.Mock).mockResolvedValue([
    {
      id: 'req-1',
      studentId: 'u1',
      schoolId: 'school-1',
      status: EnrollmentStatus.PENDING,
      message: 'Bonjour, je souhaite m’inscrire.',
      rejectionReason: null,
      processedBy: null,
      processedAt: null,
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
      studentEmail: 'yasmine@exemple.tn',
      studentFirstName: 'Yasmine',
      studentLastName: 'Amri',
    },
  ]);
  (schoolService.getSchoolInstructors as jest.Mock).mockResolvedValue([
    { id: 'i1', userId: 'u9', schoolId: 'school-1', firstName: 'Karim', lastName: 'Ben Salah', phone: '', licenseNumber: '', specialties: [] },
  ]);
  (schoolService.getSchoolPricing as jest.Mock).mockResolvedValue([
    { id: 'p1', schoolId: 'school-1', lessonType: LessonType.MANOEUVRE, price: 45, duration: 60 },
  ]);
  (schoolService.getSchoolStudents as jest.Mock).mockResolvedValue([
    {
      studentId: 'u1',
      firstName: 'Yasmine',
      lastName: 'Amri',
      email: 'yasmine@exemple.tn',
      phone: null,
      enrollmentDate: '2026-08-01T00:00:00.000Z',
      completedLessons: 16,
    },
  ]);
});

afterEach(() => applyLanguage('fr'));

const LESSON_TO_RECORD = {
  id: 'l9',
  schoolId: 'school-1',
  type: LessonType.PARC,
  status: LessonStatus.SCHEDULED,
  scheduledDate: new Date(Date.now() - 20 * 60000).toISOString(),
  durationMinutes: 60,
  student,
  instructor: null,
} as never;

const CASES: [string, () => React.ReactElement, () => string][] = [
  ['demandes de leçon', () => <LessonRequestsScreen navigation={navigation} />, () => 'Yasmine Amri'],
  [
    'demandes d’inscription',
    () => <EnrollmentRequestsScreen navigation={navigation} route={{ params: { schoolId: 'school-1' } }} />,
    () => t('enrollments.title'),
  ],
  ['demandes d’examen', () => <ExamRequestsScreen navigation={navigation} />, () => t('examRequests.title')],
  ['réservation directe', () => <BookForStudentScreen navigation={navigation} />, () => t('bookFor.title')],
  [
    'fenêtre de présence',
    () => <AttendanceModal lesson={LESSON_TO_RECORD} processing={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    () => t('common.save'),
  ],
];

describe.each(CASES)('%s', (_, element, keyText) => {
  it.each(SCREEN_VARIANTS)('se rend en %s, texte clé présent, cibles tactiles suffisantes', async (__, theme, language) => {
    const tree = renderScreen(element(), theme, language);
    await settle();
    expect(renderedText(tree).join(' ')).toContain(keyText());
    expect(smallTouchTargets(tree)).toEqual([]);
    unmountInTheme(tree);
  });
});

describe('demandes d’examen', () => {
  it('un examen pratique garde ses libellés propres (D-42), jamais « Schedule / Reject » codés en dur', async () => {
    const tree = renderScreen(<ExamRequestsScreen navigation={navigation} />, 'dark');
    await settle();
    const texts = renderedText(tree).join(' ');
    expect(texts).not.toMatch(/\bSchedule\b|\bReject\b/);
    expect(texts).toContain('Yasmine');
    unmountInTheme(tree);
  });
});

describe('fenêtre de présence', () => {
  it('enregistrer transmet la présence choisie', async () => {
    const onConfirm = jest.fn();
    const tree = renderScreen(
      <AttendanceModal lesson={LESSON_TO_RECORD} processing={false} onClose={jest.fn()} onConfirm={onConfirm} />,
      'dark'
    );
    await settle();
    act(() => tree.root.findAllByProps({ accessibilityLabel: t('common.save') })[0].props.onPress());
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ attended: true }));
    unmountInTheme(tree);
  });
});
