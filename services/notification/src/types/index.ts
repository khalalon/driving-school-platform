export enum NotificationType {
  LESSON_REMINDER = 'lesson_reminder',
  EXAM_REMINDER = 'exam_reminder',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  AUTHORIZATION_APPROVED = 'authorization_approved',
  SCHEDULE_CHANGE = 'schedule_change',
  GENERAL = 'general',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  type: NotificationType;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
}

export interface SendBulkNotificationDTO {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePreferencesDTO {
  type: NotificationType;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
}

export interface NotificationFilters {
  userId?: string;
  type?: NotificationType;
  read?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}
