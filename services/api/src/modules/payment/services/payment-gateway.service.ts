import { randomUUID } from 'crypto';

export interface PaymentIntent {
  transactionId: string;
  amount: number;
  status: string;
  paymentUrl?: string;
}

export interface IPaymentGateway {
  createPaymentIntent(amount: number, metadata: Record<string, unknown>): Promise<PaymentIntent>;
  confirmPayment(transactionId: string): Promise<boolean>;
  refundPayment(transactionId: string, amount: number): Promise<boolean>;
}

/**
 * Passerelle factice (aucun paiement en ligne en v1, D-31). Une implémentation réelle (Stripe…)
 * remplacerait cette classe derrière la même interface.
 */
export class MockPaymentGateway implements IPaymentGateway {
  async createPaymentIntent(
    amount: number,
    _metadata: Record<string, unknown>
  ): Promise<PaymentIntent> {
    await delay(100);
    const transactionId = `txn_${randomUUID()}`;
    return {
      transactionId,
      amount,
      status: 'requires_confirmation',
      paymentUrl: `https://payment-gateway.example.com/pay/${transactionId}`,
    };
  }

  async confirmPayment(_transactionId: string): Promise<boolean> {
    await delay(100);
    return Math.random() > 0.05;
  }

  async refundPayment(_transactionId: string, _amount: number): Promise<boolean> {
    await delay(100);
    return true;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
