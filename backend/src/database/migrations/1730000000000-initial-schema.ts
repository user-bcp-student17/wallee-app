import { MigrationInterface, QueryRunner } from 'typeorm';

// Esquema inicial de clientes, wallets, onboarding, pagos, QR, asientos, soporte y conciliación.
// Generado a partir de las entidades; src/database/schema.spec.ts verifica que no haya diferencias.
const UP = [
    `CREATE TABLE "customers" ("id" varchar PRIMARY KEY NOT NULL, "document_type" varchar, "document_number" varchar, "full_name" varchar, "phone" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_customers_document_pair" CHECK (("document_type" IS NULL) = ("document_number" IS NULL)), CONSTRAINT "ck_customers_document_type" CHECK ("document_type" IS NULL OR "document_type" IN ('TEST', 'DNI')))`,
    `CREATE TABLE "recipients" ("id" varchar PRIMARY KEY NOT NULL, "kind" varchar NOT NULL, "name" varchar NOT NULL, CONSTRAINT "ck_recipients_kind" CHECK ("kind" IN ('CONTACT', 'MERCHANT')))`,
    `CREATE TABLE "provider_payments" ("id" varchar PRIMARY KEY NOT NULL, "amount" integer NOT NULL, "status" varchar NOT NULL DEFAULT ('PENDING'), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_provider_payments_status" CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'REJECTED', 'REVERSED')), CONSTRAINT "ck_provider_payments_amount" CHECK ("amount" BETWEEN 1 AND 100000000))`,
    `CREATE TABLE "ledger_entries" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "operation" varchar NOT NULL, "kind" varchar NOT NULL, "account" varchar NOT NULL, "amount" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_ledger_amount" CHECK ("amount" <> 0), CONSTRAINT "ck_ledger_kind" CHECK ("kind" IN ('FUNDING', 'PAYMENT', 'REVERSAL')))`,
    `CREATE TABLE "support_cases" ("id" varchar PRIMARY KEY NOT NULL, "resource" varchar NOT NULL, "reason" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('OPEN'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "resolved_at" datetime, CONSTRAINT "ck_support_cases_status" CHECK ("status" IN ('OPEN', 'RESOLVED')), CONSTRAINT "ck_support_cases_reason" CHECK ("reason" IN ('KYC_REVIEW', 'UNKNOWN_PAYMENT_RESULT', 'PROVIDER_PENDING')))`,
    `CREATE TABLE "settlement_adjustments" ("payment_id" varchar PRIMARY KEY NOT NULL, "mode" varchar NOT NULL, "amount_cents" integer, CONSTRAINT "ck_settlement_adjustments_amount" CHECK ("amount_cents" IS NULL OR "amount_cents" BETWEEN 1 AND 100000000), CONSTRAINT "ck_settlement_adjustments_mode" CHECK ("mode" IN ('AMOUNT', 'MISSING', 'DUPLICATE', 'ORPHAN')))`,
    `CREATE TABLE "reconciliation_incidents" ("id" varchar PRIMARY KEY NOT NULL, "payment_id" varchar NOT NULL, "reason" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('OPEN'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_reconciliation_incidents_status" CHECK ("status" IN ('OPEN', 'RESOLVED')), CONSTRAINT "ck_reconciliation_incidents_reason" CHECK ("reason" IN ('DUPLICATE_PROVIDER', 'MISSING_WALLET', 'MISSING_PROVIDER', 'AMOUNT_MISMATCH', 'STATUS_MISMATCH', 'LEDGER_MISMATCH', 'LEDGER_UNBALANCED', 'BALANCE_MISMATCH')))`,
    `CREATE TABLE "wallets" ("id" varchar PRIMARY KEY NOT NULL, "customer_id" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('PENDING'), "balance" integer NOT NULL DEFAULT (0), "reserved" integer NOT NULL DEFAULT (0), "currency" varchar NOT NULL DEFAULT ('PEN'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_wallets_reserved" CHECK ("reserved" >= 0 AND "reserved" <= "balance"), CONSTRAINT "ck_wallets_balance" CHECK ("balance" >= 0), CONSTRAINT "ck_wallets_currency" CHECK ("currency" = 'PEN'), CONSTRAINT "ck_wallets_status" CHECK ("status" IN ('ACTIVE', 'PENDING', 'REJECTED')), CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "kyc_verifications" ("id" varchar PRIMARY KEY NOT NULL, "wallet_id" varchar NOT NULL, "scenario" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('PENDING'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "decided_at" datetime, CONSTRAINT "ck_kyc_status" CHECK ("status" IN ('ACTIVE', 'PENDING', 'REJECTED')), CONSTRAINT "ck_kyc_scenario" CHECK ("scenario" IN ('APPROVED', 'REJECTED', 'MANUAL_REVIEW')), CONSTRAINT "FK_f64998840c33986d3d6b1333bec" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "onboarding_processes" ("id" varchar PRIMARY KEY NOT NULL, "customer_id" varchar NOT NULL, "wallet_id" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('EN_CURSO'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "completed_at" datetime, CONSTRAINT "ck_onboarding_status" CHECK ("status" IN ('EN_CURSO', 'COMPLETADO')), CONSTRAINT "FK_986d0075763a3adbfdce121e9a7" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_f0f1ceab1f1b1eb0d8fbab1e1a9" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "onboarding_events" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "onboarding_id" varchar NOT NULL, "type" varchar NOT NULL, "step" varchar, "occurred_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_onboarding_event_step" CHECK ("step" IS NULL OR "step" IN ('datos', 'identidad', 'verificacion')), CONSTRAINT "ck_onboarding_event_type" CHECK ("type" IN ('onboarding_started', 'onboarding_step_completed', 'onboarding_completed')), CONSTRAINT "FK_d0e416f7087ef5691c5687a88ea" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_processes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    `CREATE TABLE "qrs" ("id" varchar PRIMARY KEY NOT NULL, "payload" varchar NOT NULL, "recipient_id" varchar NOT NULL, "amount_cents" integer, "currency" varchar NOT NULL DEFAULT ('PEN'), "expires_at" datetime NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_qrs_currency" CHECK ("currency" = 'PEN'), CONSTRAINT "ck_qrs_amount" CHECK ("amount_cents" IS NULL OR "amount_cents" BETWEEN 1 AND 100000000), CONSTRAINT "FK_e91903d35ae75f607b6fe002b12" FOREIGN KEY ("recipient_id") REFERENCES "recipients" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "payments" ("id" varchar PRIMARY KEY NOT NULL, "wallet_id" varchar NOT NULL, "recipient_id" varchar NOT NULL, "qr_id" varchar, "amount" integer NOT NULL, "currency" varchar NOT NULL DEFAULT ('PEN'), "status" varchar NOT NULL DEFAULT ('PENDING'), "scenario" varchar NOT NULL DEFAULT ('APPROVED'), "idempotency_key" varchar NOT NULL, "fingerprint" text NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_payments_idempotency_key" CHECK (length("idempotency_key") BETWEEN 1 AND 200), CONSTRAINT "ck_payments_currency" CHECK ("currency" = 'PEN'), CONSTRAINT "ck_payments_status" CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'REJECTED', 'REVERSED')), CONSTRAINT "ck_payments_amount" CHECK ("amount" BETWEEN 1 AND 100000000), CONSTRAINT "FK_1bdffa25425538e630d8eb8a8bc" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_0192ca7ba9de2d626df14aa4b24" FOREIGN KEY ("recipient_id") REFERENCES "recipients" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_a66dcd90603ad2fc524199d7e13" FOREIGN KEY ("qr_id") REFERENCES "qrs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "reversals" ("id" varchar PRIMARY KEY NOT NULL, "payment_id" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('PENDING'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_reversals_status" CHECK ("status" IN ('PENDING', 'SUCCEEDED')), CONSTRAINT "FK_96532fee11254542663ca6e874a" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE TABLE "payment_events" ("id" varchar PRIMARY KEY NOT NULL, "payment_id" varchar NOT NULL, "target" varchar NOT NULL, "delivered" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "delivered_at" datetime, CONSTRAINT "ck_payment_events_delivered" CHECK ("delivered" IN (0, 1)), CONSTRAINT "ck_payment_events_target" CHECK ("target" IN ('SUCCEEDED', 'REJECTED', 'REVERSED')), CONSTRAINT "FK_829c2f9024093a7f56a239acd97" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    `CREATE UNIQUE INDEX "IDX_50bbc25d401f66c27c39a1ccd5" ON "customers" ("document_type", "document_number")`,
    `CREATE INDEX "IDX_bcdc03e8992c132b9625bec846" ON "ledger_entries" ("operation")`,
    `CREATE UNIQUE INDEX "IDX_ffe31d6b485328e2053fbc8eec" ON "support_cases" ("resource", "reason")`,
    `CREATE UNIQUE INDEX "IDX_12d141fc7c500c8544cd0096ad" ON "reconciliation_incidents" ("payment_id", "reason")`,
    `CREATE INDEX "IDX_6580899a2293de27787376887f" ON "wallets" ("customer_id")`,
    `CREATE INDEX "IDX_f64998840c33986d3d6b1333be" ON "kyc_verifications" ("wallet_id")`,
    `CREATE INDEX "IDX_986d0075763a3adbfdce121e9a" ON "onboarding_processes" ("customer_id")`,
    `CREATE UNIQUE INDEX "IDX_f0f1ceab1f1b1eb0d8fbab1e1a" ON "onboarding_processes" ("wallet_id")`,
    `CREATE INDEX "IDX_66adfe24595f7551bf3261443f" ON "onboarding_events" ("onboarding_id", "id")`,
    `CREATE UNIQUE INDEX "IDX_c43cca6e8d7b493840cd4ca94c" ON "qrs" ("payload")`,
    `CREATE INDEX "IDX_f7734828fb70659e691bf8bfbc" ON "payments" ("wallet_id", "created_at")`,
    `CREATE UNIQUE INDEX "IDX_cf773ea87e4ef451cf7fb15f36" ON "payments" ("wallet_id", "idempotency_key")`,
    `CREATE UNIQUE INDEX "IDX_96532fee11254542663ca6e874" ON "reversals" ("payment_id")`,
    `CREATE INDEX "IDX_829c2f9024093a7f56a239acd9" ON "payment_events" ("payment_id")`,
];

const DOWN = [
    'DROP INDEX "IDX_829c2f9024093a7f56a239acd9"',
    'DROP INDEX "IDX_96532fee11254542663ca6e874"',
    'DROP INDEX "IDX_cf773ea87e4ef451cf7fb15f36"',
    'DROP INDEX "IDX_f7734828fb70659e691bf8bfbc"',
    'DROP INDEX "IDX_c43cca6e8d7b493840cd4ca94c"',
    'DROP INDEX "IDX_66adfe24595f7551bf3261443f"',
    'DROP INDEX "IDX_f0f1ceab1f1b1eb0d8fbab1e1a"',
    'DROP INDEX "IDX_986d0075763a3adbfdce121e9a"',
    'DROP INDEX "IDX_f64998840c33986d3d6b1333be"',
    'DROP INDEX "IDX_6580899a2293de27787376887f"',
    'DROP INDEX "IDX_12d141fc7c500c8544cd0096ad"',
    'DROP INDEX "IDX_ffe31d6b485328e2053fbc8eec"',
    'DROP INDEX "IDX_bcdc03e8992c132b9625bec846"',
    'DROP INDEX "IDX_50bbc25d401f66c27c39a1ccd5"',
    'DROP TABLE "payment_events"',
    'DROP TABLE "reversals"',
    'DROP TABLE "payments"',
    'DROP TABLE "qrs"',
    'DROP TABLE "onboarding_events"',
    'DROP TABLE "onboarding_processes"',
    'DROP TABLE "kyc_verifications"',
    'DROP TABLE "wallets"',
    'DROP TABLE "reconciliation_incidents"',
    'DROP TABLE "settlement_adjustments"',
    'DROP TABLE "support_cases"',
    'DROP TABLE "ledger_entries"',
    'DROP TABLE "provider_payments"',
    'DROP TABLE "recipients"',
    'DROP TABLE "customers"',
];

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  async up(queryRunner: QueryRunner) {
    for (const statement of UP) await queryRunner.query(statement);
  }

  async down(queryRunner: QueryRunner) {
    for (const statement of DOWN) await queryRunner.query(statement);
  }
}
