/**
 * My Profile Screen (Student Self-View)
 * Tab Navigator with 3 tabs: Progress, Lessons, Exams
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MyProgressTab } from './tabs/MyProgressTab';
import { MyLessonsPaymentTab } from './tabs/MyLessonsPaymentTab';
import { MyExamsPaymentTab } from './tabs/MyExamsPaymentTab';
import { colors, typography, spacing } from '../../../theme';

const Tab = createMaterialTopTabNavigator();

export const MyProfileScreen = ({ route, navigation }: any) => {
  const { schoolId } = route.params;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* Tab Navigator */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary[600],
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarLabelStyle: {
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold,
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: colors.background.primary,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.neutral[200],
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary[600],
            height: 3,
          },
        }}
      >
        <Tab.Screen
          name="Progress"
          component={MyProgressTab}
          initialParams={{ schoolId }}
        />
        <Tab.Screen
          name="Lessons"
          component={MyLessonsPaymentTab}
          initialParams={{ schoolId }}
        />
        <Tab.Screen
          name="Exams"
          component={MyExamsPaymentTab}
          initialParams={{ schoolId }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
});
