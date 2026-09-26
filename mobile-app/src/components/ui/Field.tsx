/**
 * `Field` (11.2) — un champ de formulaire complet : libellé, saisie, message d'aide et message
 * d'erreur. L'erreur est **portée par le champ**, pas par une fenêtre système : l'utilisateur voit
 * quoi corriger sans quitter le clavier. Toutes les propriétés de `TextInput` restent disponibles.
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
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.signal
      : theme.colors.border;

  return (
    <View style={[{ gap: theme.spacing.xs }, containerStyle]}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.typography.size.sm,
          fontWeight: theme.typography.weight.medium,
        }}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: editable ? theme.colors.surfaceRaised : theme.colors.surfaceMuted,
            borderColor,
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
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.base,
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
        <Text style={{ color: theme.colors.dangerText, fontSize: theme.typography.size.xs }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.size.xs }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  multiline: { alignItems: 'flex-start' },
  input: { flex: 1 },
});
