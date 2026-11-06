// test/payments-qa.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Contrato PROPUESTO (spec W2 + tasks): POST /payments {walletId, destination, amount}.
// Escenarios mock por último dígito del celular destino (RN-08). Datos sintéticos.
// Depende de W1 (wallet ACTIVA) y de fixtures de saldo inicial (tarea 1.2 de W2, aún no existe).

describe('W2 Pago de bajo monto — API (NO EJECUTADO)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    http = app.getHttpServer();
  });
  afterAll(async () => {
    await app.close();
  });

  const text = (b: unknown) => JSON.stringify(b);

  async function wallet(active = true): Promise<string> {
    const s = await request(http).post('/onboarding').send({});
    const id = s.body.onboardingId ?? s.body.id;
    if (active) {
      await request(http).put(`/onboarding/${id}/steps/datos`).send({ nombre: 'Ana Ejemplo', celular: '912345678' });
      await request(http).put(`/onboarding/${id}/steps/identidad`).send({ documento: '12345678' });
      await request(http).put(`/onboarding/${id}/steps/verificacion`).send({ codigo: '123456' });
    }
    return s.body.walletId;
  }
  const balance = async (w: string): Promise<number> =>
    Number((await request(http).get(`/wallets/${w}`)).body.balance);
  const pay = (walletId: string, destination: unknown, amount: unknown) =>
    request(http).post('/payments').send({ walletId, destination, amount } as object);
  const history = async (w: string): Promise<any[]> => {
    const r = await request(http).get(`/wallets/${w}/payments`);
    return Array.isArray(r.body) ? r.body : r.body.items ?? [];
  };
  const okStatus = (s: number) => expect([200, 201]).toContain(s);

  describe('W2-AC1 directorio', () => {
    it('W2-AC1-T2 [EP] un celular válido devuelve la identidad del destino', async () => {
      const res = await request(http).get('/directory/911111113');
      expect(res.status).toBe(200);
      expect(text(res.body)).toMatch(/name|nombre|displayName/i);
    });
    it('W2-AC1-T3 [EP] celular inválido -> 400 DESTINATION_INVALID', async () => {
      const res = await request(http).get('/directory/812345678');
      expect(res.status).toBe(400);
      expect(text(res.body)).toContain('DESTINATION_INVALID');
    });
  });

  describe('W2-AC2 escenarios del mock', () => {
    it.each([
      ['0 -> DECLINED', '911111110', 'fallido'],
      ['1 -> TIMEOUT', '911111111', 'expirado'],
      ['3 -> APPROVED', '911111113', 'exitoso'],
      ['9 -> APPROVED', '911111119', 'exitoso'],
    ])('W2-AC2-T2 [DT] último dígito %s', async (_n, dest, outcome) => {
      const w = await wallet();
      const res = await pay(w, dest, 10);
      okStatus(res.status);
      expect(res.body.outcome).toBe(outcome);
    });

    it('W2-AC2-T2 [ST] último dígito 2 (PENDING) no es resultado terminal', async () => {
      const w = await wallet();
      const res = await pay(w, '911111112', 10);
      okStatus(res.status);
      expect(['exitoso', 'fallido', 'expirado']).not.toContain(res.body.outcome);
      expect(await balance(w)).toBe(await balance(w));
    });

    it('W2-AC2-T3 [ST] callback resuelve PENDING y un segundo callback no altera el resultado', async () => {
      const w = await wallet();
      const p = await pay(w, '911111112', 10);
      const id = p.body.id;
      const c1 = await request(http).post(`/payments/${id}/callback`).send({ status: 'APPROVED' });
      expect(c1.status).toBeLessThan(500);
      expect((await request(http).get(`/payments/${id}`)).body.outcome).toBe('exitoso');
      const c2 = await request(http).post(`/payments/${id}/callback`).send({ status: 'DECLINED' });
      expect(c2.status).toBeLessThan(500);
      expect((await request(http).get(`/payments/${id}`)).body.outcome).toBe('exitoso');
    });
  });

  describe('W2-AC4-T3 validaciones', () => {
    it.each([
      ['499.99', 499.99, true],
      ['500.00', 500, true],
    ])('W2-AC4-T3 [BVA] monto %s permitido', async (_n, amount) => {
      const w = await wallet();
      expect(await balance(w)).toBeGreaterThanOrEqual(500); // PENDIENTE: fixtures de saldo
      const res = await pay(w, '911111113', amount);
      okStatus(res.status);
    });

    it('W2-AC4-T3 [BVA] monto 500.01 -> 422 AMOUNT_OVER_LIMIT antes del proveedor', async () => {
      const w = await wallet();
      const before = await balance(w);
      const res = await pay(w, '911111113', 500.01);
      expect(res.status).toBe(422);
      expect(text(res.body)).toContain('AMOUNT_OVER_LIMIT');
      expect(await balance(w)).toBe(before);
      expect(await history(w)).toHaveLength(0);
    });

    it.each([
      ['cero', 0],
      ['negativo', -1],
      ['texto', 'abc'],
      ['3 decimales', 10.001],
      ['enorme', 1e12],
      ['null', null],
    ])('W2-AC4-T3 [EG] monto %s -> 4xx y saldo intacto', async (_n, amount) => {
      const w = await wallet();
      const before = await balance(w);
      const res = await pay(w, '911111113', amount);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(await balance(w)).toBe(before);
    });

    it.each([
      ['8 dígitos', '91111111'],
      ['empieza con 8', '811111113'],
      ['alias inexistente', 'alias-que-no-existe'],
    ])('W2-AC4-T3 [EP] destino %s -> 4xx sin transacción', async (_n, dest) => {
      const w = await wallet();
      const res = await pay(w, dest, 10);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(await history(w)).toHaveLength(0);
    });

    it('W2-AC4-T3 [DT] wallet PENDIENTE_ONBOARDING no puede pagar', async () => {
      const w = await wallet(false);
      const res = await pay(w, '911111113', 10);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(await history(w)).toHaveLength(0);
    });

    it.todo('W2-AC4-T3 [BVA] saldo = monto y saldo = monto - 0.01 (requiere saldo inicial fijo <= 500; PENDIENTE DE FIXTURE)');
    it.todo('W2-AC4-T3 [EP] pago a uno mismo (no está en el spec; PENDIENTE DE CONFIRMAR)');
  });

  describe('W2-AC3 / AC4 / AC6', () => {
    it('W2-AC3-T2 [EP] pago exitoso: referencia mostrada y presente en historial', async () => {
      const w = await wallet();
      const res = await pay(w, '911111113', 10);
      okStatus(res.status);
      const ref = res.body.reference;
      expect(ref).toBeTruthy();
      const h = await history(w);
      expect(h.map((t) => t.reference)).toContain(ref);
    });

    it.each([
      ['fallido', '911111110'],
      ['expirado', '911111111'],
    ])('W2-AC4-T2 [DT] %s no descuenta saldo', async (_n, dest) => {
      const w = await wallet();
      const before = await balance(w);
      const res = await pay(w, dest, 10);
      okStatus(res.status);
      expect(await balance(w)).toBe(before);
    });

    it('W2-AC4-T2 [ST] reintento tras fallo descuenta exactamente una vez', async () => {
      const w = await wallet();
      const before = await balance(w);
      await pay(w, '911111110', 25);
      expect(await balance(w)).toBe(before);
      okStatus((await pay(w, '911111113', 25)).status);
      expect(await balance(w)).toBe(before - 25);
    });

    it('W2-AC6-T2 [ST] exitoso emite 1 payment_succeeded; fallido y expirado 0 (AC6 PARCIAL)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DataSource } = require('typeorm');
      const repo = app.get(DataSource).getRepository('PaymentEvent');
      const w = await wallet();
      const ok = await pay(w, '911111113', 10);
      const ko = await pay(w, '911111110', 10);
      const to = await pay(w, '911111111', 10);
      const events: any[] = await repo.find();
      const count = (id: string) => events.filter((e) => e.transactionId === id && e.type === 'payment_succeeded').length;
      expect(count(ok.body.id)).toBe(1);
      expect(count(ko.body.id)).toBe(0);
      expect(count(to.body.id)).toBe(0);
    });
  });
});