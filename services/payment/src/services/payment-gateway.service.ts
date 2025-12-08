import { v4 as uuidv4 } from 'uuid';

export interface IPaymentGateway {
  createPaymentIntent(amount: number, metadata: Record<string, unknown>): Promise<PaymentIntent>;
  confirmPayment(transactionId: string): Promise<boolean>;
  refundPayment(transactionId: string, amount: number): Promise<boolean>;
}

export interface PaymentIntent {
  transactionId: string;
  amount: number;
  status: string;
  paymentUrl?: string;
}

// Mock implementation - replace with Stripe, PayPal, etc.
export class MockPaymentGateway implements IPaymentGateway {
  async createPaymentIntent(
    amount: number,
    metadata: Record<string, unknown>
  ): Promise<PaymentIntent> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const transactionId = `txn_${uuidv4()}`;

    return {
      transactionId,
      amount,
      status: 'requires_confirmation',
      paymentUrl: `https://payment-gateway.example.com/pay/${transactionId}`,
    };
  }

  async confirmPayment(transactionId: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock: 95% success rate
    return Math.random() > 0.05;
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock: always successful
    return true;
  }
}

// Stripe implementation example (commented out - uncomment when ready to use)
/*
import Stripe from 'stripe';

export class StripePaymentGateway implements IPaymentGateway {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
  }

  async createPaymentIntent(
    amount: number,
    metadata: Record<string, unknown>
  ): Promise<PaymentIntent> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata,
    });

    return {
      transactionId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: paymentIntent.status,
      paymentUrl: paymentIntent.next_action?.redirect_to_url?.url,
    };
  }

  async confirmPayment(transactionId: string): Promise<boolean> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
    return paymentIntent.status === 'succeeded';
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    const refund = await this.stripe.refunds.create({
      payment_intent: transactionId,
      amount: Math.round(amount * 100),
    });
    return refund.status === 'succeeded';
  }
}
*/
