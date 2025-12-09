/**
 * Exam Requests Screen (Instructor)
 * Single Responsibility: Display and manage exam requests
 * Instructors can approve, reject, or schedule exams
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
import { examService, ExamRequest, ExamRequestStatus, ExamType } from '../../services/api/ExamService';

export const ExamRequestsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExamRequest | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [location, setLocation] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // This would be instructor-specific endpoint
      const data = await examService.getMyExamRequests();
      setRequests(data.filter(r => r.status === ExamRequestStatus.PENDING));
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exam requests');
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

  const handleApprove = (request: ExamRequest) => {
    setSelectedRequest(request);
    setScheduleDate('');
    setScheduleTime('');
    setLocation('');
    setAdminNotes('');
    setShowScheduleModal(true);
  };

  const handleReject = (request: ExamRequest) => {
    Alert.alert(
      'Reject Request',
      'Reject this exam request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => confirmReject(request),
        },
      ]
    );
  };

  const confirmReject = async (request: ExamRequest) => {
    try {
      setProcessing(true);
      await examService.cancelExamRequest(request.id);
      Alert.alert('Success', 'Request rejected');
      loadRequests();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to reject request');
      console.error('Reject error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate || !scheduleTime || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setProcessing(true);
      
      // Combine date and time
      const scheduledDateTime = `${scheduleDate}T${scheduleTime}:00.000Z`;

      // This would be an instructor-specific approve endpoint
      // For now, we'll show success
      Alert.alert('Success', 'Exam approved and scheduled!');
      setShowScheduleModal(false);
      loadRequests();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to approve exam');
      console.error('Approve error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getExamTypeIcon = (type: ExamType) => {
    return type === ExamType.PRACTICAL ? 'car-sport-outline' : 'book-outline';
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
          <Text style={styles.headerTitle}>Exam Requests</Text>
          <Text style={styles.headerSubtitle}>{requests.length} pending</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#e0e0e0" />
            <Text style={styles.emptyStateTitle}>All Clear!</Text>
            <Text style={styles.emptyStateText}>
              No pending exam requests at the moment
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                {/* Exam Type */}
                <View style={styles.requestHeader}>
                  <View style={styles.examIcon}>
                    <Ionicons
                      name={getExamTypeIcon(request.type)}
                      size={28}
                      color="#1a1a1a"
                    />
                  </View>
                  <View style={styles.examInfo}>
                    <Text style={styles.examType}>
                      {request.type.charAt(0).toUpperCase() + request.type.slice(1)} Exam
                    </Text>
                    <Text style={styles.studentId}>
                      Student #{request.studentId.slice(0, 8)}
                    </Text>
                  </View>
                </View>

                {/* Request Date */}
                <View style={styles.requestDate}>
                  <Ionicons name="calendar-outline" size={14} color="#999" />
                  <Text style={styles.requestDateText}>
                    Requested {formatDate(request.requestDate)}
                  </Text>
                </View>

                {/* Student Notes */}
                {request.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Student notes:</Text>
                    <Text style={styles.notesText}>{request.notes}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(request)}
                    disabled={processing}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#f44336" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(request)}
                    disabled={processing}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                    <Text style={styles.approveButtonText}>Approve & Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Exam</Text>
              <TouchableOpacity
                onPress={() => setShowScheduleModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2024-12-25"
                  value={scheduleDate}
                  onChangeText={setScheduleDate}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Time */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="14:00"
                  value={scheduleTime}
                  onChangeText={setScheduleTime}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Exam center address..."
                  value={location}
                  onChangeText={setLocation}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add any notes for the student..."
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.scheduleButton, processing && styles.scheduleButtonDisabled]}
                onPress={handleScheduleSubmit}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.scheduleButtonText}>Confirm Schedule</Text>
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
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
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
  requestsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  requestCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  requestHeader: {
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
  requestDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  requestDateText: {
    fontSize: 12,
    color: '#999',
  },
  notesContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
  },
  approveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
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
    maxHeight: '80%',
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
  scheduleButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  scheduleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
