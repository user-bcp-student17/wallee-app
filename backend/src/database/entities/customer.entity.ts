import { Check, Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DOCUMENT_TYPES, inList } from '../database.constants';

// Cliente de Wallee. Los datos personales se completan paso a paso durante el onboarding, por eso son opcionales.
@Entity('customers')
@Index(['documentType', 'documentNumber'], { unique: true })
@Check('ck_customers_document_type', `"document_type" IS NULL OR ${inList('document_type', DOCUMENT_TYPES)}`)
@Check('ck_customers_document_pair', '("document_type" IS NULL) = ("document_number" IS NULL)')
export class Customer {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  documentType!: string | null;

  @Column({ type: 'varchar', nullable: true })
  documentNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
