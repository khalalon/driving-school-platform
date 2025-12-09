/**
 * School Detail Screen - Minimal & Elegant
 * Single Responsibility: Display detailed school information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  schoolService,
  School,
  SchoolInstructor,
  SchoolPricing,
} from '../../services/api/SchoolService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { EnrollmentStatusInfo, EnrollmentStatus } from '../../models/Enrollment';
import { colors, typography, spacing, shadows } from '../../theme';

export const SchoolDetailScreen = ({ navigation, route }: any) => {
  const { schoolId } = route.params;
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [instructors, setInstructors] = useState<SchoolInstructor[]>([]);
  const [pricing, setPricing] = useState<SchoolPricing[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'instructors' | 'pricing'>('about');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadSchoolDetails();
  }, [schoolId]);

  const loadSchoolDetails = async () => {
    try {
      setLoading(true);
      const [schoolData, instructorsData, pricingData, statusData] = await Promise.all([
        schoolService.getSchoolById(schoolId),
        schoolService.getSchoolInstructors(schoolId),
        schoolService.getSchoolPricing(schoolId),
        enrollmentService.checkEnrollmentStatus(schoolId),
      ]);

      setSchool(schoolData);
      setInstructors(instructorsData);
      setPricing(pricingData);
      setEnrollmentStatus(statusData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load school details');
      console.error('Load school details error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollRequest = async () => {
    if (!enrollMessage.trim()) {
      Alert.alert('Message Required', 'Please add a message with your enrollment request');
      return;
    }

    try {
      setEnrolling(true);
      await enrollmentService.requestEnrollment({
        schoolId,
        message: enrollMessage,
      });

      Alert.alert(
        'Request Sent!',
        'Your enrollment request has been sent to the school.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowEnrollModal(false);
              setEnrollMessage('');
              loadSchoolDetails();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send enrollment request');
    } finally {
      setEnrolling(false);
    }
  };

  const handleCallSchool = () => {
    if (school?.phone) {
      Linking.openURL(`tel:${school.phone}`);
    }
  };

  const handleEmailSchool = () => {
    if (school?.email) {
      Linking.openURL(`mailto:${school.email}`);
    }
  };

  const handleBookWithInstructor = (instructor: SchoolInstructor) => {
    if (!enrollmentStatus?.canBook) {
      Alert.alert(
        'Enrollment Required',
        'You must be enrolled in this school before booking lessons.'
      );
      return;
    }

    navigation.navigate('BookLesson', {
      schoolId,
      instructorId: instructor.id,
      instructorName: instructor.name,
    });
  };

  const renderEnrollmentBanner = () => {
    if (!enrollmentStatus) return null;

    if (enrollmentStatus.isEnrolled) {
      return (
        <View style={[styles.banner, styles.enrolledBanner]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
          <Text style={styles.bannerText}>You are enrolled</Text>
        </View>
      );
    }

    if (enrollmentStatus.requestStatus === EnrollmentStatus.PENDING) {
      return (
        <View style={[styles.banner, styles.pendingBanner]}>
          <Ionicons name="time-outline" size={20} color={colors.warning[600]} />
          <Text style={styles.bannerText}>Request pending</Text>
        </View>
      );
    }

    if (enrollmentStatus.requestStatus === EnrollmentStatus.REJECTED) {
      return (
        <View style={[styles.banner, styles.rejectedBanner]}>
          <Ionicons name="close-circle" size={20} color={colors.error[600]} />
          <Text style={styles.bannerText}>Request rejected</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setShowEnrollModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.enrollButton}
        onPress={() => setShowEnrollModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="school-outline" size={20} color={colors.text.inverse} />
        <Text style={styles.enrollButtonText}>Request Enrollment</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>School not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {school.name}
          </Text>
        </View>

        {/* Enrollment Banner */}
        {renderEnrollmentBanner()}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instructors' && styles.activeTab]}
            onPress={() => setActiveTab('instructors')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'instructors' && styles.activeTabText]}
            >
              Instructors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pricing' && styles.activeTab]}
            onPress={() => setActiveTab('pricing')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'pricing' && styles.activeTabText]}>
              Pricing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'about' && (
            <View style={styles.tabContent}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.infoText}>{school.address}</Text>
              </View>

              <TouchableOpacity style={styles.infoRow} onPress={handleCallSchool}>
                <Ionicons name="call-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.infoText, styles.linkText]}>{school.phone}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.infoRow} onPress={handleEmailSchool}>
                <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
                <Text style={[styles.infoText, styles.linkText]}>{school.email}</Text>
              </TouchableOpacity>

              {school.description && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.sectionLabel}>About</Text>
                  <Text style={styles.description}>{school.description}</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'instructors' && (
            <View style={styles.tabContent}>
              {instructors.length === 0 ? (
                <Text style={styles.emptyText}>No instructors available</Text>
              ) : (
                instructors.map((instructor) => (
                  <View key={instructor.id} style={styles.instructorCard}>
                    <View style={styles.instructorInfo}>
                      <Text style={styles.instructorName}>{instructor.name}</Text>
                      {instructor.rating && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={16} color={colors.warning[500]} />
                          <Text style={styles.ratingText}>{instructor.rating.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.bookButton,
                        !enrollmentStatus?.canBook && styles.disabledButton,
                      ]}
                      onPress={() => handleBookWithInstructor(instructor)}
                      disabled={!enrollmentStatus?.canBook}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bookButtonText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'pricing' && (
            <View style={styles.tabContent}>
              {pricing.length === 0 ? (
                <Text style={styles.emptyText}>No pricing information available</Text>
              ) : (
                pricing.map((price) => (
                  <View key={price.id} style={styles.pricingCard}>
                    <View>
                      <Text style={styles.lessonType}>{price.lessonType}</Text>
                      <Text style={styles.duration}>{price.duration} min</Text>
                    </View>
                    <Text style={styles.price}>{price.price} €</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Enrollment</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEnrollModal(false);
                  setEnrollMessage('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Tell the school why you'd like to enroll
            </Text>

            <TextInput
              style={styles.messageInput}
              placeholder="I am interested in enrolling because..."
              placeholderTextColor={colors.neutral[400]}
              value={enrollMessage}
              onChangeText={setEnrollMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowEnrollModal(false);
                  setEnrollMessage('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmitButton,
                  enrolling && styles.disabledButton,
                ]}
                onPress={handleEnrollRequest}
                disabled={enrolling}
                activeOpacity={0.7}
              >
                {enrolling ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
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
    flex: 1,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    gap: spacing.md,
  },
  enrolledBanner: {
    backgroundColor: colors.success[50],
  },
  pendingBanner: {
    backgroundColor: colors.warning[50],
  },
  rejectedBanner: {
    backgroundColor: colors.error[50],
  },
  bannerText: {
    flex: 1,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  retryButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.background.primary,
  },
  retryButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error[600],
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  enrollButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[600],
  },
  tabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary[600],
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  linkText: {
    color: colors.primary[600],
  },
  descriptionBox: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: typography.size.base * typography.lineHeight.normal,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    paddingVertical: spacing['2xl'],
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: 12,
    ...shadows.sm,
  },
  instructorInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  instructorName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  bookButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pricingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: 12,
    ...shadows.sm,
  },
  lessonType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  duration: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  price: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary[600],
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  messageInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
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
});
