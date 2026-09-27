/**
 * Célébration (13.12, D-52) : une fenêtre par-dessus l'accueil, avec une animation pré-rendue
 * (Lottie, créée pour le projet — `scripts/make_celebrations.py`) recolorée aux jetons du thème,
 * un titre, un message et « Continuer », toujours visible. Vibration de réussite à l'ouverture.
 * Sous « réduire les animations », l'animation laisse place à une carte fixe.
 */

import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Celebration, CelebrationKind } from '../../hooks/useCelebrations';
import { Theme, useTextStyle } from '../../theme';
import { haptics } from '../../utils/haptics';
import type { IoniconName } from '../../utils/rtl';
import { Button } from '../ui';
import type { TranslationKey } from '../../i18n';

/* eslint-disable @typescript-eslint/no-require-imports */
const ANIMATIONS: Record<CelebrationKind, unknown> = {
  enrolled: require('../../../assets/lottie/enrolled.json'),
  theory: require('../../../assets/lottie/theory.json'),
  licence: require('../../../assets/lottie/licence.json'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const STATIC_ICONS: Record<CelebrationKind, IoniconName> = {
  enrolled: 'checkmark-circle',
  theory: 'ribbon',
  licence: 'flag',
};

const TEXTS: Record<CelebrationKind, { title: TranslationKey; message: TranslationKey }> = {
  enrolled: { title: 'celebration.enrolled.title', message: 'celebration.enrolled.message' },
  theory: { title: 'celebration.theory.title', message: 'celebration.theory.message' },
  licence: { title: 'celebration.licence.title', message: 'celebration.licence.message' },
};

/** Couleur de chaque calque des animations (noms posés par `make_celebrations.py`). */
export const celebrationColors = (theme: Theme): { keypath: string; color: string }[] => {
  const { colors } = theme;
  return [
    { keypath: 'ring', color: colors.signal },
    { keypath: 'check', color: colors.signal },
    { keypath: 'rays', color: colors.telemetry },
    { keypath: 'confetti-a', color: colors.signal },
    { keypath: 'confetti-b', color: colors.telemetry },
    { keypath: 'confetti-c', color: colors.textPrimary },
    { keypath: 'pole', color: colors.textSecondary },
    // Damier lisible dans les deux thèmes : l'encre du texte contre la surface discrète
    { keypath: 'flag-dark', color: colors.textPrimary },
    { keypath: 'flag-light', color: colors.surfaceMuted },
  ];
};

interface CelebrationModalProps {
  celebration: Celebration | null;
  onContinue: () => void;
}

export const CelebrationModal = ({ celebration, onContinue }: CelebrationModalProps) => {
  const { t } = useI18n();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const display = useTextStyle('display');
  const body = useTextStyle('body');
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colorFilters = useMemo(() => celebrationColors(theme), [theme]);

  useEffect(() => {
    if (celebration) haptics.success();
  }, [celebration]);

  if (!celebration) return null;
  const texts = TEXTS[celebration.kind];

  return (
    <Modal visible transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onContinue}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal testID={`celebration-${celebration.kind}`}>
          {reduced ? (
            <View style={styles.staticIcon} testID="celebration-static">
              <Ionicons name={STATIC_ICONS[celebration.kind]} size={96} color={theme.colors.signal} />
            </View>
          ) : (
            <LottieView
              source={ANIMATIONS[celebration.kind] as never}
              autoPlay
              loop={false}
              colorFilters={colorFilters}
              style={styles.animation}
              testID="celebration-animation"
            />
          )}
          <Text style={[display, styles.title]} accessibilityRole="header">
            {t(texts.title)}
          </Text>
          <Text style={[body, styles.message]}>
            {t(texts.message, { school: celebration.schoolName ?? '' })}
          </Text>
          <Button
            title={t('celebration.continue')}
            onPress={onContinue}
            fullWidth
            testID="celebration-continue"
          />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.gauge,
      backgroundColor: theme.colors.surfaceRaised,
      ...theme.shadows.lg,
    },
    animation: { width: 240, height: 240 },
    staticIcon: {
      width: 160,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.signalSoft,
    },
    title: { color: theme.colors.textPrimary, textAlign: 'center' },
    message: { color: theme.colors.textSecondary, textAlign: 'center' },
  });
