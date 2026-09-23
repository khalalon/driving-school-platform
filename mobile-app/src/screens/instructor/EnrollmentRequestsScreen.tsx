/**
 * Enrollment Requests Screen - Minimal & Elegant
 * Single Responsibility: Manage student enrollment requests
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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { EnrollmentRequest, EnrollmentStatus } from '../../models/Enrollment';
import { formatDate, formatPersonName } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

type FilterType = 'pending' | 'all';

/** Motif de refus : 10 à 500 caractères, même règle que le backend (D-29). */
const REJECTION_REASON_MIN = 10;
const REJECTION_REASON_MAX = 500;

const STATUS_STYLES: Record<EnrollmentStatus, { badge: object; label: string }> = {
  [EnrollmentStatus.PENDING]: { badge: { backgroundColor: colors.warning[50] }, label: 'Pending' },
  [EnrollmentStatus.APPROVED]: {
    badge: { backgroundColor: colors.success[50] },
    label: 'Approved',
  },
  [EnrollmentStatus.REJECTED]: { badge: { backgroundColor: colors.error[50] }, label: 'Rejected' },
};

export const EnrollmentRequestsScreen = ({ navigation, route }: any) => {
  const { schoolId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [processing, setProcessing] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (schoolId) {
      loadRequests();
    } else {
      Alert.alert('Error', 'School ID not provided');
      navigation.goBack();
    }
  }, [filter, schoolId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'pending' ? EnrollmentStatus.PENDING : undefined;
      const data = await enrollmentService.getSchoolRequests(schoolId, statusFilter);
      setRequests(data);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load enrollment requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [filter, schoolId]);

  const handleApprove = async (request: EnrollmentRequest) => {
    Alert.alert(
      'Approve Enrollment',
      `Approve enrollment for ${formatPersonName(
        { firstName: request.studentFirstName, lastName: request.studentLastName },
        request.studentEmail ?? 'this student'
      )}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(true);
              await enrollmentService.approveRequest(request.id);
              Alert.alert('Success', 'Student enrollment has been approved');
              loadRequests();
            } catch (error) {
              Alert.alert('Error', getApiErrorMessage(error, 'Failed to approve request'));
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectClick = (request: EnrollmentRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const reasonLength = rejectionReason.trim().length;
  const reasonValid = reasonLength >= REJECTION_REASON_MIN && reasonLength <= REJECTION_REASON_MAX;

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!reasonValid) {
      Alert.alert(
        'Reason too short',
        `Please explain the rejection in at least ${REJECTION_REASON_MIN} characters (the student will read it).`
      );
      return;
    }

    try {
      setProcessing(true);
      await enrollmentService.rejectRequest(selectedRequest.id, rejectionReason.trim());
      Alert.alert('Success', 'Enrollment request has been rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      loadRequests();
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to reject request'));
    } finally {
      setProcessing(false);
    }
  };

  /** Fiche élève (P1–P7) : `studentId` = users.id de la demande, école de l'écran (D-28). */
  const openStudentProfile = (request: EnrollmentRequest) => {
    navigation.navigate('StudentProfile', {
      studentId: request.studentId,
      schoolId,
      studentName: formatPersonName(
        { firstName: request.studentFirstName, lastName: request.studentLastName },
        request.studentEmail ?? 'Student'
      ),
    });
  };

  const renderRequest = ({ item }: { item: EnrollmentRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.studentInfo}>
          <Ionicons name="person-circle-outline" size={40} color={colors.primary[600]} />
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>
              {formatPersonName(
                { firstName: item.studentFirstName, lastName: item.studentLastName },
                'Student'
              )}
            </Text>
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
            <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, STATUS_STYLES[item.status].badge]}>
          <Text style={styles.statusText}>{STATUS_STYLES[item.status].label}</Text>
        </View>
      </View>

      {item.message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{item.message}</Text>
        </View>
      )}

      {item.status === EnrollmentStatus.REJECTED && item.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      {item.status === EnrollmentStatus.APPROVED && (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => openStudentProfile(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.profileButtonText}>View student profile</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary[600]} />
        </TouchableOpacity>
      )}

      {item.status === EnrollmentStatus.PENDING && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
            disabled={processing}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRejectClick(item)}
            disabled={processing}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.text.inverse} />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="documents-outline" size={64} color={colors.neutral[400]} />
      <Text style={styles.emptyTitle}>No Requests</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'pending' ? 'No pending enrollment requests' : 'No enrollment requests found'}
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Enrollment Requests</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.activeFilterTab]}
          onPress={() => setFilter('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
      </View>

      {/* Requests List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Enrollment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Rejection Reason</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Please provide a reason for rejection..."
              placeholderTextColor={colors.neutral[400]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={REJECTION_REASON_MAX}
              textAlignVertical="top"
            />
            <Text style={[styles.modalHint, !reasonValid && styles.modalHintWarning]}>
              {reasonLength < REJECTION_REASON_MIN
                ? `At least ${REJECTION_REASON_MIN} characters (${reasonLength}/${REJECTION_REASON_MIN})`
                : `${reasonLength}/${REJECTION_REASON_MAX} characters`}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
                disabled={processing || !reasonValid}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: colors.primary[600],
  },
  filterText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  activeFilterText: {
    color: colors.text.inverse,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  requestCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  studentName: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  studentEmail: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  requestDate: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  messageContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  messageText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  rejectionContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.error[50],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error[600],
  },
  rejectionLabel: {
    fontSize: typography.size.sm,
    color: colors.error[600],
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: typography.size.base,
    color: colors.error[600],
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
  },
  profileButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  approveButton: {
    backgroundColor: colors.success[600],
  },
  rejectButton: {
    backgroundColor: colors.error[600],
  },
  actionButtonText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  modalLabel: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.xs,
  },
  modalHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  modalHintWarning: {
    color: colors.warning[600],
  },
  modalInput: {
    fontSize: typography.size.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background.secondary,
  },
  modalRejectButton: {
    backgroundColor: colors.error[600],
  },
  modalCancelText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  modalRejectText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
});
