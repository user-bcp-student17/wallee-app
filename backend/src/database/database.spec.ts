import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { DEFAULT_DB_PATH, IN_MEMORY, dataSourceOptions, isSeedEnabled } from './database.config';
import { DEMO_OPENING_BALANCE, DEMO_WALLET_ID, DatabaseSeeder, seedDemoData } from './database.seed';
import { Customer, LedgerEntry, OnboardingEvent, OnboardingProcess, Payment, Qr, Reversal, Wallet } from './entities';
import { InitialSchema1730000000000 } from './migrations/1730000000000-initial-schema';

const memory = () => dataSourceOptions({ DB_PATH: IN_MEMORY } as NodeJS.ProcessEnv);

describe('database schema', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource(memory());
    await dataSource.initialize();
    await seedDemoData(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  const rejects = (promise: Promise<unknown>, message: RegExp) => expect(promise).rejects.toThrow(message);
  const payment = (overrides: Partial<Payment> = {}) => ({
    id: 'pay-1',
    walletId: DEMO_WALLET_ID,
    recipientId: 'merchant-demo',
    amount: 1500,
    idempotencyKey: 'key-1',
    fingerprint: '["merchant-demo",1500,null]',
    ...overrides,
  });

  it('migrations leave no differences against the entities', async () => {
    const log = await dataSource.driver.createSchemaBuilder().log();
    expect(log.upQueries).toEqual([]);
  });

  it('down migration removes every table', async () => {
    await new InitialSchema1730000000000().down(dataSource.createQueryRunner());
    const rows = await dataSource.query("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name <> 'migrations'");
    expect(rows).toEqual([]);
  });

  it('seeds wallet-demo with 100000 cents and balanced opening entries', async () => {
    const wallet = await dataSource.getRepository(Wallet).findOneByOrFail({ id: DEMO_WALLET_ID });
    expect(wallet).toMatchObject({ status: 'ACTIVE', balance: DEMO_OPENING_BALANCE, reserved: 0, currency: 'PEN' });
    const entries = await dataSource.getRepository(LedgerEntry).findBy({ operation: 'opening' });
    expect(entries.map((entry) => entry.kind)).toEqual(['FUNDING', 'FUNDING']);
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(0);
  });

  it('seeding twice does not duplicate data', async () => {
    await seedDemoData(dataSource);
    expect(await dataSource.getRepository(Wallet).count()).toBe(1);
    expect(await dataSource.getRepository(LedgerEntry).count()).toBe(2);
  });

  it('enforces foreign keys', async () => {
    await rejects(dataSource.getRepository(Wallet).insert({ id: 'w-x', customerId: 'missing' }), /FOREIGN KEY/);
    await rejects(dataSource.getRepository(Payment).insert(payment({ walletId: 'missing' })), /FOREIGN KEY/);
  });

  it('keeps balance, reserved and currency consistent', async () => {
    const wallets = dataSource.getRepository(Wallet);
    await rejects(wallets.update(DEMO_WALLET_ID, { balance: -1 }), /CHECK/);
    await rejects(wallets.update(DEMO_WALLET_ID, { reserved: DEMO_OPENING_BALANCE + 1 }), /CHECK/);
    await rejects(wallets.update(DEMO_WALLET_ID, { status: 'FROZEN' }), /CHECK/);
    await rejects(wallets.update(DEMO_WALLET_ID, { currency: 'USD' }), /CHECK/);
    await wallets.update(DEMO_WALLET_ID, { reserved: 1500 });
  });

  it('requires document type and number together and unique per customer', async () => {
    const customers = dataSource.getRepository(Customer);
    await rejects(customers.insert({ id: 'c1', documentType: 'TEST', documentNumber: null }), /CHECK/);
    await rejects(customers.insert({ id: 'c2', documentType: 'PASSPORT', documentNumber: '1' }), /CHECK/);
    await rejects(customers.insert({ id: 'c3', documentType: 'TEST', documentNumber: 'TEST-DEMO' }), /UNIQUE/);
    await customers.insert([{ id: 'c4' }, { id: 'c5' }]);
  });

  it('validates payment amount, status and idempotency key', async () => {
    const payments = dataSource.getRepository(Payment);
    await rejects(payments.insert(payment({ amount: 0 })), /CHECK/);
    await rejects(payments.insert(payment({ amount: 100_000_001 })), /CHECK/);
    await rejects(payments.insert(payment({ status: 'DONE' })), /CHECK/);
    await rejects(payments.insert(payment({ idempotencyKey: '' })), /CHECK/);
    await rejects(payments.insert(payment({ idempotencyKey: 'k'.repeat(201) })), /CHECK/);
    await payments.insert(payment());
    expect((await payments.findOneByOrFail({ id: 'pay-1' })).status).toBe('PENDING');
  });

  it('keeps idempotency keys unique per wallet', async () => {
    const payments = dataSource.getRepository(Payment);
    await payments.insert(payment());
    await rejects(payments.insert(payment({ id: 'pay-2' })), /UNIQUE/);
    await dataSource.getRepository(Customer).insert({ id: 'c-2' });
    await dataSource.getRepository(Wallet).insert({ id: 'wallet-2', customerId: 'c-2' });
    await payments.insert(payment({ id: 'pay-2', walletId: 'wallet-2' }));
  });

  it('allows a single reversal per payment', async () => {
    await dataSource.getRepository(Payment).insert(payment());
    const reversals = dataSource.getRepository(Reversal);
    await reversals.insert({ id: 'rev-1', paymentId: 'pay-1' });
    await rejects(reversals.insert({ id: 'rev-2', paymentId: 'pay-1' }), /UNIQUE/);
  });

  it('validates QR amounts and links them to a recipient', async () => {
    const qrs = dataSource.getRepository(Qr);
    const qr = { id: 'qr-1', payload: 'qrmock:qr-1', recipientId: 'merchant-demo', amountCents: null, expiresAt: new Date() };
    await rejects(qrs.insert({ ...qr, amountCents: 0 }), /CHECK/);
    await qrs.insert(qr);
    await rejects(qrs.insert({ ...qr, id: 'qr-2' }), /UNIQUE/);
    await dataSource.getRepository(Payment).insert(payment({ qrId: 'qr-1' }));
  });

  it('rejects zero-amount ledger entries and unknown kinds', async () => {
    const ledger = dataSource.getRepository(LedgerEntry);
    await rejects(ledger.insert({ operation: 'pay-1', kind: 'PAYMENT', account: DEMO_WALLET_ID, amount: 0 }), /CHECK/);
    await rejects(ledger.insert({ operation: 'pay-1', kind: 'OTHER', account: DEMO_WALLET_ID, amount: 5 }), /CHECK/);
  });

  it('stores onboarding progress and cascades its events', async () => {
    await dataSource.getRepository(Customer).insert({ id: 'c-onb' });
    await dataSource.getRepository(Wallet).insert({ id: 'wal-onb', customerId: 'c-onb' });
    await dataSource.getRepository(OnboardingProcess).insert({ id: 'onb-1', customerId: 'c-onb', walletId: 'wal-onb' });
    const events = dataSource.getRepository(OnboardingEvent);
    await events.insert([{ onboardingId: 'onb-1', type: 'onboarding_started' }, { onboardingId: 'onb-1', type: 'onboarding_step_completed', step: 'datos' }]);
    await rejects(events.insert({ onboardingId: 'onb-1', type: 'other' }), /CHECK/);
    await rejects(events.insert({ onboardingId: 'onb-1', type: 'onboarding_step_completed', step: 'otro' }), /CHECK/);
    await dataSource.getRepository(OnboardingProcess).delete('onb-1');
    expect(await events.count()).toBe(0);
  });
});

describe('database configuration', () => {
  it('uses the default path and detects the seed flag', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wallee-db-'));
    const previous = process.cwd();
    process.chdir(dir);
    try {
      expect(dataSourceOptions({} as NodeJS.ProcessEnv).database).toBe(DEFAULT_DB_PATH);
      expect(existsSync(join(dir, 'data'))).toBe(true);
    } finally {
      process.chdir(previous);
      rmSync(dir, { recursive: true, force: true });
    }
    expect(isSeedEnabled({ DB_SEED: 'true' } as NodeJS.ProcessEnv)).toBe(true);
    expect(isSeedEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('persists data in a file between connections', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wallee-db-'));
    const env = { DB_PATH: join(dir, 'nested', 'wallee.sqlite') } as NodeJS.ProcessEnv;
    try {
      const first = new DataSource(dataSourceOptions(env));
      await first.initialize();
      await first.getRepository(Customer).insert({ id: 'persisted' });
      await first.destroy();
      const second = new DataSource(dataSourceOptions(env));
      await second.initialize();
      expect(await second.getRepository(Customer).countBy({ id: 'persisted' })).toBe(1);
      await second.destroy();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('DatabaseSeeder', () => {
  const run = async (seed: string | undefined) => {
    const dataSource = new DataSource(memory());
    await dataSource.initialize();
    const previous = process.env.DB_SEED;
    if (seed === undefined) delete process.env.DB_SEED;
    else process.env.DB_SEED = seed;
    try {
      await new DatabaseSeeder(dataSource).onApplicationBootstrap();
      return await dataSource.getRepository(Wallet).count();
    } finally {
      if (previous === undefined) delete process.env.DB_SEED;
      else process.env.DB_SEED = previous;
      await dataSource.destroy();
    }
  };

  it('seeds only when DB_SEED is true', async () => {
    expect(await run('true')).toBe(1);
    expect(await run(undefined)).toBe(0);
  });
});
