import { HttpError } from '../../../http/errors';
import { IPaymentRepository } from '../repositories/payment.repository';
import {
  CreatePaymentDTO,
  Payment,
  PaymentFilters,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
} from '../types/payment.types';
import { IPaymentGateway } from './payment-gateway.service';

const MANUAL_METHODS: readonly PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.BANK_TRANSFER,
];

/** Porté tel quel depuis payment-service ; non monté dans l'application (D-31). */
export class PaymentService {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentGateway: IPaymentGateway
  ) {}

  /** Le montant > 0 est garanti par le validateur Joi. */
  createPayment(dto: CreatePaymentDTO): Promise<Payment> {
    return this.paymentRepository.create(dto);
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new HttpError(404, 'NOT_FOUND', 'Paiement introuvable');
    }
    return payment;
  }

  getPayments(filters: PaymentFilters): Promise<Payment[]> {
    return this.paymentRepository.findAll(filters);
  }

  async processOnlinePayment(paymentId: string): Promise<{ paymentUrl: string }> {
    const payment = await this.getPaymentById(paymentId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new HttpError(409, 'CONFLICT', 'Ce paiement n’est plus en attente');
    }
    if (payment.method !== PaymentMethod.ONLINE) {
      throw new HttpError(409, 'CONFLICT', 'Ce paiement n’est pas un paiement en ligne');
    }

    await this.paymentRepository.update(paymentId, { status: PaymentStatus.PROCESSING });
    const intent = await this.paymentGateway.createPaymentIntent(payment.amount, {
      paymentId: payment.id,
      studentId: payment.studentId,
      referenceType: payment.referenceType,
      referenceId: payment.referenceId,
    });
    await this.paymentRepository.update(paymentId, { transactionId: intent.transactionId });

    return { paymentUrl: intent.paymentUrl ?? '' };
  }

  async confirmPayment(transactionId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findByTransactionId(transactionId);
    if (!payment) {
      throw new HttpError(404, 'NOT_FOUND', 'Paiement introuvable');
    }
    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment;
    }
    const confirmed = await this.paymentGateway.confirmPayment(transactionId);
    return this.paymentRepository.update(payment.id, {
      status: confirmed ? PaymentStatus.PAID : PaymentStatus.FAILED,
    });
  }

  async markAsPaid(paymentId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (!MANUAL_METHODS.includes(payment.method)) {
      throw new HttpError(
        409,
        'CONFLICT',
        'Un paiement en ligne ne peut pas être marqué payé à la main'
      );
    }
    return this.paymentRepository.update(paymentId, { status: PaymentStatus.PAID });
  }

  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId);
    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.CONFIRMED) {
      throw new HttpError(409, 'CONFLICT', 'Seul un paiement encaissé peut être remboursé');
    }
    if (payment.method === PaymentMethod.ONLINE && payment.transactionId) {
      const refunded = await this.paymentGateway.refundPayment(
        payment.transactionId,
        payment.amount
      );
      if (!refunded) {
        throw new HttpError(
          502,
          'INTERNAL_ERROR',
          'Le remboursement a été refusé par la passerelle'
        );
      }
    }
    return this.paymentRepository.update(paymentId, {
      status: PaymentStatus.REFUNDED,
      metadata: { ...(payment.metadata ?? {}), refundReason: reason },
    });
  }

  getPaymentSummary(studentId: string): Promise<PaymentSummary> {
    return this.paymentRepository.getSummary(studentId);
  }

  async deletePayment(paymentId: string): Promise<void> {
    const payment = await this.getPaymentById(paymentId);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new HttpError(409, 'CONFLICT', 'Seul un paiement en attente peut être supprimé');
    }
    await this.paymentRepository.delete(paymentId);
  }
}
