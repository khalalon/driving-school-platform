/**
 * `Field` (11.2, refait en 13.5 — D-52) — un champ de formulaire complet : libellé toujours
 * visible (capitales condensées), saisie, message d'aide et message d'erreur sous le champ.
 * L'erreur est **portée par le champ**, pas par une fenêtre système : l'utilisateur voit quoi
 * corriger sans quitter le clavier. Filet `borderStrong` (≥ 3:1) au repos, `gauge` au focus,
 * `danger` en erreur — accompagnée d'une icône. Toutes les propriétés de `TextInput` restent
 * disponibles.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { IoniconName } from '../../utils/rtl';

interface FieldProps extends TextInputProps {
  label: string;
  /** Message d'erreur : remplace l'aide et colore la bordure. */
  error?: string | null;
  /** Aide affichée sous le champ tant qu'il n'y a pas d'erreur. */
  hint?: string;
  icon?: IoniconName;
  /** Action à droite (ouvrir un calendrier, vider la saisie). */
  trailing?: React.ReactNode;
  /** Mot de passe : le champ porte lui-même l'oeil « afficher / masquer ». */
  revealable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Field = ({
  label,
  error,
  hint,
  icon,
  trailing,
  revealable = false,
  containerStyle,
  multiline,
  editable = true,
  ...inputProps
}: FieldProps) => {
  const theme = useTheme();
  const labelStyle = useTextStyle('label');
  const bodyStyle = useTextStyle('body');
  const captionStyle = useTextStyle('caption');
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.gauge
      : theme.colors.borderStrong;

  return (
    <View style={[{ gap: theme.spacing.xs }, containerStyle]}>
      <Text style={[labelStyle, { color: theme.colors.textSecondary }]}>{label}</Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: editable ? theme.colors.surfaceRaised : theme.colors.surfaceMuted,
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            gap: theme.spacing.sm,
            minHeight: MIN_TOUCH_TARGET + 4,
          },
          multiline === true && styles.multiline,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={theme.colors.textMuted} /> : null}
        <TextInput
          {...inputProps}
          secureTextEntry={revealable ? !revealed : inputProps.secureTextEntry}
          multiline={multiline}
          editable={editable}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          style={[
            styles.input,
            bodyStyle,
            {
              color: theme.colors.textPrimary,
              paddingVertical: theme.spacing.sm,
            },
            inputProps.style,
          ]}
        />
        {revealable ? (
          <Pressable
            onPress={() => setRevealed((shown) => !shown)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ expanded: revealed }}
          >
            <Ionicons
              name={revealed ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
        {trailing}
      </View>

      {error ? (
        <View style={[styles.messageRow, { gap: theme.spacing.xs }]}>
          <Ionicons name="alert-circle" size={14} color={theme.colors.dangerText} />
          <Text
            style={[captionStyle, styles.message, { color: theme.colors.dangerText }]}
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={[captionStyle, { color: theme.colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  multiline: { alignItems: 'flex-start' },
  input: { flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1 },
});
