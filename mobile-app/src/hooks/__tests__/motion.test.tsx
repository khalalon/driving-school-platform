/**
 * Mouvement et retour haptique (13.4, D-52) : « réduire les animations » suivi en direct et
 * respecté par le retour d'appui ; les vibrations demandées sont les bonnes et ne cassent rien
 * quand l'appareil n'en produit pas.
 */
import React from 'react';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { useReducedMotion } from '../useReducedMotion';
import { PressFeedback, usePressFeedback } from '../usePressFeedback';
import { haptics } from '../../utils/haptics';
import { exitDuration, motion } from '../../theme/motion';

type Listener = (value: boolean) => void;
let listener: Listener | undefined;

const mockReduceMotion = (enabled: boolean) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    _event: string,
    handler: Listener
  ) => {
    listener = handler;
    return { remove: jest.fn() };
  }) as unknown as typeof AccessibilityInfo.addEventListener);
};

const mount = async (node: React.ReactElement): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(node);
  });
  return tree;
};

afterEach(() => {
  jest.restoreAllMocks();
  listener = undefined;
});

describe('jetons de mouvement', () => {
  it('la sortie est plus courte que l’entrée', () => {
    expect(exitDuration(motion.duration.base)).toBeLessThan(motion.duration.base);
    expect(motion.duration.fast).toBeLessThan(motion.duration.base);
    expect(motion.duration.base).toBeLessThan(motion.duration.slow);
  });
});

describe('useReducedMotion', () => {
  const Probe = () => <Text>{useReducedMotion() ? 'reduit' : 'normal'}</Text>;

  it('lit le réglage du téléphone puis le suit en direct', async () => {
    mockReduceMotion(false);
    const tree = await mount(<Probe />);
    expect(tree.root.findByType(Text).props.children).toBe('normal');

    await act(async () => listener?.(true));
    expect(tree.root.findByType(Text).props.children).toBe('reduit');
    act(() => tree.unmount());
  });
});

describe('usePressFeedback', () => {
  let feedback: PressFeedback;
  const Probe = () => {
    feedback = usePressFeedback();
    return null;
  };

  it('anime l’échelle à l’appui quand les animations sont permises', async () => {
    mockReduceMotion(false);
    const spring = jest.spyOn(Animated, 'spring');
    const tree = await mount(<Probe />);
    act(() => feedback.onPressIn());
    expect(spring).toHaveBeenCalledWith(
      feedback.scale,
      expect.objectContaining({ toValue: motion.pressScale, useNativeDriver: true })
    );
    act(() => tree.unmount());
  });

  it('ne bouge pas quand « réduire les animations » est actif', async () => {
    mockReduceMotion(true);
    const spring = jest.spyOn(Animated, 'spring');
    const tree = await mount(<Probe />);
    act(() => feedback.onPressIn());
    expect(spring).not.toHaveBeenCalled();
    expect((feedback.scale as unknown as { __getValue: () => number }).__getValue()).toBe(1);
    act(() => tree.unmount());
  });
});

describe('haptics', () => {
  it('demande la vibration prévue pour chaque moment', () => {
    haptics.success();
    haptics.warning();
    haptics.selection();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('un appareil sans vibration ne casse pas l’action', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(new Error('non disponible'));
    expect(() => haptics.success()).not.toThrow();
    await Promise.resolve();
  });
});
