import Joi from 'joi';
import { NotificationType, NotificationChannel } from '../types';

export const sendNotificationSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(500).required(),
  metadata: Joi.object().optional(),
});

export const sendBulkNotificationSchema = Joi.object({
  userIds: Joi.array().items(Joi.string().uuid()).min(1).max(1000).required(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  title: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(500).required(),
  metadata: Joi.object().optional(),
});

export const updatePreferencesSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  pushEnabled: Joi.boolean().optional(),
  emailEnabled: Joi.boolean().optional(),
  smsEnabled: Joi.boolean().optional(),
});

export const registerPushTokenSchema = Joi.object({
  token: Joi.string().required(),
  platform: Joi.string().valid('ios', 'android', 'web').required(),
});

export const notificationFiltersSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .optional(),
  read: Joi.boolean().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
