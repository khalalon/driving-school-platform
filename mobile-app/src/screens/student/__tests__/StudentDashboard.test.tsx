/**
 * Accueil élève refait (13.14, maquette C, D-52) : tableau de bord en clair, en sombre et en
 * arabe — jauge des étapes franchies, compteurs par type, prochaine session en grande heure,
 * parcours, action principale — plus les états vide (pas encore inscrit), chargement et erreur.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { StudentDashboard } from '../StudentDashboard';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { lessonService } from '../../../services/api/LessonService';
import { examService } from '../../../services/api/ExamService';
import { studentSelfProfileService } from '../../../services/api/StudentSelfProfileService';
import { LessonStatus, LessonType } from '../../../models/Lesson';
import { ExamResult, ExamStatus, ExamType } from '../../../models/Exam';
import { EnrollmentStatus } from '../../../models/Enrollment';
import { applyLanguage, t } from '../../../i18n';
import { formatTime } from '../../../utils/format';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: { getMyRequests: jest.fn() },
}));
jest.mock('../../../services/api/LessonService', () => ({
  lessonService: { getMyLessons: jest.fn(), cancelLesson: jest.fn() },
}));
jest.mock('../../../services/api/ExamService', () => ({
  examService: { getMyExams: jest.fn() },
}));
jest.mock('../../../services/api/StudentSelfProfileService', () => ({
  studentSelfProfileService: { getMyProfile: jest.fn(), getMyFinancialSummary: jest.fn() },
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

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

const APPROVED = {
  id: 'req-1',
  status: EnrollmentStatus.APPROVED,
  schoolId: 'school-1',
  schoolName: 'Auto-école El Amel',
};
const LESSON = {
  id: 'l1',
  type: LessonType.MANOEUVRE,
  status: LessonStatus.SCHEDULED,
  scheduledDate: inTwoDays,
  durationMinutes: 60,
  instructor: { id: 'i1', firstName: 'Karim', lastName: 'B.' },
};
const THEORY_PASSED = {
  id: 'x1',
  type: ExamType.THEORY,
  status: ExamStatus.COMPLETED,
  result: ExamResult.PASSED,
  score: null,
  createdAt: '2026-09-01T10:00:00.000Z',
};

const enrolled = () => {
  (enrollmentService.getMyRequests as jest.Mock).mockResolvedValue([APPROVED]);
  (lessonService.getMyLessons as jest.Mock).mockResolvedValue([LESSON]);
  (examService.getMyExams as jest.Mock).mockResolvedValue([THEORY_PASSED]);
  (studentSelfProfileService.getMyProfile as jest.Mock).mockResolvedValue({
    completedLessonsByType: { CODE: 12, [LessonType.MANOEUVRE]: 4, [LessonType.PARC]: 0 },
  });
  (studentSelfProfileService.getMyFinancialSummary as jest.Mock).mockResolvedValue({
    totalDue: 0,
    credit: 0,
  });
};

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => applyLanguage('fr'));

describe('tableau de bord d’un élève inscrit', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s avec jauge, compteurs et prochaine session', async (_, theme, language) => {
    enrolled();
    const tree = renderScreen(<StudentDashboard navigation={navigation} />, theme, language);
    await settle();

    const texts = renderedText(tree);
    expect(texts).toContain(t('home.dashboard'));
    expect(texts).toContain(formatTime(inTwoDays));
    expect(texts).toContain('12');

    // Code et examen du code réussis : 2 étapes franchies sur 5
    const gauge = tree.root.findByProps({ accessibilityRole: 'progressbar' });
    expect(gauge.props.accessibilityValue).toEqual({ min: 0, max: 5, now: 2 });
    expect(gauge.props.accessibilityLabel).toBe(t('home.stepsA11y', { done: 2, total: 5 }));

    expect(tree.root.findAllByProps({ testID: 'journey-sectors' }).length).toBeGreaterThan(0);
    expect(smallTouchTargets(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('« Demander une leçon » ouvre la demande pour l’école de l’inscription', async () => {
    enrolled();
    const tree = renderScreen(<StudentDashboard navigation={navigation} />, 'dark');
    await settle();
    const buttons = tree.root.findAllByProps({ accessibilityLabel: t('home.requestLesson') });
    act(() => buttons[0].props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('BookLesson', { schoolId: 'school-1' });
    unmountInTheme(tree);
  });
});

describe('autres états', () => {
  it('pas encore inscrit : propose de trouver une auto-école', async () => {
    (enrollmentService.getMyRequests as jest.Mock).mockResolvedValue([]);
    const tree = renderScreen(<StudentDashboard navigation={navigation} />, 'light');
    await settle();
    expect(renderedText(tree)).toContain(t('home.findSchool'));
    unmountInTheme(tree);
  });

  it('pendant le chargement : squelettes, jamais « trouvez votre école »', () => {
    (enrollmentService.getMyRequests as jest.Mock).mockReturnValue(new Promise(() => undefined));
    const tree = renderScreen(<StudentDashboard navigation={navigation} />, 'dark');
    expect(tree.root.findAllByProps({ accessibilityRole: 'progressbar' }).length).toBeGreaterThan(0);
    expect(renderedText(tree)).not.toContain(t('home.findSchool'));
    unmountInTheme(tree);
  });

  it('erreur réseau : message et bouton réessayer', async () => {
    (enrollmentService.getMyRequests as jest.Mock).mockRejectedValue(new Error('réseau'));
    const tree = renderScreen(<StudentDashboard navigation={navigation} />, 'dark');
    await settle();
    const texts = renderedText(tree);
    expect(texts).toContain(t('home.loadFailed'));
    expect(texts).toContain(t('common.retry'));
    unmountInTheme(tree);
  });
});
