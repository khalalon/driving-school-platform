/**
 * My Enrollment Requests - Minimal & Elegant
 * Single Responsibility: Display student's enrollment requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { EnrollmentRequest, EnrollmentStatus } from '../../models/Enrollment';
import { colors, typography, spacing, shadows } from '../../theme';

export const MyEnrollmentRequestsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await enrollmentService.getMyRequests();
      setRequests(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load enrollment requests');
      console.error('Load requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  const getStatusConfig = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.PENDING:
        return {
          icon: 'time-outline',
          color: colors.warning[500],
          bg: colors.warning[50],
          text: 'Pending',
        };
      case EnrollmentStatus.APPROVED:
        return {
          icon: 'checkmark-circle',
          color: colors.success[500],
          bg: colors.success[50],
          text: 'Approved',
        };
      case EnrollmentStatus.REJECTED:
        return {
          icon: 'close-circle',
          color: colors.error[500],
          bg: colors.error[50],
          text: 'Rejected',
        };
    }
  };

  const renderRequestCard = ({ item }: { item: EnrollmentRequest }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName}>{item.schoolName}</Text>
            {item.schoolAddress && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={colors.text.tertiary} />
                <Text style={styles.locationText}>{item.schoolAddress}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        {item.message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>Your message:</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}

        {item.status === EnrollmentStatus.REJECTED && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.error[600]} />
            <View style={styles.rejectionContent}>
              <Text style={styles.rejectionLabel}>Reason:</Text>
              <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('SchoolDetail', { schoolId: item.schoolId })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>View School</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color={colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>No Enrollment Requests</Text>
      <Text style={styles.emptyText}>Browse schools and request enrollment to get started</Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('SchoolsList')}
        activeOpacity={0.8}
      >
        <Ionicons name="business-outline" size={20} color={colors.text.inverse} />
        <Text style={styles.browseButtonText}>Browse Schools</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
      </View>

      {/* Requests List */}
      <FlatList
        data={requests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
    gap: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  schoolInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  schoolName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  messageBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  messageLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  rejectionBox: {
    flexDirection: 'row',
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  rejectionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rejectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.error[600],
    textTransform: 'uppercase',
  },
  rejectionText: {
    fontSize: typography.size.sm,
    color: colors.error[600],
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dateText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.sm,
  },
  browseButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
