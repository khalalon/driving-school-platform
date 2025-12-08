# Payment Service

Payment processing and transaction management microservice.

## Features

- Create and manage payments for lessons and exams
- Online payment processing (Stripe/PayPal integration ready)
- Manual payment confirmation (cash, card, bank transfer)
- Payment refunds with reason tracking
- Payment summary and history
- Transaction tracking

## Setup
```bash
npm install
npm run dev
```

## Payment Flow

### Online Payment
1. Create payment → status: `pending`
2. Process payment → status: `processing`, generates payment URL
3. Customer pays via payment URL
4. Webhook/Confirm endpoint → status: `paid`

### Manual Payment
1. Create payment → status: `pending`
2. Admin marks as paid → status: `paid`

## API Endpoints

### Payments
- POST `/api/payments` - Create payment
- GET `/api/payments` - List payments (Admin)
- GET `/api/payments/:id` - Get payment details
- POST `/api/payments/:id/process` - Process online payment
- POST `/api/payments/confirm` - Confirm payment (webhook)
- POST `/api/payments/:id/mark-paid` - Manually mark as paid (Admin)
- POST `/api/payments/:id/refund` - Refund payment (Admin)
- GET `/api/payments/students/:studentId/summary` - Payment summary
- DELETE `/api/payments/:id` - Delete pending payment (Admin)

## Payment Methods

- `online` - Online payment gateway (Stripe, PayPal, etc.)
- `cash` - Cash payment
- `card` - Card payment (in-person)
- `bank_transfer` - Bank transfer

## Payment Status Flow
```
pending → processing → paid → confirmed
                    ↓
                  failed

paid → refunded
```

## Examples
```bash
# Create a payment
curl -X POST http://localhost:3005/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-uuid",
    "referenceType": "lesson",
    "referenceId": "lesson-uuid",
    "amount": 50.00,
    "method": "online"
  }'

# Process online payment
curl -X POST http://localhost:3005/api/payments/payment-uuid/process \
  -H "Authorization: Bearer TOKEN"

# Get student payment summary
curl http://localhost:3005/api/payments/students/student-uuid/summary \
  -H "Authorization: Bearer TOKEN"

# Refund a payment
curl -X POST http://localhost:3005/api/payments/payment-uuid/refund \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer request"}'
```

## Integration with Payment Gateways

The service uses a mock payment gateway by default. To integrate with Stripe:

1. Install Stripe: `npm install stripe`
2. Uncomment Stripe implementation in `payment-gateway.service.ts`
3. Set environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

## Webhook Setup

For production, set up webhooks to automatically confirm payments:
- Stripe: `/api/payments/confirm`
- PayPal: `/api/payments/confirm`
