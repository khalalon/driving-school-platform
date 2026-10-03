/**
 * Mes disponibilités (15.8, D-60) : mêmes règles que le serveur avant l'envoi, semaine type
 * modifiée localement puis enregistrée d'un bloc (I2) — en clair, en sombre et en arabe.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act } from 'react-test-renderer';
import { MyAvailabilityScreen } from '../MyAvailabilityScreen';
import { availabilityService } from '../../../services/api/AvailabilityService';
import { findAvailabilityProblem, sortSlots } from '../../../models/Availability';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unlabelledPressables,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/AvailabilityService', () => ({
  availabilityService: { getMine: jest.fn(), replaceMine: jest.fn() },
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
const tuesdayMorning = { weekday: 2, startTime: '09:00', endTime: '12:00' };

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const byTestId = (tree: ReturnType<typeof renderScreen>, testID: string) =>
  tree.root.findAll((node) => node.props?.testID === testID && node.props?.onPress)[0];

beforeEach(() => {
  jest.clearAllMocks();
  (availabilityService.getMine as jest.Mock).mockResolvedValue([tuesdayMorning]);
  (availabilityService.replaceMine as jest.Mock).mockImplementation(async (slots) => slots);
});
afterEach(() => applyLanguage('fr'));

describe('findAvailabilityProblem (règles de I2)', () => {
  it('valide, puis format, plage à l’envers, chevauchement le même jour', () => {
    expect(findAvailabilityProblem([tuesdayMorning, { weekday: 2, startTime: '12:00', endTime: '14:00' }])).toBeNull();
    expect(findAvailabilityProblem([{ weekday: 1, startTime: '9h', endTime: '12:00' }])?.kind).toBe('format');
    expect(findAvailabilityProblem([{ weekday: 1, startTime: '12:00', endTime: '09:00' }])?.kind).toBe(
      'backwards'
    );
    expect(
      findAvailabilityProblem([tuesdayMorning, { weekday: 2, startTime: '11:00', endTime: '13:00' }])?.kind
    ).toBe('overlap');
    // Même heure, autre jour : permis
    expect(findAvailabilityProblem([tuesdayMorning, { ...tuesdayMorning, weekday: 3 }])).toBeNull();
  });

  it('sortSlots : par jour puis heure', () => {
    expect(
      sortSlots([
        { weekday: 3, startTime: '08:00', endTime: '09:00' },
        { weekday: 2, startTime: '14:00', endTime: '15:00' },
        tuesdayMorning,
      ]).map((slot) => `${slot.weekday}-${slot.startTime}`)
    ).toEqual(['2-09:00', '2-14:00', '3-08:00']);
  });
});

describe('MyAvailabilityScreen', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s : sept jours, la plage du mardi', async (_, theme, language) => {
    const tree = renderScreen(<MyAvailabilityScreen navigation={navigation} />, theme, language);
    await settle();
    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('availability.title'));
    expect(text).toContain('09:00 – 12:00');
    for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
      expect(tree.root.findAllByProps({ testID: `availability-day-${weekday}` }).length).toBeGreaterThan(0);
    }
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('enregistrer est désactivé tant que rien n’a changé', async () => {
    const tree = renderScreen(<MyAvailabilityScreen navigation={navigation} />, 'dark');
    await settle();
    expect(byTestId(tree, 'availability-save').props.disabled).toBe(true);
    unmountInTheme(tree);
  });

  it('ajouter une plage le lundi puis enregistrer : la semaine entière, triée (I2)', async () => {
    const tree = renderScreen(<MyAvailabilityScreen navigation={navigation} />, 'dark');
    await settle();
    act(() => byTestId(tree, 'availability-add-1').props.onPress());
    act(() => {
      tree.root.findByProps({ testID: 'availability-start' }).props.onChangeText('14:00');
      tree.root.findByProps({ testID: 'availability-end' }).props.onChangeText('17:30');
    });
    act(() => byTestId(tree, 'availability-confirm-add').props.onPress());
    expect(renderedText(tree).join(' ')).toContain('14:00 – 17:30');

    await act(async () => {
      await byTestId(tree, 'availability-save').props.onPress();
    });
    expect(availabilityService.replaceMine).toHaveBeenCalledWith([
      { weekday: 1, startTime: '14:00', endTime: '17:30' },
      tuesdayMorning,
    ]);
    unmountInTheme(tree);
  });

  it('une plage qui chevauche est refusée avant l’envoi', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const tree = renderScreen(<MyAvailabilityScreen navigation={navigation} />, 'dark');
    await settle();
    act(() => byTestId(tree, 'availability-add-2').props.onPress());
    act(() => {
      tree.root.findByProps({ testID: 'availability-start' }).props.onChangeText('11:00');
      tree.root.findByProps({ testID: 'availability-end' }).props.onChangeText('13:00');
    });
    act(() => byTestId(tree, 'availability-confirm-add').props.onPress());
    expect(alert).toHaveBeenCalledWith(t('availability.invalidTitle'), expect.stringContaining('11:00 – 13:00'));
    expect(renderedText(tree).join(' ')).not.toContain('11:00 – 13:00');
    alert.mockRestore();
    unmountInTheme(tree);
  });

  it('retirer la plage puis enregistrer : semaine vide envoyée', async () => {
    const tree = renderScreen(<MyAvailabilityScreen navigation={navigation} />, 'dark');
    await settle();
    const remove = byTestId(tree, 'availability-remove-2-09:00');
    expect(remove.props.accessibilityLabel).toContain('09:00 – 12:00');
    act(() => remove.props.onPress());
    await act(async () => {
      await byTestId(tree, 'availability-save').props.onPress();
    });
    expect(availabilityService.replaceMine).toHaveBeenCalledWith([]);
    unmountInTheme(tree);
  });
});
