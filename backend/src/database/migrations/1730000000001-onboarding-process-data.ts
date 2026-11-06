import { MigrationInterface, QueryRunner } from 'typeorm';

// El onboarding pasa de memoria a la base. La wallet y el cliente se crean al activarla, así que el proceso ya no
// referencia `customers` ni `wallets` y guarda los datos de cada paso. Estas tablas aún no recibían filas, por eso se
// recrean en lugar de migrar datos.
const UP = [
  'DROP TABLE "onboarding_events"',
  'DROP TABLE "onboarding_processes"',
  `CREATE TABLE "onboarding_processes" ("id" varchar PRIMARY KEY NOT NULL, "wallet_id" varchar NOT NULL, "full_name" varchar, "phone" varchar, "document_number" varchar, "status" varchar NOT NULL DEFAULT ('EN_CURSO'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "completed_at" datetime, CONSTRAINT "ck_onboarding_status" CHECK ("status" IN ('EN_CURSO', 'COMPLETADO')))`,
  `CREATE TABLE "onboarding_events" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "onboarding_id" varchar NOT NULL, "type" varchar NOT NULL, "step" varchar, "occurred_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_onboarding_event_step" CHECK ("step" IS NULL OR "step" IN ('datos', 'identidad', 'verificacion')), CONSTRAINT "ck_onboarding_event_type" CHECK ("type" IN ('onboarding_started', 'onboarding_step_completed', 'onboarding_completed')), CONSTRAINT "FK_d0e416f7087ef5691c5687a88ea" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_processes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
  `CREATE UNIQUE INDEX "IDX_f0f1ceab1f1b1eb0d8fbab1e1a" ON "onboarding_processes" ("wallet_id")`,
  `CREATE INDEX "IDX_66adfe24595f7551bf3261443f" ON "onboarding_events" ("onboarding_id", "id")`,
];

const DOWN = [
  'DROP TABLE "onboarding_events"',
  'DROP TABLE "onboarding_processes"',
  `CREATE TABLE "onboarding_processes" ("id" varchar PRIMARY KEY NOT NULL, "customer_id" varchar NOT NULL, "wallet_id" varchar NOT NULL, "status" varchar NOT NULL DEFAULT ('EN_CURSO'), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "completed_at" datetime, CONSTRAINT "ck_onboarding_status" CHECK ("status" IN ('EN_CURSO', 'COMPLETADO')), CONSTRAINT "FK_986d0075763a3adbfdce121e9a7" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_f0f1ceab1f1b1eb0d8fbab1e1a9" FOREIGN KEY ("wallet_id") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
  `CREATE TABLE "onboarding_events" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "onboarding_id" varchar NOT NULL, "type" varchar NOT NULL, "step" varchar, "occurred_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "ck_onboarding_event_step" CHECK ("step" IS NULL OR "step" IN ('datos', 'identidad', 'verificacion')), CONSTRAINT "ck_onboarding_event_type" CHECK ("type" IN ('onboarding_started', 'onboarding_step_completed', 'onboarding_completed')), CONSTRAINT "FK_d0e416f7087ef5691c5687a88ea" FOREIGN KEY ("onboarding_id") REFERENCES "onboarding_processes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
  `CREATE INDEX "IDX_986d0075763a3adbfdce121e9a" ON "onboarding_processes" ("customer_id")`,
  `CREATE UNIQUE INDEX "IDX_f0f1ceab1f1b1eb0d8fbab1e1a" ON "onboarding_processes" ("wallet_id")`,
  `CREATE INDEX "IDX_66adfe24595f7551bf3261443f" ON "onboarding_events" ("onboarding_id", "id")`,
];

export class OnboardingProcessData1730000000001 implements MigrationInterface {
  name = 'OnboardingProcessData1730000000001';

  async up(queryRunner: QueryRunner) {
    for (const statement of UP) await queryRunner.query(statement);
  }

  async down(queryRunner: QueryRunner) {
    for (const statement of DOWN) await queryRunner.query(statement);
  }
}
