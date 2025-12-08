export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Mock implementation
export class MockEmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('📧 [Mock] Sending email:', { to, subject, body: body.substring(0, 50) });
  }
}

// SendGrid implementation (commented - uncomment when ready)
/*
import sgMail from '@sendgrid/mail';

export class SendGridEmailService implements IEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const msg = {
      to,
      from: 'noreply@drivingschool.com',
      subject,
      html: body,
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
    }
  }
}
*/
