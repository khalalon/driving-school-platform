/**
 * Onglet « Dossier » de la fiche élève (16.4, D-61) — F5 et F7.
 *
 * Pas d'envoi de fichier (D-49) : l'instructeur coche ce que l'élève a **apporté au bureau**,
 * avec une note facultative. Un dossier incomplet n'empêche rien (D-62) : l'en-tête informe,
 * c'est tout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentFileService } from '../../../../services/api/StudentFileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { StudentFile, StudentFileDocument } from '../../../../models/StudentFile';
import { formatDate } from '../../../../utils/format';
import { useI18n } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { useTheme } from '../../../../context/ThemeContext';
import { Badge, Button, Card, EmptyState, Field, SkeletonCard } from '../../../../components/ui';
import { Theme, textStyle } from '../../../../theme';
import type { Language } from '../../../../i18n';

export const StudentFileTab = ({ route }: any) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  const { studentId, schoolId } = route.params;

  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<StudentFile | null>(null);
  const [selected, setSelected] = useState<StudentFileDocument | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFile();
  }, []);

  const loadFile = async () => {
    try {
      setLoading(true);
      setFile(await studentFileService.getStudentFile(studentId, schoolId));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentFile.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  /** Cocher passe par la fenêtre (la note se saisit là) ; décocher est immédiat. */
  const save = async (document: StudentFileDocument, received: boolean, withNote?: string) => {
    try {
      setSaving(true);
      setFile(
        await studentFileService.setDocumentReceived(
          studentId,
          schoolId,
          document.documentTypeId,
          received,
          withNote
        )
      );
      setSelected(null);
      setNote('');
      showToast(t('studentFile.saved'));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentFile.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

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

      {item.note ? (
        <View style={styles.quote}>
          <Text style={styles.quoteLabel}>{t('studentFile.noteLabel')}</Text>
          <Text style={styles.quoteText}>{item.note}</Text>
        </View>
      ) : null}

      <Button
        title={item.received ? t('studentFile.markNotReceived') : t('studentFile.markReceived')}
        onPress={() => {
          if (item.received) {
            save(item, false);
            return;
          }
          setSelected(item);
          setNote('');
        }}
        size="sm"
        variant={item.received ? 'secondary' : 'primary'}
        icon={item.received ? 'close-circle-outline' : 'checkmark-circle-outline'}
      />
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
            <View style={styles.header} testID="student-file-header">
              <Badge
                label={missing === 0 ? t('studentFile.complete') : t('studentFile.incomplete')}
                tone={missing === 0 ? 'success' : 'warning'}
                dot
              />
              <Text style={styles.hint}>
                {missing === 0
                  ? t('studentFile.hint')
                  : t('studentFile.missingCount', { count: missing })}
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

      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('studentFile.modalTitle')}</Text>
            <Text style={styles.meta}>{selected?.label}</Text>

            <Field
              label={t('studentFile.noteLabel')}
              placeholder={t('studentFile.notePlaceholder')}
              value={note}
              onChangeText={setNote}
              multiline
              icon="create-outline"
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setSelected(null)}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('studentFile.confirm')}
                onPress={() => selected && save(selected, true, note.trim() || undefined)}
                loading={saving}
                style={styles.action}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
    card: { gap: theme.spacing.sm },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    label: { ...textStyle('bodyStrong', language), flex: 1, color: theme.colors.textPrimary },
    meta: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    quote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteLabel: { ...textStyle('caption', language), color: theme.colors.textMuted },
    quoteText: { ...textStyle('caption', language), color: theme.colors.textPrimary },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { gap: theme.spacing.md },
    modalTitle: { ...textStyle('heading', language), color: theme.colors.textPrimary },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
  });
