/**
 * Catalogue arabe (D-47), RTL. Mêmes clés que `fr.ts` (test de parité).
 * Les termes métier de ce fichier **restent à valider par une école pilote** : les corriger ici
 * suffit, rien d'autre n'en dépend.
 */

import type { TranslationKey } from './fr';

export const ar: Record<TranslationKey, string> = {
  // Langue
  'language.title': 'اللغة',
  'language.french': 'Français',
  'language.arabic': 'العربية',
  'language.hint': 'يُعاد تشغيل التطبيق عند تغيير اتجاه القراءة.',

  // Vocabulaire commun
  'common.ok': 'حسناً',
  'common.cancel': 'إلغاء',
  'common.close': 'إغلاق',
  'common.retry': 'إعادة المحاولة',
  'common.save': 'حفظ',
  'common.error': 'خطأ',
  'common.success': 'تم',
  'common.required': 'حقل إلزامي',
  'common.loading': 'جارٍ التحميل…',
  'common.optional': 'اختياري',
  'common.back': 'رجوع',
};
