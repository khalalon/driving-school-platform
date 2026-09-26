/**
 * Demandes d'inscription (11.4) — E4 à E6, cloisonnées à l'école de l'instructeur (D-20).
 * Approuver ouvre la fiche élève ; refuser demande un motif (10 à 500 caractères, D-29) que le
 * champ contrôle lui-même avant l'envoi.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  SkeletonCard,
  Tone,
} from '../../components/ui';
import { TranslationKey } from '../../i18n';
import { EnrollmentRequest, EnrollmentStatus } from '../../models/Enrollment';
import { formatDate, formatPersonName } from '../../utils/format';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

type FilterType = 'pending' | 'all';

/** Motif de refus : 10 à 500 caractères, même règle que le backend (D-29). */
const REJECTION_REASON_MIN = 10;
const REJECTION_REASON_MAX = 500;

const STATUS: Record<EnrollmentStatus, { tone: Tone; labelKey: TranslationKey }> = {
  [EnrollmentStatus.PENDING]: { tone: 'warning', labelKey: 'enrollments.statusPending' },
  [EnrollmentStatus.APPROVED]: { tone: 'success', labelKey: 'enrollments.statusApproved' },
  [EnrollmentStatus.REJECTED]: { tone: 'danger', labelKey: 'enrollments.statusRejected' },
};

export const EnrollmentRequestsScreen = ({ navigation, route }: any) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { schoolId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [processing, setProcessing] = useState(false);

  // Refus : motif saisi dans une modale
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EnrollmentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (schoolId) {
      loadRequests();
    } else {
      Alert.alert(t('common.error'), t('enrollments.noSchoolId'));
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
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('enrollments.loadFailed')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [filter, schoolId]);

  const studentNameOf = (request: EnrollmentRequest) =>
    formatPersonName(
      { firstName: request.studentFirstName, lastName: request.studentLastName },
      request.studentEmail ?? t('today.student')
    );

  const handleApprove = (request: EnrollmentRequest) => {
    Alert.alert(
      t('enrollments.approveTitle'),
      t('enrollments.approveConfirm', { student: studentNameOf(request) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('enrollments.approve'),
          onPress: async () => {
            try {
              setProcessing(true);
              await enrollmentService.approveRequest(request.id);
              showToast(t('enrollments.approved'));
              loadRequests();
            } catch (error) {
              Alert.alert(
                t('common.error'),
                getApiErrorMessage(error, t('enrollments.approveFailed'))
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const reasonLength = rejectionReason.trim().length;
  const reasonValid = reasonLength >= REJECTION_REASON_MIN && reasonLength <= REJECTION_REASON_MAX;

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!reasonValid) {
      Alert.alert(
        t('lessonRequests.reasonTooShort'),
        t('lessonRequests.reasonTooShortText', { min: REJECTION_REASON_MIN })
      );
      return;
    }

    try {
      setProcessing(true);
      await enrollmentService.rejectRequest(selectedRequest.id, rejectionReason.trim());
      showToast(t('enrollments.rejected'));
      closeReject();
      loadRequests();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('enrollments.rejectFailed')));
    } finally {
      setProcessing(false);
    }
  };

  const closeReject = () => {
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectionReason('');
  };

  /** Fiche élève (P1–P7) : `studentId` = users.id de la demande, école de l'écran (D-28). */
  const openStudentProfile = (request: EnrollmentRequest) => {
    navigation.navigate('StudentProfile', {
      studentId: request.studentId,
      schoolId,
      studentName: studentNameOf(request),
    });
  };

  const renderRequest = ({ item }: { item: EnrollmentRequest }) => (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={theme.colors.signalText} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{studentNameOf(item)}</Text>
          <Text style={styles.meta}>{item.studentEmail}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <Badge label={t(STATUS[item.status].labelKey)} tone={STATUS[item.status].tone} dot />
      </View>

      {item.message ? (
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>{t('enrollments.message')}</Text>
          <Text style={styles.quoteText}>{item.message}</Text>
        </View>
      ) : null}

      {item.status === EnrollmentStatus.REJECTED && item.rejectionReason ? (
        <View style={styles.reason}>
          <Text style={styles.reasonLabel}>{t('enrollments.rejectionReason')}</Text>
          <Text style={styles.reasonText}>{item.rejectionReason}</Text>
        </View>
      ) : null}

      {item.status === EnrollmentStatus.APPROVED ? (
        <Button
          title={t('enrollments.viewProfile')}
          onPress={() => openStudentProfile(item)}
          variant="ghost"
          size="sm"
          icon={mirrorIcon('chevron-forward')}
          iconPosition="trailing"
        />
      ) : null}

      {item.status === EnrollmentStatus.PENDING ? (
        <View style={styles.actions}>
          <Button
            title={t('enrollments.approve')}
            onPress={() => handleApprove(item)}
            disabled={processing}
            size="sm"
            icon="checkmark-circle-outline"
            style={styles.action}
          />
          <Button
            title={t('enrollments.reject')}
            onPress={() => {
              setSelectedRequest(item);
              setShowRejectModal(true);
            }}
            variant="danger"
            disabled={processing}
            size="sm"
            icon="close-circle-outline"
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('enrollments.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <View style={styles.filters}>
        <Chip
          label={t('filter.pending')}
          selected={filter === 'pending'}
          onPress={() => setFilter('pending')}
        />
        <Chip
          label={t('enrollments.all')}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="documents-outline"
              title={t('enrollments.emptyTitle')}
              message={
                filter === 'pending' ? t('enrollments.emptyPending') : t('enrollments.emptyAll')
              }
              tone="neutral"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.signal]}
              tintColor={theme.colors.signal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={closeReject}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('enrollments.rejectTitle')}</Text>

            <Field
              label={t('enrollments.rejectLabel')}
              placeholder={t('enrollments.rejectPlaceholder')}
              hint={
                reasonLength < REJECTION_REASON_MIN
                  ? t('reason.min', { min: REJECTION_REASON_MIN, count: reasonLength })
                  : t('reason.count', { count: reasonLength, max: REJECTION_REASON_MAX })
              }
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={REJECTION_REASON_MAX}
              textAlignVertical="top"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={closeReject}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('enrollments.reject')}
                onPress={handleReject}
                variant="danger"
                loading={processing}
                disabled={!reasonValid}
                style={styles.action}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    filters: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, paddingTop: 0, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.signalSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    meta: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    date: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
    quote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteLabel: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textMuted,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    reason: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    reasonLabel: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.dangerText,
    },
    reasonText: { fontSize: theme.typography.size.sm, color: theme.colors.dangerText },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { gap: theme.spacing.md },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    modalInput: { minHeight: 96 },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
  });
