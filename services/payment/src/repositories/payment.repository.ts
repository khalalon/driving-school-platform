import { Pool } from 'pg';
import {
  Payment,
  CreatePaymentDTO,
  UpdatePaymentDTO,
  PaymentFilters,
  PaymentSummary,
} from '../types';

export interface IPaymentRepository {
  create(dto: CreatePaymentDTO): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  findAll(filters: PaymentFilters): Promise<Payment[]>;
  update(id: string, dto: UpdatePaymentDTO): Promise<Payment>;
  delete(id: string): Promise<void>;
  getSummary(studentId: string): Promise<PaymentSummary>;
}

export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreatePaymentDTO): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        student_id, reference_type, reference_id, amount, status, method, 
        metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        student_id as "studentId",
        reference_type as "referenceType",
        reference_id as "referenceId",
        amount,
        status,
        method,
        transaction_id as "transactionId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      dto.studentId,
      dto.referenceType,
      dto.referenceId,
      dto.amount,
      dto.method,
      dto.metadata ? JSON.stringify(dto.metadata) : null,
    ]);

    return result.rows[0] as Payment;
  }

  async findById(id: string): Promise<Payment | null> {
    const query = `
      SELECT 
        id,
        student_id as "studentId",
        reference_type as "referenceType",
        reference_id as "referenceId",
        amount,
        status,
        method,
        transaction_id as "transactionId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM payments
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const query = `
      SELECT 
        id,
        student_id as "studentId",
        reference_type as "referenceType",
        reference_id as "referenceId",
        amount,
        status,
        method,
        transaction_id as "transactionId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM payments
      WHERE transaction_id = $1
    `;

    const result = await this.db.query(query, [transactionId]);
    return result.rows[0] || null;
  }

  async findAll(filters: PaymentFilters): Promise<Payment[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (filters.studentId) {
      conditions.push(`student_id = $${paramCount++}`);
      values.push(filters.studentId);
    }
    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters.method) {
      conditions.push(`method = $${paramCount++}`);
      values.push(filters.method);
    }
    if (filters.referenceType) {
      conditions.push(`reference_type = $${paramCount++}`);
      values.push(filters.referenceType);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        student_id as "studentId",
        reference_type as "referenceType",
        reference_id as "referenceId",
        amount,
        status,
        method,
        transaction_id as "transactionId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM payments
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, values);
    return result.rows as Payment[];
  }

  async update(id: string, dto: UpdatePaymentDTO): Promise<Payment> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (dto.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(dto.status);
    }
    if (dto.transactionId !== undefined) {
      updates.push(`transaction_id = $${paramCount++}`);
      values.push(dto.transactionId);
    }
    if (dto.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(dto.metadata));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE payments
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        student_id as "studentId",
        reference_type as "referenceType",
        reference_id as "referenceId",
        amount,
        status,
        method,
        transaction_id as "transactionId",
        metadata,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] as Payment;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM payments WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async getSummary(studentId: string): Promise<PaymentSummary> {
    const query = `
      SELECT 
        COUNT(*) as "paymentCount",
        COALESCE(SUM(amount), 0) as "totalAmount",
        COALESCE(SUM(CASE WHEN status IN ('paid', 'confirmed') THEN amount ELSE 0 END), 0) as "paidAmount",
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as "pendingAmount"
      FROM payments
      WHERE student_id = $1
    `;

    const result = await this.db.query(query, [studentId]);
    return {
      paymentCount: parseInt(result.rows[0].paymentCount, 10),
      totalAmount: parseFloat(result.rows[0].totalAmount),
      paidAmount: parseFloat(result.rows[0].paidAmount),
      pendingAmount: parseFloat(result.rows[0].pendingAmount),
    };
  }
}
