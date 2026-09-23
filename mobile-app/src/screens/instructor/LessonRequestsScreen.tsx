/**
 * Lesson Requests Screen - Minimal & Elegant
 * Single Responsibility: Manage the school's pending lesson requests (L1 scope=school, L5, L6)
 *
 * File partagée (D-32) : toutes les demandes `pending` de l'école ; l'instructeur qui approuve
 * devient l'instructeur de la leçon, en fixant la date et la durée. Le prix vient de la grille
 * de l'école (S4) ; il n'est saisi que si l'école n'a pas de tarif pour ce type (D-30).
 * Approbation multiple (D-34) : les demandes de code se cochent et se planifient d'un coup pour
 * un même créneau — un seul formulaire, puis un appel L5 par demande, avec récapitulatif.
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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../context/AuthContext";
import { lessonService } from "../../services/api/LessonService";
import { schoolService } from "../../services/api/SchoolService";
import { getApiErrorMessage } from "../../services/api/ApiError";
import {
  LESSON_TYPE_LABELS,
  Lesson,
  LessonStatus,
  LessonType,
} from "../../models/Lesson";
import { SchoolInstructor, SchoolPricing } from "../../models/School";
import { useSchoolCurrency } from "../../hooks/useSchoolCurrency";
import {
  formatAmount,
  formatDateTime,
  formatPersonName,
} from "../../utils/format";
import { colors, typography, spacing, shadows } from "../../theme";

/** Motif de refus : 10 à 500 caractères, même règle que le backend (D-29). */
const REASON_MIN = 10;
const REASON_MAX = 500;
const DEFAULT_DURATION_MINUTES = 60;

/** Demain à 9 h : proposé quand la demande n'a pas de date souhaitée. */
const tomorrowMorning = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const LessonRequestsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const schoolId = user?.schoolId;
  const currency = useSchoolCurrency(schoolId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<Lesson[]>([]);
  const [processing, setProcessing] = useState(false);

  // Référentiel de l'école : noms des instructeurs (préférence affichée) et grille tarifaire.
  // `pricing` reste `null` tant que la grille n'a pas pu être lue (le prix est alors facultatif).
  const [instructors, setInstructors] = useState<SchoolInstructor[]>([]);
  const [pricing, setPricing] = useState<SchoolPricing[] | null>(null);

  // Approve modal : une demande, ou plusieurs demandes de code pour le même créneau (D-34)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTargets, setApproveTargets] = useState<Lesson[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState<Date>(tomorrowMorning);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));
  const [price, setPrice] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Lesson | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadRequests();
      loadSchoolData();
    }, [schoolId]),
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      // L1 : file partagée des demandes pending de l'école
      const data = await lessonService.getMyLessons({
        status: [LessonStatus.PENDING],
        scope: "school",
      });
      setRequests(data);
      // Une demande traitée entre-temps ne reste pas cochée
      setCheckedIds(
        (previous) =>
          new Set(data.filter((l) => previous.has(l.id)).map((l) => l.id)),
      );
    } catch (error) {
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to load lesson requests"),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolData = async () => {
    if (!schoolId) return;
    try {
      const [instructorList, pricingList] = await Promise.all([
        schoolService.getSchoolInstructors(schoolId),
        schoolService.getSchoolPricing(schoolId),
      ]);
      setInstructors(instructorList);
      setPricing(pricingList);
    } catch {
      // Sans référentiel : la préférence est affichée sans nom, le prix reste facultatif
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadRequests(), loadSchoolData()]);
    setRefreshing(false);
  }, [schoolId]);

  const preferredInstructorLabel = (request: Lesson): string | null => {
    if (!request.preferredInstructorId) return null;
    if (request.preferredInstructorId === user?.instructorId) return "you";
    const instructor = instructors.find(
      (i) => i.id === request.preferredInstructorId,
    );
    return instructor
      ? formatPersonName(instructor, "an instructor")
      : "an instructor";
  };

  const pricingFor = (
    type: LessonType | undefined,
  ): SchoolPricing | undefined =>
    type && pricing ? pricing.find((p) => p.lessonType === type) : undefined;

  // ----- Sélection multiple (D-34 : demandes de code seulement) -----

  const toggleChecked = (request: Lesson) => {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(request.id)) next.delete(request.id);
      else next.add(request.id);
      return next;
    });
  };

  const checkedRequests = requests.filter((r) => checkedIds.has(r.id));

  // ----- Approve (L5, une demande ou un lot) -----

  const openApprove = (targets: Lesson[]) => {
    if (targets.length === 0) return;
    const rate = pricingFor(targets[0].type);
    setApproveTargets(targets);
    // Une seule demande : sa date souhaitée ; un lot : un créneau commun à choisir
    setScheduledDate(
      targets.length === 1 && targets[0].requestedDate
        ? new Date(targets[0].requestedDate)
        : tomorrowMorning(),
    );
    setDuration(String(rate?.duration ?? DEFAULT_DURATION_MINUTES));
    setPrice("");
    setAdminNotes("");
    setShowApproveModal(true);
  };

  const closeApprove = () => {
    setShowApproveModal(false);
    setApproveTargets([]);
  };

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(scheduledDate);
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
      setScheduledDate(next);
    }
  };

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(scheduledDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setScheduledDate(next);
    }
  };

  const confirmApprove = async () => {
    if (approveTargets.length === 0) return;
    const targetType = approveTargets[0].type;
    const rate = pricingFor(targetType);
    const priceRequired = pricing !== null && !rate;

    if (scheduledDate.getTime() <= Date.now()) {
      Alert.alert("Invalid Date", "The lesson date must be in the future");
      return;
    }
    const durationMinutes = Number.parseInt(duration, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      Alert.alert("Invalid Duration", "Please enter the duration in minutes");
      return;
    }
    const priceValue =
      price.trim() === "" ? undefined : Number(price.replace(",", "."));
    if (
      priceValue !== undefined &&
      (Number.isNaN(priceValue) || priceValue < 0)
    ) {
      Alert.alert("Invalid Price", "Please enter a valid price");
      return;
    }
    if (priceRequired && priceValue === undefined) {
      Alert.alert(
        "Price Required",
        `The school has no rate for ${LESSON_TYPE_LABELS[targetType]} lessons: please enter the price.`,
      );
      return;
    }

    const data = {
      scheduledDate: scheduledDate.toISOString(),
      durationMinutes,
      price: priceValue,
      adminNotes: adminNotes.trim() || undefined,
    };

    try {
      setProcessing(true);
      if (approveTargets.length === 1) {
        // L5 : l'appelant devient l'instructeur ; prix de la grille sinon celui saisi (D-30)
        await lessonService.approveLesson(approveTargets[0].id, data);
        Alert.alert("Success", "Lesson scheduled: you are now its instructor");
      } else {
        // D-34 : un appel L5 par demande cochée, en séquence, puis récapitulatif
        const result = await lessonService.approveLessons(
          approveTargets.map((t) => t.id),
          data,
        );
        const failures = result.failed.map(({ lessonId, error }) => {
          const request = approveTargets.find((t) => t.id === lessonId);
          const who = request
            ? formatPersonName(request.student, "Student")
            : lessonId;
          return `• ${who}: ${getApiErrorMessage(error, "request failed")}`;
        });
        Alert.alert(
          failures.length === 0 ? "Success" : "Partially scheduled",
          `${result.succeeded.length} of ${approveTargets.length} lesson(s) scheduled` +
            (failures.length > 0
              ? `\n\nNot scheduled:\n${failures.join("\n")}`
              : ""),
        );
        setCheckedIds(new Set());
      }
      closeApprove();
      loadRequests();
    } catch (error) {
      // 409 : un collègue a déjà traité la demande ; 400 PRICE_REQUIRED : grille incomplète
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to approve lesson"),
      );
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Reject (L6) -----

  const openReject = (request: Lesson) => {
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
      await lessonService.rejectLesson(
        selectedRequest.id,
        rejectionReason.trim(),
      );
      Alert.alert("Success", "Lesson request rejected");
      closeReject();
      loadRequests();
    } catch (error) {
      Alert.alert(
        "Error",
        getApiErrorMessage(error, "Failed to reject lesson"),
      );
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Rendering -----

  const renderRequestCard = ({ item }: { item: Lesson }) => {
    const preferred = preferredInstructorLabel(item);
    const rate = pricingFor(item.type);
    const selectable = item.type === LessonType.CODE;
    const checked = checkedIds.has(item.id);

    return (
      <View style={[styles.requestCard, checked && styles.requestCardChecked]}>
        <View style={styles.cardHeader}>
          {selectable ? (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleChecked(item)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel="Select this code request for group scheduling"
            >
              <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={28}
                color={checked ? colors.primary[600] : colors.neutral[400]}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconContainer}>
              <Ionicons
                name="person-outline"
                size={28}
                color={colors.primary[600]}
              />
            </View>
          )}

          <View style={styles.requestInfo}>
            <Text style={styles.studentName}>
              {formatPersonName(item.student, "Student")}
            </Text>
            <View style={styles.detailRow}>
              <Ionicons
                name="car-outline"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.detailText}>
                {LESSON_TYPE_LABELS[item.type] ?? item.type}
                {rate
                  ? ` · ${formatAmount(rate.price, currency)} · ${rate.duration} min`
                  : ""}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.text.tertiary}
              />
              <Text style={styles.detailText}>
                Requested: {formatDateTime(item.requestedDate, "no date given")}
              </Text>
            </View>
            {preferred && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="star-outline"
                  size={16}
                  color={colors.warning[600]}
                />
                <Text style={[styles.detailText, styles.preferredText]}>
                  Prefers {preferred}
                </Text>
              </View>
            )}
            {item.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{item.notes}</Text>
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
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => openApprove([item])}
            activeOpacity={0.7}
            disabled={processing}
          >
            <Ionicons
              name="checkmark-outline"
              size={20}
              color={colors.text.inverse}
            />
            <Text style={styles.approveButtonText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="document-text-outline"
          size={64}
          color={colors.neutral[300]}
        />
      </View>
      <Text style={styles.emptyTitle}>No Pending Requests</Text>
      <Text style={styles.emptyText}>
        New lesson requests from your school will appear here
      </Text>
    </View>
  );

  const targetType = approveTargets[0]?.type;
  const selectedRate = pricingFor(targetType);
  const priceRequired =
    pricing !== null && targetType !== undefined && !selectedRate;
  const isBatch = approveTargets.length > 1;

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
        <Text style={styles.headerTitle}>Lesson Requests</Text>
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

      {/* Barre d'approbation multiple (D-34) */}
      {checkedRequests.length > 0 && (
        <View style={styles.batchBar}>
          <Text style={styles.batchText}>
            {checkedRequests.length} code request
            {checkedRequests.length > 1 ? "s" : ""} selected
          </Text>
          <TouchableOpacity
            style={styles.batchClear}
            onPress={() => setCheckedIds(new Set())}
            activeOpacity={0.7}
          >
            <Text style={styles.batchClearText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={() => openApprove(checkedRequests)}
            activeOpacity={0.8}
            disabled={processing}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.inverse}
            />
            <Text style={styles.batchButtonText}>Schedule together</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Approve Modal (L5) */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={closeApprove}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isBatch
                    ? `Schedule ${approveTargets.length} Lessons`
                    : "Schedule Lesson"}
                </Text>
                <TouchableOpacity onPress={closeApprove}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                {isBatch
                  ? `One ${LESSON_TYPE_LABELS[LessonType.CODE]} lesson per student, same slot — ` +
                    `you will be the instructor of each: ` +
                    approveTargets
                      .map((t) => formatPersonName(t.student, "Student"))
                      .join(", ")
                  : approveTargets[0]
                    ? `${LESSON_TYPE_LABELS[approveTargets[0].type]} lesson for ${formatPersonName(
                        approveTargets[0].student,
                        "the student",
                      )} — you will be the instructor`
                    : ""}
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>Date & Time</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={[styles.dateButton, styles.dateButtonGrow]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.dateText}>
                      {scheduledDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
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
                      {scheduledDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onValueChange={handleDateChange}
                    onDismiss={() => setShowDatePicker(false)}
                    minimumDate={new Date()}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onValueChange={handleTimeChange}
                    onDismiss={() => setShowTimePicker(false)}
                  />
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Duration (minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder={String(DEFAULT_DURATION_MINUTES)}
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>
                  Price{currency ? ` (${currency})` : ""}
                  {priceRequired ? " — required" : ""}
                </Text>
                {selectedRate ? (
                  <Text style={styles.rateText}>
                    School rate: {formatAmount(selectedRate.price, currency)}{" "}
                    (applied automatically)
                  </Text>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.neutral[400]}
                    />
                    <Text style={styles.hintText}>
                      {priceRequired
                        ? "The school has no rate for this lesson type"
                        : "Leave empty to apply the school rate"}
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>
                  Notes for the student (optional)
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Meeting point, documents to bring..."
                  placeholderTextColor={colors.neutral[400]}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={closeApprove}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalApproveButton,
                    processing && styles.disabledButton,
                  ]}
                  onPress={confirmApprove}
                  disabled={processing}
                  activeOpacity={0.7}
                >
                  {processing ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.text.inverse}
                    />
                  ) : (
                    <Text style={styles.modalApproveText}>
                      {isBatch
                        ? `Schedule ${approveTargets.length}`
                        : "Confirm"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reject Modal (L6) */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={closeReject}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <TouchableOpacity onPress={closeReject}>
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Provide a reason for rejecting this lesson request
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., No availability this week, please request another date..."
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
  requestCardChecked: {
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  checkbox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
  },
  batchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  batchText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  batchClear: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  batchClearText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  batchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary[600],
  },
  batchButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
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
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  preferredText: {
    color: colors.warning[600],
  },
  notesBox: {
    backgroundColor: colors.background.tertiary,
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  notesText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontStyle: "italic",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
  approveButton: {
    backgroundColor: colors.primary[600],
  },
  approveButtonText: {
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
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    maxHeight: "90%",
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.size.sm,
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
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    height: 48,
    gap: spacing.sm,
  },
  dateButtonGrow: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    height: 48,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  rateText: {
    fontSize: typography.size.sm,
    color: colors.success[600],
    fontWeight: typography.weight.medium,
  },
  hintText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  hintWarning: {
    color: colors.warning[600],
  },
  reasonInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: colors.background.tertiary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modalApproveButton: {
    backgroundColor: colors.primary[600],
  },
  modalApproveText: {
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
