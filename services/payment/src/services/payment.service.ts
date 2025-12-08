import { IPaymentRepository } from '../repositories/payment.repository';
import { IPaymentGateway } from './payment-gateway.service';
import {
  Payment,
  CreatePaymentDTO,
  PaymentFilters,
  PaymentSummary,
  PaymentStatus,
  PaymentMethod,
} from '../types';

export class PaymentService {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentGateway: IPaymentGateway
  ) {}

  async createPayment(dto: CreatePaymentDTO): Promise<Payment> {
    if (dto.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    return this.paymentRepository.create(dto);
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  }

  async getPayments(filters: PaymentFilters): Promise<Payment[]> {
    return this.paymentRepository.findAll(filters);
  }

  async processOnlinePayment(paymentId: string): Promise<{ paymentUrl: string }> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Payment is not in pending status');
    }

    if (payment.method !== PaymentMethod.ONLINE) {
      throw new Error('Payment method is not online');
    }

    // Update status to processing
    await this.paymentRepository.update(paymentId, { status: PaymentStatus.PROCESSING });

    // Create payment intent with gateway
    const intent = await this.paymentGateway.createPaymentIntent(payment.amount, {
      paymentId: payment.id,
      studentId: payment.studentId,
      referenceType: payment.referenceType,
      referenceId: payment.referenceId,
    });

    // Update payment with transaction ID
    await this.paymentRepository.update(paymentId, {
      transactionId: intent.transactionId,
    });

    return { paymentUrl: intent.paymentUrl || '' };
  }

  async confirmPayment(transactionId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findByTransactionId(transactionId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return payment; // Already confirmed
    }

    // Verify payment with gateway
    const isConfirmed = await this.paymentGateway.confirmPayment(transactionId);

    if (isConfirmed) {
      return this.paymentRepository.update(payment.id, { status: PaymentStatus.PAID });
    } else {
      return this.paymentRepository.update(payment.id, { status: PaymentStatus.FAILED });
    }
  }

  async markAsPaid(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (
      [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER].includes(payment.method)
    ) {
      return this.paymentRepository.update(paymentId, { status: PaymentStatus.PAID });
    }

    throw new Error('Cannot manually mark online payment as paid');
  }

  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID && payment.status !== PaymentStatus.CONFIRMED) {
      throw new Error('Only paid payments can be refunded');
    }

    // Process refund through gateway if online payment
    if (payment.method === PaymentMethod.ONLINE && payment.transactionId) {
      const isRefunded = await this.paymentGateway.refundPayment(
        payment.transactionId,
        payment.amount
      );

      if (!isRefunded) {
        throw new Error('Refund failed');
      }
    }

    return this.paymentRepository.update(paymentId, {
      status: PaymentStatus.REFUNDED,
      metadata: { ...payment.metadata, refundReason: reason },
    });
  }

  async getPaymentSummary(studentId: string): Promise<PaymentSummary> {
    return this.paymentRepository.getSummary(studentId);
  }

  async deletePayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Can only delete pending payments');
    }

    await this.paymentRepository.delete(paymentId);
  }
}
