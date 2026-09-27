/**
 * Écrans élève « leçons, examens, profil » refaits (13.16, D-52) : demande de leçon, mes leçons,
 * demande d'examen, mes examens, « Mon profil » (onglets progression, leçons, examens) — rendus en
 * clair, en sombre et en arabe, textes clés présents, cibles tactiles suffisantes.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { BookLessonScreen } from '../BookLessonScreen';
import { MyLessonsScreen } from '../MyLessonsScreen';
import { RequestExamScreen } from '../RequestExamScreen';
import { MyExamsScreen } from '../MyExamsScreen';
import { MyProfileScreen } from '../my-profile/MyProfileScreen';
import { MyProgressTab } from '../my-profile/tabs/MyProgressTab';
import { MyLessonsPaymentTab } from '../my-profile/tabs/MyLessonsPaymentTab';
import { MyExamsPaymentTab } from '../my-profile/tabs/MyExamsPaymentTab';
import { lessonService } from '../../../services/api/LessonService';
import { examService } from '../../../services/api/ExamService';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { studentSelfProfileService } from '../../../services/api/StudentSelfProfileService';
import { LessonStatus, LessonType } from '../../../models/Lesson';
import { ExamResult, ExamStatus, ExamType } from '../../../models/Exam';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unlabelledPressables,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/LessonService', () => ({
  lessonService: { getMyLessons: jest.fn(), cancelLesson: jest.fn(), requestLesson: jest.fn() },
}));
jest.mock('../../../services/api/ExamService', () => ({
  examService: { getMyExams: jest.fn(), requestExam: jest.fn() },
}));
jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: { checkEnrollmentStatus: jest.fn(), getMyRequests: jest.fn() },
}));
jest.mock('../../../services/api/StudentSelfProfileService', () => ({
  studentSelfProfileService: {
    getMyProfile: jest.fn(),
    getMyFinancialSummary: jest.fn(),
    getMyLessons: jest.fn(),
    getMyExams: jest.fn(),
  },
}));
jest.mock('../../../hooks/useSchoolCurrency', () => ({ useSchoolCurrency: () => 'TND' }));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Yasmine', lastName: 'Amri' } }),
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

const navigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() };
const school = { params: { schoolId: 'school-1' } };
const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

const LESSONS = [
  {
    id: 'l1',
    schoolId: 'school-1',
    type: LessonType.MANOEUVRE,
    status: LessonStatus.SCHEDULED,
    scheduledDate: inTwoDays,
    requestedDate: inTwoDays,
    durationMinutes: 60,
    price: 45,
    instructor: { id: 'i1', firstName: 'Karim', lastName: 'Ben Salah' },
    student: { id: 'u1', firstName: 'Yasmine', lastName: 'Amri' },
    paid: false,
  },
  {
    id: 'l2',
    schoolId: 'school-1',
    type: LessonType.CODE,
    status: LessonStatus.REJECTED,
    requestedDate: '2026-09-02T09:00:00.000Z',
    scheduledDate: null,
    durationMinutes: null,
    rejectionReason: 'Créneau complet, merci de proposer une autre date.',
    instructor: null,
    student: { id: 'u1', firstName: 'Yasmine', lastName: 'Amri' },
    paid: false,
  },
];

const EXAMS = [
  {
    id: 'x1',
    schoolId: 'school-1',
    type: ExamType.THEORY,
    status: ExamStatus.COMPLETED,
    result: ExamResult.PASSED,
    score: 34,
    dateTime: '2026-09-05T09:00:00.000Z',
    location: 'Centre ATTT Tunis',
    createdAt: '2026-09-01T10:00:00.000Z',
    paid: true,
    amount: 30,
  },
];

const PROFILE = {
  id: 'u1',
  firstName: 'Yasmine',
  lastName: 'Amri',
  email: 'yasmine@exemple.tn',
  phone: '+216 20 000 000',
  address: null,
  dateOfBirth: null,
  licenseNumber: null,
  enrollmentDate: '2026-08-01T00:00:00.000Z',
  emergencyContact: null,
  emergencyPhone: null,
  totalLessons: 17,
  completedLessons: 16,
  completedLessonsByType: { CODE: 12, [LessonType.MANOEUVRE]: 4, [LessonType.PARC]: 0 },
  totalExams: 1,
  passedExams: 1,
};

const FINANCIAL = {
  totalRevenue: 520,
  totalPending: 45,
  totalDue: 45,
  lessonsRevenue: 490,
  examsRevenue: 30,
  lessonsPending: 45,
  examsPending: 0,
  lastPaymentDate: '2026-09-05T09:00:00.000Z',
  credit: 0,
};

const HISTORY_LESSON = {
  id: 'l1',
  type: LessonType.MANOEUVRE,
  status: 'completed',
  scheduledDate: '2026-09-10T09:00:00.000Z',
  durationMinutes: 60,
  instructorFirstName: 'Karim',
  instructorLastName: 'Ben Salah',
  attended: true,
  feedback: null,
  rating: null,
  paid: true,
  price: 45,
  amount: 45,
  paymentDate: '2026-09-10T10:00:00.000Z',
  paymentMethod: 'cash',
  creditApplied: 0,
};

const HISTORY_EXAM = {
  id: 'x1',
  type: ExamType.THEORY,
  status: 'completed',
  dateTime: '2026-09-05T09:00:00.000Z',
  location: 'Centre ATTT Tunis',
  result: 'passed',
  score: 34,
  notes: null,
  paid: true,
  price: 30,
  amount: 30,
  paymentDate: '2026-09-05T10:00:00.000Z',
  paymentMethod: 'card',
};

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  (lessonService.getMyLessons as jest.Mock).mockResolvedValue(LESSONS);
  (examService.getMyExams as jest.Mock).mockResolvedValue(EXAMS);
  (enrollmentService.checkEnrollmentStatus as jest.Mock).mockResolvedValue({
    isEnrolled: true,
    canBook: true,
  });
  (enrollmentService.getMyRequests as jest.Mock).mockResolvedValue([]);
  (studentSelfProfileService.getMyProfile as jest.Mock).mockResolvedValue(PROFILE);
  (studentSelfProfileService.getMyFinancialSummary as jest.Mock).mockResolvedValue(FINANCIAL);
  (studentSelfProfileService.getMyLessons as jest.Mock).mockResolvedValue([HISTORY_LESSON]);
  (studentSelfProfileService.getMyExams as jest.Mock).mockResolvedValue([HISTORY_EXAM]);
});

afterEach(() => applyLanguage('fr'));

const CASES: [string, () => React.ReactElement, () => string][] = [
  ['demande de leçon', () => <BookLessonScreen navigation={navigation} route={school} />, () => t('book.title')],
  ['mes leçons', () => <MyLessonsScreen navigation={navigation} />, () => t('myLessons.title')],
  ['demande d’examen', () => <RequestExamScreen navigation={navigation} />, () => t('requestExam.title')],
  ['mes examens', () => <MyExamsScreen navigation={navigation} />, () => t('myExams.title')],
  ['profil : progression', () => <MyProgressTab navigation={navigation} route={school} />, () => t('profile.personalInfo')],
  ['profil : leçons', () => <MyLessonsPaymentTab navigation={navigation} route={school} />, () => 'Karim Ben Salah'],
  ['profil : examens', () => <MyExamsPaymentTab navigation={navigation} route={school} />, () => 'Centre ATTT Tunis'],
];

describe.each(CASES)('%s', (_, element, keyText) => {
  it.each(SCREEN_VARIANTS)('se rend en %s, texte clé présent, cibles tactiles suffisantes', async (__, theme, language) => {
    const tree = renderScreen(element(), theme, language);
    await settle();
    expect(renderedText(tree).join(' ')).toContain(keyText());
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });
});

describe('Mon profil', () => {
  it('sans inscription approuvée : invite à trouver une auto-école', async () => {
    const tree = renderScreen(<MyProfileScreen navigation={navigation} route={{ params: undefined }} />, 'dark');
    await settle();
    expect(renderedText(tree)).toContain(t('profile.notEnrolled'));
    unmountInTheme(tree);
  });
});

describe('mes leçons', () => {
  it('un refus affiche son motif à l’élève', async () => {
    const tree = renderScreen(<MyLessonsScreen navigation={navigation} />, 'light');
    await settle();
    // Les demandes refusées vivent sous le filtre « clôturées »
    const closed = tree.root.findAll(
      (node) =>
        typeof node.props?.onPress === 'function' &&
        String(node.props?.accessibilityLabel ?? '') === t('filter.closed')
    )[0];
    expect(closed).toBeDefined();
    act(() => closed.props.onPress());
    expect(renderedText(tree).join(' ')).toContain('Créneau complet');
    unmountInTheme(tree);
  });
});
