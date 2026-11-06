import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import {
  CURRENCY,
  EVENT_TARGETS,
  MAX_AMOUNT_CENTS,
  MIN_AMOUNT_CENTS,
  PAYMENT_STATUSES,
  REVERSAL_STATUSES,
  inList,
} from '../database.constants';
import { Qr, Recipient } from './recipient-qr.entity';
import { Wallet } from './wallet.entity';

const AMOUNT_RANGE = `BETWEEN ${MIN_AMOUNT_CENTS} AND ${MAX_AMOUNT_CENTS}`;

// Solo los pagos PENDING reservan saldo en la wallet.
@Entity('payments')
@Index(['walletId', 'idempotencyKey'], { unique: true })
@Index(['walletId', 'createdAt'])
@Check('ck_payments_amount', `"amount" ${AMOUNT_RANGE}`)
@Check('ck_payments_status', inList('status', PAYMENT_STATUSES))
@Check('ck_payments_currency', `"currency" = '${CURRENCY}'`)
@Check('ck_payments_idempotency_key', 'length("idempotency_key") BETWEEN 1 AND 200')
export class Payment {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  walletId!: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column('varchar')
  recipientId!: string;

  @ManyToOne(() => Recipient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Recipient;

  @Column({ type: 'varchar', nullable: true })
  qrId!: string | null;

  @ManyToOne(() => Qr, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'qr_id' })
  qr?: Qr | null;

  @Column('integer')
  amount!: number;

  @Column({ type: 'varchar', default: CURRENCY })
  currency!: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ type: 'varchar', default: 'APPROVED' })
  scenario!: string;

  @Column('varchar')
  idempotencyKey!: string;

  // Huella interna para detectar el mismo Idempotency-Key con contenido distinto (texto JSON).
  @Column('text')
  fingerprint!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Fuente del proveedor simulado. Sin FK a payments: el modo ORPHAN del reporte crea IDs que la wallet no conoce.
@Entity('provider_payments')
@Check('ck_provider_payments_amount', `"amount" ${AMOUNT_RANGE}`)
@Check('ck_provider_payments_status', inList('status', PAYMENT_STATUSES))
export class ProviderPayment {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('integer')
  amount!: number;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// Un reverso completo por pago.
@Entity('reversals')
@Check('ck_reversals_status', inList('status', REVERSAL_STATUSES))
export class Reversal {
  @PrimaryColumn('varchar')
  id!: string;

  @Index({ unique: true })
  @Column('varchar')
  paymentId!: string;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

// Evento del proveedor; delivered pasa de 0 a 1 y repetir la entrega no lo incrementa.
@Entity('payment_events')
@Check('ck_payment_events_target', inList('target', EVENT_TARGETS))
@Check('ck_payment_events_delivered', '"delivered" IN (0, 1)')
export class PaymentEvent {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  paymentId!: string;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column('varchar')
  target!: string;

  @Column({ type: 'integer', default: 0 })
  delivered!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveredAt!: Date | null;
}
