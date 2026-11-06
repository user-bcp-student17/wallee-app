// test/w2-pago-bajo-monto-qa.e2e-spec.ts
// QA & Security — W2 Pago de bajo monto. NO EJECUTADO. Datos sintéticos. Mock por último dígito (RN-08).
// Cubre: W2-AC1-T2, AC2-T2, AC3-T2, AC4-T2/T3, AC6-T2 (eventos bloqueados) y tareas 3.1, 3.2, 4.1 a 4.5.
// Supuestos PROPUESTOS a confirmar: cuerpo de POST /payments {walletId,destination,amount}, callback {status},
// respuesta con {id, reference, outcome, providerStatus}, wallet con {balance, status}, historial lista de transacciones.
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import {
  destinoConDigito,
  historial,
  http,
  iniciarOnboarding,
  onboardingCompleto,
  pagar,
  reducirSaldoA,
  saldo,
} from './support/qa-helpers';

describe('W2 Pago de bajo monto (QA)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    // PENDIENTE: replicar pipes/filtros globales de main.ts si existen.
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Wallet ACTIVA nueva por caso (independencia y repetibilidad). */
  const walletActiva = async () => (await onboardingCompleto(app)).walletId as string;

  describe('W2-AC2 resultado terminal único por escenario del mock (tareas 3.1, 4.2)', () => {
    const escenarios: Array<[number, string | null]> = [
      [0, 'fallido'],
      [1, 'expirado'],
      [3, 'exitoso'],
      [4, 'exitoso'],
      [9, 'exitoso'],
    ];

    it.each(escenarios)(
      'W2-AC2-T2 [EP/BVA] último dígito %i -> resultado %s',
      async (digito, esperado) => {
        const w = await walletActiva();
        const res = await pagar(app, w, destinoConDigito(digito), 10);
        expect(res.status).toBeLessThan(300);
        expect(res.body.outcome).toBe(esperado);
      },
    );

    it('W2-AC2-T2 [EP] último dígito 2 (PENDING) no muestra resultado terminal (RN-07)', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, destinoConDigito(2), 10);
      expect(res.status).toBeLessThan(300);
      expect(['exitoso', 'fallido', 'expirado']).not.toContain(res.body.outcome);
      expect(res.body.outcome ?? null).toBeNull();
      const g = await http(app).get(`/payments/${res.body.id}`);
      expect(g.body.outcome ?? null).toBeNull();
    });

    it('W2-AC2-T2 [ST] PENDING resuelto por callback APPROVED -> exitoso (tarea 4.3)', async () => {
      const w = await walletActiva();
      const p = await pagar(app, w, destinoConDigito(2), 10);
      const cb = await http(app).post(`/payments/${p.body.id}/callback`).send({ status: 'APPROVED' });
      expect(cb.status).toBeLessThan(300);
      const g = await http(app).get(`/payments/${p.body.id}`);
      expect(g.body.outcome).toBe('exitoso');
    });

    it('W2-AC2-T3 [ST] segundo callback sobre intento terminal no altera el resultado (RN-06)', async () => {
      const w = await walletActiva();
      const p = await pagar(app, w, destinoConDigito(2), 10);
      await http(app).post(`/payments/${p.body.id}/callback`).send({ status: 'APPROVED' });
      const antes = await saldo(app, w);
      await http(app).post(`/payments/${p.body.id}/callback`).send({ status: 'DECLINED' });
      const g = await http(app).get(`/payments/${p.body.id}`);
      expect(g.body.outcome).toBe('exitoso');
      expect(await saldo(app, w)).toBeCloseTo(antes, 2);
    });
  });

  describe('W2-AC4-T3 / RN-01 monto máximo (tarea 3.2) — BVA', () => {
    it('W2-AC4-T3 [BVA] monto 499.99 permitido', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, destinoConDigito(3), 499.99);
      expect(res.status).toBe(201);
      expect(res.body.outcome).toBe('exitoso');
    });

    it('W2-AC4-T3 [BVA] monto 500.00 permitido (límite exacto)', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, destinoConDigito(3), 500);
      expect(res.status).toBe(201);
    });

    it('W2-AC4-T3 [BVA] monto 500.01 rechazado con 422 AMOUNT_OVER_LIMIT antes del proveedor y sin transacción', async () => {
      const w = await walletActiva();
      const antes = await saldo(app, w);
      const res = await pagar(app, w, destinoConDigito(3), 500.01);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('AMOUNT_OVER_LIMIT');
      expect(await saldo(app, w)).toBeCloseTo(antes, 2);
      expect(await historial(app, w)).toHaveLength(0);
    });
  });

  describe('W2-AC4-T3 montos hostiles / inválidos (EP, EG, SEC-05)', () => {
    const invalidos: Array<[string, unknown]> = [
      ['cero', 0],
      ['negativo', -10],
      ['texto', 'abc'],
      ['3 decimales', 10.123],
      ['enorme', 1e15],
      ['nulo', null],
      ['SQL', "1; DROP TABLE transactions;--"],
      ['vacío', ''],
    ];

    it.each(invalidos)(
      'W2-AC4-T3 [EP/EG] monto %s -> 4xx, sin transacción y saldo intacto',
      async (_n, monto) => {
        const w = await walletActiva();
        const antes = await saldo(app, w);
        const res = await pagar(app, w, destinoConDigito(3), monto);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500);
        expect(typeof res.body.code).toBe('string');
        expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at .*\.ts:\d+|SQLITE/i);
        expect(await saldo(app, w)).toBeCloseTo(antes, 2);
        expect(await historial(app, w)).toHaveLength(0);
      },
    );

    it('W2-AC4-T3 [BVA] monto 0.01 (PENDIENTE DE CONFIRMAR: el spec no define mínimo) se documenta, no se afirma', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, destinoConDigito(3), 0.01);
      // Sin mínimo definido: solo se exige que no sea 5xx.
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('W2-AC4-T3 destino inválido (RN-04) — tarea 4.1', () => {
    const celularesMalos = ['91234567', '9123456789', '812345678', '9abcdefgh', '', "9'; DROP--"];

    it.each(celularesMalos)(
      'W2-AC4-T3 [EP/BVA] destino "%s" en pago -> 400 DESTINATION_INVALID y sin transacción',
      async (dest) => {
        const w = await walletActiva();
        const antes = await saldo(app, w);
        const res = await pagar(app, w, dest, 10);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('DESTINATION_INVALID');
        expect(await saldo(app, w)).toBeCloseTo(antes, 2);
      },
    );

    it('W2-AC4-T3 [EP] alias inexistente en el directorio -> 400 DESTINATION_INVALID', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, 'alias_que_no_existe_zz', 10);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DESTINATION_INVALID');
    });

    it('W2-AC1-T2 [EP] GET /directory/:destination con celular inválido -> 400 DESTINATION_INVALID', async () => {
      const res = await http(app).get('/directory/91234567');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DESTINATION_INVALID');
    });

    it.todo('W2-AC1-T2 GET /directory con celular y alias válidos devuelve el nombre del destino (nombre parcialmente oculto) — requiere fixture del directorio (tarea 1.2)');
    it.todo('W2-AC4-T3 pago a uno mismo rechazado (en el catálogo del discovery; el spec no lo define — DR-03)');
  });

  describe('W2-AC4-T3 saldo insuficiente RN-18 — BVA de saldo', () => {
    it('W2-AC4-T3 [BVA] monto = saldo + 0.01 -> 422 INSUFFICIENT_FUNDS, sin transacción y saldo intacto', async () => {
      const w = await walletActiva();
      await reducirSaldoA(app, w, 100);
      const s = await saldo(app, w);
      const res = await pagar(app, w, destinoConDigito(3), Math.round((s + 0.01) * 100) / 100);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INSUFFICIENT_FUNDS');
      expect(await saldo(app, w)).toBeCloseTo(s, 2);
    });

    it('W2-AC4-T3 [BVA] monto = saldo -> permitido y saldo final 0', async () => {
      const w = await walletActiva();
      await reducirSaldoA(app, w, 100);
      const s = await saldo(app, w);
      const res = await pagar(app, w, destinoConDigito(3), s);
      expect(res.status).toBe(201);
      expect(await saldo(app, w)).toBeCloseTo(0, 2);
    });

    it('W2-AC4-T3 [BVA] monto = saldo - 0.01 -> permitido y saldo final 0.01', async () => {
      const w = await walletActiva();
      await reducirSaldoA(app, w, 100);
      const s = await saldo(app, w);
      const res = await pagar(app, w, destinoConDigito(3), Math.round((s - 0.01) * 100) / 100);
      expect(res.status).toBe(201);
      expect(await saldo(app, w)).toBeCloseTo(0.01, 2);
    });
  });

  describe('RN-10 wallet no ACTIVA (DT)', () => {
    it('W2-AC4-T3 [DT] wallet PENDIENTE_ONBOARDING no puede pagar: 4xx, sin transacción (código PENDIENTE DE CONFIRMAR, DR-02)', async () => {
      const ini = await iniciarOnboarding(app);
      const w = ini.body.walletId;
      const res = await pagar(app, w, destinoConDigito(3), 10);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(typeof res.body.code).toBe('string');
      expect(await historial(app, w)).toHaveLength(0);
    });

    it('W2-AC4-T3 [DT] wallet inexistente -> 4xx y sin 5xx', async () => {
      const res = await pagar(app, 'wallet-inexistente', destinoConDigito(3), 10);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('W2-AC3 referencia en historial (tarea 4.4)', () => {
    it('W2-AC3-T2 [EP] pago exitoso devuelve referencia y el historial la incluye', async () => {
      const w = await walletActiva();
      const res = await pagar(app, w, destinoConDigito(3), 25);
      expect(res.body.outcome).toBe('exitoso');
      expect(typeof res.body.reference).toBe('string');
      expect(res.body.reference.length).toBeGreaterThan(0);
      const h = await historial(app, w);
      expect(h.map((t: any) => t.reference)).toContain(res.body.reference);
    });

    it('W2-AC3-T2 [EP] dos pagos exitosos tienen referencias distintas', async () => {
      const w = await walletActiva();
      const a = await pagar(app, w, destinoConDigito(3), 10);
      const b = await pagar(app, w, destinoConDigito(4), 10);
      expect(a.body.reference).not.toBe(b.body.reference);
    });
  });

  describe('W2-AC4 fallo o expiración sin cobro duplicado (tarea 4.4)', () => {
    it.each([
      [0, 'fallido'],
      [1, 'expirado'],
    ])('W2-AC4-T2 [EP] último dígito %i (%s) no descuenta saldo', async (digito, esperado) => {
      const w = await walletActiva();
      const antes = await saldo(app, w);
      const res = await pagar(app, w, destinoConDigito(digito), 50);
      expect(res.body.outcome).toBe(esperado);
      expect(await saldo(app, w)).toBeCloseTo(antes, 2);
    });

    it('W2-AC4-T2 [ST] reintento tras fallido es un intento nuevo y descuenta como máximo una vez si termina exitoso', async () => {
      const w = await walletActiva();
      const antes = await saldo(app, w);
      await pagar(app, w, destinoConDigito(0), 50); // fallido
      const retry = await pagar(app, w, destinoConDigito(3), 50); // exitoso
      expect(retry.body.outcome).toBe('exitoso');
      expect(await saldo(app, w)).toBeCloseTo(antes - 50, 2);
    });
  });

  describe('W2-AC6 evento payment_succeeded (tarea 4.5) — PARCIAL', () => {
    // BLOQUEADO: no hay forma definida de consultar PaymentEvent (DR-01).
    it.todo('W2-AC6-T2 un pago exitoso registra exactamente un payment_succeeded con marca de tiempo del servidor y la referencia');
    it.todo('W2-AC6-T3 un pago fallido o expirado no registra payment_succeeded');
  });
});