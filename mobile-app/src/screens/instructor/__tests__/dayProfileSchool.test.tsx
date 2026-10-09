/**
 * Écrans instructeur « journée, fiche élève, école » refaits (13.19, D-52) : leçons du jour,
 * examens du jour, fiche élève (infos, leçons, examens) et « Mon école » — en clair, en sombre et
 * en arabe, textes clés présents, cibles tactiles suffisantes.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { TodayLessonsScreen } from '../TodayLessonsScreen';
import { TodayExamsScreen } from '../TodayExamsScreen';
import { MySchoolScreen } from '../MySchoolScreen';
import { StudentInfoTab } from '../student-profile/tabs/StudentInfoTab';
import { StudentLessonsTab } from '../student-profile/tabs/StudentLessonsTab';
import { StudentExamsTab } from '../student-profile/tabs/StudentExamsTab';
import { StudentFileTab } from '../student-profile/tabs/StudentFileTab';
import { lessonService } from '../../../services/api/LessonService';
import { examService } from '../../../services/api/ExamService';
import { schoolService } from '../../../services/api/SchoolService';
import { studentProfileService } from '../../../services/api/StudentProfileService';
import { studentFileService } from '../../../services/api/StudentFileService';
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
  lessonService: { getMyLessons: jest.fn(), markAttendance: jest.fn() },
}));
jest.mock('../../../services/api/ExamService', () => ({
  examService: { getMyExams: jest.fn(), recordExamResult: jest.fn() },
}));
jest.mock('../../../services/api/SchoolService', () => ({
  schoolService: {
    getSchoolById: jest.fn(),
    getSchoolPricing: jest.fn(),
    updateSchool: jest.fn(),
    setPricing: jest.fn(),
    deletePricing: jest.fn(),
  },
}));
jest.mock('../../../services/api/StudentProfileService', () => ({
  studentProfileService: {
    getCompleteProfile: jest.fn(),
    getFinancialSummary: jest.fn(),
    updateNotes: jest.fn(),
    getStudentLessons: jest.fn(),
    getStudentExams: jest.fn(),
    markLessonPaid: jest.fn(),
    markExamPaid: jest.fn(),
  },
}));
jest.mock('../../../services/api/StudentFileService', () => ({
  studentFileService: {
    getDocumentTypes: jest.fn(),
    addDocumentType: jest.fn(),
    renameDocumentType: jest.fn(),
    removeDocumentType: jest.fn(),
    getStudentFile: jest.fn(),
    setDocumentReceived: jest.fn(),
  },
}));
jest.mock('../../../hooks/useSchoolCurrency', () => ({ useSchoolCurrency: () => 'TND' }));
// Gérant par défaut (tous les boutons de « Mon école » rendus) ; un test bascule en moniteur
let mockIsManager = true;
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      firstName: 'Karim',
      lastName: 'Ben Salah',
      role: 'instructor',
      schoolId: 'school-1',
      isManager: mockIsManager,
    },
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
const profileRoute = { params: { studentId: 'u1', schoolId: 'school-1', studentName: 'Yasmine Amri' } };
const today = (hours: number) => {
  const date = new Date();
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};
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
      type: LessonType.PARC,
      status: LessonStatus.SCHEDULED,
      scheduledDate: today(10),
      durationMinutes: 60,
      student,
      instructor: null,
    },
  ]);
  (examService.getMyExams as jest.Mock).mockResolvedValue([
    {
      id: 'x1',
      schoolId: 'school-1',
      type: ExamType.THEORY,
      status: ExamStatus.SCHEDULED,
      result: ExamResult.PENDING,
      dateTime: today(9),
      location: 'Centre ATTT Tunis',
      studentFirstName: 'Yasmine',
      studentLastName: 'Amri',
      studentCompletedLessons: 12,
      createdAt: '2026-09-20T10:00:00.000Z',
    },
  ]);
  (schoolService.getSchoolById as jest.Mock).mockResolvedValue({
    id: 'school-1',
    name: 'Auto-école El Amel',
    address: '12 avenue Habib Bourguiba, Tunis',
    phone: '+216 71 000 000',
    email: 'contact@elamel.tn',
    currency: 'TND',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  (schoolService.getSchoolPricing as jest.Mock).mockResolvedValue([
    { id: 'p1', schoolId: 'school-1', lessonType: LessonType.MANOEUVRE, price: 45, duration: 60 },
  ]);
  (studentProfileService.getCompleteProfile as jest.Mock).mockResolvedValue({
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
    notes: 'Progresse vite en créneau.',
    totalLessons: 17,
    completedLessons: 16,
    completedLessonsByType: { CODE: 12, [LessonType.MANOEUVRE]: 4, [LessonType.PARC]: 0 },
    totalExams: 1,
    passedExams: 1,
  });
  (studentFileService.getDocumentTypes as jest.Mock).mockResolvedValue([
    { id: 'doc-1', schoolId: 'school-1', label: 'Copie de la CIN', position: 1, active: true },
    { id: 'doc-2', schoolId: 'school-1', label: 'Certificat médical', position: 2, active: true },
  ]);
  (studentFileService.getStudentFile as jest.Mock).mockResolvedValue({
    complete: false,
    documents: [
      {
        documentTypeId: 'doc-1',
        label: 'Copie de la CIN',
        received: true,
        receivedAt: '2026-10-01T09:00:00.000Z',
        note: null,
      },
      {
        documentTypeId: 'doc-2',
        label: 'Certificat médical',
        received: false,
        receivedAt: null,
        note: null,
      },
    ],
  });
  (studentProfileService.getFinancialSummary as jest.Mock).mockResolvedValue({
    totalRevenue: 520,
    totalPending: 45,
    totalDue: 45,
    lessonsRevenue: 490,
    examsRevenue: 30,
    lessonsPending: 45,
    examsPending: 0,
    lastPaymentDate: null,
    credit: 0,
  });
  (studentProfileService.getStudentLessons as jest.Mock).mockResolvedValue([
    {
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
      paid: false,
      price: 45,
      amount: null,
      paymentDate: null,
      paymentMethod: null,
      creditApplied: 0,
    },
  ]);
  (studentProfileService.getStudentExams as jest.Mock).mockResolvedValue([
    {
      id: 'x1',
      type: ExamType.THEORY,
      status: 'completed',
      dateTime: '2026-09-05T09:00:00.000Z',
      location: 'Centre ATTT Tunis',
      result: 'passed',
      score: 34,
      notes: null,
      paid: false,
      price: 30,
      amount: null,
      paymentDate: null,
      paymentMethod: null,
    },
  ]);
});

afterEach(() => applyLanguage('fr'));

const CASES: [string, () => React.ReactElement, () => string][] = [
  ['leçons du jour', () => <TodayLessonsScreen navigation={navigation} />, () => t('todayLessons.title')],
  ['examens du jour', () => <TodayExamsScreen navigation={navigation} />, () => t('todayExams.title')],
  ['Mon école', () => <MySchoolScreen navigation={navigation} />, () => 'Auto-école El Amel'],
  ['fiche élève : infos', () => <StudentInfoTab navigation={navigation} route={profileRoute} />, () => 'Progresse vite en créneau.'],
  ['fiche élève : leçons', () => <StudentLessonsTab navigation={navigation} route={profileRoute} />, () => t('studentLessons.markPaid')],
  ['fiche élève : examens', () => <StudentExamsTab navigation={navigation} route={profileRoute} />, () => 'Centre ATTT Tunis'],
  ['fiche élève : dossier', () => <StudentFileTab navigation={navigation} route={profileRoute} />, () => 'Certificat médical'],
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

describe('Mon école : réservée au gérant (14.4, D-56)', () => {
  afterEach(() => {
    mockIsManager = true;
  });

  const labels = (tree: ReturnType<typeof renderScreen>) => renderedText(tree).join(' | ');

  it('le gérant voit « Modifier », « Ajouter un tarif » et « Retirer »', async () => {
    const tree = renderScreen(<MySchoolScreen navigation={navigation} />, 'dark');
    await settle();
    const text = labels(tree);
    expect(text).toContain(t('mySchool.edit'));
    expect(text).toContain(t('mySchool.addPricing'));
    expect(text).not.toContain(t('mySchool.managerOnly'));
    unmountInTheme(tree);
  });

  it('un simple moniteur voit l’école en lecture seule', async () => {
    mockIsManager = false;
    const tree = renderScreen(<MySchoolScreen navigation={navigation} />, 'dark');
    await settle();
    const text = labels(tree);
    expect(text).toContain('Auto-école El Amel');
    expect(text).toContain(t('mySchool.managerOnly'));
    expect(text).not.toContain(t('mySchool.edit'));
    expect(text).not.toContain(t('mySchool.addPricing'));
    expect(text).not.toContain(t('mySchool.removePricing'));
    expect(tree.root.findAllByProps({ testID: 'my-school-read-only' }).length).toBeGreaterThan(0);
    unmountInTheme(tree);
  });
});

describe('dossier administratif (16.4, D-61, D-62)', () => {
  const press = async (tree: ReturnType<typeof renderScreen>, label: string) => {
    const [button] = tree.root.findAll(
      (node) =>
        node.props?.accessibilityLabel === label && typeof node.props?.onPress === 'function'
    );
    await act(async () => {
      await button.props.onPress();
    });
  };

  it('fiche élève : l’en-tête dit ce qui manque, sans rien bloquer', async () => {
    const tree = renderScreen(<StudentFileTab navigation={navigation} route={profileRoute} />, 'dark');
    await settle();

    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('studentFile.incomplete'));
    expect(text).toContain(t('studentFile.missingCount', { count: 1 }));
    expect(text).toContain(t('studentFile.markReceived'));
    expect(text).toContain(t('studentFile.markNotReceived'));
    unmountInTheme(tree);
  });

  it('décocher une pièce part sans note ; cocher passe par la fenêtre et en envoie une (F7)', async () => {
    (studentFileService.setDocumentReceived as jest.Mock).mockResolvedValue({
      complete: true,
      documents: [],
    });
    const tree = renderScreen(<StudentFileTab navigation={navigation} route={profileRoute} />, 'light');
    await settle();

    // La pièce reçue : « Annuler la réception » écrit tout de suite, sans note
    await press(tree, t('studentFile.markNotReceived'));
    expect(studentFileService.setDocumentReceived).toHaveBeenCalledWith(
      'u1',
      'school-1',
      'doc-1',
      false,
      undefined
    );
    unmountInTheme(tree);
  });

  it('Mon école : le gérant tient la liste des pièces, le moniteur la lit (F2–F4, D-56)', async () => {
    (studentFileService.addDocumentType as jest.Mock).mockResolvedValue({
      id: 'doc-3',
      schoolId: 'school-1',
      label: 'Timbre fiscal',
      position: 3,
      active: true,
    });

    const tree = renderScreen(<MySchoolScreen navigation={navigation} />, 'dark');
    await settle();
    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('mySchool.documents'));
    expect(text).toContain('Certificat médical');
    expect(text).toContain(t('mySchool.addDocument'));
    expect(text).toContain(t('mySchool.renameDocument'));
    unmountInTheme(tree);

    mockIsManager = false;
    const readOnly = renderScreen(<MySchoolScreen navigation={navigation} />, 'dark');
    await settle();
    const readOnlyText = renderedText(readOnly).join(' | ');
    expect(readOnlyText).toContain('Certificat médical');
    expect(readOnlyText).not.toContain(t('mySchool.addDocument'));
    expect(readOnlyText).not.toContain(t('mySchool.removeDocument'));
    unmountInTheme(readOnly);
    mockIsManager = true;
  });
});
