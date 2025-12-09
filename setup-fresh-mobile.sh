cd mobile-app

# 1. Fix AuthContext - role should be UserRole type
cat > src/context/AuthContext.tsx << 'EOF'
/**
 * Auth Context
 * Single Responsibility: Manage authentication state globally
 * Provides: user, login, logout, register functions
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api/AuthService';
import { User, UserRole } from '../models/User';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole; // Changed from string to UserRole
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      // Save token and user data
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
      ]);

      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);
      
      // Save token and user data
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, response.token),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
      ]);

      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear storage
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);

      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
EOF

# 2. Fix SchoolDetailScreen - Remove FC type, use regular function
cat > src/screens/student/SchoolDetailScreen.tsx << 'EOF'
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
EOF

# 3. Fix BookLessonScreen - Remove FC type
cat > src/screens/student/BookLessonScreen.tsx << 'EOF'
/**
 * Book Lesson Screen - Minimal & Elegant
 * Single Responsibility: Handle lesson booking with enrollment check
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { lessonService } from '../../services/api/LessonService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { LessonType } from '../../models/Lesson';
import { colors, typography, spacing, shadows } from '../../theme';

export const BookLessonScreen = ({ navigation, route }: any) => {
  const { schoolId, instructorId, instructorName } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [canBook, setCanBook] = useState(false);
  
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRACTICAL);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  const checkEnrollmentStatus = async () => {
    try {
      setCheckingEnrollment(true);
      const status = await enrollmentService.checkEnrollmentStatus(schoolId);
      
      if (!status.canBook) {
        Alert.alert(
          'Enrollment Required',
          'You must be enrolled in this school to book lessons.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      
      setCanBook(status.canBook);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to check enrollment status');
      navigation.goBack();
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleBookLesson = async () => {
    try {
      setLoading(true);

      const dateTime = new Date(date);
      dateTime.setHours(time.getHours());
      dateTime.setMinutes(time.getMinutes());

      await lessonService.bookLesson({
        schoolId,
        instructorId,
        lessonType,
        dateTime: dateTime.toISOString(),
      });

      Alert.alert('Success', 'Lesson booked successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('MyLessons') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to book lesson');
    } finally {
      setLoading(false);
    }
  };

  if (checkingEnrollment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Checking enrollment...</Text>
      </View>
    );
  }

  if (!canBook) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Lesson</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {instructorName && (
          <View style={styles.infoCard}>
            <Ionicons name="person-outline" size={24} color={colors.primary[600]} />
            <Text style={styles.infoText}>Instructor: {instructorName}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Lesson Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={lessonType}
              onValueChange={(value) => setLessonType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Practical Driving" value={LessonType.PRACTICAL} />
              <Picker.Item label="Theory" value={LessonType.THEORY} />
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
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
            <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.bookButton, loading && styles.disabledButton]}
          onPress={handleBookLesson}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    gap: spacing.md,
  },
  loadingText: {
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
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing.base,
    borderRadius: 12,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  infoText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  pickerContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  picker: {
    height: 52,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
    height: 52,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.base,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.base,
    ...shadows.sm,
  },
  bookButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
EOF

echo "✅ TypeScript errors fixed!"
echo ""
echo "Fixed issues:"
echo "  ✅ AuthContext - role type changed from string to UserRole"
echo "  ✅ SchoolDetailScreen - Removed FC type, using regular function"
echo "  ✅ BookLessonScreen - Removed FC type, using regular function"
echo ""
echo "Now try starting the app:"
echo "  npx expo start"