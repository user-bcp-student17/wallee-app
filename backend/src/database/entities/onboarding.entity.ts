import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ONBOARDING_EVENT_TYPES, ONBOARDING_STATUSES, ONBOARDING_STEPS, inList } from '../database.constants';
import { Customer } from './customer.entity';
import { Wallet } from './wallet.entity';

// Proceso de onboarding de la HU W1; la wallet nace PENDING y se activa al completar los tres pasos.
@Entity('onboarding_processes')
@Check('ck_onboarding_status', inList('status', ONBOARDING_STATUSES))
export class OnboardingProcess {
  @PrimaryColumn('varchar')
  id!: string;

  @Index()
  @Column('varchar')
  customerId!: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Index({ unique: true })
  @Column('varchar')
  walletId!: string;

  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  @Column({ type: 'varchar', default: 'EN_CURSO' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;
}

@Entity('onboarding_events')
@Check('ck_onboarding_event_type', inList('type', ONBOARDING_EVENT_TYPES))
@Check('ck_onboarding_event_step', `"step" IS NULL OR ${inList('step', ONBOARDING_STEPS)}`)
@Index(['onboardingId', 'id'])
export class OnboardingEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar')
  onboardingId!: string;

  @ManyToOne(() => OnboardingProcess, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'onboarding_id' })
  onboarding?: OnboardingProcess;

  @Column('varchar')
  type!: string;

  @Column({ type: 'varchar', nullable: true })
  step!: string | null;

  @CreateDateColumn()
  occurredAt!: Date;
}
