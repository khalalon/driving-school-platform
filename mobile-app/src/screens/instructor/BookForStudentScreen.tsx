/**
 * Book For Student Screen (Instructor)
 * Single Responsibility: Allow instructors to book lessons directly for students
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonService } from '../../services/api/LessonService';
import { LessonType } from '../../models/Lesson';

export const BookForStudentScreen = ({ navigation }: any) => {
  const [booking, setBooking] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [selectedType, setSelectedType] = useState<LessonType>(LessonType.PRACTICAL);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleBookLesson = async () => {
    if (!studentId || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setBooking(true);

      // Combine date and time
      const startDateTime = `${scheduleDate}T${scheduleStartTime}:00.000Z`;
      const endDateTime = `${scheduleDate}T${scheduleEndTime}:00.000Z`;

      await lessonService.bookLessonForStudent({
        studentId,
        type: selectedType,
        startTime: startDateTime,
        endTime: endDateTime,
        notes,
      });

      Alert.alert(
        'Success',
        'Lesson booked successfully for student!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to book lesson');
      console.error('Book lesson error:', error);
    } finally {
      setBooking(false);
    }
  };

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
        <Text style={styles.headerTitle}>Book for Student</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color="#4CAF50" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Direct Booking</Text>
            <Text style={styles.infoText}>
              Book a lesson directly for a student without requiring a request. The lesson will be immediately scheduled.
            </Text>
          </View>
        </View>

        {/* Student ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Student ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter student ID..."
              value={studentId}
              onChangeText={setStudentId}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Lesson Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lesson Type</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === LessonType.PRACTICAL && styles.typeButtonActive,
              ]}
              onPress={() => setSelectedType(LessonType.PRACTICAL)}
            >
              <Ionicons
                name="car-sport-outline"
                size={24}
                color={selectedType === LessonType.PRACTICAL ? '#ffffff' : '#666'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === LessonType.PRACTICAL && styles.typeButtonTextActive,
                ]}
              >
                Practical
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                selectedType === LessonType.THEORY && styles.typeButtonActive,
              ]}
              onPress={() => setSelectedType(LessonType.THEORY)}
            >
              <Ionicons
                name="book-outline"
                size={24}
                color={selectedType === LessonType.THEORY ? '#ffffff' : '#666'}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === LessonType.THEORY && styles.typeButtonTextActive,
                ]}
              >
                Theory
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

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

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="10:00"
              value={scheduleStartTime}
              onChangeText={setScheduleStartTime}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="11:00"
              value={scheduleEndTime}
              onChangeText={setScheduleEndTime}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bookButton, booking && styles.bookButtonDisabled]}
          onPress={handleBookLesson}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Book Lesson</Text>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#4CAF50',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
    minHeight: 100,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 18,
  },
  bookButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
