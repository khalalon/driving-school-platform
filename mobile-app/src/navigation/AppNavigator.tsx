/**
 * App Navigator
 * Single Responsibility: Define app navigation structure
 *
 * Une pile par rôle dont la racine est une barre d'onglets (8.4) : élève Home / Lessons /
 * Exams / Profile, instructeur Today / Requests / Exams / Students. Les autres écrans
 * s'empilent au-dessus des onglets et gardent leur bouton retour.
 */

import React from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { UserRole } from '../models/User';
import { AppStackParamList, InstructorTabParamList, StudentTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';
import { Theme } from '../theme';

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
import { MySchoolScreen } from '../screens/instructor/MySchoolScreen';

const Stack = createStackNavigator<AppStackParamList>();
const StudentTab = createBottomTabNavigator<StudentTabParamList>();
const InstructorTab = createBottomTabNavigator<InstructorTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon =
  (focused: IoniconName, idle: IoniconName) =>
  ({ focused: isFocused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={isFocused ? focused : idle} size={size} color={color} />
  );

/** Onglets et en-têtes suivent les jetons du thème (11.3, D-48). */
const tabScreenOptions = (theme: Theme) => ({
  headerShown: false,
  tabBarActiveTintColor: theme.colors.signal,
  tabBarInactiveTintColor: theme.colors.textMuted,
  tabBarLabelStyle: {
    fontSize: theme.typography.size.xs,
    fontWeight: theme.typography.weight.medium,
  },
  tabBarStyle: {
    backgroundColor: theme.colors.surfaceRaised,
    borderTopColor: theme.colors.border,
  },
});

/** Thème de React Navigation : le fond des écrans et des transitions vient des mêmes jetons. */
const navigationTheme = (theme: Theme): NavigationTheme => {
  const base = theme.name === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
  return {
    ...base,
    dark: theme.name === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.signal,
      background: theme.colors.surface,
      card: theme.colors.surfaceRaised,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.danger,
    },
  };
};

const StudentTabs = () => {
  const { t } = useI18n();
  const theme = useTheme();
  return (
    <StudentTab.Navigator screenOptions={tabScreenOptions(theme)}>
      <StudentTab.Screen
        name="StudentDashboard"
        component={StudentDashboard}
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <StudentTab.Screen
        name="MyLessons"
        component={MyLessonsScreen}
        options={{ title: t('tabs.lessons'), tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <StudentTab.Screen
        name="MyExams"
        component={MyExamsScreen}
        options={{ title: t('tabs.exams'), tabBarIcon: tabIcon('ribbon', 'ribbon-outline') }}
      />
      <StudentTab.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{ title: t('tabs.profile'), tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </StudentTab.Navigator>
  );
};

const InstructorTabs = () => {
  const { t } = useI18n();
  const theme = useTheme();
  return (
    <InstructorTab.Navigator screenOptions={tabScreenOptions(theme)}>
      <InstructorTab.Screen
        name="InstructorDashboard"
        component={InstructorDashboard}
        options={{ title: t('tabs.today'), tabBarIcon: tabIcon('today', 'today-outline') }}
      />
      <InstructorTab.Screen
        name="LessonRequests"
        component={LessonRequestsScreen}
        options={{ title: t('tabs.requests'), tabBarIcon: tabIcon('time', 'time-outline') }}
      />
      <InstructorTab.Screen
        name="ExamRequests"
        component={ExamRequestsScreen}
        options={{ title: t('tabs.exams'), tabBarIcon: tabIcon('ribbon', 'ribbon-outline') }}
      />
      <InstructorTab.Screen
        name="BookForStudent"
        component={BookForStudentScreen}
        options={{ title: t('tabs.students'), tabBarIcon: tabIcon('people', 'people-outline') }}
      />
    </InstructorTab.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer theme={navigationTheme(theme)}>
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
                <Stack.Screen name="MySchool" component={MySchoolScreen} />
              </>
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
