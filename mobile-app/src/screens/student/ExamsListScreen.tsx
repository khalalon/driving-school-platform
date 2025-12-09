/**
 * Exams List Screen
 * Single Responsibility: Display available exams for registration
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examService, Exam, ExamType } from '../../services/api/ExamService';
import { useAuth } from '../../context/AuthContext';

export const ExamsListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [filter, setFilter] = useState<'all' | ExamType>('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getAllExams();
      setExams(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exams');
      console.error('Load exams error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExams();
    setRefreshing(false);
  };

  const handleRegisterForExam = async (exam: Exam) => {
    // First check eligibility
    try {
      const eligibility = await examService.checkEligibility(
        user!.id,
        exam.type as ExamType
      );

      if (!eligibility.eligible) {
        Alert.alert(
          'Not Eligible',
          eligibility.reason ||
            `You need ${eligibility.requiredLessons} completed lessons. You have ${eligibility.completedLessons}.`
        );
        return;
      }

      // Show confirmation
      Alert.alert(
        'Confirm Registration',
        `Register for ${exam.type} exam on ${formatDate(exam.dateTime)}?\n\nPrice: $${exam.price}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Register',
            onPress: () => confirmRegistration(exam),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to check eligibility');
      console.error('Check eligibility error:', error);
    }
  };

  const confirmRegistration = async (exam: Exam) => {
    try {
      await examService.registerForExam(exam.id, user!.id);
      Alert.alert('Success', 'Successfully registered for exam!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MyExams'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to register');
      console.error('Register exam error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getFilteredExams = () => {
    if (filter === 'all') return exams;
    return exams.filter((exam) => exam.type === filter);
  };

  const getExamTypeIcon = (type: string) => {
    return type === ExamType.PRACTICAL ? 'car-sport-outline' : 'book-outline';
  };

  const getAvailableSeats = (exam: Exam) => {
    return exam.capacity - (exam.registeredCount || 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const filteredExams = getFilteredExams();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Exams</Text>
        <TouchableOpacity
          style={styles.myExamsButton}
          onPress={() => navigation.navigate('MyExams')}
        >
          <Ionicons name="list-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === ExamType.THEORY && styles.filterTabActive,
          ]}
          onPress={() => setFilter(ExamType.THEORY)}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === ExamType.THEORY && styles.filterTabTextActive,
            ]}
          >
            Theory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === ExamType.PRACTICAL && styles.filterTabActive,
          ]}
          onPress={() => setFilter(ExamType.PRACTICAL)}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === ExamType.PRACTICAL && styles.filterTabTextActive,
            ]}
          >
            Practical
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredExams.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#e0e0e0" />
            <Text style={styles.emptyStateTitle}>No Exams Available</Text>
            <Text style={styles.emptyStateText}>
              Check back later for upcoming exam sessions
            </Text>
          </View>
        ) : (
          <View style={styles.examsList}>
            {filteredExams.map((exam) => {
              const availableSeats = getAvailableSeats(exam);
              const isFull = availableSeats <= 0;

              return (
                <View key={exam.id} style={styles.examCard}>
                  {/* Header */}
                  <View style={styles.examHeader}>
                    <View style={styles.examTypeContainer}>
                      <View style={styles.examIcon}>
                        <Ionicons
                          name={getExamTypeIcon(exam.type)}
                          size={24}
                          color="#1a1a1a"
                        />
                      </View>
                      <View style={styles.examTypeInfo}>
                        <Text style={styles.examType}>
                          {exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} Exam
                        </Text>
                        {exam.duration && (
                          <Text style={styles.examDuration}>
                            {exam.duration} minutes
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.examPrice}>
                      <Text style={styles.priceValue}>${exam.price}</Text>
                    </View>
                  </View>

                  {/* Date & Time */}
                  <View style={styles.examDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{formatDate(exam.dateTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.detailText}>{formatTime(exam.dateTime)}</Text>
                    </View>
                    {exam.location && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.detailText}>{exam.location}</Text>
                      </View>
                    )}
                  </View>

                  {/* School Info */}
                  {exam.school && (
                    <View style={styles.schoolInfo}>
                      <Ionicons name="school-outline" size={14} color="#999" />
                      <Text style={styles.schoolName}>{exam.school.name}</Text>
                    </View>
                  )}

                  {/* Capacity */}
                  <View style={styles.examFooter}>
                    <View style={styles.capacityContainer}>
                      <Ionicons
                        name="people-outline"
                        size={16}
                        color={isFull ? '#f44336' : '#666'}
                      />
                      <Text
                        style={[
                          styles.capacityText,
                          isFull && styles.capacityTextFull,
                        ]}
                      >
                        {availableSeats} / {exam.capacity} seats available
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.registerButton,
                        isFull && styles.registerButtonDisabled,
                      ]}
                      onPress={() => handleRegisterForExam(exam)}
                      disabled={isFull}
                    >
                      <Text
                        style={[
                          styles.registerButtonText,
                          isFull && styles.registerButtonTextDisabled,
                        ]}
                      >
                        {isFull ? 'Full' : 'Register'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  myExamsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1a1a1a',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  examsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  examCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  examTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  examIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  examTypeInfo: {
    flex: 1,
  },
  examType: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  examDuration: {
    fontSize: 13,
    color: '#666',
  },
  examPrice: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  examDetails: {
    gap: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  schoolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  schoolName: {
    fontSize: 13,
    color: '#999',
  },
  examFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  capacityTextFull: {
    color: '#f44336',
  },
  registerButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  registerButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  registerButtonTextDisabled: {
    color: '#999',
  },
});
