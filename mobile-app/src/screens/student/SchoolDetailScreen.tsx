/**
 * Fiche d'une auto-école (11.3) — S2, S4, S5 et E1 / E2 : ce que l'école propose, et la seule
 * action qui compte selon l'état de l'inscription (demander, patienter, réessayer, réserver).
 * L2 : la demande de leçon est adressée à l'école ; l'instructeur choisi n'est qu'une préférence
 * (D-32).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { schoolService } from '../../services/api/SchoolService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AppBar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  ListRow,
  Screen,
  SkeletonCard,
} from '../../components/ui';
import { School, SchoolInstructor, SchoolPricing } from '../../models/School';
import { EnrollmentStatusInfo, EnrollmentStatus } from '../../models/Enrollment';
import { lessonTypeLabel } from '../../models/Lesson';
import { formatAmount, formatPersonName } from '../../utils/format';
import { Theme } from '../../theme';

type TabKey = 'about' | 'instructors' | 'pricing';

export const SchoolDetailScreen = ({ navigation, route }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { schoolId } = route.params;
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [instructors, setInstructors] = useState<SchoolInstructor[]>([]);
  const [pricing, setPricing] = useState<SchoolPricing[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatusInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('about');
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
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('school.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollRequest = async () => {
    if (!enrollMessage.trim()) {
      Alert.alert(t('school.messageRequired'), t('school.messageRequiredText'));
      return;
    }

    try {
      setEnrolling(true);
      await enrollmentService.requestEnrollment({ schoolId, message: enrollMessage });

      Alert.alert(t('school.requestSent'), t('school.enrollmentSentText'), [
        {
          text: t('common.ok'),
          onPress: () => {
            setShowEnrollModal(false);
            setEnrollMessage('');
            loadSchoolDetails();
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('school.enrollmentFailed')));
    } finally {
      setEnrolling(false);
    }
  };

  /** L2 : la demande est adressée à l'école ; l'instructeur choisi n'est qu'une préférence (D-32). */
  const handleRequestLesson = (instructor?: SchoolInstructor) => {
    if (!enrollmentStatus?.canBook) {
      Alert.alert(t('school.enrollmentRequired'), t('school.enrollmentRequiredLesson'));
      return;
    }

    navigation.navigate('BookLesson', {
      schoolId,
      preferredInstructorId: instructor?.id,
      instructorName: instructor
        ? formatPersonName(instructor, t('myLessons.instructorFallback'))
        : undefined,
    });
  };

  /** L'état de l'inscription décide de l'action proposée en haut de la fiche. */
  const renderEnrollmentBanner = () => {
    if (!enrollmentStatus) return null;

    if (enrollmentStatus.isEnrolled) {
      return (
        <Card highlighted style={styles.banner}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.successText} />
          <Text style={styles.bannerText}>{t('school.enrolled')}</Text>
          {enrollmentStatus.canBook ? (
            <Button
              title={t('myLessons.requestLesson')}
              onPress={() => handleRequestLesson()}
              size="sm"
            />
          ) : null}
        </Card>
      );
    }

    if (enrollmentStatus.requestStatus === EnrollmentStatus.PENDING) {
      return (
        <Card style={styles.banner}>
          <Ionicons name="time" size={22} color={theme.colors.warningText} />
          <Text style={styles.bannerText}>{t('school.requestPending')}</Text>
        </Card>
      );
    }

    if (enrollmentStatus.requestStatus === EnrollmentStatus.REJECTED) {
      return (
        <Card style={styles.banner}>
          <Ionicons name="close-circle" size={22} color={theme.colors.dangerText} />
          <Text style={styles.bannerText}>{t('school.requestRejected')}</Text>
          <Button
            title={t('school.tryAgain')}
            onPress={() => setShowEnrollModal(true)}
            variant="secondary"
            size="sm"
          />
        </Card>
      );
    }

    return (
      <Button
        title={t('school.requestEnrollment')}
        onPress={() => setShowEnrollModal(true)}
        icon="school-outline"
        fullWidth
      />
    );
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'about', label: t('school.about') },
    { key: 'instructors', label: t('school.instructors') },
    { key: 'pricing', label: t('school.pricing') },
  ];

  const renderAbout = (current: School) => (
    <Card padded={false}>
      <ListRow title={current.address} icon="location-outline" tone="neutral" style={styles.row} />
      <ListRow
        title={current.phone}
        icon="call-outline"
        tone="accent"
        onPress={() => Linking.openURL(`tel:${current.phone}`)}
        style={styles.row}
      />
      <ListRow
        title={current.email}
        icon="mail-outline"
        tone="accent"
        onPress={() => Linking.openURL(`mailto:${current.email}`)}
        style={styles.rowLast}
      />
    </Card>
  );

  const renderInstructors = () =>
    instructors.length === 0 ? (
      <EmptyState icon="people-outline" title={t('school.noInstructors')} tone="neutral" />
    ) : (
      <Card padded={false}>
        {instructors.map((instructor, index) => (
          <ListRow
            key={instructor.id}
            title={formatPersonName(instructor, t('myLessons.instructorFallback'))}
            subtitle={
              instructor.specialties.length > 0 ? instructor.specialties.join(' · ') : undefined
            }
            icon="person"
            tone="accent"
            style={index === instructors.length - 1 ? styles.rowLast : styles.row}
            trailing={
              <Button
                title={t('school.request')}
                onPress={() => handleRequestLesson(instructor)}
                variant="secondary"
                size="sm"
                disabled={!enrollmentStatus?.canBook}
              />
            }
          />
        ))}
      </Card>
    );

  const renderPricing = (current: School) =>
    pricing.length === 0 ? (
      <EmptyState icon="pricetags-outline" title={t('school.noPricing')} tone="neutral" />
    ) : (
      <Card padded={false}>
        {pricing.map((price, index) => (
          <ListRow
            key={price.id}
            title={lessonTypeLabel(price.lessonType) ?? price.lessonType}
            subtitle={t('format.minutes', { count: price.duration })}
            icon="pricetag"
            tone="success"
            style={index === pricing.length - 1 ? styles.rowLast : styles.row}
            trailing={
              <Text style={styles.price}>{formatAmount(price.price, current.currency)}</Text>
            }
          />
        ))}
      </Card>
    );

  const renderBody = () => {
    if (loading && !school) {
      return (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </>
      );
    }
    if (!school) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title={t('school.notFound')}
          tone="danger"
          action={{ label: t('common.retry'), onPress: loadSchoolDetails }}
        />
      );
    }

    return (
      <>
        {renderEnrollmentBanner()}

        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <Chip
              key={tab.key}
              label={tab.label}
              selected={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>

        {activeTab === 'about' ? renderAbout(school) : null}
        {activeTab === 'instructors' ? renderInstructors() : null}
        {activeTab === 'pricing' ? renderPricing(school) : null}
      </>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={school?.name ?? t('schools.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        {renderBody()}
      </Screen>

      <Modal
        visible={showEnrollModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEnrollModal(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('school.requestEnrollment')}</Text>
            <Text style={styles.modalSubtitle}>{t('school.modalSubtitle')}</Text>

            <Field
              label={t('enrollmentRequests.yourMessage')}
              placeholder={t('school.modalPlaceholder')}
              value={enrollMessage}
              onChangeText={setEnrollMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.messageInput}
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => {
                  setShowEnrollModal(false);
                  setEnrollMessage('');
                }}
                variant="secondary"
                style={styles.modalAction}
              />
              <Button
                title={t('school.sendRequest')}
                onPress={handleEnrollRequest}
                loading={enrolling}
                style={styles.modalAction}
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
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.base },
    banner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    bannerText: {
      flex: 1,
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
    tabs: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: theme.spacing.base,
    },
    rowLast: { paddingHorizontal: theme.spacing.base },
    price: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },

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
    modalSubtitle: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    messageInput: { minHeight: 96 },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
    modalAction: { flex: 1 },
  });
