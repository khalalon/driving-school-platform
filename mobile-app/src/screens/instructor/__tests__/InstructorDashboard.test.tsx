/**
 * Accueil instructeur refait (13.17, maquette C, D-52) : la leçon en cours en grande heure, les
 * trois files d'attente cliquables (chiffre en signal quand une file attend), planning et
 * semaine — en clair, en sombre et en arabe ; pas de scène 3D côté instructeur.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { InstructorDashboard } from '../InstructorDashboard';
import { lessonService } from '../../../services/api/LessonService';
import { examService } from '../../../services/api/ExamService';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { LessonStatus, LessonType } from '../../../models/Lesson';
import { ExamStatus, ExamType, ExamResult } from '../../../models/Exam';
import { applyLanguage, t } from '../../../i18n';
import { formatTime } from '../../../utils/format';
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
  examService: { getMyExams: jest.fn() },
}));
jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: { getSchoolRequests: jest.fn() },
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Karim', lastName: 'Ben Salah', schoolId: 'school-1' } }),
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
const startedTenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();

const CURRENT = {
  id: 'l1',
  type: LessonType.MANOEUVRE,
  status: LessonStatus.SCHEDULED,
  scheduledDate: startedTenMinutesAgo,
  durationMinutes: 60,
  student: { id: 'u1', firstName: 'Yasmine', lastName: 'Amri' },
  instructor: { id: 'i1', firstName: 'Karim', lastName: 'Ben Salah' },
};
const PENDING_CODE = (id: string) => ({
  id,
  type: LessonType.CODE,
  status: LessonStatus.PENDING,
  scheduledDate: null,
  requestedDate: startedTenMinutesAgo,
  student: { id: 'u2', firstName: 'Nour', lastName: 'Cherif' },
});

const withQueues = (lessons: number, exams: number, enrollments: number) => {
  (lessonService.getMyLessons as jest.Mock).mockImplementation(
    (filters: { scope?: string; status?: string[] }) => {
      if (filters.scope === 'school') {
        return Promise.resolve(Array.from({ length: lessons }, (_, i) => PENDING_CODE(`p${i}`)));
      }
      return Promise.resolve([CURRENT]);
    }
  );
  (examService.getMyExams as jest.Mock).mockResolvedValue(
    Array.from({ length: exams }, (_, i) => ({
      id: `x${i}`,
      type: ExamType.THEORY,
      status: ExamStatus.PENDING,
      result: ExamResult.PENDING,
      studentFirstName: 'Sami',
      studentLastName: 'Trabelsi',
    }))
  );
  (enrollmentService.getSchoolRequests as jest.Mock).mockResolvedValue(
    Array.from({ length: enrollments }, (_, i) => ({ id: `e${i}` }))
  );
};

/** L'élément pressable d'une file (le `Pressable` de `StatRow`, qui porte le libellé). */
const queue = (tree: ReturnType<typeof renderScreen>, id: string) =>
  tree.root.findAll(
    (node) => node.props?.testID === id && typeof node.props?.accessibilityLabel === 'string'
  )[0];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => applyLanguage('fr'));

describe('accueil instructeur', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s : leçon en cours, files d’attente, cibles tactiles', async (_, theme, language) => {
    withQueues(3, 1, 2);
    const tree = renderScreen(<InstructorDashboard navigation={navigation} />, theme, language);
    await settle();

    const texts = renderedText(tree);
    expect(texts).toContain(t('today.focus.now'));
    expect(texts).toContain(formatTime(startedTenMinutesAgo));
    expect(texts).toContain(t('today.queues'));
    expect(queue(tree, 'queue-lessons').props.accessibilityLabel).toBe(
      `${t('today.queue.lessons')} : 3`
    );
    // Pas de 3D côté instructeur (D-52)
    expect(tree.root.findAll((n) => /car-scene|track-scene/.test(String(n.props?.testID)))).toHaveLength(0);
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('chaque file ouvre son écran', async () => {
    withQueues(1, 1, 1);
    const tree = renderScreen(<InstructorDashboard navigation={navigation} />, 'dark');
    await settle();
    act(() => queue(tree, 'queue-lessons').props.onPress());
    act(() => queue(tree, 'queue-exams').props.onPress());
    act(() => queue(tree, 'queue-enrollments').props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('LessonRequests');
    expect(navigation.navigate).toHaveBeenCalledWith('ExamRequests');
    expect(navigation.navigate).toHaveBeenCalledWith('EnrollmentRequests', { schoolId: 'school-1' });
    unmountInTheme(tree);
  });

  it('aucune demande : les files restent visibles à zéro, avec un message rassurant', async () => {
    withQueues(0, 0, 0);
    const tree = renderScreen(<InstructorDashboard navigation={navigation} />, 'light');
    await settle();
    expect(renderedText(tree)).toContain(t('today.noRequests'));
    expect(queue(tree, 'queue-exams').props.accessibilityLabel).toBe(
      `${t('today.queue.exams')} : 0`
    );
    unmountInTheme(tree);
  });

  it('erreur réseau : réessayer', async () => {
    (lessonService.getMyLessons as jest.Mock).mockRejectedValue(new Error('réseau'));
    (examService.getMyExams as jest.Mock).mockResolvedValue([]);
    (enrollmentService.getSchoolRequests as jest.Mock).mockResolvedValue([]);
    const tree = renderScreen(<InstructorDashboard navigation={navigation} />, 'dark');
    await settle();
    expect(renderedText(tree)).toContain(t('common.retry'));
    unmountInTheme(tree);
  });
});
