/**
 * Catalogue arabe (D-47), RTL. Mêmes clés que `fr.ts` (test de parité).
 *
 * Les termes métier de ce fichier (types de leçon, examens, ATTT) **restent à valider par une
 * école pilote** : les corriger ici suffit, aucun autre fichier n'en dépend et les valeurs
 * échangées avec le backend ne changent jamais (D-18).
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

  // Types de leçon (valeurs en base inchangées, D-18)
  'lesson.type.CODE': 'قانون السير',
  'lesson.type.MANOEUVRE': 'المناورات',
  'lesson.type.PARC': 'الحلبة',

  // États d'une leçon
  'lesson.status.pending': 'في الانتظار',
  'lesson.status.scheduled': 'مُبرمجة',
  'lesson.status.completed': 'أُنجزت',
  'lesson.status.cancelled': 'مُلغاة',
  'lesson.status.rejected': 'مرفوضة',

  // Examens
  'exam.type.theory': 'قانون السير',
  'exam.type.practical': 'السياقة',
  'exam.status.pending': 'في الانتظار',
  'exam.status.scheduled': 'مُبرمج',
  'exam.status.completed': 'اجتيز',
  'exam.status.cancelled': 'مُلغى',
  'exam.status.rejected': 'مرفوض',
  'exam.result.pending': 'في الانتظار',
  'exam.result.passed': 'ناجح',
  'exam.result.failed': 'راسب',

  // Procédure « l'école fixe la date » (théorie, D-42)
  'exam.procedure.school.scheduleAction': 'برمجة',
  'exam.procedure.school.scheduleHint': 'حدّد تاريخ الامتحان وساعته ومكانه',
  'exam.procedure.school.dateLabel': 'تاريخ الامتحان',
  'exam.procedure.school.locationLabel': 'المكان',
  'exam.procedure.school.locationPlaceholder': 'مثال: مركز الامتحان الرئيسي',
  'exam.procedure.school.rejectAction': 'رفض',
  'exam.procedure.school.rejectHint': 'وضّح سبب عدم تقديم المدرسة للمترشّح في هذا الامتحان',
  'exam.procedure.school.scheduledStatus': 'مُبرمج',
  'exam.procedure.school.rejectedStatus': 'مرفوض',
  'exam.procedure.school.pendingHint': 'في انتظار التاريخ الذي تحدّده المدرسة',
  'exam.procedure.school.rejectedHint': 'لم تقدّمك المدرسة لهذا الامتحان',

  // Procédure « session ATTT » (pratique, D-42)
  'exam.procedure.attt.scheduleAction': 'تسجيل الاستدعاء',
  'exam.procedure.attt.scheduleHint':
    'أدخل تاريخ الدورة ومركز الامتحان الواردين من الوكالة الفنية للنقل البري',
  'exam.procedure.attt.dateLabel': 'تاريخ الدورة (الوكالة الفنية للنقل البري)',
  'exam.procedure.attt.locationLabel': 'مركز الامتحان (الوكالة الفنية للنقل البري)',
  'exam.procedure.attt.locationPlaceholder': 'مثال: مركز الوكالة بتونس',
  'exam.procedure.attt.rejectAction': 'الملف غير مكتمل',
  'exam.procedure.attt.rejectHint': 'بيّن ما ينقص: يمكن للمترشّح إعادة الطلب في الدورة القادمة',
  'exam.procedure.attt.scheduledStatus': 'تمّ استلام الاستدعاء',
  'exam.procedure.attt.rejectedStatus': 'الملف غير مكتمل',
  'exam.procedure.attt.pendingHint': 'في انتظار الدورة القادمة للوكالة الفنية للنقل البري',
  'exam.procedure.attt.rejectedHint': 'يمكنك إعادة الطلب في الدورة القادمة',

  // Moyens de paiement (D-40)
  'payment.method.cash': 'نقداً',
  'payment.method.card': 'بطاقة',
  'payment.method.bank_transfer': 'تحويل بنكي',
  'payment.method.credit': 'رصيد المترشّح',
  'payment.method.unknown': '—',

  // Parcours de l'accueil élève (D-45)
  'journey.step.theoryExam': 'امتحان قانون السير',
  'journey.step.practicalExam': 'امتحان السياقة',
  'journey.lessons.none': 'لم تبدأ بعد',
  'journey.lessons.doneOne': 'حصة واحدة منجزة',
  'journey.lessons.doneMany': '{count} حصص منجزة',
  'journey.lessons.scheduledOne': 'واحدة مُبرمجة',
  'journey.lessons.scheduledMany': '{count} مُبرمجة',
  'journey.exam.notRequested': 'لم يُطلب بعد',
  'journey.exam.requested': 'طُلب — {hint}',
  'journey.exam.scheduled': '{status} · {date}',
  'journey.exam.rejected': '{status} — {hint}',
  'journey.exam.passed': 'ناجح',
  'journey.exam.passedWithScore': 'ناجح · النتيجة {score}',
  'journey.exam.failed': 'راسب — يمكنك إعادة الطلب',

  // Dates et montants
  'format.dateTBD': 'التاريخ لم يُحدَّد',
  'format.timeTBD': 'الساعة لم تُحدَّد',
  'format.at': 'على الساعة',
  'format.started': 'انطلقت',
  'format.inMinutes': 'بعد {minutes} دقيقة',
  'format.inHours': 'بعد {hours} سا و{minutes} د',
  'format.inDay': 'بعد يوم واحد',
  'format.inDays': 'بعد {days} أيام',
  'format.empty': '—',
};
