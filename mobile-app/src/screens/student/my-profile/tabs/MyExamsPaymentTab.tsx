/**
 * My Exams & Payment Tab
 * Single Responsibility: Display exam history with payment status
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService, MyExamHistory } from '../../../../services/api/StudentSelfProfileService';
import { colors, typography, spacing } from '../../../../theme';

export const MyExamsPaymentTab = ({ route }: any) => {
  const { schoolId } = route.params;
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<MyExamHistory[]>([]);

  useEffect(() => {
    loadExams();
  }, [schoolId]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await studentSelfProfileService.getMyExams(schoolId);
      setExams(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result?: string) => {
    if (!result) return colors.text.secondary;
    switch (result.toLowerCase()) {
      case 'passed':
        return colors.success[500];
      case 'failed':
        return colors.error[500];
      default:
        return colors.warning[500];
    }
  };

  const getResultIcon = (result?: string) => {
    if (!result) return 'help-circle-outline';
    switch (result.toLowerCase()) {
      case 'passed':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderExam = ({ item }: { item: MyExamHistory }) => (
    <View style={styles.examCard}>
      {/* Header */}
      <View style={styles.examHeader}>
        <View style={styles.examInfo}>
          <Text style={styles.examType}>{item.examType}</Text>
          <Text style={styles.examDate}>
            {new Date(item.dateTime).toLocaleDateString()} at{' '}
            {new Date(item.dateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      {/* Result Section */}
      {item.result && (
        <View style={styles.resultSection}>
          <View style={styles.resultRow}>
            <Ionicons
              name={getResultIcon(item.result) as any}
              size={24}
              color={getResultColor(item.result)}
            />
            <View style={styles.resultInfo}>
              <Text style={[styles.resultText, { color: getResultColor(item.result) }]}>
                {item.result.toUpperCase()}
              </Text>
              {item.score !== undefined && (
                <Text style={styles.scoreText}>Score: {item.score}%</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      {/* Payment Status */}
      <View style={styles.paymentSection}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentLabel}>
            <Ionicons
              name={item.paid ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={item.paid ? colors.success[500] : colors.warning[500]}
            />
            <Text style={styles.paymentLabelText}>
              {item.paid ? 'Paid' : 'Pending Payment'}
            </Text>
          </View>
          {item.amount && (
            <Text
              style={[
                styles.paymentAmount,
                { color: item.paid ? colors.success[500] : colors.warning[500] },
              ]}
            >
              ${item.amount.toFixed(2)}
            </Text>
          )}
        </View>
        {item.paid && item.paymentDate && (
          <Text style={styles.paymentDate}>
            Paid on {new Date(item.paymentDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (exams.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>No exams recorded yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={exams}
      renderItem={renderExam}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  listContainer: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  examCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  examHeader: {
    marginBottom: spacing.sm,
  },
  examInfo: {
    flex: 1,
  },
  examType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  examDate: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  resultSection: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs / 2,
  },
  scoreText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  notesContainer: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  notesText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  paymentSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentLabelText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  paymentDate: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
});
