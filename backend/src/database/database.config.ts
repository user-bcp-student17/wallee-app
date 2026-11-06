import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import {
  Customer,
  KycVerification,
  LedgerEntry,
  OnboardingEvent,
  OnboardingProcess,
  Payment,
  PaymentEvent,
  ProviderPayment,
  Qr,
  ReconciliationIncident,
  Recipient,
  Reversal,
  SettlementAdjustment,
  SupportCase,
  Wallet,
} from './entities';
import { InitialSchema1730000000000 } from './migrations/1730000000000-initial-schema';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export const DEFAULT_DB_PATH = 'data/wallee.sqlite';
export const IN_MEMORY = ':memory:';

export const ENTITIES = [
  Customer,
  Wallet,
  KycVerification,
  OnboardingProcess,
  OnboardingEvent,
  Recipient,
  Qr,
  Payment,
  ProviderPayment,
  Reversal,
  PaymentEvent,
  LedgerEntry,
  SupportCase,
  SettlementAdjustment,
  ReconciliationIncident,
];

export function dataSourceOptions(env: NodeJS.ProcessEnv = process.env): BetterSqlite3ConnectionOptions {
  const database = env.DB_PATH?.trim() || DEFAULT_DB_PATH;
  if (database !== IN_MEMORY) mkdirSync(dirname(database), { recursive: true });
  return {
    type: 'better-sqlite3',
    database,
    entities: ENTITIES,
    migrations: [InitialSchema1730000000000],
    migrationsRun: true,
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    prepareDatabase: (db) => {
      db.pragma('journal_mode = WAL');
    },
  };
}

// DB_SEED manda; sin él se siembra solo fuera de producción, como el OTP simulado.
export const isSeedEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  env.DB_SEED ? env.DB_SEED === 'true' : env.NODE_ENV !== 'production';
