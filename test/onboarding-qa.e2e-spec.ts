// test/onboarding-qa.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

// Contrato PROPUESTO (design.md D2/D5): campos nombre, celular, documento, codigo.
// QA no implementa nada: si el módulo aún no existe, estos tests fallan y se reporta BUG.

const VALID = {
  datos: { nombre: 'Ana Ejemplo', celular: '912345678' },
  identidad: { documento: '12345678' },
  verificacion: { codigo: '123456' },
};

describe('W1 Onboarding — API (NO EJECUTADO)', () => {
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

  const start = async () => {
    const res = await request(http).post('/onboarding').send({});
    return res;
  };
  const put = (id: string, step: string, body: unknown) =>
    request(http).put(`/onboarding/${id}/steps/${step}`).send(body as object);
  const get = (id: string) => request(http).get(`/onboarding/${id}`);
  const ids = (body: any): string[] => (body.steps ?? []).map((s: any) => s.id ?? s.key);
  const oid = (body: any): string => body.onboardingId ?? body.id;
  const text = (body: unknown) => JSON.stringify(body);

  async function newAt(step: 'datos' | 'identidad' | 'verificacion') {
    const s = await start();
    const id = oid(s.body);
    if (step !== 'datos') await put(id, 'datos', VALID.datos);
    if (step === 'verificacion') await put(id, 'identidad', VALID.identidad);
    return { id, walletId: s.body.walletId as string };
  }

  it('2.1-T2 [EP] la app arranca y las tablas existen (POST /onboarding crea fila)', async () => {
    const res = await start();
    expect(res.status).toBe(201);
    expect(oid(res.body)).toBeDefined();
  });

  describe('W1-AC1', () => {
    it('W1-AC1-T2 [EP] el inicio lista los 3 pasos y marca datos como actual', async () => {
      const res = await start();
      expect(res.status).toBe(201);
      expect(ids(res.body)).toEqual(['datos', 'identidad', 'verificacion']);
      expect(res.body.currentStep).toBe('datos');
      expect(res.body.walletId).toBeDefined();
    });

    it('W1-AC1-T2 [ST] al completar datos el paso actual pasa a identidad', async () => {
      const { id } = await newAt('datos');
      const res = await get(id);
      expect(res.status).toBe(200);
      expect(res.body.currentStep).toBe('identidad');
    });

    it.each([
      ['verificacion', 'datos'],
      ['identidad', 'datos'],
    ])('W1-AC1-T3 [ST] %s antes de %s -> 409 STEP_OUT_OF_ORDER y progreso intacto', async (step) => {
      const s = await start();
      const id = oid(s.body);
      const res = await put(id, step, (VALID as any)[step]);
      expect(res.status).toBe(409);
      expect(text(res.body)).toContain('STEP_OUT_OF_ORDER');
      expect((await get(id)).body.currentStep).toBe('datos');
    });

    it('W1-AC1-T3 [EP] onboarding inexistente -> 404 ONBOARDING_NOT_FOUND', async () => {
      const res = await put('inexistente-123', 'datos', VALID.datos);
      expect(res.status).toBe(404);
      expect(text(res.body)).toContain('ONBOARDING_NOT_FOUND');
    });
  });

  describe('W1-AC2', () => {
    it.each([
      ['vacío', ''],
      ['8 dígitos', '91234567'],
      ['10 dígitos', '9123456789'],
      ['empieza con 8', '812345678'],
      ['con letra', '91234567a'],
      ['solo espacios', '         '],
    ])('W1-AC2-T2 [BVA/EP] celular %s -> 400 VALIDATION_ERROR sin avanzar', async (_n, celular) => {
      const { id } = await newAt('datos');
      const res = await put(id, 'datos', { nombre: 'Ana Ejemplo', celular });
      expect(res.status).toBe(400);
      expect(text(res.body)).toContain('VALIDATION_ERROR');
      expect(text(res.body)).toContain('celular');
      expect((await get(id)).body.currentStep).toBe('datos');
    });

    it('W1-AC2-T2 [BVA] celular de 9 dígitos que empieza con 9 avanza', async () => {
      const { id } = await newAt('datos');
      const res = await put(id, 'datos', VALID.datos);
      expect(res.status).toBe(200);
      expect((await get(id)).body.currentStep).toBe('identidad');
    });

    it.each([
      ['ausente', { celular: '912345678' }],
      ['vacío', { nombre: '', celular: '912345678' }],
      ['solo espacios', { nombre: '   ', celular: '912345678' }],
    ])('W1-AC2-T2 [EP] nombre %s -> 400 mencionando nombre', async (_n, body) => {
      const { id } = await newAt('datos');
      const res = await put(id, 'datos', body);
      expect(res.status).toBe(400);
      expect(text(res.body)).toContain('nombre');
      expect((await get(id)).body.currentStep).toBe('datos');
    });

    it.each([
      ['7 dígitos', '1234567'],
      ['9 dígitos', '123456789'],
      ['letras', 'abcdefgh'],
      ['vacío', ''],
    ])('W1-AC2-T2 [BVA] documento %s -> 400 (PENDIENTE DE CONFIRMAR: 8 dígitos)', async (_n, documento) => {
      const { id } = await newAt('identidad');
      const res = await put(id, 'identidad', { documento });
      expect(res.status).toBe(400);
      expect(text(res.body)).toContain('documento');
      expect((await get(id)).body.currentStep).toBe('identidad');
    });

    it.each([
      ['vacío', ''],
      ['distinto', '000000'],
      ['5 dígitos', '12345'],
      ['7 dígitos', '1234567'],
    ])('W1-AC2-T2 [EP] código %s -> 400 y no avanza', async (_n, codigo) => {
      const { id } = await newAt('verificacion');
      const res = await put(id, 'verificacion', { codigo });
      expect(res.status).toBe(400);
      expect((await get(id)).body.currentStep).toBe('verificacion');
    });

    it('W1-AC2-T3 [ST] tras un código incorrecto se puede reintentar con el correcto', async () => {
      const { id } = await newAt('verificacion');
      expect((await put(id, 'verificacion', { codigo: '654321' })).status).toBe(400);
      expect((await put(id, 'verificacion', { codigo: '123456' })).status).toBe(200);
    });
  });

  describe('Mock de identidad (tarea 2.2) — vía API', () => {
    it('2.2-T2 [EP] OTP 123456 completa el paso sin proveedor externo', async () => {
      const { id } = await newAt('verificacion');
      const res = await put(id, 'verificacion', { codigo: '123456' });
      expect(res.status).toBe(200);
    });
    it('2.2-T2 [EP] un OTP distinto de 123456 falla con VALIDATION_ERROR', async () => {
      const { id } = await newAt('verificacion');
      const res = await put(id, 'verificacion', { codigo: '654321' });
      expect(res.status).toBe(400);
      expect(text(res.body)).toContain('VALIDATION_ERROR');
    });
    it.todo('2.2-T3 [EP] con NODE_ENV=production 123456 no se acepta (PENDIENTE DE CONFIRMAR comportamiento)');
  });

  describe('W1-AC3', () => {
    it('W1-AC3-T2 [ST] tras los tres pasos el onboarding está COMPLETADO y la wallet ACTIVA', async () => {
      const s = await start();
      const id = oid(s.body);
      for (const step of ['datos', 'identidad', 'verificacion'] as const) {
        expect((await put(id, step, VALID[step])).status).toBe(200);
      }
      const w = await request(http).get(`/wallets/${s.body.walletId}`);
      expect(w.status).toBe(200);
      expect(w.body.status).toBe('ACTIVA');
      expect((await get(id)).body.status).toBe('COMPLETADO');
    });

    it('W1-AC3-T3 [ST] con pasos pendientes la wallet sigue PENDIENTE_ONBOARDING', async () => {
      const s = await start();
      const id = oid(s.body);
      const status = async () =>
        (await request(http).get(`/wallets/${s.body.walletId}`)).body.status;
      expect(await status()).toBe('PENDIENTE_ONBOARDING');
      await put(id, 'datos', VALID.datos);
      expect(await status()).toBe('PENDIENTE_ONBOARDING');
      await put(id, 'identidad', VALID.identidad);
      expect(await status()).toBe('PENDIENTE_ONBOARDING');
    });
  });

  describe('W1-AC4 eventos', () => {
    it('W1-AC4-T2 [ST] recorrido completo: started, 3 step_completed y completed en orden', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DataSource } = require('typeorm');
      const ds = app.get(DataSource);
      const s = await start();
      const id = oid(s.body);
      for (const step of ['datos', 'identidad', 'verificacion'] as const) {
        await put(id, step, VALID[step]);
      }
      const all: any[] = await ds.getRepository('OnboardingEvent').find();
      const mine = all
        .filter((e) => e.onboardingId === id)
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
      expect(mine.map((e) => e.type)).toEqual([
        'onboarding_started',
        'onboarding_step_completed',
        'onboarding_step_completed',
        'onboarding_step_completed',
        'onboarding_completed',
      ]);
      expect(mine.filter((e) => e.type === 'onboarding_step_completed').map((e) => e.step)).toEqual([
        'datos', 'identidad', 'verificacion',
      ]);
      mine.forEach((e) => expect(e.occurredAt).toBeTruthy());
    });
  });

  describe('SEC-03/04/05 entradas hostiles', () => {
    it.each([
      ['SQL', "9' OR '1'='1"],
      ['JS', '<script>alert(1)</script>'],
      ['enorme', '9'.repeat(10000)],
      ['null', null],
      ['número', 912345678],
    ])('W1-SEC05-T3 [EG] celular %s no produce 5xx ni activa la wallet', async (_n, celular) => {
      const s = await start();
      const id = oid(s.body);
      const res = await put(id, 'datos', { nombre: 'Ana', celular });
      expect(res.status).toBeLessThan(500);
      const w = await request(http).get(`/wallets/${s.body.walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
    });

    it('W1-SEC05-T3 [EG] campos extra (status, isAdmin) no activan la wallet', async () => {
      const s = await start();
      const id = oid(s.body);
      const res = await put(id, 'datos', { ...VALID.datos, status: 'ACTIVA', isAdmin: true });
      expect(res.status).toBeLessThan(500);
      const w = await request(http).get(`/wallets/${s.body.walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
    });

    it('W1-SEC04-T3 [EG] errores 400 y 409 sin traza ni rutas internas', async () => {
      const s = await start();
      const id = oid(s.body);
      const bodies = [
        (await put(id, 'datos', { nombre: '', celular: '1' })).body,
        (await put(id, 'verificacion', VALID.verificacion)).body,
      ];
      for (const b of bodies) {
        const t = text(b);
        expect(t).not.toMatch(/stack|node_modules|\.ts:\d+|at\s+\w+\s*\(/i);
        expect(b.code ?? b.message).toBeDefined();
      }
    });

    it('W1-SEC03-T3 [EG] GET /wallets/:id no expone el documento', async () => {
      const s = await start();
      const id = oid(s.body);
      await put(id, 'datos', VALID.datos);
      await put(id, 'identidad', VALID.identidad);
      const w = await request(http).get(`/wallets/${s.body.walletId}`);
      expect(text(w.body)).not.toContain(VALID.identidad.documento);
    });
  });
});