import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { CURRENCY, MAX_AMOUNT_CENTS, MIN_AMOUNT_CENTS, RECIPIENT_KINDS, inList } from '../database.constants';

// Destinatarios permitidos por el mock: contact-demo y merchant-demo. Los comercios también resuelven QR.
@Entity('recipients')
@Check('ck_recipients_kind', inList('kind', RECIPIENT_KINDS))
export class Recipient {
  @PrimaryColumn('varchar')
  id!: string;

  @Column('varchar')
  kind!: string;

  @Column('varchar')
  name!: string;
}

@Entity('qrs')
@Check('ck_qrs_amount', `"amount_cents" IS NULL OR "amount_cents" BETWEEN ${MIN_AMOUNT_CENTS} AND ${MAX_AMOUNT_CENTS}`)
@Check('ck_qrs_currency', `"currency" = '${CURRENCY}'`)
export class Qr {
  @PrimaryColumn('varchar')
  id!: string;

  @Index({ unique: true })
  @Column('varchar')
  payload!: string;

  @Column('varchar')
  recipientId!: string;

  @ManyToOne(() => Recipient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: Recipient;

  // null = monto abierto.
  @Column({ type: 'integer', nullable: true })
  amountCents!: number | null;

  @Column({ type: 'varchar', default: CURRENCY })
  currency!: string;

  @Column('datetime')
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
