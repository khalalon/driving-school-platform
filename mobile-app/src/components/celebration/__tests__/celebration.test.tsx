/**
 * Célébrations (13.12, D-52) : seuls des événements réels déclenchent une célébration, une seule
 * fois chacun, dans l'ordre du parcours ; l'animation est recolorée au thème ; « Continuer »
 * est toujours là ; sous « réduire les animations », une carte fixe remplace l'animation.
 */
import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CELEBRATED_STORAGE_KEY,
  pendingCelebrations,
  useCelebrations,
} from '../../../hooks/useCelebrations';
import { CelebrationModal, celebrationColors } from '../CelebrationModal';
import { EnrollmentRequest, EnrollmentStatus } from '../../../models/Enrollment';
import { Exam, ExamResult, ExamType } from '../../../models/Exam';
import { themes } from '../../../theme';
import { applyLanguage, t as translate } from '../../../i18n';
import {
  allowedColors,
  renderInTheme,
  renderedText,
  unmountInTheme,
} from '../../ui/__tests__/renderInTheme';

jest.mock('../../../context/LanguageContext', () => {
  const i18n = jest.requireActual('../../../i18n');
  return { useI18n: () => ({ t: i18n.t, language: i18n.getLanguage(), isRTL: i18n.isRTL() }) };
});

const enrollment = (status: EnrollmentStatus): EnrollmentRequest =>
  ({ id: 'req-1', status, schoolName: 'Auto-école El Amel' }) as unknown as EnrollmentRequest;

const exam = (id: string, type: ExamType, result: ExamResult): Exam =>
  ({ id, type, result }) as unknown as Exam;

const mount = async (node: React.ReactElement): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(node);
  });
  return tree;
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
  applyLanguage('fr');
});

describe('pendingCelebrations', () => {
  it('fête l’inscription acceptée, le code et le permis réussis, dans l’ordre du parcours', () => {
    const queue = pendingCelebrations(
      enrollment(EnrollmentStatus.APPROVED),
      [
        exam('x2', ExamType.PRACTICAL, ExamResult.PASSED),
        exam('x1', ExamType.THEORY, ExamResult.PASSED),
      ],
      new Set()
    );
    expect(queue.map((c) => c.kind)).toEqual(['enrolled', 'theory', 'licence']);
    expect(queue[0]).toEqual({ id: 'enrollment:req-1', kind: 'enrolled', schoolName: 'Auto-école El Amel' });
  });

  it('rien à fêter : demande en attente, examen échoué ou pas encore passé', () => {
    const queue = pendingCelebrations(
      enrollment(EnrollmentStatus.PENDING),
      [
        exam('x1', ExamType.THEORY, ExamResult.FAILED),
        exam('x2', ExamType.PRACTICAL, ExamResult.PENDING),
      ],
      new Set()
    );
    expect(queue).toEqual([]);
  });

  it('un événement déjà fêté ne revient pas', () => {
    const queue = pendingCelebrations(
      enrollment(EnrollmentStatus.APPROVED),
      [exam('x1', ExamType.THEORY, ExamResult.PASSED)],
      new Set(['enrollment:req-1'])
    );
    expect(queue.map((c) => c.id)).toEqual(['exam:x1']);
  });
});

describe('useCelebrations', () => {
  let state: ReturnType<typeof useCelebrations>;
  const Probe = (props: { enrollment?: EnrollmentRequest | null; exams?: Exam[] }) => {
    state = useCelebrations(props.enrollment, props.exams);
    return <Text>{state.current?.kind ?? 'aucune'}</Text>;
  };

  it('montre les célébrations l’une après l’autre et s’en souvient', async () => {
    const tree = await mount(
      <Probe
        enrollment={enrollment(EnrollmentStatus.APPROVED)}
        exams={[exam('x1', ExamType.THEORY, ExamResult.PASSED)]}
      />
    );
    expect(state.current?.kind).toBe('enrolled');
    await act(async () => state.dismiss());
    expect(state.current?.kind).toBe('theory');
    await act(async () => state.dismiss());
    expect(state.current).toBeNull();

    const stored = JSON.parse((await AsyncStorage.getItem(CELEBRATED_STORAGE_KEY)) ?? '[]');
    expect(stored).toEqual(['enrollment:req-1', 'exam:x1']);
    act(() => tree.unmount());

    // Réouverture de l'app : plus rien à fêter
    const again = await mount(
      <Probe
        enrollment={enrollment(EnrollmentStatus.APPROVED)}
        exams={[exam('x1', ExamType.THEORY, ExamResult.PASSED)]}
      />
    );
    expect(state.current).toBeNull();
    act(() => again.unmount());
  });

  it('attend que les données soient chargées', async () => {
    const tree = await mount(<Probe enrollment={undefined} />);
    expect(state.current).toBeNull();
    act(() => tree.unmount());
  });
});

describe('CelebrationModal', () => {
  const celebration = { id: 'exam:x2', kind: 'licence' as const };

  it('joue l’animation recolorée au thème, vibre, et « Continuer » ferme', async () => {
    const onContinue = jest.fn();
    const tree = renderInTheme(
      <CelebrationModal celebration={celebration} onContinue={onContinue} />,
      'dark'
    );
    await act(async () => undefined);
    const animation = tree.root.findByProps({ testID: 'celebration-animation' });
    expect(animation.props.autoPlay).toBe(true);
    expect(animation.props.loop).toBe(false);
    expect(animation.props.colorFilters).toEqual(celebrationColors(themes.dark));
    expect(renderedText(tree)).toContain(translate('celebration.licence.title'));
    expect(Haptics.notificationAsync).toHaveBeenCalled();

    act(() => tree.root.findByProps({ testID: 'celebration-continue' }).props.onPress());
    expect(onContinue).toHaveBeenCalledTimes(1);
    unmountInTheme(tree);
  });

  it('sous « réduire les animations » : carte fixe, pas d’animation', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
    const tree = renderInTheme(
      <CelebrationModal celebration={celebration} onContinue={jest.fn()} />,
      'light'
    );
    await act(async () => undefined);
    expect(tree.root.findAllByProps({ testID: 'celebration-static' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'celebration-animation' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'celebration-continue' }).length).toBeGreaterThan(0);
    unmountInTheme(tree);
  });

  it('en arabe, le message est traduit', async () => {
    applyLanguage('ar');
    const tree = renderInTheme(
      <CelebrationModal celebration={{ id: 'e', kind: 'enrolled', schoolName: 'الأمل' }} onContinue={jest.fn()} />,
      'dark'
    );
    await act(async () => undefined);
    expect(renderedText(tree).join(' ')).toContain('الأمل');
    unmountInTheme(tree);
  });

  it('rien n’est rendu sans célébration', () => {
    const tree = renderInTheme(<CelebrationModal celebration={null} onContinue={jest.fn()} />, 'dark');
    expect(tree.root.findAll((node) => /^celebration-/.test(String(node.props?.testID)))).toHaveLength(0);
    unmountInTheme(tree);
  });
});

describe('animations', () => {
  const layersOf = (name: string): string[] =>
    JSON.parse(readFileSync(join(__dirname, '..', '..', '..', '..', 'assets', 'lottie', `${name}.json`), 'utf8')).layers.map(
      (layer: { nm: string }) => layer.nm
    );

  it('chaque calque des animations a sa couleur de thème', () => {
    const colored = new Set(celebrationColors(themes.dark).map((filter) => filter.keypath));
    for (const name of ['enrolled', 'theory', 'licence']) {
      for (const layer of layersOf(name)) {
        expect({ name, layer, colored: colored.has(layer) }).toEqual({ name, layer, colored: true });
      }
    }
  });

  it.each(['dark', 'light'] as const)('thème %s : couleurs toutes tirées du thème', (name) => {
    const allowed = allowedColors(themes[name]);
    for (const filter of celebrationColors(themes[name])) {
      expect(allowed.has(filter.color.toLowerCase())).toBe(true);
    }
  });
});
