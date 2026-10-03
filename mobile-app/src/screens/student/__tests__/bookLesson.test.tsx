/**
 * Demander une leçon parmi les créneaux libres (15.9, D-60) : créneaux du type choisi groupés
 * par jour, un créneau choisi devient la date souhaitée et l'instructeur préféré de L2 (la
 * demande reste à approuver) ; « Proposer une autre date » et l'absence de créneaux reviennent
 * à la saisie libre — en clair, en sombre et en arabe.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';
import { BookLessonScreen } from '../BookLessonScreen';
import { lessonService } from '../../../services/api/LessonService';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { LessonType } from '../../../models/Lesson';
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
  lessonService: { getFreeSlots: jest.fn(), requestLesson: jest.fn() },
}));
jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: { checkEnrollmentStatus: jest.fn() },
}));
jest.mock('../../../context/LanguageContext', () => {
  const i18n = jest.requireActual('../../../i18n');
  return {
    useI18n: () => ({ t: i18n.t, language: i18n.getLanguage(), isRTL: i18n.isRTL() }),
  };
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const route = { params: { schoolId: 'school-1' } };
const day = (offset: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};
const SLOTS = [
  {
    start: day(2, 9),
    end: day(2, 10),
    instructorId: 'i1',
    instructorFirstName: 'Karim',
    instructorLastName: 'Ben Salah',
  },
  {
    start: day(3, 14),
    end: day(3, 15),
    instructorId: 'i2',
    instructorFirstName: 'Sami',
    instructorLastName: 'Trabelsi',
  },
];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

type Tree = ReturnType<typeof renderScreen>;

const pressable = (tree: Tree, testID: string) =>
  tree.root.findAll((node) => node.props?.testID === testID && node.props?.onPress)[0];

const byLabel = (tree: Tree, label: string) =>
  tree.root.findAll((node) => node.props?.accessibilityLabel === label && node.props?.onPress)[0];

const sendRequest = async (tree: Tree) => {
  await act(async () => {
    await byLabel(tree, t('book.sendRequest')).props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (enrollmentService.checkEnrollmentStatus as jest.Mock).mockResolvedValue({ canBook: true });
  (lessonService.getFreeSlots as jest.Mock).mockResolvedValue(SLOTS);
  (lessonService.requestLesson as jest.Mock).mockResolvedValue({ id: 'l1' });
});
afterEach(() => applyLanguage('fr'));

describe('BookLessonScreen : créneaux libres (15.9)', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s avec les créneaux groupés par jour', async (_, theme, language) => {
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, theme, language);
    await settle();
    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('book.freeSlots'));
    expect(text).toContain(`${formatTime(SLOTS[0].start)} · Karim Ben Salah`);
    expect(text).toContain(`${formatTime(SLOTS[1].start)} · Sami Trabelsi`);
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('charge 14 jours de créneaux pour le type choisi, et recharge au changement de type', async () => {
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'dark');
    await settle();
    const [type, from, to] = (lessonService.getFreeSlots as jest.Mock).mock.calls[0] as string[];
    expect(type).toBe(LessonType.CODE);
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(14 * 86_400_000);

    await act(async () => {
      byLabel(tree, 'Parc').props.onPress();
    });
    await settle();
    const calls = (lessonService.getFreeSlots as jest.Mock).mock.calls;
    expect(calls[calls.length - 1][0]).toBe(LessonType.PARC);
    unmountInTheme(tree);
  });

  it('un créneau choisi devient la date souhaitée et l’instructeur préféré de la demande', async () => {
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'dark');
    await settle();
    act(() => pressable(tree, `book-slot-${SLOTS[1].start}|i2`).props.onPress());
    expect(renderedText(tree)).toContain('Sami Trabelsi');

    await sendRequest(tree);
    expect(lessonService.requestLesson).toHaveBeenCalledWith({
      type: LessonType.CODE,
      requestedDate: SLOTS[1].start,
      preferredInstructorId: 'i2',
      notes: undefined,
    });
    unmountInTheme(tree);
  });

  it('sans créneau choisi : on le demande, rien n’est envoyé', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'dark');
    await settle();
    await sendRequest(tree);
    expect(alert).toHaveBeenCalledWith(t('book.pickSlotTitle'), t('book.pickSlotText'));
    expect(lessonService.requestLesson).not.toHaveBeenCalled();
    alert.mockRestore();
    unmountInTheme(tree);
  });

  it('« Proposer une autre date » : saisie libre, puis retour aux créneaux', async () => {
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'dark');
    await settle();
    act(() => pressable(tree, 'book-other-date').props.onPress());
    expect(tree.root.findAll((node) => node.props?.testID === 'book-free-slots')).toHaveLength(0);
    expect(renderedText(tree)).toContain(t('book.requestedDate'));

    act(() => pressable(tree, 'book-back-to-slots').props.onPress());
    expect(
      tree.root.findAll((node) => node.props?.testID === 'book-free-slots').length
    ).toBeGreaterThan(0);
    unmountInTheme(tree);
  });

  it('aucun créneau publié (ou erreur) : saisie libre d’office, demande avec la date saisie', async () => {
    (lessonService.getFreeSlots as jest.Mock).mockResolvedValue([]);
    const tree = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'light');
    await settle();
    expect(renderedText(tree)).toContain(t('book.noFreeSlots'));
    await sendRequest(tree);
    expect(lessonService.requestLesson).toHaveBeenCalledWith(
      expect.objectContaining({ type: LessonType.CODE, preferredInstructorId: undefined })
    );
    unmountInTheme(tree);

    (lessonService.getFreeSlots as jest.Mock).mockRejectedValue(new Error('réseau'));
    const failed = renderScreen(<BookLessonScreen navigation={navigation} route={route} />, 'light');
    await settle();
    expect(renderedText(failed)).toContain(t('book.noFreeSlots'));
    unmountInTheme(failed);
  });
});
