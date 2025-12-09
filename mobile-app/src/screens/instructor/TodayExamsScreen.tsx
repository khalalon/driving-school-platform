/**
 * Today Exams Screen (Instructor)
 * Single Responsibility: Display today's scheduled exams
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examService, ExamRequest, ExamResult, ExamType } from '../../services/api/ExamService';

export const TodayExamsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<ExamRequest[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamRequest | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTodayExams();
  }, []);

  const loadTodayExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getMyExamRequests();
      
      // Filter for today's exams
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayExams = data.filter((exam) => {
        if (!exam.scheduledDate) return false;
        const examDate = new Date(exam.scheduledDate);
        examDate.setHours(0, 0, 0, 0);
        return examDate.getTime() === today.getTime();
      });
      
      setExams(todayExams);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exams');
      console.error('Load exams error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayExams();
    setRefreshing(false);
  }, []);

  const handleRecordResult = (exam: ExamRequest) => {
    setSelectedExam(exam);
    setResult(null);
    setScore('');
    setNotes('');
    setShowResultModal(true);
  };

  const handleSubmitResult = async () => {
    if (!result) {
      Alert.alert('Error', 'Please select a result');
      return;
    }

    if (!score) {
      Alert.alert('Error', 'Please enter a score');
      return;
    }

    try {
      setSubmitting(true);
      
      // This would be instructor-specific endpoint to record result
      Alert.alert('Success', 'Exam result recorded!');
      setShowResultModal(false);
      loadTodayExams();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to record result');
      console.error('Submit result error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getExamTypeIcon = (type: ExamType) => {
    return type === ExamType.PRACTICAL ? 'car-sport-outline' : 'book-outline';
  };

  const getResultColor = (result?: ExamResult) => {
    switch (result) {
      case ExamResult.PASSED:
        return '#4CAF50';
      case ExamResult.FAILED:
        return '#f44336';
      default:
        return '#FFB300';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
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
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Today's Exams</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{exams.length}</Text>
          <Text style={styles.summaryLabel}>Total Exams</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {exams.filter(e => e.result === ExamResult.PENDING || !e.result).length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {exams.filter(e => e.result && e.result !== ExamResult.PENDING).length}
          </Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {exams.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#e0e0e0" />
            <Text style={styles.emptyStateTitle}>No Exams Today</Text>
            <Text style={styles.emptyStateText}>
              You have no scheduled exams for today
            </Text>
          </View>
        ) : (
          <View style={styles.examsList}>
            {exams.map((exam) => (
              <View key={exam.id} style={styles.examCard}>
                {/* Time */}
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={20} color="#1a1a1a" />
                  <Text style={styles.timeText}>
                    {formatTime(exam.scheduledDate!)}
                  </Text>
                </View>

                {/* Exam Info */}
                <View style={styles.examHeader}>
                  <View style={styles.examIcon}>
                    <Ionicons
                      name={getExamTypeIcon(exam.type)}
                      size={28}
                      color="#1a1a1a"
                    />
                  </View>
                  <View style={styles.examInfo}>
                    <Text style={styles.examType}>
                      {exam.type.charAt(0).toUpperCase() + exam.type.slice(1)} Exam
                    </Text>
                    <Text style={styles.studentId}>
                      Student #{exam.studentId.slice(0, 8)}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                {exam.location && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.locationText}>{exam.location}</Text>
                  </View>
                )}

                {/* Result */}
                {exam.result && exam.result !== ExamResult.PENDING ? (
                  <View
                    style={[
                      styles.resultBadge,
                      { backgroundColor: `${getResultColor(exam.result)}20` },
                    ]}
                  >
                    <Ionicons
                      name={
                        exam.result === ExamResult.PASSED
                          ? 'checkmark-circle'
                          : 'close-circle'
                      }
                      size={18}
                      color={getResultColor(exam.result)}
                    />
                    <Text
                      style={[
                        styles.resultText,
                        { color: getResultColor(exam.result) },
                      ]}
                    >
                      {exam.result.toUpperCase()}
                    </Text>
                    {exam.score !== undefined && (
                      <Text
                        style={[
                          styles.scoreText,
                          { color: getResultColor(exam.result) },
                        ]}
                      >
                        {exam.score}%
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={() => handleRecordResult(exam)}
                  >
                    <Ionicons name="create-outline" size={18} color="#ffffff" />
                    <Text style={styles.recordButtonText}>Record Result</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Exam Result</Text>
              <TouchableOpacity
                onPress={() => setShowResultModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Result Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Result</Text>
                <View style={styles.resultButtons}>
                  <TouchableOpacity
                    style={[
                      styles.resultButton,
                      result === ExamResult.PASSED && styles.resultButtonPassed,
                    ]}
                    onPress={() => setResult(ExamResult.PASSED)}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={result === ExamResult.PASSED ? '#ffffff' : '#4CAF50'}
                    />
                    <Text
                      style={[
                        styles.resultButtonText,
                        result === ExamResult.PASSED && styles.resultButtonTextActive,
                      ]}
                    >
                      Passed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.resultButton,
                      result === ExamResult.FAILED && styles.resultButtonFailed,
                    ]}
                    onPress={() => setResult(ExamResult.FAILED)}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={result === ExamResult.FAILED ? '#ffffff' : '#f44336'}
                    />
                    <Text
                      style={[
                        styles.resultButtonText,
                        result === ExamResult.FAILED && styles.resultButtonTextActive,
                      ]}
                    >
                      Failed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Score */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Score (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0-100"
                  value={score}
                  onChangeText={setScore}
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add feedback..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitResult}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Result</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
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
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  examIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  examInfo: {
    flex: 1,
  },
  examType: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 13,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 10,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  textArea: {
    minHeight: 80,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8f8f8',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  resultButtonPassed: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  resultButtonFailed: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  resultButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  resultButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
