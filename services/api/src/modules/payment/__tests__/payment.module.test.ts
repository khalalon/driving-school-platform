import request from 'supertest';
import { createApp } from '../../../app';
import { bearerFor, fakePool, testRequireAuth, UUID } from '../../../test-utils/http';
import { buildPaymentModule } from '..';
import { PaymentController } from '../controllers/payment.controller';
import { createPaymentRouter } from '../routes/payment.routes';
import { IPaymentRepository, PaymentRepository } from '../repositories/payment.repository';
import { IPaymentGateway, MockPaymentGateway } from '../services/payment-gateway.service';
import { PaymentService } from '../services/payment.service';
import { Payment, PaymentMethod, PaymentStatus, ReferenceType } from '../types/payment.types';

const now = new Date('2026-09-18T10:00:00Z');
const payment: Payment = {
  id: UUID.request,
  studentId: UUID.student,
  referenceType: ReferenceType.LESSON,
  referenceId: UUID.booking,
  amount: 40,
  status: PaymentStatus.PENDING,
  method: PaymentMethod.CASH,
  transactionId: null,
  metadata: null,
  createdAt: now,
  updatedAt: now,
};

function repositoryMock(): jest.Mocked<IPaymentRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByTransactionId: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getSummary: jest.fn(),
  };
}

describe('PaymentService (porté, non monté — D-31)', () => {
  let repository: jest.Mocked<IPaymentRepository>;
  let gateway: jest.Mocked<IPaymentGateway>;
  let service: PaymentService;

  beforeEach(() => {
    repository = repositoryMock();
    gateway = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      refundPayment: jest.fn(),
    };
    service = new PaymentService(repository, gateway);
  });

  it('getPaymentById : 404 « Paiement introuvable »', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getPaymentById('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it('processOnlinePayment : pending + online → processing, intent, transactionId', async () => {
    repository.findById.mockResolvedValue({ ...payment, method: PaymentMethod.ONLINE });
    repository.update.mockResolvedValue(payment);
    gateway.createPaymentIntent.mockResolvedValue({
      transactionId: 'txn_1',
      amount: 40,
      status: 'requires_confirmation',
      paymentUrl: 'https://pay/txn_1',
    });

    await expect(service.processOnlinePayment(payment.id)).resolves.toEqual({
      paymentUrl: 'https://pay/txn_1',
    });
    expect(repository.update).toHaveBeenCalledWith(payment.id, { status: 'processing' });
    expect(repository.update).toHaveBeenCalledWith(payment.id, { transactionId: 'txn_1' });
  });

  it('processOnlinePayment : 409 si pas pending ou pas online', async () => {
    repository.findById.mockResolvedValue({ ...payment, status: PaymentStatus.PAID });
    await expect(service.processOnlinePayment(payment.id)).rejects.toMatchObject({ status: 409 });
    repository.findById.mockResolvedValue(payment);
    await expect(service.processOnlinePayment(payment.id)).rejects.toMatchObject({ status: 409 });
  });

  it('confirmPayment : déjà confirmé → inchangé ; sinon paid / failed selon la passerelle', async () => {
    repository.findByTransactionId.mockResolvedValue({
      ...payment,
      status: PaymentStatus.CONFIRMED,
    });
    await expect(service.confirmPayment('txn')).resolves.toMatchObject({ status: 'confirmed' });

    repository.findByTransactionId.mockResolvedValue(payment);
    gateway.confirmPayment.mockResolvedValue(false);
    repository.update.mockResolvedValue({ ...payment, status: PaymentStatus.FAILED });
    await expect(service.confirmPayment('txn')).resolves.toMatchObject({ status: 'failed' });
    expect(repository.update).toHaveBeenCalledWith(payment.id, { status: 'failed' });

    repository.findByTransactionId.mockResolvedValue(null);
    await expect(service.confirmPayment('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it('markAsPaid : méthodes manuelles seulement', async () => {
    repository.findById.mockResolvedValue(payment);
    repository.update.mockResolvedValue({ ...payment, status: PaymentStatus.PAID });
    await expect(service.markAsPaid(payment.id)).resolves.toMatchObject({ status: 'paid' });

    repository.findById.mockResolvedValue({ ...payment, method: PaymentMethod.ONLINE });
    await expect(service.markAsPaid(payment.id)).rejects.toMatchObject({ status: 409 });
  });

  it('refundPayment : encaissé seulement ; passerelle pour l’en ligne ; motif dans metadata', async () => {
    repository.findById.mockResolvedValue(payment);
    await expect(service.refundPayment(payment.id, 'Erreur de saisie')).rejects.toMatchObject({
      status: 409,
    });

    repository.findById.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PAID,
      method: PaymentMethod.ONLINE,
      transactionId: 'txn_1',
    });
    gateway.refundPayment.mockResolvedValue(false);
    await expect(service.refundPayment(payment.id, 'Erreur de saisie')).rejects.toMatchObject({
      status: 502,
    });

    gateway.refundPayment.mockResolvedValue(true);
    repository.update.mockResolvedValue({ ...payment, status: PaymentStatus.REFUNDED });
    await expect(service.refundPayment(payment.id, 'Erreur de saisie')).resolves.toMatchObject({
      status: 'refunded',
    });
    expect(repository.update).toHaveBeenCalledWith(payment.id, {
      status: 'refunded',
      metadata: { refundReason: 'Erreur de saisie' },
    });
  });

  it('deletePayment : pending seulement ; createPayment, getPayments, summary délèguent', async () => {
    repository.findById.mockResolvedValue({ ...payment, status: PaymentStatus.PAID });
    await expect(service.deletePayment(payment.id)).rejects.toMatchObject({ status: 409 });
    repository.findById.mockResolvedValue(payment);
    await service.deletePayment(payment.id);
    expect(repository.delete).toHaveBeenCalledWith(payment.id);

    repository.create.mockResolvedValue(payment);
    repository.findAll.mockResolvedValue([payment]);
    repository.getSummary.mockResolvedValue({
      totalAmount: 40,
      paidAmount: 0,
      pendingAmount: 40,
      paymentCount: 1,
    });
    await expect(
      service.createPayment({
        studentId: UUID.student,
        referenceType: ReferenceType.LESSON,
        referenceId: UUID.booking,
        amount: 40,
        method: PaymentMethod.CASH,
      })
    ).resolves.toEqual(payment);
    await expect(service.getPayments({ studentId: UUID.student })).resolves.toEqual([payment]);
    await expect(service.getPaymentSummary(UUID.student)).resolves.toMatchObject({
      paymentCount: 1,
    });
  });
});

describe('MockPaymentGateway', () => {
  it('produit un identifiant txn_ et une URL ; rembourse toujours', async () => {
    const gateway = new MockPaymentGateway();
    const intent = await gateway.createPaymentIntent(40, {});
    expect(intent.transactionId).toMatch(/^txn_/);
    expect(intent.paymentUrl).toContain(intent.transactionId);
    await expect(gateway.refundPayment(intent.transactionId, 40)).resolves.toBe(true);
    expect(typeof (await gateway.confirmPayment(intent.transactionId))).toBe('boolean');
  });
});

describe('PaymentRepository (Pool factice)', () => {
  it('create sérialise metadata ; findAll filtre ; update dynamique ; summary en nombres', async () => {
    const { pool, query } = fakePool([
      { paymentCount: '2', totalAmount: '100.00', paidAmount: '60.00', pendingAmount: '40.00' },
    ]);
    const repo = new PaymentRepository(pool);

    await repo.create({
      studentId: UUID.student,
      referenceType: ReferenceType.EXAM,
      referenceId: UUID.booking,
      amount: 60,
      method: PaymentMethod.CARD,
      metadata: { note: 'x' },
    });
    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([
      UUID.student,
      'exam',
      UUID.booking,
      60,
      'card',
      '{"note":"x"}',
    ]);

    await repo.findAll({ studentId: UUID.student, status: PaymentStatus.PAID });
    expect((query.mock.calls[1] as [string])[0]).toMatch(/WHERE student_id = \$1 AND status = \$2/);

    await repo.update(UUID.request, { status: PaymentStatus.REFUNDED, metadata: { a: 1 } });
    expect((query.mock.calls[2] as [string, unknown[]])[1]).toEqual([
      'refunded',
      '{"a":1}',
      UUID.request,
    ]);

    await expect(repo.getSummary(UUID.student)).resolves.toEqual({
      paymentCount: 2,
      totalAmount: 100,
      paidAmount: 60,
      pendingAmount: 40,
    });
    await repo.delete(UUID.request);
    await expect(new PaymentRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
    await expect(
      new PaymentRepository(fakePool([]).pool).findByTransactionId('txn')
    ).resolves.toBeNull();
  });
});

describe('Routeur payment (monté sur une app de test uniquement)', () => {
  it('est câblé par buildPaymentModule et répond ; il n’apparaît pas dans AppRouters', async () => {
    const { pool } = fakePool([]);
    const module = buildPaymentModule({ db: pool, requireAuth: testRequireAuth });
    const app = createApp({ auth: module.router });

    await request(app).get('/api/auth').expect(401);
    const res = await request(app).get('/api/auth').set('Authorization', bearerFor('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    await request(app)
      .post('/api/auth')
      .set('Authorization', bearerFor('student'))
      .send({ amount: -1 })
      .expect(400);
  });
});

describe('PaymentController via HTTP (service doublé)', () => {
  const service = {
    createPayment: jest.fn(),
    getPaymentById: jest.fn(),
    getPayments: jest.fn(),
    processOnlinePayment: jest.fn(),
    confirmPayment: jest.fn(),
    markAsPaid: jest.fn(),
    refundPayment: jest.fn(),
    getPaymentSummary: jest.fn(),
    deletePayment: jest.fn(),
  };
  const app = createApp({
    auth: createPaymentRouter(
      new PaymentController(service as unknown as PaymentService),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const admin = bearerFor('admin');

  beforeEach(() => jest.clearAllMocks());

  it('couvre chaque action : création, lectures, process, confirm, mark-paid, refund, summary, delete', async () => {
    service.createPayment.mockResolvedValue(payment);
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('student'))
      .send({
        studentId: UUID.student,
        referenceType: 'lesson',
        referenceId: UUID.booking,
        amount: 40,
        method: 'cash',
      })
      .expect(201);

    service.getPayments.mockResolvedValue([payment]);
    await request(app).get(`${base}?status=pending`).set('Authorization', admin).expect(200);
    await request(app).get(`${base}?status=nope`).set('Authorization', admin).expect(400);

    service.getPaymentById.mockResolvedValue(payment);
    await request(app).get(`${base}/${UUID.request}`).set('Authorization', admin).expect(200);
    await request(app).get(`${base}/nope`).set('Authorization', admin).expect(404);

    service.processOnlinePayment.mockResolvedValue({ paymentUrl: 'https://pay/x' });
    await request(app)
      .post(`${base}/${UUID.request}/process`)
      .set('Authorization', admin)
      .expect(200, { paymentUrl: 'https://pay/x' });

    service.confirmPayment.mockResolvedValue(payment);
    await request(app).post(`${base}/confirm`).send({ transactionId: 'txn_1' }).expect(200);
    await request(app).post(`${base}/confirm`).send({}).expect(400);

    service.markAsPaid.mockResolvedValue({ ...payment, status: 'paid' });
    await request(app)
      .post(`${base}/${UUID.request}/mark-paid`)
      .set('Authorization', admin)
      .expect(200);

    service.refundPayment.mockResolvedValue({ ...payment, status: 'refunded' });
    await request(app)
      .post(`${base}/${UUID.request}/refund`)
      .set('Authorization', admin)
      .send({ reason: 'Erreur de saisie' })
      .expect(200);
    await request(app)
      .post(`${base}/${UUID.request}/refund`)
      .set('Authorization', admin)
      .send({ reason: 'x' })
      .expect(400);

    service.getPaymentSummary.mockResolvedValue({ paymentCount: 1 });
    await request(app)
      .get(`${base}/students/${UUID.student}/summary`)
      .set('Authorization', bearerFor('student'))
      .expect(200, { paymentCount: 1 });

    service.deletePayment.mockResolvedValue(undefined);
    await request(app).delete(`${base}/${UUID.request}`).set('Authorization', admin).expect(204);
  });
});
