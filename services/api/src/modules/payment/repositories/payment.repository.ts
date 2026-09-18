import { Pool } from 'pg';
import {
  CreatePaymentDTO,
  Payment,
  PaymentFilters,
  PaymentSummary,
  UpdatePaymentDTO,
} from '../types/payment.types';

export interface IPaymentRepository {
  create(dto: CreatePaymentDTO): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByTransactionId(transactionId: string): Promise<Payment | null>;
  findAll(filters: PaymentFilters): Promise<Payment[]>;
  update(id: string, dto: UpdatePaymentDTO): Promise<Payment>;
  delete(id: string): Promise<void>;
  getSummary(studentId: string): Promise<PaymentSummary>;
}

/**
 * Porté tel quel depuis payment-service (module non monté, D-31). Attention : la table
 * `payments` de la migration 001 n'a **pas** de colonne `metadata` — ces requêtes échoueraient
 * à l'exécution ; à corriger par une migration si le module est un jour monté.
 */
const PAYMENT_COLUMNS = `id, student_id AS "studentId", reference_type AS "referenceType",
  reference_id AS "referenceId", amount::float8 AS amount, status, method,
  transaction_id AS "transactionId", metadata, created_at AS "createdAt", updated_at AS "updatedAt"`;

export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreatePaymentDTO): Promise<Payment> {
    const result = await this.db.query<Payment>(
      `INSERT INTO payments (student_id, reference_type, reference_id, amount, status, method,
         metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${PAYMENT_COLUMNS}`,
      [
        dto.studentId,
        dto.referenceType,
        dto.referenceId,
        dto.amount,
        dto.method,
        dto.metadata ? JSON.stringify(dto.metadata) : null,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Payment | null> {
    const result = await this.db.query<Payment>(
      `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByTransactionId(transactionId: string): Promise<Payment | null> {
    const result = await this.db.query<Payment>(
      `SELECT ${PAYMENT_COLUMNS} FROM payments WHERE transaction_id = $1`,
      [transactionId]
    );
    return result.rows[0] ?? null;
  }

  async findAll(filters: PaymentFilters): Promise<Payment[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, operator: string, value: unknown): void => {
      values.push(value);
      conditions.push(`${column} ${operator} $${values.length}`);
    };

    if (filters.studentId) add('student_id', '=', filters.studentId);
    if (filters.status) add('status', '=', filters.status);
    if (filters.method) add('method', '=', filters.method);
    if (filters.referenceType) add('reference_type', '=', filters.referenceType);
    if (filters.dateFrom) add('created_at', '>=', filters.dateFrom);
    if (filters.dateTo) add('created_at', '<=', filters.dateTo);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Payment>(
      `SELECT ${PAYMENT_COLUMNS} FROM payments ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }

  async update(id: string, dto: UpdatePaymentDTO): Promise<Payment> {
    const updates: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (dto.status !== undefined) set('status', dto.status);
    if (dto.transactionId !== undefined) set('transaction_id', dto.transactionId);
    if (dto.metadata !== undefined) set('metadata', JSON.stringify(dto.metadata));
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.query<Payment>(
      `UPDATE payments SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${PAYMENT_COLUMNS}`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM payments WHERE id = $1', [id]);
  }

  async getSummary(studentId: string): Promise<PaymentSummary> {
    const result = await this.db.query<{
      paymentCount: string;
      totalAmount: string;
      paidAmount: string;
      pendingAmount: string;
    }>(
      `SELECT COUNT(*) AS "paymentCount",
              COALESCE(SUM(amount), 0) AS "totalAmount",
              COALESCE(SUM(CASE WHEN status IN ('paid', 'confirmed') THEN amount ELSE 0 END), 0) AS "paidAmount",
              COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS "pendingAmount"
       FROM payments
       WHERE student_id = $1`,
      [studentId]
    );
    const row = result.rows[0];
    return {
      paymentCount: Number(row.paymentCount),
      totalAmount: Number(row.totalAmount),
      paidAmount: Number(row.paidAmount),
      pendingAmount: Number(row.pendingAmount),
    };
  }
}
