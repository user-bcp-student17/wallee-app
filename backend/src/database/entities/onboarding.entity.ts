import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ONBOARDING_EVENT_TYPES, ONBOARDING_STATUSES, ONBOARDING_STEPS, inList } from '../database.constants';

// Proceso de onboarding de la HU W1. walletId se reserva al iniciar, pero la fila de `wallets` y el cliente se crean al
// activar la wallet (último paso); por eso no hay claves foráneas. Los datos de cada paso se guardan aquí hasta entonces.
@Entity('onboarding_processes')
@Check('ck_onboarding_status', inList('status', ONBOARDING_STATUSES))
export class OnboardingProcess {
  @PrimaryColumn('varchar')
  id!: string;

  @Index({ unique: true })
  @Column('varchar')
  walletId!: string;

  @Column({ type: 'varchar', nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  documentNumber!: string | null;

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
