import { PaymentService } from '../payment.service';
import { IPaymentRepository } from '../../repositories/payment.repository';
import { IPaymentGatewayService } from '../payment-gateway.service';
import { Payment, CreatePaymentDTO, PaymentStatus } from '../../types';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockPaymentRepository: jest.Mocked<IPaymentRepository>;
  let mockPaymentGateway: jest.Mocked<IPaymentGatewayService>;

  const mockPayment: Payment = {
    id: 'payment-123',
    userId: 'user-123',
    amount: 5000,
    currency: 'usd',
    status: 'pending' as PaymentStatus,
    description: 'Driving lesson payment',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPaymentRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockPaymentGateway = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      refundPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    paymentService = new PaymentService(
      mockPaymentRepository,
      mockPaymentGateway
    );
  });

  describe('createPayment', () => {
    it('should create a new payment', async () => {
      const createPaymentDto: CreatePaymentDTO = {
        userId: 'user-123',
        amount: 5000,
        currency: 'usd',
        description: 'Lesson payment',
      };

      mockPaymentRepository.create.mockResolvedValue(mockPayment);
      mockPaymentGateway.createPaymentIntent.mockResolvedValue('pi_test_123');

      const result = await paymentService.createPayment(createPaymentDto);

      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        userId: createPaymentDto.userId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        description: createPaymentDto.description,
        status: 'pending',
      });
      expect(result).toEqual(mockPayment);
    });

    it('should validate payment amount', async () => {
      const invalidPayment = {
        userId: 'user-123',
        amount: -100,  // Invalid: negative amount
        currency: 'usd',
        description: 'Invalid payment',
      };

      await expect(paymentService.createPayment(invalidPayment as any))
        .rejects.toThrow('Invalid payment amount');
    });
  });

  describe('processPayment', () => {
    it('should process a payment successfully', async () => {
      const paymentMethodId = 'pm_test_123';

      mockPaymentRepository.findById.mockResolvedValue(mockPayment);
      mockPaymentGateway.confirmPayment.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({
        ...mockPayment,
        status: 'completed',
      });

      const result = await paymentService.processPayment('payment-123', paymentMethodId);

      expect(mockPaymentGateway.confirmPayment).toHaveBeenCalledWith(
        'payment-123',
        paymentMethodId
      );
      expect(result.status).toBe('completed');
    });

    it('should throw error for non-existent payment', async () => {
      mockPaymentRepository.findById.mockResolvedValue(null);

      await expect(paymentService.processPayment('non-existent', 'pm_test_123'))
        .rejects.toThrow('Payment not found');
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by id', async () => {
      mockPaymentRepository.findById.mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentById('payment-123');

      expect(mockPaymentRepository.findById).toHaveBeenCalledWith('payment-123');
      expect(result).toEqual(mockPayment);
    });

    it('should throw error if payment not found', async () => {
      mockPaymentRepository.findById.mockResolvedValue(null);

      await expect(paymentService.getPaymentById('non-existent')).rejects.toThrow('Payment not found');
    });
  });

  describe('getUserPayments', () => {
    it('should return all user payments', async () => {
      const mockPayments = [mockPayment];
      mockPaymentRepository.findByUserId.mockResolvedValue(mockPayments);

      const result = await paymentService.getUserPayments('user-123');

      expect(mockPaymentRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPayments);
    });

    it('should return empty array if no payments', async () => {
      mockPaymentRepository.findByUserId.mockResolvedValue([]);

      const result = await paymentService.getUserPayments('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment', async () => {
      mockPaymentRepository.findById.mockResolvedValue({
        ...mockPayment,
        status: 'completed',
      });
      mockPaymentGateway.refundPayment.mockResolvedValue({ id: 're_test_123' });
      mockPaymentRepository.updateStatus.mockResolvedValue({
        ...mockPayment,
        status: 'refunded',
      });

      const result = await paymentService.refundPayment('payment-123');

      expect(mockPaymentGateway.refundPayment).toHaveBeenCalledWith('payment-123');
      expect(result.status).toBe('refunded');
    });

    it('should not refund pending payments', async () => {
      mockPaymentRepository.findById.mockResolvedValue(mockPayment);

      await expect(paymentService.refundPayment('payment-123'))
        .rejects.toThrow('Cannot refund pending payment');
    });

    it('should not refund already refunded payments', async () => {
      mockPaymentRepository.findById.mockResolvedValue({
        ...mockPayment,
        status: 'refunded',
      });

      await expect(paymentService.refundPayment('payment-123'))
        .rejects.toThrow('Payment already refunded');
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status from gateway', async () => {
      mockPaymentRepository.findById.mockResolvedValue(mockPayment);
      mockPaymentGateway.getPaymentStatus.mockResolvedValue('succeeded');

      const result = await paymentService.getPaymentStatus('payment-123');

      expect(mockPaymentGateway.getPaymentStatus).toHaveBeenCalledWith('payment-123');
      expect(result).toBe('succeeded');
    });
  });
});
