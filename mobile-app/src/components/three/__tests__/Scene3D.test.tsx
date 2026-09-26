/**
 * Enveloppe 3D (13.8, D-52) : la scène ne remplace l'image fixe qu'une fois l'écran affiché, et
 * lui rend la place sous « réduire les animations », après une erreur ou si elle est trop lente ;
 * la boucle de rendu s'arrête quand l'app passe en arrière-plan.
 */
import React from 'react';
import { AccessibilityInfo, AppState, InteractionManager, Text, View } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { FPS_SAMPLE, Scene3D, isTooSlow } from '../Scene3D';
import { ProbeScene } from '../ProbeScene';

type AppStateListener = (state: string) => void;
let appStateListener: AppStateListener | undefined;

const COLORS = { body: 'a', glass: 'b', lights: 'c', tyres: 'd', ground: 'e' };

const Fallback = () => (
  <View testID="fallback">
    <Text>image fixe</Text>
  </View>
);

const mount = async (node: React.ReactElement): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(node);
  });
  return tree;
};

const has = (tree: ReactTestRenderer, testID: string): boolean =>
  tree.root.findAll((node) => node.props?.testID === testID).length > 0;

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(((task: () => void) => {
    task();
    return { cancel: jest.fn(), then: jest.fn(), done: jest.fn() };
  }) as unknown as typeof InteractionManager.runAfterInteractions);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    listener: AppStateListener
  ) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
  appStateListener = undefined;
});

describe('isTooSlow', () => {
  it('juge sur les 60 premières images, sous 40 images par seconde', () => {
    expect(isTooSlow(Array(FPS_SAMPLE).fill(1 / 60))).toBe(false);
    expect(isTooSlow(Array(FPS_SAMPLE).fill(1 / 30))).toBe(true);
    expect(isTooSlow(Array(FPS_SAMPLE - 1).fill(1 / 10))).toBe(false);
  });
});

describe('Scene3D', () => {
  it('affiche la scène une fois l’écran prêt, annoncée comme une image', async () => {
    const tree = await mount(
      <Scene3D height={200} fallback={<Fallback />} accessibilityLabel="Voiture en 3D">
        <ProbeScene colors={COLORS} />
      </Scene3D>
    );
    expect(has(tree, 'r3f-canvas')).toBe(true);
    expect(has(tree, 'fallback')).toBe(false);
    const root = tree.root.findByProps({ accessibilityRole: 'image' });
    expect(root.props.accessibilityLabel).toBe('Voiture en 3D');
    act(() => tree.unmount());
  });

  it('« réduire les animations » : image fixe, pas de scène', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);
    const onFallback = jest.fn();
    const tree = await mount(
      <Scene3D
        height={200}
        fallback={<Fallback />}
        accessibilityLabel="Voiture"
        onFallback={onFallback}
      >
        <ProbeScene colors={COLORS} />
      </Scene3D>
    );
    expect(has(tree, 'fallback')).toBe(true);
    expect(has(tree, 'r3f-canvas')).toBe(false);
    expect(onFallback).toHaveBeenCalledWith('reduced-motion');
    act(() => tree.unmount());
  });

  it('une scène qui plante cède la place à l’image fixe', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const Broken = () => {
      throw new Error('contexte GL refusé');
    };
    const onFallback = jest.fn();
    const tree = await mount(
      <Scene3D
        height={200}
        fallback={<Fallback />}
        accessibilityLabel="Voiture"
        onFallback={onFallback}
      >
        <Broken />
      </Scene3D>
    );
    expect(has(tree, 'fallback')).toBe(true);
    expect(onFallback).toHaveBeenCalledWith('error');
    act(() => tree.unmount());
  });

  it('la boucle de rendu s’arrête en arrière-plan et reprend au retour', async () => {
    const tree = await mount(
      <Scene3D height={200} fallback={<Fallback />} accessibilityLabel="Voiture">
        <ProbeScene colors={COLORS} />
      </Scene3D>
    );
    const frameloop = () => tree.root.findByProps({ testID: 'r3f-canvas' }).props.frameloop;
    expect(frameloop()).toBe('always');

    await act(async () => appStateListener?.('background'));
    expect(frameloop()).toBe('never');

    await act(async () => appStateListener?.('active'));
    expect(frameloop()).toBe('always');
    act(() => tree.unmount());
  });
});
