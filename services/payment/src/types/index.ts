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

export interface Payment {
  id: string;
  studentId: string;
  referenceType: ReferenceType;
  referenceId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDTO {
  studentId: string;
  referenceType: ReferenceType;
  referenceId: string;
  amount: number;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaymentDTO {
  status?: PaymentStatus;
  transactionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessOnlinePaymentDTO {
  paymentId: string;
  returnUrl?: string;
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

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}
