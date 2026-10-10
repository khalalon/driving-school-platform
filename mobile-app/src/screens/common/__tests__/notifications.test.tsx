/**
 * Écran « Notifications » et cloche des accueils (17.7, D-66) : rendu clair / sombre / arabe,
 * cibles tactiles et lecteur d'écran ; ouvrir une notification la marque lue **puis** mène à sa
 * destination ; « Tout marquer lu » ; badge « 50+ » quand la page est pleine.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { NotificationsScreen } from '../NotificationsScreen';
import { NotificationBell } from '../../../components/NotificationBell';
import { notificationService } from '../../../services/api/NotificationService';
import { unreadBadge } from '../../../models/Notification';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unlabelledPressables,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/NotificationService', () => ({
  notificationService: {
    getMine: jest.fn(),
    markRead: jest.fn().mockResolvedValue(undefined),
    markAllRead: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'student', firstName: 'Nour' } }),
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

const NOTIFICATIONS = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'lesson_scheduled',
    title: 'Leçon planifiée',
    message: 'Votre leçon Parc est fixée au 15/10/2026 10:00.',
    read: false,
    data: { screen: 'MyLessons', id: 'l1' },
    createdAt: '2026-10-10T09:00:00.000Z',
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'enrollment_approved',
    title: 'Inscription acceptée',
    message: 'Auto-école El Amel a accepté votre inscription.',
    read: true,
    data: null,
    createdAt: '2026-10-09T09:00:00.000Z',
  },
];

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const press = async (tree: ReturnType<typeof renderScreen>, testID: string) => {
  const [node] = tree.root.findAll(
    (n) => n.props?.testID === testID && typeof n.props?.onPress === 'function'
  );
  await act(async () => {
    await node.props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (notificationService.getMine as jest.Mock).mockResolvedValue(NOTIFICATIONS);
});

afterEach(() => applyLanguage('fr'));

describe('écran Notifications (17.7)', () => {
  it.each(SCREEN_VARIANTS)('se rend en %s, cibles tactiles et lecteur d’écran', async (_, theme, language) => {
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, theme, language);
    await settle();

    const text = renderedText(tree).join(' | ');
    expect(text).toContain(t('notifications.title'));
    // Le texte vient du serveur, déjà rendu : affiché tel quel
    expect(text).toContain('Leçon planifiée');
    expect(text).toContain(t('notifications.unreadCount', { count: 1 }));
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });

  it('ouvrir une non lue : marquée lue (N4) puis destination ouverte', async () => {
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, 'dark');
    await settle();

    await press(tree, 'notification-n1');

    expect(notificationService.markRead).toHaveBeenCalledWith('n1');
    expect(navigation.navigate).toHaveBeenCalledWith('StudentTabs', { screen: 'MyLessons' });
    expect(tree.root.findAllByProps({ testID: 'unread-n1' })).toEqual([]);
    unmountInTheme(tree);
  });

  it('une lue sans destination : ni appel, ni navigation', async () => {
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, 'light');
    await settle();

    await press(tree, 'notification-n2');

    expect(notificationService.markRead).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    unmountInTheme(tree);
  });

  it('« Tout marquer lu » (N5) efface les pastilles et le compteur', async () => {
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, 'dark');
    await settle();

    const [button] = tree.root.findAll(
      (n) =>
        n.props?.accessibilityLabel === t('notifications.markAllRead') &&
        typeof n.props?.onPress === 'function'
    );
    await act(async () => {
      await button.props.onPress();
    });

    expect(notificationService.markAllRead).toHaveBeenCalledTimes(1);
    expect(renderedText(tree).join(' ')).not.toContain(
      t('notifications.unreadCount', { count: 1 })
    );
    unmountInTheme(tree);
  });

  it('historique vide : message d’attente, aucun bouton', async () => {
    (notificationService.getMine as jest.Mock).mockResolvedValue([]);
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, 'dark');
    await settle();

    expect(renderedText(tree)).toContain(t('notifications.empty'));
    unmountInTheme(tree);
  });

  it('lecture en échec : message et « Réessayer »', async () => {
    (notificationService.getMine as jest.Mock).mockRejectedValue(new Error('hors ligne'));
    const tree = renderScreen(<NotificationsScreen navigation={navigation} />, 'dark');
    await settle();

    const text = renderedText(tree).join(' ');
    expect(text).toContain(t('notifications.loadFailed'));
    expect(text).toContain(t('common.retry'));
    unmountInTheme(tree);
  });
});

describe('cloche des accueils (17.7)', () => {
  it('le nombre de non lues, annoncé au lecteur d’écran ; ouvre l’historique', async () => {
    (notificationService.getMine as jest.Mock).mockResolvedValue([NOTIFICATIONS[0]]);
    const onPress = jest.fn();
    const tree = renderScreen(<NotificationBell onPress={onPress} />, 'dark');
    await settle();

    expect(notificationService.getMine).toHaveBeenCalledWith(true);
    expect(renderedText(tree)).toContain('1');
    const [bell] = tree.root.findAllByProps({ testID: 'notification-bell' });
    expect(bell.props.accessibilityLabel).toBe(t('notifications.bellUnread', { count: '1' }));
    expect(smallTouchTargets(tree)).toEqual([]);

    await press(tree, 'notification-bell');
    expect(onPress).toHaveBeenCalledTimes(1);
    unmountInTheme(tree);
  });

  it('rien à lire ou lecture en échec : pas de badge, pas d’erreur', async () => {
    (notificationService.getMine as jest.Mock).mockResolvedValue([]);
    const quiet = renderScreen(<NotificationBell onPress={jest.fn()} />, 'light');
    await settle();
    expect(quiet.root.findAllByProps({ testID: 'notification-badge' })).toEqual([]);
    unmountInTheme(quiet);

    (notificationService.getMine as jest.Mock).mockRejectedValue(new Error('hors ligne'));
    const offline = renderScreen(<NotificationBell onPress={jest.fn()} />, 'light');
    await settle();
    expect(offline.root.findAllByProps({ testID: 'notification-badge' })).toEqual([]);
    unmountInTheme(offline);
  });

  it('badge : rien à zéro, le nombre ensuite, « 50+ » quand la page de N3 est pleine', () => {
    expect(unreadBadge(0)).toBeNull();
    expect(unreadBadge(7)).toBe('7');
    expect(unreadBadge(49)).toBe('49');
    expect(unreadBadge(50)).toBe('50+');
  });
});
