/**
 * App Navigator
 * Single Responsibility: Define app navigation structure
 *
 * Une pile par rôle dont la racine est une barre d'onglets (8.4) : élève Home / Lessons /
 * Exams / Profile, instructeur Today / Requests / Exams / Students. Les autres écrans
 * s'empilent au-dessus des onglets et gardent leur bouton retour.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../models/User';
import { AppStackParamList, InstructorTabParamList, StudentTabParamList } from './types';
import { colors, typography } from '../theme';

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
import { MyProfileScreen } from '../screens/student/my-profile/MyProfileScreen';

// Instructor Screens
import { InstructorDashboard } from '../screens/instructor/InstructorDashboard';
import { TodayLessonsScreen } from '../screens/instructor/TodayLessonsScreen';
import { LessonRequestsScreen } from '../screens/instructor/LessonRequestsScreen';
import { BookForStudentScreen } from '../screens/instructor/BookForStudentScreen';
import { TodayExamsScreen } from '../screens/instructor/TodayExamsScreen';
import { ExamRequestsScreen } from '../screens/instructor/ExamRequestsScreen';
import { EnrollmentRequestsScreen } from '../screens/instructor/EnrollmentRequestsScreen';
import { StudentProfileScreen } from '../screens/instructor/student-profile/StudentProfileScreen';

const Stack = createStackNavigator<AppStackParamList>();
const StudentTab = createBottomTabNavigator<StudentTabParamList>();
const InstructorTab = createBottomTabNavigator<InstructorTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (focused: IoniconName, idle: IoniconName) =>
  ({ focused: isFocused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={isFocused ? focused : idle} size={size} color={color} />
  );

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary[600],
  tabBarInactiveTintColor: colors.text.tertiary,
  tabBarLabelStyle: { fontSize: typography.size.xs, fontWeight: typography.weight.medium },
  tabBarStyle: {
    backgroundColor: colors.background.primary,
    borderTopColor: colors.border.default,
  },
};

const StudentTabs = () => (
  <StudentTab.Navigator screenOptions={tabScreenOptions}>
    <StudentTab.Screen
      name="StudentDashboard"
      component={StudentDashboard}
      options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
    />
    <StudentTab.Screen
      name="MyLessons"
      component={MyLessonsScreen}
      options={{ title: 'Lessons', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
    />
    <StudentTab.Screen
      name="MyExams"
      component={MyExamsScreen}
      options={{ title: 'Exams', tabBarIcon: tabIcon('ribbon', 'ribbon-outline') }}
    />
    <StudentTab.Screen
      name="MyProfile"
      component={MyProfileScreen}
      options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }}
    />
  </StudentTab.Navigator>
);

const InstructorTabs = () => (
  <InstructorTab.Navigator screenOptions={tabScreenOptions}>
    <InstructorTab.Screen
      name="InstructorDashboard"
      component={InstructorDashboard}
      options={{ title: 'Today', tabBarIcon: tabIcon('today', 'today-outline') }}
    />
    <InstructorTab.Screen
      name="LessonRequests"
      component={LessonRequestsScreen}
      options={{ title: 'Requests', tabBarIcon: tabIcon('time', 'time-outline') }}
    />
    <InstructorTab.Screen
      name="ExamRequests"
      component={ExamRequestsScreen}
      options={{ title: 'Exams', tabBarIcon: tabIcon('ribbon', 'ribbon-outline') }}
    />
    <InstructorTab.Screen
      name="BookForStudent"
      component={BookForStudentScreen}
      options={{ title: 'Students', tabBarIcon: tabIcon('people', 'people-outline') }}
    />
  </InstructorTab.Navigator>
);

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
            <Stack.Screen name="InstructorRegistration" component={InstructorRegistrationScreen} />
          </>
        ) : (
          <>
            {user?.role === UserRole.STUDENT ? (
              <>
                <Stack.Screen name="StudentTabs" component={StudentTabs} />
                <Stack.Screen name="SchoolsList" component={SchoolsListScreen} />
                <Stack.Screen name="SchoolDetail" component={SchoolDetailScreen} />
                <Stack.Screen name="BookLesson" component={BookLessonScreen} />
                <Stack.Screen name="RequestExam" component={RequestExamScreen} />
                <Stack.Screen name="MyEnrollmentRequests" component={MyEnrollmentRequestsScreen} />
              </>
            ) : user?.role === UserRole.INSTRUCTOR ? (
              <>
                <Stack.Screen name="InstructorTabs" component={InstructorTabs} />
                <Stack.Screen name="TodayLessons" component={TodayLessonsScreen} />
                <Stack.Screen name="TodayExams" component={TodayExamsScreen} />
                <Stack.Screen name="EnrollmentRequests" component={EnrollmentRequestsScreen} />
                <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
              </>
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
