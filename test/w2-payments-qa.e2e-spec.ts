// test/w2-payments-qa.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import {
  activeWallet, ALIAS_OK, assertNoLeak, balanceOf, callback, codeOf, createApp, DIR, getWallet,
  history, http, idOf, pay, pendingWallet, repo, setBalance,
} from './helpers/qa-helpers';

const OUTCOMES = ['exitoso', 'fallido', 'expirado'];

describe('W2 Pago a contacto (QA) — NO EJECUTADO hasta confirmación de main.py', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  const fundedWallet = async (balance = 1000) => {
    const { walletId } = await activeWallet(app);
    await setBalance(app, walletId, balance); // saldo sintético controlado (PROPUESTO)
    return walletId;
  };
  const events = async (transactionId: string): Promise<any[]> =>
    repo(app, 'PaymentEvent').find({ where: { transactionId, type: 'payment_succeeded' } });

  // ---------- Base (tareas 1.1 y 1.2, verificación de apoyo; no cierran las tareas) ----------
  it('W2-BASE-T2 [ST] GET /wallets/:id devuelve ACTIVA y PENDIENTE_ONBOARDING (RN-10, tarea 1.1)', async () => {
    const a = await activeWallet(app);
    const p = await pendingWallet(app);
    expect((await getWallet(app, a.walletId)).body.status).toBe('ACTIVA');
    expect((await getWallet(app, p.walletId)).body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it.each([0, 1, 2, 3, 9])('W2-BASE-T2 [EP] fixture: directorio contiene destino terminado en %i (tarea 1.2)', async (d) => {
    const res = await http(app).get(`/directory/${DIR[d]}`);
    expect(res.status).toBe(200);
  });

  it('W2-BASE-T2 [EP] wallet nueva tiene saldo inicial fijo > 0 (valor PROPUESTO, por confirmar)', async () => {
    const { walletId } = await activeWallet(app);
    expect(await balanceOf(app, walletId)).toBeGreaterThan(0);
  });

  // ---------- W2-AC1 ----------
  it('W2-AC1-T2 [EP] celular y alias válidos devuelven identidad del destino', async () => {
    const a = await http(app).get(`/directory/${DIR[3]}`);
    const b = await http(app).get(`/directory/${ALIAS_OK}`);
    for (const r of [a, b]) {
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.body)).toMatch(/displayName|name|nombre/i);
    }
  });

  it('W2-AC1-T2 [EP] consultar el destino (confirmación) no crea transacción ni descuenta saldo', async () => {
    const walletId = await fundedWallet(100);
    await http(app).get(`/directory/${DIR[3]}`);
    expect(await history(app, walletId)).toHaveLength(0);
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  it.each([
    ['empieza con 8', '812345678'],
    ['8 dígitos', '91234567'],
    ['10 dígitos', '9123456789'],
    ['texto', 'abcdefghi'],
    ['alias inexistente', 'alias.que.no.existe'],
  ])('W2-AC1-T2 [EP] destino inválido (%s) → 400 DESTINATION_INVALID', async (_n, dest) => {
    const res = await http(app).get(`/directory/${encodeURIComponent(dest)}`);
    expect(res.status).toBe(400);
    expect(codeOf(res)).toBe('DESTINATION_INVALID');
    assertNoLeak(res);
  });

  // ---------- W2-AC2 (RN-05 a RN-08) ----------
  it.each([
    [0, 'fallido'],
    [1, 'expirado'],
    [3, 'exitoso'],
    [9, 'exitoso'],
  ])('W2-AC2-T2 [EP/BVA] último dígito %i → %s (terminal único)', async (d, outcome) => {
    const walletId = await fundedWallet();
    const res = await pay(app, walletId, DIR[d], 10);
    expect(res.status).toBeLessThan(300);
    expect(res.body.outcome).toBe(outcome);
    const again = await http(app).get(`/payments/${idOf(res.body)}`);
    expect(again.body.outcome).toBe(outcome); // un solo resultado, no cambia al consultar
  });

  it('W2-AC2-T2 [EP] último dígito 2 → en proceso, NO terminal, saldo intacto', async () => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[2], 10);
    expect(res.status).toBeLessThan(300);
    expect(OUTCOMES).not.toContain(res.body.outcome);
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  it('W2-AC2-T2 [ST] PENDING + callback APPROVED → exitoso y saldo descontado una vez', async () => {
    const walletId = await fundedWallet(100);
    const p = await pay(app, walletId, DIR[2], 10);
    const cb = await callback(app, idOf(p.body), 'APPROVED');
    expect(cb.status).toBeLessThan(300);
    expect((await http(app).get(`/payments/${idOf(p.body)}`)).body.outcome).toBe('exitoso');
    expect(await balanceOf(app, walletId)).toBe(90);
  });

  it('W2-AC2-T3 [ST] transición inválida: segundo callback sobre terminal no cambia estado ni saldo (RN-06)', async () => {
    const walletId = await fundedWallet(100);
    const p = await pay(app, walletId, DIR[2], 10);
    await callback(app, idOf(p.body), 'APPROVED');
    const second = await callback(app, idOf(p.body), 'DECLINED');
    expect(second.status).toBeLessThan(500);
    assertNoLeak(second);
    expect((await http(app).get(`/payments/${idOf(p.body)}`)).body.outcome).toBe('exitoso');
    expect(await balanceOf(app, walletId)).toBe(90);
  });

  // ---------- W2-AC3 (RN-11) ----------
  it('W2-AC3-T2 [EP] pago exitoso muestra referencia y aparece en el historial con la misma referencia', async () => {
    const walletId = await fundedWallet();
    const res = await pay(app, walletId, DIR[3], 25);
    expect(res.body.reference).toBeTruthy();
    const h = await history(app, walletId);
    expect(h.map((t: any) => t.reference)).toContain(res.body.reference);
  });

  it('W2-AC3-T3 [EG] dos pagos exitosos tienen referencias distintas', async () => {
    const walletId = await fundedWallet();
    const a = await pay(app, walletId, DIR[3], 5);
    const b = await pay(app, walletId, DIR[4], 5);
    expect(a.body.reference).not.toBe(b.body.reference);
  });

  // ---------- W2-AC4 (RN-12) ----------
  it.each([[0, 'fallido'], [1, 'expirado']])('W2-AC4-T2 [EP] %i → %s no descuenta saldo', async (d) => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[d], 30);
    expect(OUTCOMES).toContain(res.body.outcome);
    expect(res.body.reference ?? null).toBeNull; // la referencia es de pagos exitosos (PENDIENTE DE CONFIRMAR si el fallido también la trae)
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  it('W2-AC4-T2 [ST] reintento tras fallo = nuevo intento; saldo descontado como máximo una vez', async () => {
    const walletId = await fundedWallet(100);
    await pay(app, walletId, DIR[0], 30); // fallido
    await pay(app, walletId, DIR[1], 30); // expirado
    expect(await balanceOf(app, walletId)).toBe(100);
    const retry = await pay(app, walletId, DIR[3], 30); // reintento exitoso
    expect(retry.body.outcome).toBe('exitoso');
    expect(await balanceOf(app, walletId)).toBe(70);
  });

  // ---------- W2-AC4-T3: bordes (RN-01, RN-04, RN-10, RN-18) ----------
  it.each([
    [499.99, 'exitoso'],
    [500.0, 'exitoso'],
  ])('W2-AC4-T3 [BVA] monto %f permitido (límite S/ 500, RN-01)', async (amount, outcome) => {
    const walletId = await fundedWallet(1000);
    const res = await pay(app, walletId, DIR[3], amount);
    expect(res.status).toBeLessThan(300);
    expect(res.body.outcome).toBe(outcome);
  });

  it('W2-AC4-T3 [BVA] monto 500.01 → 422 AMOUNT_OVER_LIMIT antes del proveedor, sin transacción', async () => {
    const walletId = await fundedWallet(1000);
    const res = await pay(app, walletId, DIR[3], 500.01);
    expect(res.status).toBe(422);
    expect(codeOf(res)).toBe('AMOUNT_OVER_LIMIT');
    assertNoLeak(res);
    expect(await history(app, walletId)).toHaveLength(0);
    expect(await balanceOf(app, walletId)).toBe(1000);
  });

  it('W2-AC4-T3 [BVA] saldo = monto → permitido; saldo queda en 0 (RN-18)', async () => {
    const walletId = await fundedWallet(20);
    const res = await pay(app, walletId, DIR[3], 20);
    expect(res.body.outcome).toBe('exitoso');
    expect(await balanceOf(app, walletId)).toBe(0);
  });

  it('W2-AC4-T3 [BVA] monto = saldo + 0.01 → 422 INSUFFICIENT_FUNDS, saldo intacto, sin transacción', async () => {
    const walletId = await fundedWallet(19.99);
    const res = await pay(app, walletId, DIR[3], 20);
    expect(res.status).toBe(422);
    expect(codeOf(res)).toBe('INSUFFICIENT_FUNDS');
    expect(await balanceOf(app, walletId)).toBe(19.99);
    expect(await history(app, walletId)).toHaveLength(0);
  });

  it.each([
    ['monto 0', 0],
    ['monto negativo', -5],
    ['monto no numérico', 'abc'],
  ])('W2-AC4-T3 [EP] %s rechazado con 4xx, sin transacción (límite inferior mínimo = PENDIENTE DE CONFIRMAR)', async (_n, amount) => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[3], amount);
    expect([400, 422]).toContain(res.status);
    assertNoLeak(res);
    expect(await history(app, walletId)).toHaveLength(0);
  });

  it('W2-AC4-T3 [BVA] 3 decimales (10.005) rechazado (regla de decimales = PENDIENTE DE CONFIRMAR)', async () => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[3], 10.005);
    expect([400, 422]).toContain(res.status);
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  it('W2-AC4-T3 [DT] celular inválido en POST /payments → 400 DESTINATION_INVALID, sin transacción', async () => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, '812345678', 10);
    expect(res.status).toBe(400);
    expect(codeOf(res)).toBe('DESTINATION_INVALID');
    expect(await history(app, walletId)).toHaveLength(0);
  });

  it('W2-AC4-T3 [DT] wallet PENDIENTE_ONBOARDING no puede pagar (RN-10)', async () => {
    const { walletId } = await pendingWallet(app);
    const res = await pay(app, walletId, DIR[3], 10);
    expect([403, 409, 422]).toContain(res.status); // código exacto PROPUESTO
    assertNoLeak(res);
    expect(await history(app, walletId)).toHaveLength(0);
  });

  it('W2-AC4-T3 [DT] wallet inexistente → 4xx, nunca 5xx', async () => {
    const res = await pay(app, 'wallet-inexistente', DIR[3], 10);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    assertNoLeak(res);
  });

  it('W2-AC4-T3 [DT] pago a uno mismo rechazado (regla del discovery; ausente del spec = PENDIENTE DE CONFIRMAR)', async () => {
    const { walletId } = await activeWallet(app);
    await setBalance(app, walletId, 100);
    const own = (await getWallet(app, walletId)).body.phone;
    const res = await pay(app, walletId, own, 10);
    expect([400, 422]).toContain(res.status);
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  // ---------- W2-AC6 (PARCIAL, RN-17) ----------
  it('W2-AC6-T2 [EP] pago exitoso emite exactamente un payment_succeeded con marca de tiempo', async () => {
    const walletId = await fundedWallet();
    const res = await pay(app, walletId, DIR[3], 10);
    const ev = await events(idOf(res.body));
    expect(ev).toHaveLength(1);
    expect(ev[0].occurredAt).toBeTruthy();
  });

  it.each([[0], [1]])('W2-AC6-T3 [EP] destino terminado en %i (fallido/expirado) no emite evento', async (d) => {
    const walletId = await fundedWallet();
    const res = await pay(app, walletId, DIR[d], 10);
    expect(await events(idOf(res.body))).toHaveLength(0);
  });

  it('W2-AC6-T3 [ST] PENDING sin evento; tras callback APPROVED uno; segundo callback no duplica', async () => {
    const walletId = await fundedWallet();
    const p = await pay(app, walletId, DIR[2], 10);
    expect(await events(idOf(p.body))).toHaveLength(0);
    await callback(app, idOf(p.body), 'APPROVED');
    expect(await events(idOf(p.body))).toHaveLength(1);
    await callback(app, idOf(p.body), 'APPROVED');
    expect(await events(idOf(p.body))).toHaveLength(1);
  });

  // ---------- SEC-05 / SEC-04: entradas hostiles ----------
  it.each([
    ['null', null], ['vacío', ''], ['texto', 'abc'], ['-0.01', -0.01], ['1e21', 1e21],
    ['cadena 1e3', '1e3'], ['arreglo', []], ['objeto', {}], ['booleano', true], ['NaN→null', NaN],
  ])('SEC-05-T3 [EG] monto hostil (%s) → 4xx, sin stack, sin transacción', async (_n, amount) => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[3], amount);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    assertNoLeak(res);
    expect(await history(app, walletId)).toHaveLength(0);
    expect(await balanceOf(app, walletId)).toBe(100);
  });

  it.each([
    ['SQL', "'; DROP TABLE wallet;--"],
    ['JS', '<script>alert(1)</script>'],
    ['espacios', '   '],
    ['unicode fullwidth', '９１２３４５６７８'],
    ['muy largo', 'a'.repeat(10000)],
    ['ruta', '../../etc/passwd'],
  ])('SEC-05-T3 [EG] destino hostil (%s) → 400, sin stack, base de datos intacta', async (_n, dest) => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, dest, 10);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    assertNoLeak(res);
    expect((await getWallet(app, walletId)).status).toBe(200); // la tabla sigue existiendo
  });

  it('SEC-05-T3 [EG] campos extra (outcome/balance/providerStatus) del cliente son ignorados', async () => {
    const walletId = await fundedWallet(100);
    const res = await pay(app, walletId, DIR[0], 10, {
      outcome: 'exitoso', providerStatus: 'APPROVED', balance: 1e9, status: 'ACTIVA',
    });
    expect(res.status).toBeLessThan(500);
    expect(res.body.outcome).toBe('fallido'); // manda el mock por último dígito
    expect(await balanceOf(app, walletId)).toBe(100);
  });
});