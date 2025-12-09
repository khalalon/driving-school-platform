/**
 * App Navigator
 * Single Responsibility: Define app navigation structure
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../models/User';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { InstructorRegistrationScreen } from '../screens/auth/InstructorRegistrationScreen';

// Student Screens
import { StudentDashboard } from '../screens/student/StudentDashboard';
import { SchoolsListScreen } from '../screens/student/SchoolsListScreen';
import { SchoolDetailScreen } from '../screens/student/SchoolDetailScreen';
import { BookLessonScreen } from '../screens/student/BookLessonScreen';
import { MyLessonsScreen } from '../screens/student/MyLessonsScreen';
import { RequestExamScreen } from '../screens/student/RequestExamScreen';
import { MyExamsScreen } from '../screens/student/MyExamsScreen';
import { MyEnrollmentRequestsScreen } from '../screens/student/MyEnrollmentRequestsScreen';

// Instructor Screens
import { InstructorDashboard } from '../screens/instructor/InstructorDashboard';
import { TodayLessonsScreen } from '../screens/instructor/TodayLessonsScreen';
import { LessonRequestsScreen } from '../screens/instructor/LessonRequestsScreen';
import { BookForStudentScreen } from '../screens/instructor/BookForStudentScreen';
import { TodayExamsScreen } from '../screens/instructor/TodayExamsScreen';
import { ExamRequestsScreen } from '../screens/instructor/ExamRequestsScreen';
import { EnrollmentRequestsScreen } from '../screens/instructor/EnrollmentRequestsScreen';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen 
              name="InstructorRegistration" 
              component={InstructorRegistrationScreen} 
            />
          </>
        ) : (
          <>
            {user?.role === UserRole.STUDENT ? (
              <>
                <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
                <Stack.Screen name="SchoolsList" component={SchoolsListScreen} />
                <Stack.Screen name="SchoolDetail" component={SchoolDetailScreen} />
                <Stack.Screen name="BookLesson" component={BookLessonScreen} />
                <Stack.Screen name="MyLessons" component={MyLessonsScreen} />
                <Stack.Screen name="RequestExam" component={RequestExamScreen} />
                <Stack.Screen name="MyExams" component={MyExamsScreen} />
                <Stack.Screen 
                  name="MyEnrollmentRequests" 
                  component={MyEnrollmentRequestsScreen} 
                />
              </>
            ) : user?.role === UserRole.INSTRUCTOR ? (
              <>
                <Stack.Screen name="InstructorDashboard" component={InstructorDashboard} />
                <Stack.Screen name="TodayLessons" component={TodayLessonsScreen} />
                <Stack.Screen name="LessonRequests" component={LessonRequestsScreen} />
                <Stack.Screen name="BookForStudent" component={BookForStudentScreen} />
                <Stack.Screen name="TodayExams" component={TodayExamsScreen} />
                <Stack.Screen name="ExamRequests" component={ExamRequestsScreen} />
                <Stack.Screen 
                  name="EnrollmentRequests" 
                  component={EnrollmentRequestsScreen} 
                />
              </>
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
