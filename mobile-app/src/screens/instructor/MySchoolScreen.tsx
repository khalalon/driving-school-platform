/**
 * Mon école (12.5, 16.4) — S2 en lecture, S7 pour la fiche, S8 / S9 pour la grille tarifaire,
 * F1–F4 pour les pièces du dossier administratif.
 *
 * L'école reste **créée par l'administrateur** (D-51) : cet écran ne crée ni ne supprime une
 * école, il corrige la fiche et tient les tarifs. Tout est cloisonné côté serveur à l'école de
 * l'instructeur (403 `FORBIDDEN_SCHOOL` sinon, D-20) ; `schoolId` vient de A3.
 * Depuis 14.4 (D-56), seul le **gérant** modifie la fiche et les tarifs : un simple moniteur voit
 * l'école en lecture seule (boutons masqués, mention « réservé au gérant »). Les pièces du
 * dossier suivent la même règle (D-56 (b)) : tout instructeur les lit, le gérant seul les tient.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useIsManager } from '../../hooks/useIsManager';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonCard,
} from '../../components/ui';
import { schoolService } from '../../services/api/SchoolService';
import { studentFileService } from '../../services/api/StudentFileService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { School, SchoolPricing } from '../../models/School';
import { DocumentType } from '../../models/StudentFile';
import { lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { formatAmount } from '../../utils/format';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';

/** Libellé d'une pièce : au moins deux caractères, comme le backend l'exige (F2, F3). */
const MIN_DOCUMENT_LABEL = 2;
/** Devise : trois lettres, comme le backend l'exige (D-43). */
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const DEFAULT_DURATION_MINUTES = 60;

export const MySchoolScreen = ({ navigation }: any) => {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  const { showToast } = useToast();
  const schoolId = user?.schoolId ?? null;
  // Fiche et tarifs : réservés au gérant (D-56) ; un moniteur voit l'école en lecture seule
  const canManage = useIsManager();

  const [school, setSchool] = useState<School | null>(null);
  const [pricing, setPricing] = useState<SchoolPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Édition de la fiche : les champs ne s'affichent qu'une fois « Modifier » demandé
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('');

  // Pièces du dossier (F1–F4) : ajout, ou renommage de la pièce dont l'identifiant est retenu
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [documentFormOpen, setDocumentFormOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [documentLabel, setDocumentLabel] = useState('');

  // Ajout d'un tarif
  const [addingPricing, setAddingPricing] = useState(false);
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.CODE);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    try {
      const [schoolData, pricingData, documentData] = await Promise.all([
        schoolService.getSchoolById(schoolId),
        schoolService.getSchoolPricing(schoolId).catch(() => []),
        // Une liste de pièces indisponible ne doit pas masquer la fiche de l'école
        studentFileService.getDocumentTypes(schoolId).catch(() => [] as DocumentType[]),
      ]);
      setSchool(schoolData);
      setPricing(pricingData);
      setDocuments(documentData);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('mySchool.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startEditing = (current: School) => {
    setName(current.name);
    setAddress(current.address);
    setPhone(current.phone);
    setEmail(current.email);
    setCurrency(current.currency);
    setEditing(true);
  };

  /** S7 : seuls les champs réellement modifiés partent, pour ne rien écraser par mégarde. */
  const saveSchool = async () => {
    if (!school || !schoolId) return;
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('mySchool.nameRequired'));
      return;
    }
    if (!CURRENCY_PATTERN.test(currency.trim())) {
      Alert.alert(t('common.error'), t('mySchool.currencyInvalid'));
      return;
    }

    const changes = {
      ...(name.trim() !== school.name ? { name: name.trim() } : {}),
      ...(address.trim() !== school.address ? { address: address.trim() } : {}),
      ...(phone.trim() !== school.phone ? { phone: phone.trim() } : {}),
      ...(email.trim() !== school.email ? { email: email.trim() } : {}),
      ...(currency.trim().toUpperCase() !== school.currency
        ? { currency: currency.trim().toUpperCase() }
        : {}),
    };

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const updated = await schoolService.updateSchool(schoolId, changes);
      setSchool(updated);
      setEditing(false);
      showToast(t('mySchool.saved'));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('mySchool.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  /** S8 : upsert par type — un type déjà tarifé voit son tarif remplacé, jamais dupliqué. */
  const savePricing = async () => {
    if (!schoolId) return;
    const priceValue = Number(price.replace(',', '.'));
    const durationValue = Number.parseInt(duration, 10);
    if (!Number.isFinite(priceValue) || priceValue <= 0 || !(durationValue > 0)) {
      Alert.alert(t('common.error'), t('mySchool.pricingInvalid'));
      return;
    }

    try {
      setSaving(true);
      await schoolService.setPricing(schoolId, {
        lessonType,
        price: priceValue,
        duration: durationValue,
      });
      setAddingPricing(false);
      setPrice('');
      setDuration(String(DEFAULT_DURATION_MINUTES));
      showToast(t('mySchool.pricingSaved'));
      load();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('mySchool.pricingSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  /** S9 : retirer un tarif se confirme — les prochaines leçons devront être chiffrées à la main. */
  const removePricing = (item: SchoolPricing) => {
    Alert.alert(t('mySchool.removePricingTitle'), t('mySchool.removePricingConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('mySchool.removePricing'),
        style: 'destructive',
        onPress: async () => {
          try {
            await schoolService.deletePricing(item.id);
            showToast(t('mySchool.pricingRemoved'));
            load();
          } catch (error) {
            Alert.alert(
              t('common.error'),
              getApiErrorMessage(error, t('mySchool.pricingRemoveFailed'))
            );
          }
        },
      },
    ]);
  };

  /**
   * F2 / F3 : le même formulaire ajoute une pièce ou renomme celle qu'on a choisie. Un libellé
   * déjà retiré revient actif côté serveur — c'est voulu (D-61), pas un doublon.
   */
  const saveDocument = async () => {
    if (!schoolId) return;
    const label = documentLabel.trim();
    if (label.length < MIN_DOCUMENT_LABEL) {
      Alert.alert(t('common.error'), t('mySchool.documentInvalid'));
      return;
    }

    try {
      setSaving(true);
      if (renamingId) {
        await studentFileService.renameDocumentType(renamingId, label);
      } else {
        await studentFileService.addDocumentType(schoolId, label);
      }
      setDocuments(await studentFileService.getDocumentTypes(schoolId));
      closeDocumentForm();
      showToast(t('mySchool.documentSaved'));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('mySchool.documentSaveFailed')));
    } finally {
      setSaving(false);
    }
  };

  /** F4 : la pièce est désactivée, pas supprimée — les dossiers déjà cochés gardent leur trace. */
  const removeDocument = (item: DocumentType) => {
    Alert.alert(t('mySchool.removeDocumentTitle'), t('mySchool.removeDocumentConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('mySchool.removeDocument'),
        style: 'destructive',
        onPress: async () => {
          try {
            await studentFileService.removeDocumentType(item.id);
            setDocuments((current) => current.filter((document) => document.id !== item.id));
            showToast(t('mySchool.documentRemoved'));
          } catch (error) {
            Alert.alert(
              t('common.error'),
              getApiErrorMessage(error, t('mySchool.documentRemoveFailed'))
            );
          }
        },
      },
    ]);
  };

  const openDocumentForm = (item?: DocumentType) => {
    setRenamingId(item?.id ?? null);
    setDocumentLabel(item?.label ?? '');
    setDocumentFormOpen(true);
  };

  const closeDocumentForm = () => {
    setDocumentFormOpen(false);
    setRenamingId(null);
    setDocumentLabel('');
  };

  const alreadyPriced = pricing.some((item) => item.lessonType === lessonType);

  const renderDetails = (current: School) => (
    <Card style={styles.card}>
      <SectionHeader
        title={t('mySchool.details')}
        icon="business-outline"
        action={
          editing || !canManage
            ? undefined
            : { label: t('mySchool.edit'), onPress: () => startEditing(current) }
        }
      />
      {canManage ? null : (
        <Text style={styles.readOnly} testID="my-school-read-only">
          {t('mySchool.managerOnly')}
        </Text>
      )}

      {editing ? (
        <>
          <Field label={t('mySchool.name')} value={name} onChangeText={setName} />
          <Field
            label={t('mySchool.address')}
            value={address}
            onChangeText={setAddress}
            icon="location-outline"
          />
          <Field
            label={t('mySchool.phone')}
            value={phone}
            onChangeText={setPhone}
            icon="call-outline"
            keyboardType="phone-pad"
          />
          <Field
            label={t('mySchool.email')}
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={t('mySchool.currency')}
            hint={t('mySchool.currencyHint')}
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
          />

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={() => setEditing(false)}
              variant="secondary"
              style={styles.action}
            />
            <Button
              title={t('common.save')}
              onPress={saveSchool}
              loading={saving}
              style={styles.action}
            />
          </View>
        </>
      ) : (
        <>
          <InfoRow label={t('mySchool.name')} value={current.name} styles={styles} />
          <InfoRow label={t('mySchool.address')} value={current.address} styles={styles} />
          <InfoRow label={t('mySchool.phone')} value={current.phone} styles={styles} />
          <InfoRow label={t('mySchool.email')} value={current.email} styles={styles} />
          <InfoRow label={t('mySchool.currency')} value={current.currency} styles={styles} />
        </>
      )}
    </Card>
  );

  const renderPricing = (current: School) => (
    <Card style={styles.card} padded={false}>
      <View style={styles.pricingHeader}>
        <SectionHeader
          title={t('mySchool.pricing')}
          subtitle={t('mySchool.pricingHint')}
          icon="pricetags-outline"
          action={
            addingPricing || !canManage
              ? undefined
              : { label: t('mySchool.addPricing'), onPress: () => setAddingPricing(true) }
          }
        />
      </View>

      {addingPricing ? (
        <View style={styles.pricingForm}>
          <Text style={styles.label}>{t('mySchool.pricingType')}</Text>
          <View style={styles.types}>
            {LESSON_TYPES.map((type) => (
              <Chip
                key={type}
                label={lessonTypeLabel(type)}
                selected={lessonType === type}
                onPress={() => setLessonType(type)}
              />
            ))}
          </View>
          {alreadyPriced ? (
            <Text style={styles.warning}>{t('mySchool.pricingReplaced')}</Text>
          ) : null}

          <Field
            label={`${t('mySchool.pricingPrice')} (${current.currency})`}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            icon="cash-outline"
          />
          <Field
            label={t('mySchool.pricingDuration')}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            icon="hourglass-outline"
          />

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={() => setAddingPricing(false)}
              variant="secondary"
              style={styles.action}
            />
            <Button
              title={t('common.save')}
              onPress={savePricing}
              loading={saving}
              style={styles.action}
            />
          </View>
        </View>
      ) : null}

      {pricing.length === 0 && !addingPricing ? (
        <EmptyState
          icon="pricetags-outline"
          title={t('mySchool.noPricing')}
          tone="neutral"
          action={{ label: t('mySchool.addPricing'), onPress: () => setAddingPricing(true) }}
        />
      ) : (
        pricing.map((item, index) => (
          <ListRow
            key={item.id}
            title={lessonTypeLabel(item.lessonType) ?? item.lessonType}
            subtitle={t('format.minutes', { count: item.duration })}
            icon="pricetag"
            tone="success"
            style={index === pricing.length - 1 ? styles.rowLast : styles.row}
            trailing={
              <View style={styles.pricingTrailing}>
                <Badge label={formatAmount(item.price, current.currency)} tone="success" />
                {canManage ? (
                  <Button
                    title={t('mySchool.removePricing')}
                    onPress={() => removePricing(item)}
                    variant="ghost"
                    size="sm"
                  />
                ) : null}
              </View>
            }
          />
        ))
      )}
    </Card>
  );

  /** F1–F4 : la liste que l'instructeur cochera dans la fiche élève (16.4). */
  const renderDocuments = () => (
    <Card style={styles.card} padded={false}>
      <View style={styles.pricingHeader}>
        <SectionHeader
          title={t('mySchool.documents')}
          subtitle={t('mySchool.documentsHint')}
          icon="document-text-outline"
          action={
            documentFormOpen || !canManage
              ? undefined
              : { label: t('mySchool.addDocument'), onPress: () => openDocumentForm() }
          }
        />
      </View>

      {documentFormOpen ? (
        <View style={styles.pricingForm}>
          <Field
            label={t('mySchool.documentLabel')}
            value={documentLabel}
            onChangeText={setDocumentLabel}
            placeholder={t('mySchool.documentPlaceholder')}
            icon="document-text-outline"
          />
          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={closeDocumentForm}
              variant="secondary"
              style={styles.action}
            />
            <Button
              title={t('common.save')}
              onPress={saveDocument}
              loading={saving}
              style={styles.action}
            />
          </View>
        </View>
      ) : null}

      {documents.length === 0 && !documentFormOpen ? (
        <EmptyState
          icon="document-text-outline"
          title={t('mySchool.noDocuments')}
          tone="neutral"
          action={
            canManage
              ? { label: t('mySchool.addDocument'), onPress: () => openDocumentForm() }
              : undefined
          }
        />
      ) : (
        documents.map((item, index) => (
          <ListRow
            key={item.id}
            title={item.label}
            icon="document-text"
            tone="accent"
            style={index === documents.length - 1 ? styles.rowLast : styles.row}
            trailing={
              canManage ? (
                <View style={styles.pricingTrailing}>
                  <Button
                    title={t('mySchool.renameDocument')}
                    onPress={() => openDocumentForm(item)}
                    variant="ghost"
                    size="sm"
                  />
                  <Button
                    title={t('mySchool.removeDocument')}
                    onPress={() => removeDocument(item)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              ) : undefined
            }
          />
        ))
      )}
    </Card>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </>
      );
    }
    if (!schoolId || !school) {
      return (
        <EmptyState
          icon="business-outline"
          title={t('mySchool.noSchool')}
          message={t('mySchool.noSchoolText')}
          tone="danger"
          action={{ label: t('common.retry'), onPress: load }}
        />
      );
    }
    return (
      <>
        {renderDetails(school)}
        {renderPricing(school)}
        {renderDocuments()}
      </>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('mySchool.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />
      <Screen
        contentContainerStyle={styles.content}
        edges={[]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.signal]}
            tintColor={theme.colors.signal}
          />
        }
      >
        {renderBody()}
      </Screen>
    </View>
  );
};

/** Une ligne « libellé / valeur » de la fiche en lecture. */
const InfoRow = ({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.md },
    card: { gap: theme.spacing.sm },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
    infoLabel: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    infoValue: {
      ...textStyle('caption', language),
      flexShrink: 1,
      textAlign: 'right',
      color: theme.colors.textPrimary,
    },
    actions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
    action: { flex: 1 },
    pricingHeader: { padding: theme.spacing.base, paddingBottom: theme.spacing.sm },
    pricingForm: {
      paddingHorizontal: theme.spacing.base,
      paddingBottom: theme.spacing.base,
      gap: theme.spacing.sm,
    },
    label: {
      ...textStyle('label', language),
      color: theme.colors.textSecondary,
    },
    types: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
    warning: { ...textStyle('caption', language), color: theme.colors.warningText },
    readOnly: { ...textStyle('caption', language), color: theme.colors.textMuted },
    row: {
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLast: { paddingHorizontal: theme.spacing.base },
    pricingTrailing: { alignItems: 'flex-end', gap: theme.spacing.xs },
  });
