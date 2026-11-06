import { Check, Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CASE_STATUSES, INCIDENT_REASONS, LEDGER_KINDS, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, SETTLEMENT_MODES, SUPPORT_REASONS, inList } from '../database.constants';

// Partida doble. account es una wallet, "funding" o "clearing", por eso no tiene FK. Cada operación suma cero.
@Entity('ledger_entries')
@Index(['operation'])
@Check('ck_ledger_kind', inList('kind', LEDGER_KINDS))
@Check('ck_ledger_amount', '"amount" <> 0')
export class LedgerEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  // ID del pago, o "opening" para la semilla.
  @Column('varchar')
  operation!: string;

  @Column('varchar')
  kind!: string;

  @Column('varchar')
  account!: string;

  @Column('integer')
  amount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

// resource es el ID de un KYC o de un pago. Un único caso por recurso y motivo.
@Entity('support_cases')
@Index(['resource', 'reason'], { unique: true })
@Check('ck_support_cases_reason', inList('reason', SUPPORT_REASONS))
@Check('ck_support_cases_status', inList('status', CASE_STATUSES))
export class SupportCase {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  resource!: string;

  @Column('varchar')
  reason!: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt!: Date | null;
}

// Una sola alteración del reporte de conciliación por pago; no modifica wallet ni ledger.
@Entity('settlement_adjustments')
@Check('ck_settlement_adjustments_mode', inList('mode', SETTLEMENT_MODES))
@Check('ck_settlement_adjustments_amount', `"amount_cents" IS NULL OR "amount_cents" BETWEEN ${MIN_AMOUNT_CENTS} AND ${MAX_AMOUNT_CENTS}`)
export class SettlementAdjustment {
  @PrimaryColumn('varchar')
  paymentId!: string;

  @Column('varchar')
  mode!: string;

  @Column({ type: 'integer', nullable: true })
  amountCents!: number | null;
}

// La misma combinación de recurso y motivo conserva su ID entre conciliaciones.
@Entity('reconciliation_incidents')
@Index(['paymentId', 'reason'], { unique: true })
@Check('ck_reconciliation_incidents_reason', inList('reason', INCIDENT_REASONS))
@Check('ck_reconciliation_incidents_status', inList('status', CASE_STATUSES))
export class ReconciliationIncident {
  @PrimaryColumn('varchar')
  id!: string;

  // Pago o wallet afectada (BALANCE_MISMATCH).
  @Column('varchar')
  paymentId!: string;

  @Column('varchar')
  reason!: string;

  @Column({ type: 'varchar', default: 'OPEN' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
