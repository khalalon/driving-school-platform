/**
 * Mon école (12.5) — S2 en lecture, S7 pour la fiche, S8 et S9 pour la grille tarifaire.
 *
 * L'école reste **créée par l'administrateur** (D-51) : cet écran ne crée ni ne supprime une
 * école, il corrige la fiche et tient les tarifs. Tout est cloisonné côté serveur à l'école de
 * l'instructeur (403 `FORBIDDEN_SCHOOL` sinon, D-20) ; `schoolId` vient de A3.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
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
import { getApiErrorMessage } from '../../services/api/ApiError';
import { School, SchoolPricing } from '../../models/School';
import { lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { formatAmount } from '../../utils/format';
import { Theme } from '../../theme';

/** Devise : trois lettres, comme le backend l'exige (D-43). */
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const DEFAULT_DURATION_MINUTES = 60;

export const MySchoolScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { showToast } = useToast();
  const schoolId = user?.schoolId ?? null;

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
      const [schoolData, pricingData] = await Promise.all([
        schoolService.getSchoolById(schoolId),
        schoolService.getSchoolPricing(schoolId).catch(() => []),
      ]);
      setSchool(schoolData);
      setPricing(pricingData);
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

  const alreadyPriced = pricing.some((item) => item.lessonType === lessonType);

  const renderDetails = (current: School) => (
    <Card style={styles.card}>
      <SectionHeader
        title={t('mySchool.details')}
        icon="business-outline"
        action={
          editing ? undefined : { label: t('mySchool.edit'), onPress: () => startEditing(current) }
        }
      />

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
            addingPricing
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
                <Button
                  title={t('mySchool.removePricing')}
                  onPress={() => removePricing(item)}
                  variant="ghost"
                  size="sm"
                />
              </View>
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.md },
    card: { gap: theme.spacing.sm },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
    infoLabel: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    infoValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
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
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    types: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
    warning: { fontSize: theme.typography.size.xs, color: theme.colors.warningText },
    row: {
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLast: { paddingHorizontal: theme.spacing.base },
    pricingTrailing: { alignItems: 'flex-end', gap: theme.spacing.xs },
  });
