/**
 * Request Lesson Screen (Student)
 * Single Responsibility: Allow students to request lessons
 * Request-based system - instructor approves/schedules later
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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonService } from '../../services/api/LessonService';
import { LessonType } from '../../models/Lesson';

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  specializations: string[];
  rating: number;
  hourlyRate: number;
  yearsOfExperience: number;
}

export const RequestLessonScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [selectedType, setSelectedType] = useState<LessonType>(LessonType.PRACTICAL);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const data = await lessonService.getInstructors();
      setInstructors(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load instructors');
      console.error('Load instructors error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLesson = async () => {
    if (!selectedInstructor) {
      Alert.alert('Error', 'Please select an instructor');
      return;
    }

    Alert.alert(
      'Confirm Request',
      `Request ${selectedType} lesson with ${selectedInstructor.firstName} ${selectedInstructor.lastName}?\n\nThe instructor will review and schedule your lesson.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => confirmRequest(),
        },
      ]
    );
  };

  const confirmRequest = async () => {
    try {
      setRequesting(true);
      await lessonService.requestLesson({
        instructorId: selectedInstructor!.id,
        type: selectedType,
        notes,
      });

      Alert.alert(
        'Request Sent!',
        'Your lesson request has been submitted. You will be notified when the instructor approves and schedules it.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyLessons'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send request');
      console.error('Request lesson error:', error);
    } finally {
      setRequesting(false);
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
        <Text style={styles.headerTitle}>Request Lesson</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Submit a lesson request. The instructor will review, approve, and schedule a date and time for you.
            </Text>
          </View>
        </View>

        {/* Lesson Type Selection */}
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

        {/* Select Instructor */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Instructor</Text>
          {instructors.map((instructor) => (
            <TouchableOpacity
              key={instructor.id}
              style={[
                styles.instructorCard,
                selectedInstructor?.id === instructor.id && styles.instructorCardActive,
              ]}
              onPress={() => setSelectedInstructor(instructor)}
            >
              <View style={styles.instructorAvatar}>
                <Ionicons name="person" size={24} color="#666" />
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>
                  {instructor.firstName} {instructor.lastName}
                </Text>
                <View style={styles.instructorMeta}>
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color="#FFB300" />
                    <Text style={styles.ratingText}>{instructor.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.metaText}>•</Text>
                  <Text style={styles.metaText}>{instructor.yearsOfExperience} years</Text>
                </View>
                <Text style={styles.specialization}>
                  {instructor.specializations.join(', ')}
                </Text>
              </View>
              <View style={styles.instructorPrice}>
                <Text style={styles.priceAmount}>${instructor.hourlyRate}</Text>
                <Text style={styles.priceLabel}>per hour</Text>
              </View>
              {selectedInstructor?.id === instructor.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        {selectedInstructor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Preferred times, special requests, etc..."
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      {selectedInstructor && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              requesting && styles.submitButtonDisabled,
            ]}
            onPress={handleRequestLesson}
            disabled={requesting}
          >
            {requesting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Send Request</Text>
                <Ionicons name="send" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
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
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
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
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  instructorCardActive: {
    backgroundColor: '#ffffff',
    borderColor: '#1a1a1a',
  },
  instructorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  instructorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  specialization: {
    fontSize: 12,
    color: '#999',
  },
  instructorPrice: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  priceLabel: {
    fontSize: 11,
    color: '#666',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 100,
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
