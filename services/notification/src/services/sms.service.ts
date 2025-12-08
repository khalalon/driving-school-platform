export interface ISmsService {
  sendSms(to: string, message: string): Promise<void>;
}

// Mock implementation
export class MockSmsService implements ISmsService {
  async sendSms(to: string, message: string): Promise<void> {
    console.log('📱 [Mock] Sending SMS:', { to, message: message.substring(0, 50) });
  }
}

// Twilio implementation (commented - uncomment when ready)
/*
import twilio from 'twilio';

export class TwilioSmsService implements ISmsService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  }

  async sendSms(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });
      console.log(`✅ SMS sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
    }
  }
}
*/
