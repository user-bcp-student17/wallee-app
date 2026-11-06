import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { KYC_SCENARIOS, WALLET_STATUSES, inList } from '../database.constants';
import { Wallet } from './wallet.entity';

// El escenario UNAVAILABLE del mock responde 503 sin crear wallet, por eso no se persiste.
@Entity('kyc_verifications')
@Check('ck_kyc_scenario', inList('scenario', KYC_SCENARIOS))
@Check('ck_kyc_status', inList('status', WALLET_STATUSES))
export class KycVerification {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  walletId!: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column('varchar')
  scenario!: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  decidedAt!: Date | null;
}
