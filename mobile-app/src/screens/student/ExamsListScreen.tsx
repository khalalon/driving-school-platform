/**
 * Exams List Screen - Redirects to Request Exam
 * Note: This screen is not needed in the request-approval workflow.
 * Students request exams through RequestExamScreen instead of browsing available slots.
 * 
 * If you need this screen, you should remove it from the navigation
 * and use RequestExamScreen and MyExamsScreen instead.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../theme';

export const ExamsListScreen = ({ navigation }: any) => {
  // Auto-redirect to RequestExam screen
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('RequestExam');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="information-circle-outline" size={64} color={colors.primary[600]} />
        </View>
        
        <Text style={styles.title}>Request an Exam</Text>
        <Text style={styles.message}>
          In this driving school platform, you request exams that instructors will schedule for you.
        </Text>
        
        <Text style={styles.redirectText}>Redirecting to exam request...</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('RequestExam')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Request Exam Now</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.replace('MyExams')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>View My Exams</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.normal,
    marginBottom: spacing.xl,
  },
  redirectText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: spacing['2xl'],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: 12,
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  buttonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
});