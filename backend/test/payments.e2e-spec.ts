import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Pagos W2 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const payload = { walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1500 };

  it('transfers from wallet-demo: 202, replay 200, resolve, receipt and balances', async () => {
    const before = (await http().get('/wallets/wallet-demo').expect(200)).body;
    const created = await http().post('/payments').set('Idempotency-Key', 'e2e-1').send(payload).expect(202);
    expect(created.body).toMatchObject({ status: 'PENDING', amountCents: 1500, recipient: 'contact-demo' });
    await http().post('/payments').set('Idempotency-Key', 'e2e-1').send(payload).expect(200).expect((res) => expect(res.body.id).toBe(created.body.id));
    await http().post('/payments').set('Idempotency-Key', 'e2e-1').send({ ...payload, amountCents: 1 }).expect(409).expect((res) => expect(res.body.code).toBe('IDEMPOTENCY_CONFLICT'));
    await http().get(`/payments/${created.body.id}/receipt`).expect(409).expect((res) => expect(res.body.code).toBe('RECEIPT_NOT_READY'));
    await http().get('/wallets/wallet-demo').expect(200).expect((res) => expect(res.body.available).toBe(before.available - 1500));

    await http().post(`/payments/${created.body.id}/resolve`).expect(200).expect((res) => expect(res.body.status).toBe('SUCCEEDED'));
    await http().get(`/payments/${created.body.id}/receipt`).expect(200).expect((res) => expect(res.body.status).toBe('SUCCEEDED'));
    await http().get('/wallets/wallet-demo').expect(200).expect((res) => {
      expect(res.body.balance).toBe(before.balance - 1500);
      expect(res.body.reserved).toBe(before.reserved);
    });
    await http().get('/payments?walletId=wallet-demo').expect(200).expect((res) => expect(res.body.map((p: { id: string }) => p.id)).toContain(created.body.id));
  });

  it('escalates a pending payment and finishes it with the simulated provider', async () => {
    const created = await http().post('/payments').set('Idempotency-Key', 'e2e-2').send({ ...payload, scenario: 'PENDING' }).expect(202);
    await http().post(`/payments/${created.body.id}/resolve`).expect(202).expect({ status: 'PENDING', escalated: true });
    await http().post(`/control/provider/${created.body.id}/complete`).send({ status: 'REJECTED' }).expect(200);
    await http().post(`/payments/${created.body.id}/resolve`).expect(200).expect((res) => expect(res.body.status).toBe('REJECTED'));
  });

  it('returns stable error codes', async () => {
    await http().post('/payments').send(payload).expect(400).expect((res) => expect(res.body.code).toBe('INVALID_IDEMPOTENCY_KEY'));
    await http().post('/payments').set('Idempotency-Key', 'e2e-3').send({ ...payload, amountCents: 0 }).expect(400).expect((res) => expect(res.body.code).toBe('VALIDATION_ERROR'));
    await http().post('/payments').set('Idempotency-Key', 'e2e-4').send({ ...payload, amountCents: 100_000_000 }).expect(409).expect((res) => expect(res.body.code).toBe('INSUFFICIENT_FUNDS'));
    await http().post('/payments').set('Idempotency-Key', 'e2e-5').send({ ...payload, walletId: 'nope' }).expect(404).expect((res) => expect(res.body.code).toBe('WALLET_NOT_FOUND'));
    await http().get('/payments/nope').expect(404).expect((res) => expect(res.body.code).toBe('PAYMENT_NOT_FOUND'));
    await http().get('/wallets/nope').expect(404);
  });
});
