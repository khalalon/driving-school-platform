/**
 * Exam Requests Screen - Minimal & Elegant
 * Single Responsibility: The school's pending exam requests (X1 status=pending), scheduling
 * (X3) and rejection (X4)
 *
 * Pas d'instructeur attitré (D-33) : tout instructeur de l'école voit et traite les demandes.
 * Pas de règle d'éligibilité (D-26) : le nombre de leçons effectuées est affiché pour aider à
 * décider. Les libellés dépendent du type (D-42, `EXAM_PROCEDURES`) : théorie planifiée par
 * l'école (« Schedule » / « Reject »), pratique par session ATTT (« Record convocation » /
 * « File not ready ») ; mêmes payloads X3 / X4.
 */

import React, { useState, useCallback } from "react";
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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { examService } from "../../services/api/ExamService";
import { getApiErrorMessage } from "../../services/api/ApiError";
import {
  EXAM_PROCEDURES,
  EXAM_TYPE_LABELS,
  Exam,
  ExamStatus,
  ExamType,
} from "../../models/Exam";
import { formatDate, formatPersonName } from "../../utils/format";
import { colors, typography, spacing, shadows } from "../../theme";

/** Motif de refus : 10 à 500 caractères, même règle que le backend. */
const REASON_MIN = 10;
const REASON_MAX = 500;

/** Demain à 9 h : proposé quand la demande n'a pas de date souhaitée. */
const tomorrowMorning = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const ExamRequestsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<Exam[]>([]);
  const [processing, setProcessing] = useState(false);

  // Schedule modal (X3)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Exam | null>(null);
  const [dateTime, setDateTime] = useState<Date>(tomorrowMorning);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState("");

  // Reject modal (X4)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, []),
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      // X1 : toutes les demandes pending de l'école (instructeur)
      const data = await examService.getMyExams({
        status: [ExamStatus.PENDING],
      });
      setRequests(data);
    } catch (error) {
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to load exam requests"),
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  // ----- Schedule (X3) -----

  const openSchedule = (request: Exam) => {
    setSelectedRequest(request);
    setDateTime(
      request.preferredDate
        ? new Date(request.preferredDate)
        : tomorrowMorning(),
    );
    setLocation("");
    setShowScheduleModal(true);
  };

  const closeSchedule = () => {
    setShowScheduleModal(false);
    setLocation("");
    setSelectedRequest(null);
  };

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
      setDateTime(next);
    }
  };

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDateTime(next);
    }
  };

  const confirmSchedule = async () => {
    if (!selectedRequest) return;
    if (!location.trim()) {
      Alert.alert("Required", "Please enter the exam location");
      return;
    }
    if (dateTime.getTime() <= Date.now()) {
      Alert.alert("Invalid Date", "The exam date must be in the future");
      return;
    }

    try {
      setProcessing(true);
      // X3 : date et centre → scheduled
      await examService.scheduleExam(selectedRequest.id, {
        dateTime: dateTime.toISOString(),
        location: location.trim(),
      });
      Alert.alert("Success", "Exam scheduled");
      closeSchedule();
      loadRequests();
    } catch (error) {
      // 409 : un collègue a déjà traité la demande
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to schedule exam"),
      );
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Reject (X4) -----

  const openReject = (request: Exam) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const closeReject = () => {
    setShowRejectModal(false);
    setRejectionReason("");
    setSelectedRequest(null);
  };

  const reasonLength = rejectionReason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;

  const confirmReject = async () => {
    if (!selectedRequest) return;
    if (!reasonValid) {
      Alert.alert(
        "Reason too short",
        `Please explain the rejection in at least ${REASON_MIN} characters (the student will read it).`,
      );
      return;
    }

    try {
      setProcessing(true);
      await examService.rejectExamRequest(
        selectedRequest.id,
        rejectionReason.trim(),
      );
      Alert.alert("Success", "Exam request rejected");
      closeReject();
      loadRequests();
    } catch (error) {
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to reject request"),
      );
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Rendering -----

  const renderRequestCard = ({ item }: { item: Exam }) => {
    const procedure = EXAM_PROCEDURES[item.type];
    return (
      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={
                item.type === ExamType.THEORY
                  ? "book-outline"
                  : "car-sport-outline"
              }
              size={28}
              color={
                item.type === ExamType.THEORY
                  ? colors.primary[600]
                  : colors.warning[600]
              }
            />
          </View>

          <View style={styles.requestInfo}>
            <Text style={styles.examType}>
              {EXAM_TYPE_LABELS[item.type] ?? item.type} Exam
            </Text>
            <Text style={styles.studentName}>
              {formatPersonName(
                {
                  firstName: item.studentFirstName,
                  lastName: item.studentLastName,
                },
                "Student",
              )}
            </Text>
            <View style={styles.detailRow}>
              <Ionicons
                name="school-outline"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.detailText}>
                {item.studentCompletedLessons} lesson
                {item.studentCompletedLessons === 1 ? "" : "s"} completed
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.detailText}>
                Preferred: {formatDate(item.preferredDate, "no date given")}
              </Text>
            </View>
            {item.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openReject(item)}
            activeOpacity={0.7}
            disabled={processing}
          >
            <Ionicons
              name="close-outline"
              size={20}
              color={colors.error[600]}
            />
            <Text style={styles.rejectButtonText}>
              {procedure.rejectAction}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.scheduleButton]}
            onPress={() => openSchedule(item)}
            activeOpacity={0.7}
            disabled={processing}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.text.inverse}
            />
            <Text style={styles.scheduleButtonText}>
              {procedure.scheduleAction}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="documents-outline"
          size={64}
          color={colors.neutral[300]}
        />
      </View>
      <Text style={styles.emptyTitle}>No Pending Requests</Text>
      <Text style={styles.emptyText}>
        New exam requests from your school will appear here
      </Text>
    </View>
  );

  // Libellés de la modale ouverte : ceux du type de la demande sélectionnée (D-42)
  const selectedProcedure =
    EXAM_PROCEDURES[selectedRequest?.type ?? ExamType.THEORY];

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
        <Text style={styles.headerTitle}>Exam Requests</Text>
      </View>

      {/* Requests List */}
      <FlatList
        data={requests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          requests.length === 0 ? styles.emptyList : styles.listContent
        }
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

      {/* Schedule Modal (X3) */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="fade"
        onRequestClose={closeSchedule}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProcedure.scheduleAction}
              </Text>
              <TouchableOpacity onPress={closeSchedule}>
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedRequest
                ? `${EXAM_TYPE_LABELS[selectedRequest.type]} exam for ${formatPersonName(
                    {
                      firstName: selectedRequest.studentFirstName,
                      lastName: selectedRequest.studentLastName,
                    },
                    "the student",
                  )}: ${selectedProcedure.scheduleHint}`
                : ""}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>{selectedProcedure.dateLabel}</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.text.secondary}
                />
                <Text style={styles.dateText}>
                  {dateTime.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                  minimumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.text.secondary}
                />
                <Text style={styles.dateText}>
                  {dateTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                {selectedProcedure.locationLabel}
              </Text>
              <TextInput
                style={styles.locationInput}
                placeholder={selectedProcedure.locationPlaceholder}
                placeholderTextColor={colors.neutral[400]}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeSchedule}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmitButton,
                  processing && styles.disabledButton,
                ]}
                onPress={confirmSchedule}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {selectedProcedure.scheduleAction}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal (X4) */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={closeReject}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProcedure.rejectAction}
              </Text>
              <TouchableOpacity onPress={closeReject}>
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedProcedure.rejectHint}
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Need more practice lessons first..."
              placeholderTextColor={colors.neutral[400]}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={REASON_MAX}
              textAlignVertical="top"
            />
            <Text style={[styles.hintText, !reasonValid && styles.hintWarning]}>
              {reasonLength < REASON_MIN
                ? `At least ${REASON_MIN} characters (${reasonLength}/${REASON_MIN})`
                : `${reasonLength}/${REASON_MAX} characters`}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeReject}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalRejectButton,
                  (processing || !reasonValid) && styles.disabledButton,
                ]}
                onPress={confirmReject}
                disabled={processing || !reasonValid}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalRejectText}>
                    {selectedProcedure.rejectAction}
                  </Text>
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
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["4xl"],
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
    gap: spacing.md,
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  requestInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  examType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  studentName: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  rejectButton: {
    backgroundColor: colors.error[50],
  },
  rejectButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error[600],
  },
  scheduleButton: {
    backgroundColor: colors.primary[600],
    ...shadows.sm,
  },
  scheduleButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["4xl"],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalContent: {
    width: "100%",
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    padding: spacing.base,
    borderRadius: 12,
    gap: spacing.md,
    height: 52,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  locationInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    height: 52,
  },
  reasonInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 100,
  },
  hintText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  hintWarning: {
    color: colors.warning[600],
  },
  messageBox: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  messageText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: colors.background.tertiary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary[600],
  },
  modalSubmitText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  modalRejectButton: {
    backgroundColor: colors.error[600],
  },
  modalRejectText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
