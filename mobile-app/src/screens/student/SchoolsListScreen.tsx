/**
 * Liste des auto-écoles (11.3) — S1 : le point de départ d'un élève sans inscription.
 * Une carte par école, ouverte d'un doigt ; le chargement montre des squelettes à la forme
 * des cartes, la liste vide propose de réessayer plutôt que de constater le vide.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { schoolService } from '../../services/api/SchoolService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Card, EmptyState, SkeletonCard } from '../../components/ui';
import { School } from '../../models/School';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const SchoolsListScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await schoolService.getAllSchools();
      setSchools(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('schools.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSchools();
    setRefreshing(false);
  }, []);

  const renderSchoolCard = ({ item }: { item: School }) => (
    <Card
      onPress={() => navigation.navigate('SchoolDetail', { schoolId: item.id })}
      accessibilityLabel={item.name}
      style={styles.schoolCard}
    >
      <View style={styles.logo}>
        <Ionicons name="business" size={26} color={theme.colors.signalText} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="call-outline" size={15} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {item.phone}
          </Text>
        </View>
      </View>

      <Ionicons name={mirrorIcon('chevron-forward')} size={20} color={theme.colors.textMuted} />
    </Card>
  );

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('schools.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      {loading && schools.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : (
        <FlatList
          data={schools}
          renderItem={renderSchoolCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={schools.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title={t('schools.emptyTitle')}
              message={t('schools.emptyText')}
              action={{ label: t('common.retry'), onPress: loadSchools }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.signal]}
              tintColor={theme.colors.signal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    schoolCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    logo: {
      width: 52,
      height: 52,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.signalSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
  });
