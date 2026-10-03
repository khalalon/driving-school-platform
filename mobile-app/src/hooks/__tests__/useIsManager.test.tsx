/**
 * `useIsManager` (14.4, D-54) : vrai seulement pour un instructeur dont A3 dit `isManager`.
 */
import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { useIsManager } from '../useIsManager';
import { User, UserRole } from '../../models/User';

let mockUser: Partial<User> | null = null;
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const Probe = () => <Text>{String(useIsManager())}</Text>;

const read = (): string => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Probe />);
  });
  const value = tree.root.findByType(Text).props.children as string;
  act(() => tree.unmount());
  return value;
};

describe('useIsManager', () => {
  it.each([
    ['gérant', { role: UserRole.INSTRUCTOR, isManager: true }, 'true'],
    ['moniteur', { role: UserRole.INSTRUCTOR, isManager: false }, 'false'],
    ['instructeur sans drapeau (ancienne session)', { role: UserRole.INSTRUCTOR }, 'false'],
    ['élève', { role: UserRole.STUDENT, isManager: true }, 'false'],
    ['déconnecté', null, 'false'],
  ])('%s → %s', (_, user, expected) => {
    mockUser = user as Partial<User> | null;
    expect(read()).toBe(expected);
  });
});
