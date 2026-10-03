/**
 * Écran Agenda (15.3, D-59) : la semaine en cours depuis L9, toute l'école par défaut, filtre
 * par instructeur, semaine précédente / suivante, et la fiche élève au toucher — en clair, en
 * sombre et en arabe, cibles tactiles suffisantes, tout pressable annoncé.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { AgendaScreen } from '../AgendaScreen';
import { lessonService } from '../../../services/api/LessonService';
import { schoolService } from '../../../services/api/SchoolService';
import { LessonStatus, LessonType } from '../../../models/Lesson';
import { addDays, startOfWeek, weekRange } from '../../../utils/agenda';
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
  lessonService: { getAgenda: jest.fn() },
}));
jest.mock('../../../services/api/SchoolService', () => ({
  schoolService: { getSchoolInstructors: jest.fn() },
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Karim', role: 'instructor', schoolId: 'school-1' } }),
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
  return { ...actual, useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const monday = startOfWeek(new Date());
const tuesdayAt9 = new Date(addDays(monday, 1).getTime() + 9 * 3_600_000);

const LESSONS = [
  {
    id: 'l1',
    studentId: 'user-1',
    student: { id: 'user-1', firstName: 'Yasmine', lastName: 'Amri' },
    instructorId: 'i2',
    instructor: { id: 'i2', firstName: 'Sami', lastName: 'Trabelsi' },
    type: LessonType.MANOEUVRE,
    status: LessonStatus.SCHEDULED,
    scheduledDate: tuesdayAt9.toISOString(),
    durationMinutes: 60,
    attended: null,
  },
];

const INSTRUCTORS = [
  { id: 'i1', firstName: 'Karim', lastName: 'Ben Salah', schoolId: 'school-1' },
  { id: 'i2', firstName: 'Sami', lastName: 'Trabelsi', schoolId: 'school-1' },
];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (lessonService.getAgenda as jest.Mock).mockResolvedValue(LESSONS);
  (schoolService.getSchoolInstructors as jest.Mock).mockResolvedValue(INSTRUCTORS);
});
afterEach(() => applyLanguage('fr'));

describe('AgendaScreen', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s : semaine, filtre, leçon', async (_, theme, language) => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, theme, language);
    await settle();
    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('agenda.title'));
    expect(text).toContain(t('agenda.allInstructors'));
    expect(text).toContain('Yasmine Amri');
    // Toute l'école : l'instructeur de la leçon est nommé
    expect(text).toContain('Sami Trabelsi');
    expect(tree.root.findAllByProps({ testID: 'agenda-lesson-l1' }).length).toBeGreaterThan(0);
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('charge la semaine en cours pour toute l’école', async () => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'dark');
    await settle();
    const { from, to } = weekRange(monday);
    expect(lessonService.getAgenda).toHaveBeenCalledWith(from, to, undefined);
    expect(schoolService.getSchoolInstructors).toHaveBeenCalledWith('school-1');
    unmountInTheme(tree);
  });

  it('semaine suivante puis retour à cette semaine', async () => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'dark');
    await settle();
    await act(async () => {
      tree.root.findByProps({ testID: 'agenda-next-week' }).props.onPress();
    });
    await settle();
    const next = weekRange(addDays(monday, 7));
    expect(lessonService.getAgenda).toHaveBeenLastCalledWith(next.from, next.to, undefined);

    await act(async () => {
      tree.root.findByProps({ testID: 'agenda-today' }).props.onPress();
    });
    await settle();
    const current = weekRange(monday);
    expect(lessonService.getAgenda).toHaveBeenLastCalledWith(current.from, current.to, undefined);
    unmountInTheme(tree);
  });

  it('filtre par instructeur (D-59)', async () => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'dark');
    await settle();
    await act(async () => {
      tree.root.findByProps({ testID: 'agenda-filter-i2' }).props.onPress();
    });
    await settle();
    const { from, to } = weekRange(monday);
    expect(lessonService.getAgenda).toHaveBeenLastCalledWith(from, to, 'i2');
    unmountInTheme(tree);
  });

  it('toucher une leçon ouvre la fiche de l’élève', async () => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'dark');
    await settle();
    act(() => {
      tree.root.findByProps({ testID: 'agenda-lesson-l1' }).props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('StudentProfile', {
      studentId: 'user-1',
      schoolId: 'school-1',
      studentName: 'Yasmine Amri',
    });
    unmountInTheme(tree);
  });

  it('« Mes disponibilités » ouvre l’écran de la semaine type (15.8)', async () => {
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'dark');
    await settle();
    act(() => {
      tree.root.findByProps({ testID: 'agenda-my-availability' }).props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('MyAvailability');
    unmountInTheme(tree);
  });

  it('semaine vide : le dit, jours affichés quand même', async () => {
    (lessonService.getAgenda as jest.Mock).mockResolvedValue([]);
    const tree = renderScreen(<AgendaScreen navigation={navigation} />, 'light');
    await settle();
    const text = renderedText(tree);
    expect(text).toContain(t('agenda.emptyWeek'));
    expect(text.filter((item) => item === t('agenda.noLesson'))).toHaveLength(7);
    unmountInTheme(tree);
  });
});
