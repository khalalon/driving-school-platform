import axios from 'axios';

export interface IPushService {
  sendPushNotification(
    tokens: string[],
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void>;
}

// Mock implementation - Replace with Expo/FCM
export class MockPushService implements IPushService {
  async sendPushNotification(
    tokens: string[],
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    console.log('📲 [Mock] Sending push notification:', {
      tokens: tokens.length,
      title,
      message,
      data,
    });
  }
}

// Expo Push Notification Service
export class ExpoPushService implements IPushService {
  private readonly expoApiUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly accessToken: string;

  constructor() {
    this.accessToken = process.env.EXPO_ACCESS_TOKEN || '';
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!this.accessToken) {
      console.warn('Expo access token not configured');
      return;
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data: data || {},
    }));

    try {
      await axios.post(this.expoApiUrl, messages, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      console.log(`✅ Sent push notification to ${tokens.length} devices`);
    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
    }
  }
}
