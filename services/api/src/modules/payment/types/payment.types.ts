export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CONFIRMED = 'confirmed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  ONLINE = 'online',
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
}

export enum ReferenceType {
  LESSON = 'lesson',
  EXAM = 'exam',
}

export const PAYMENT_STATUSES: readonly PaymentStatus[] = Object.values(PaymentStatus);
export const PAYMENT_METHODS: readonly PaymentMethod[] = Object.values(PaymentMethod);
export const REFERENCE_TYPES: readonly ReferenceType[] = Object.values(ReferenceType);

export type PaymentMetadata = Record<string, unknown>;

/** `studentId` = students.id. */
export interface Payment {
  id: string;
  studentId: string;
  referenceType: ReferenceType;
  referenceId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId: string | null;
  metadata: PaymentMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDTO {
  studentId: string;
  referenceType: ReferenceType;
  referenceId: string;
  amount: number;
  method: PaymentMethod;
  metadata?: PaymentMetadata;
}

export interface UpdatePaymentDTO {
  status?: PaymentStatus;
  transactionId?: string;
  metadata?: PaymentMetadata;
}

export interface ConfirmPaymentDTO {
  transactionId: string;
}

export interface RefundPaymentDTO {
  reason: string;
}

export interface PaymentFilters {
  studentId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  referenceType?: ReferenceType;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentCount: number;
}
