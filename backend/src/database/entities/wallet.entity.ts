import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { CURRENCY, WALLET_STATUSES, inList } from '../database.constants';
import { Customer } from './customer.entity';

// Importes en céntimos de PEN. available = balance - reserved (se calcula, no se guarda).
@Entity('wallets')
@Check('ck_wallets_status', inList('status', WALLET_STATUSES))
@Check('ck_wallets_currency', `"currency" = '${CURRENCY}'`)
@Check('ck_wallets_balance', '"balance" >= 0')
@Check('ck_wallets_reserved', '"reserved" >= 0 AND "reserved" <= "balance"')
export class Wallet {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @Column({ type: 'integer', default: 0 })
  balance!: number;

  @Column({ type: 'integer', default: 0 })
  reserved!: number;

  @Column({ type: 'varchar', default: CURRENCY })
  currency!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
