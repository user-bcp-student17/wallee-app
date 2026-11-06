import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IN_MEMORY, dataSourceOptions } from '../database/database.config';
import { DEMO_WALLET_ID, seedDemoData } from '../database/database.seed';
import { Customer, LedgerEntry, PaymentEvent, SupportCase, Wallet } from '../database/entities';
import { PaymentsService } from './payments.service';

const body = (overrides: Record<string, unknown> = {}) => ({ walletId: DEMO_WALLET_ID, recipient: 'contact-demo', amountCents: 1500, ...overrides });
const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { getResponse(): { code: string } }).getResponse().code;
  }
  return undefined;
};

describe('PaymentsService (W2: pago a contacto)', () => {
  let dataSource: DataSource;
  let service: PaymentsService;

  beforeEach(async () => {
    dataSource = new DataSource(dataSourceOptions({ DB_PATH: IN_MEMORY } as NodeJS.ProcessEnv));
    await dataSource.initialize();
    await seedDemoData(dataSource);
    service = new PaymentsService(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('reads the seeded wallet with available = balance - reserved', async () => {
    expect(await service.getWallet(DEMO_WALLET_ID)).toEqual({ id: DEMO_WALLET_ID, status: 'ACTIVE', balance: 100000, reserved: 0, available: 100000, currency: 'PEN' });
    expect(await codeOf(service.getWallet('missing'))).toBe('WALLET_NOT_FOUND');
  });

  it('creates a PENDING payment that reserves funds, then resolves it and debits the wallet', async () => {
    const { payment, replay } = await service.createPayment(body(), 'key-1');
    expect(replay).toBe(false);
    expect(payment).toMatchObject({ walletId: DEMO_WALLET_ID, recipient: 'contact-demo', amountCents: 1500, currency: 'PEN', status: 'PENDING', scenario: 'APPROVED' });
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 100000, reserved: 1500, available: 98500 });
    expect(await codeOf(service.getReceipt(payment.id))).toBe('RECEIPT_NOT_READY');

    const resolved = await service.resolvePayment(payment.id);
    expect(resolved).toMatchObject({ escalated: false, payment: { id: payment.id, status: 'SUCCEEDED' } });
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 98500, reserved: 0, available: 98500 });
    const entries = await dataSource.getRepository(LedgerEntry).findBy({ operation: payment.id });
    expect(entries.map((entry) => [entry.account, entry.amount])).toEqual([[DEMO_WALLET_ID, -1500], ['clearing', 1500]]);
    expect(await service.getReceipt(payment.id)).toEqual({ receiptId: `rcp_${payment.id}`, paymentId: payment.id, amountCents: 1500, currency: 'PEN', recipient: 'contact-demo', status: 'SUCCEEDED' });
  });

  it('resolving twice keeps the same result and does not debit again', async () => {
    const { payment } = await service.createPayment(body(), 'key-1');
    await service.resolvePayment(payment.id);
    const again = await service.resolvePayment(payment.id);
    expect(again.payment.status).toBe('SUCCEEDED');
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 98500, reserved: 0 });
    expect(await dataSource.getRepository(LedgerEntry).countBy({ operation: payment.id })).toBe(2);
    expect(await dataSource.getRepository(PaymentEvent).countBy({ paymentId: payment.id, delivered: 1 })).toBe(1);
  });

  it('releases the reservation when the provider rejects', async () => {
    const { payment } = await service.createPayment(body({ scenario: 'REJECTED' }), 'key-1');
    expect((await service.resolvePayment(payment.id)).payment.status).toBe('REJECTED');
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 100000, reserved: 0 });
    expect(await codeOf(service.getReceipt(payment.id))).toBe('RECEIPT_NOT_READY');
    expect(await dataSource.getRepository(LedgerEntry).countBy({ operation: payment.id })).toBe(0);
  });

  it('escalates a pending provider once, then applies the result after it completes', async () => {
    const { payment } = await service.createPayment(body({ scenario: 'PENDING' }), 'key-1');
    expect(await service.resolvePayment(payment.id)).toMatchObject({ escalated: true });
    expect(await service.resolvePayment(payment.id)).toMatchObject({ escalated: true });
    expect(await dataSource.getRepository(SupportCase).countBy({ resource: payment.id, reason: 'PROVIDER_PENDING' })).toBe(1);

    const { eventId } = await service.completeProvider(payment.id, {});
    expect(eventId).toMatch(/^evt_/);
    expect(await codeOf(service.completeProvider(payment.id, {}))).toBe('PROVIDER_ALREADY_FINAL');
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 100000, reserved: 1500 });
    expect((await service.resolvePayment(payment.id)).payment.status).toBe('SUCCEEDED');
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ balance: 98500, reserved: 0 });
  });

  it('can complete a pending provider as REJECTED and validates the status', async () => {
    const { payment } = await service.createPayment(body({ scenario: 'PENDING' }), 'key-1');
    expect(await codeOf(service.completeProvider(payment.id, { status: 'DONE' }))).toBe('INVALID_STATUS');
    expect(await codeOf(service.completeProvider('missing', {}))).toBe('NOT_FOUND');
    await service.completeProvider(payment.id, { status: 'REJECTED' });
    expect((await service.resolvePayment(payment.id)).payment.status).toBe('REJECTED');
  });

  it('is idempotent per wallet: same content replays, different content conflicts', async () => {
    const first = await service.createPayment(body(), 'key-1');
    const replay = await service.createPayment(body(), 'key-1');
    expect(replay).toEqual({ replay: true, payment: first.payment });
    expect(await codeOf(service.createPayment(body({ amountCents: 2000 }), 'key-1'))).toBe('IDEMPOTENCY_CONFLICT');
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ reserved: 1500 });
    expect(await service.listPayments(DEMO_WALLET_ID)).toHaveLength(1);
  });

  it('rejects amounts above the available balance counting reservations', async () => {
    await service.createPayment(body({ amountCents: 99000 }), 'key-1');
    expect(await codeOf(service.createPayment(body({ amountCents: 1001 }), 'key-2'))).toBe('INSUFFICIENT_FUNDS');
    await service.createPayment(body({ amountCents: 1000 }), 'key-3');
  });

  it('rejects inactive and unknown wallets', async () => {
    await dataSource.getRepository(Customer).insert({ id: 'c-pending' });
    await dataSource.getRepository(Wallet).insert({ id: 'wallet-pending', customerId: 'c-pending' });
    expect(await codeOf(service.createPayment(body({ walletId: 'wallet-pending' }), 'key-1'))).toBe('WALLET_NOT_ACTIVE');
    expect(await codeOf(service.createPayment(body({ walletId: 'missing' }), 'key-1'))).toBe('WALLET_NOT_FOUND');
  });

  it('validates the body and the Idempotency-Key', async () => {
    const invalid = (overrides: Record<string, unknown>) => expect(service.createPayment(body(overrides), 'key')).rejects.toBeInstanceOf(BadRequestException);
    await invalid({ amountCents: 0 });
    await invalid({ amountCents: 1.5 });
    await invalid({ amountCents: 100_000_001 });
    await invalid({ amountCents: '15' });
    await invalid({ recipient: 'someone' });
    await invalid({ currency: 'USD' });
    await invalid({ scenario: 'PROVIDER_ERROR' });
    await invalid({ qrId: 'qr-1' });
    await expect(service.createPayment([], 'key')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createPayment(undefined, 'key')).rejects.toBeInstanceOf(BadRequestException);
    for (const key of [undefined, '', 'k'.repeat(201)]) {
      expect(await codeOf(service.createPayment(body(), key))).toBe('INVALID_IDEMPOTENCY_KEY');
    }
  });

  it('reports field errors with a stable code', async () => {
    const error = await service.createPayment(body({ amountCents: 0, recipient: 'x' }), 'key').catch((caught: BadRequestException) => caught);
    const response = (error as BadRequestException).getResponse() as { code: string; errors: { field: string }[] };
    expect(response.code).toBe('VALIDATION_ERROR');
    expect(response.errors.map((item) => item.field).sort()).toEqual(['amountCents', 'recipient']);
  });

  it('lists the history newest first and returns 404 for unknown payments', async () => {
    const first = await service.createPayment(body(), 'key-1');
    const second = await service.createPayment(body({ amountCents: 500 }), 'key-2');
    expect((await service.listPayments(DEMO_WALLET_ID)).map((payment) => payment.id)).toEqual([second.payment.id, first.payment.id]);
    expect(await service.listPayments('empty')).toEqual([]);
    expect(await service.getPayment(first.payment.id)).toEqual(first.payment);
    expect(await codeOf(service.getPayment('missing'))).toBe('PAYMENT_NOT_FOUND');
    expect(await codeOf(service.resolvePayment('missing'))).toBe('PAYMENT_NOT_FOUND');
  });

  it('serializes concurrent payments so reservations never exceed the balance', async () => {
    const results = await Promise.allSettled(Array.from({ length: 5 }, (_, index) => service.createPayment(body({ amountCents: 30000 }), `key-${index}`)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(await service.getWallet(DEMO_WALLET_ID)).toMatchObject({ reserved: 90000, available: 10000 });
  });

  it('rejects applying a result to a payment that is no longer pending', async () => {
    const { payment } = await service.createPayment(body(), 'key-1');
    await dataSource.getRepository(PaymentEvent).update({ paymentId: payment.id }, { target: 'SUCCEEDED' });
    await service.resolvePayment(payment.id);
    await dataSource.getRepository(PaymentEvent).insert({ id: 'evt-late', paymentId: payment.id, target: 'REJECTED', delivered: 0 });
    await expect(service.resolvePayment(payment.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.getWallet('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
