/**
 * Fiche élève côté instructeur (11.4) — trois onglets : informations, leçons, examens (P1–P7).
 * L'écran est ouvert avec `{ studentId (users.id), schoolId, studentName }` (D-28).
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StudentInfoTab } from './tabs/StudentInfoTab';
import { StudentLessonsTab } from './tabs/StudentLessonsTab';
import { StudentExamsTab } from './tabs/StudentExamsTab';
import { useI18n } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { AppBar } from '../../../components/ui';
import { Theme, textStyle } from '../../../theme';

const Tab = createMaterialTopTabNavigator();

export const StudentProfileScreen = ({ route, navigation }: any) => {
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { studentId, schoolId, studentName } = route.params;

  return (
    <View style={styles.flex}>
      <AppBar title={studentName} onBack={() => navigation.goBack()} backLabel={t('common.back')} />

      <Tab.Navigator
        screenOptions={{
          // `signalText` et non `signal` : le jaune pur serait illisible sur fond clair
          tabBarActiveTintColor: theme.colors.signalText,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarLabelStyle: { ...textStyle('label', language), fontSize: 14 },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.gauge, height: 3 },
        }}
      >
        <Tab.Screen
          name="Info"
          component={StudentInfoTab}
          initialParams={{ studentId, schoolId }}
          options={{ title: t('studentProfile.tab.info') }}
        />
        <Tab.Screen
          name="Lessons"
          component={StudentLessonsTab}
          initialParams={{ studentId, schoolId }}
          options={{ title: t('studentProfile.tab.lessons') }}
        />
        <Tab.Screen
          name="Exams"
          component={StudentExamsTab}
          initialParams={{ studentId, schoolId }}
          options={{ title: t('studentProfile.tab.exams') }}
        />
      </Tab.Navigator>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
  });
