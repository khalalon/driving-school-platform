# Notification Service

Multi-channel notification service supporting push notifications, email, and SMS.

## Features

- Push notifications (Expo/FCM)
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- In-app notifications
- User notification preferences
- Bulk notifications
- Notification history
- Unread count tracking

## Setup
```bash
npm install
npm run dev
```

## Notification Types

- `lesson_reminder` - Lesson reminder 24h before
- `exam_reminder` - Exam reminder
- `payment_confirmation` - Payment confirmed
- `authorization_approved` - Student authorized
- `schedule_change` - Lesson/exam schedule changed
- `general` - General announcements

## API Endpoints

### Notifications
- POST `/api/notifications/send` - Send notification (Admin)
- POST `/api/notifications/send-bulk` - Send to multiple users (Admin)
- GET `/api/notifications` - Get user notifications
- GET `/api/notifications/unread-count` - Get unread count
- GET `/api/notifications/:id` - Get notification details
- PUT `/api/notifications/:id/read` - Mark as read
- PUT `/api/notifications/read-all` - Mark all as read
- DELETE `/api/notifications/:id` - Delete notification

### Preferences
- GET `/api/notifications/preferences/me` - Get preferences
- PUT `/api/notifications/preferences` - Update preferences

### Push Tokens
- POST `/api/notifications/push-tokens` - Register device token
- DELETE `/api/notifications/push-tokens/:token` - Delete token

## Examples
```bash
# Send notification
curl -X POST http://localhost:3006/api/notifications/send \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "type": "lesson_reminder",
    "title": "Lesson Tomorrow",
    "message": "Your driving lesson is tomorrow at 10:00 AM"
  }'

# Get notifications
curl http://localhost:3006/api/notifications \
  -H "Authorization: Bearer TOKEN"

# Get unread count
curl http://localhost:3006/api/notifications/unread-count \
  -H "Authorization: Bearer TOKEN"

# Update preferences
curl -X PUT http://localhost:3006/api/notifications/preferences \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "lesson_reminder",
    "pushEnabled": true,
    "emailEnabled": false,
    "smsEnabled": false
  }'

# Register push token (from mobile app)
curl -X POST http://localhost:3006/api/notifications/push-tokens \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios"
  }'
```

## Integration

### Expo Push Notifications
1. Get Expo access token from https://expo.dev
2. Set `EXPO_ACCESS_TOKEN` in .env
3. Use Expo SDK in mobile app to get push token

### SendGrid Email
1. Sign up at https://sendgrid.com
2. Set `SENDGRID_API_KEY` in .env
3. Uncomment SendGrid implementation

### Twilio SMS
1. Sign up at https://twilio.com
2. Set Twilio credentials in .env
3. Uncomment Twilio implementation

## Database Tables
```sql
-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    channel VARCHAR(50),
    read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP
);

-- Notification Preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(50),
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    UNIQUE(user_id, type)
);

-- Push Tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token TEXT UNIQUE,
    platform VARCHAR(20),
    created_at TIMESTAMP
);
```
