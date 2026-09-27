/**
 * Écrans élève « écoles et inscription » refaits (13.15, D-52) : liste des écoles, fiche d'une
 * école (instructeurs, tarifs), mes demandes d'inscription — rendus en clair, en sombre et en
 * arabe, textes clés présents, cibles tactiles suffisantes.
 */
import React from 'react';
import { act } from 'react-test-renderer';
import { SchoolsListScreen } from '../SchoolsListScreen';
import { SchoolDetailScreen } from '../SchoolDetailScreen';
import { MyEnrollmentRequestsScreen } from '../MyEnrollmentRequestsScreen';
import { schoolService } from '../../../services/api/SchoolService';
import { enrollmentService } from '../../../services/api/EnrollmentService';
import { EnrollmentStatus } from '../../../models/Enrollment';
import { LessonType } from '../../../models/Lesson';
import { applyLanguage, t } from '../../../i18n';
import {
  SCREEN_VARIANTS,
  renderScreen,
  renderedText,
  smallTouchTargets,
  unlabelledPressables,
  unmountInTheme,
} from '../../../components/ui/__tests__/renderInTheme';

jest.mock('../../../services/api/SchoolService', () => ({
  schoolService: {
    getAllSchools: jest.fn(),
    getSchoolById: jest.fn(),
    getSchoolInstructors: jest.fn(),
    getSchoolPricing: jest.fn(),
  },
}));
jest.mock('../../../services/api/EnrollmentService', () => ({
  enrollmentService: {
    getMyRequests: jest.fn(),
    checkEnrollmentStatus: jest.fn(),
    requestEnrollment: jest.fn(),
  },
}));
jest.mock('../../../hooks/useSchoolCurrency', () => ({ useSchoolCurrency: () => 'TND' }));
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

const SCHOOL = {
  id: 'school-1',
  name: 'Auto-école El Amel',
  address: '12 avenue Habib Bourguiba, Tunis',
  phone: '+216 71 000 000',
  email: 'contact@elamel.tn',
  currency: 'TND',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

const settle = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  (schoolService.getAllSchools as jest.Mock).mockResolvedValue([SCHOOL]);
  (schoolService.getSchoolById as jest.Mock).mockResolvedValue(SCHOOL);
  (schoolService.getSchoolInstructors as jest.Mock).mockResolvedValue([
    {
      id: 'i1',
      userId: 'u1',
      schoolId: 'school-1',
      firstName: 'Karim',
      lastName: 'Ben Salah',
      phone: '+216 20 000 000',
      licenseNumber: 'LIC-1',
      specialties: [],
    },
  ]);
  (schoolService.getSchoolPricing as jest.Mock).mockResolvedValue([
    { id: 'p1', schoolId: 'school-1', lessonType: LessonType.MANOEUVRE, price: 45, duration: 60 },
  ]);
  (enrollmentService.checkEnrollmentStatus as jest.Mock).mockResolvedValue({
    isEnrolled: false,
    canBook: false,
  });
  (enrollmentService.getMyRequests as jest.Mock).mockResolvedValue([
    {
      id: 'req-1',
      studentId: 'u9',
      schoolId: 'school-1',
      schoolName: 'Auto-école El Amel',
      status: EnrollmentStatus.REJECTED,
      message: 'Bonjour, je souhaite m’inscrire.',
      rejectionReason: 'Dossier incomplet, merci de repasser au bureau.',
      processedBy: null,
      processedAt: null,
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    },
  ]);
});

afterEach(() => applyLanguage('fr'));

const CASES: [string, () => React.ReactElement, () => string][] = [
  ['liste des écoles', () => <SchoolsListScreen navigation={navigation} />, () => SCHOOL.name],
  [
    'fiche d’une école',
    () => <SchoolDetailScreen navigation={navigation} route={{ params: { schoolId: 'school-1' } }} />,
    () => SCHOOL.name,
  ],
  [
    'mes demandes d’inscription',
    () => <MyEnrollmentRequestsScreen navigation={navigation} />,
    () => 'Dossier incomplet, merci de repasser au bureau.',
  ],
];

describe.each(CASES)('%s', (_, element, keyText) => {
  it.each(SCREEN_VARIANTS)('se rend en %s, texte clé présent, cibles tactiles suffisantes', async (__, theme, language) => {
    const tree = renderScreen(element(), theme, language);
    await settle();
    expect(renderedText(tree).join(' ')).toContain(keyText());
    expect(smallTouchTargets(tree)).toEqual([]);
    expect(unlabelledPressables(tree)).toEqual([]);
    unmountInTheme(tree);
  });
});

describe('navigation', () => {
  it('toucher une école ouvre sa fiche', async () => {
    const tree = renderScreen(<SchoolsListScreen navigation={navigation} />, 'dark');
    await settle();
    const card = tree.root.findAll(
      (node) =>
        typeof node.props?.onPress === 'function' &&
        node.props?.accessibilityRole === 'button' &&
        String(node.props?.accessibilityLabel ?? '').includes(SCHOOL.name)
    )[0];
    expect(card).toBeDefined();
    act(() => card.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('SchoolDetail', { schoolId: 'school-1' });
    unmountInTheme(tree);
  });

  it('la fiche affiche les tarifs de l’école dans sa devise', async () => {
    const tree = renderScreen(
      <SchoolDetailScreen navigation={navigation} route={{ params: { schoolId: 'school-1' } }} />,
      'light'
    );
    await settle();
    // L'onglet des tarifs s'ouvre depuis les pastilles de la fiche
    const tab = tree.root.findAll(
      (node) =>
        typeof node.props?.onPress === 'function' &&
        String(node.props?.accessibilityLabel ?? '') === t('school.pricing')
    )[0];
    expect(tab).toBeDefined();
    act(() => tab.props.onPress());
    expect(renderedText(tree).join(' ')).toMatch(/45/);
    unmountInTheme(tree);
  });
});
