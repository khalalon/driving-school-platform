/**
 * Onglet « Dossier » de Mon profil (16.5, D-61) — F6, en lecture seule.
 *
 * L'élève ne coche rien (D-49) : il voit ce qu'il a déjà remis et ce qu'il lui reste à
 * apporter **au bureau** de son auto-école. Un dossier incomplet n'empêche rien (D-62).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentFileService } from '../../../../services/api/StudentFileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { StudentFile, StudentFileDocument } from '../../../../models/StudentFile';
import { formatDate } from '../../../../utils/format';
import { useI18n } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';
import { Badge, Card, EmptyState, SkeletonCard } from '../../../../components/ui';
import { Theme, textStyle } from '../../../../theme';
import type { Language } from '../../../../i18n';

export const MyFileTab = ({ route }: any) => {
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  const { schoolId } = route.params;

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<StudentFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    studentFileService
      .getMyFile(schoolId)
      .then((data) => {
        if (cancelled) return;
        setFile(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, t('studentFile.loadFailed')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const renderDocument = ({ item }: { item: StudentFileDocument }) => (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.labelRow}>
          <Ionicons
            name={item.received ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={item.received ? theme.colors.successText : theme.colors.textMuted}
          />
          <Text style={styles.label}>{item.label}</Text>
        </View>
        <Badge
          label={item.received ? t('studentFile.received') : t('studentFile.notReceived')}
          tone={item.received ? 'success' : 'warning'}
          dot
        />
      </View>

      {item.received && item.receivedAt ? (
        <Text style={styles.meta}>
          {t('studentFile.receivedOn', { date: formatDate(item.receivedAt) })}
        </Text>
      ) : null}

      {item.note ? <Text style={styles.meta}>{item.note}</Text> : null}
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('studentFile.loadFailed')}
          message={error}
          tone="danger"
        />
      </View>
    );
  }

  const missing = file ? file.documents.filter((document) => !document.received).length : 0;

  return (
    <View style={styles.flex}>
      <FlatList
        data={file?.documents ?? []}
        renderItem={renderDocument}
        keyExtractor={(item) => item.documentTypeId}
        contentContainerStyle={
          (file?.documents.length ?? 0) === 0 ? styles.emptyList : styles.listContent
        }
        ListHeaderComponent={
          file && file.documents.length > 0 ? (
            <View style={styles.header} testID="my-file-header">
              <Badge
                label={missing === 0 ? t('studentFile.complete') : t('studentFile.incomplete')}
                tone={missing === 0 ? 'success' : 'warning'}
                dot
              />
              <Text style={styles.hint}>
                {missing === 0 ? t('myFile.allBrought') : t('myFile.hint')}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={t('studentFile.empty')}
            message={t('studentFile.emptyText')}
            tone="neutral"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.base,
      gap: theme.spacing.md,
    },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    header: { gap: theme.spacing.xs, paddingBottom: theme.spacing.sm },
    hint: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    card: { gap: theme.spacing.xs },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    label: { ...textStyle('bodyStrong', language), flex: 1, color: theme.colors.textPrimary },
    meta: { ...textStyle('caption', language), color: theme.colors.textSecondary },
  });
