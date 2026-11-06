// test/w1-onboarding-qa.e2e-spec.ts
// QA & Security — W1 Onboarding. NO EJECUTADO. Datos sintéticos. App creada en la prueba (sin puerto).
// Cubre: W1-AC1-T2, W1-AC2-T2, W1-AC3-T2/T3, tareas 2.2, 3.1, 3.2, 3.3, 4.1, 4.2 (AC4 bloqueado, ver it.todo).
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import {
  DOC_VALIDO,
  OTP_VALIDO,
  celularUnico,
  enviarPaso,
  http,
  iniciarOnboarding,
  onboardingCompleto,
} from './support/qa-helpers';

describe('W1 Onboarding guiado (QA)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    // PENDIENTE: si main.ts configura ValidationPipe/filtros globales, replicar aquí o exportar un bootstrap común.
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const idsPasos = (body: any) => (body.steps ?? []).map((s: any) => s.id);

  describe('W1-AC1 secuencia de pasos visible', () => {
    it('W1-AC1-T2 [EP] inicio lista los tres pasos con "datos" como actual (tarea 3.1)', async () => {
      const res = await iniciarOnboarding(app);
      expect(res.status).toBe(201);
      expect(idsPasos(res.body)).toEqual(['datos', 'identidad', 'verificacion']);
      expect(res.body.currentStep).toBe('datos');
      expect(res.body.walletStatus ?? 'PENDIENTE_ONBOARDING').toBe('PENDIENTE_ONBOARDING');
    });

    it('W1-AC1-T2 [ST] GET /onboarding/:id refleja el progreso actual (tarea 3.1)', async () => {
      const ini = await iniciarOnboarding(app);
      const res = await http(app).get(`/onboarding/${ini.body.onboardingId}`);
      expect(res.status).toBe(200);
      expect(res.body.currentStep).toBe('datos');
    });

    it('W1-AC1-T2 [ST] completar "datos" marca ese paso completado y avanza a "identidad"', async () => {
      const ini = await iniciarOnboarding(app);
      const r = await enviarPaso(app, ini.body.onboardingId, 'datos', {
        nombre: 'Ana Prueba',
        celular: celularUnico(),
      });
      expect(r.status).toBe(200);
      expect(r.body.currentStep).toBe('identidad');
      const g = await http(app).get(`/onboarding/${ini.body.onboardingId}`);
      const datos = g.body.steps.find((s: any) => s.id === 'datos');
      expect(datos.status).toBe('COMPLETADO');
    });

    it('W1-AC1-T3 [EG] onboarding inexistente devuelve 404 ONBOARDING_NOT_FOUND', async () => {
      const res = await http(app).get('/onboarding/no-existe-000');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ONBOARDING_NOT_FOUND');
    });
  });

  describe('W1-AC2 bloqueo con datos faltantes o inválidos (RN-09, RN-04)', () => {
    const invalidosDatos: Array<[string, Record<string, unknown>, string]> = [
      ['nombre vacío', { nombre: '', celular: '912345678' }, 'nombre'],
      ['nombre ausente', { celular: '912345678' }, 'nombre'],
      ['celular ausente', { nombre: 'Ana Prueba' }, 'celular'],
      ['celular de 8 dígitos', { nombre: 'Ana Prueba', celular: '91234567' }, 'celular'],
      ['celular de 10 dígitos', { nombre: 'Ana Prueba', celular: '9123456789' }, 'celular'],
      ['celular que empieza con 8', { nombre: 'Ana Prueba', celular: '812345678' }, 'celular'],
      ['celular con texto', { nombre: 'Ana Prueba', celular: '9abcdefgh' }, 'celular'],
    ];

    it.each(invalidosDatos)(
      'W1-AC2-T2 [EP/BVA] datos: %s -> 400 VALIDATION_ERROR, campo indicado y paso sin avanzar',
      async (_nombre, body, campo) => {
        const ini = await iniciarOnboarding(app);
        const id = ini.body.onboardingId;
        const res = await enviarPaso(app, id, 'datos', body);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        expect(JSON.stringify(res.body)).toContain(campo);
        const g = await http(app).get(`/onboarding/${id}`);
        expect(g.body.currentStep).toBe('datos');
      },
    );

    it('W1-AC2-T2 [BVA] celular de 9 dígitos que empieza con 9 es aceptado (límite válido)', async () => {
      const ini = await iniciarOnboarding(app);
      const res = await enviarPaso(app, ini.body.onboardingId, 'datos', {
        nombre: 'Ana Prueba',
        celular: '900000000',
      });
      expect(res.status).toBe(200);
    });

    const invalidosDoc: Array<[string, Record<string, unknown>]> = [
      ['documento de 7 dígitos', { documento: '1234567' }],
      ['documento de 9 dígitos', { documento: '123456789' }],
      ['documento con letras', { documento: '1234abcd' }],
      ['documento ausente', {}],
    ];

    it.each(invalidosDoc)(
      'W1-AC2-T2 [EP/BVA] identidad: %s -> 400 VALIDATION_ERROR y paso sin avanzar (PENDIENTE DE CONFIRMAR: documento 8 dígitos)',
      async (_n, body) => {
        const ini = await iniciarOnboarding(app);
        const id = ini.body.onboardingId;
        await enviarPaso(app, id, 'datos', { nombre: 'Ana Prueba', celular: celularUnico() });
        const res = await enviarPaso(app, id, 'identidad', body);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
        const g = await http(app).get(`/onboarding/${id}`);
        expect(g.body.currentStep).toBe('identidad');
      },
    );

    it('W1-AC2-T2 [EP] código OTP vacío -> 400 y se mantiene "verificacion"', async () => {
      const ini = await iniciarOnboarding(app);
      const id = ini.body.onboardingId;
      await enviarPaso(app, id, 'datos', { nombre: 'Ana Prueba', celular: celularUnico() });
      await enviarPaso(app, id, 'identidad', { documento: DOC_VALIDO });
      const res = await enviarPaso(app, id, 'verificacion', { codigo: '' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      const g = await http(app).get(`/onboarding/${id}`);
      expect(g.body.currentStep).toBe('verificacion');
    });
  });

  describe('Tarea 2.2 mock de identidad (OTP fijo, PROPUESTO)', () => {
    it('W1-AC2-T2 [EP] OTP incorrecto -> 400, se puede reintentar y wallet sigue pendiente', async () => {
      const ini = await iniciarOnboarding(app);
      const { onboardingId, walletId } = ini.body;
      await enviarPaso(app, onboardingId, 'datos', { nombre: 'Ana Prueba', celular: celularUnico() });
      await enviarPaso(app, onboardingId, 'identidad', { documento: DOC_VALIDO });
      const mal = await enviarPaso(app, onboardingId, 'verificacion', { codigo: '000000' });
      expect(mal.status).toBe(400);
      expect(mal.body.code).toBe('VALIDATION_ERROR');
      const w = await http(app).get(`/wallets/${walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
      const bien = await enviarPaso(app, onboardingId, 'verificacion', { codigo: OTP_VALIDO });
      expect(bien.status).toBe(200);
    });
  });

  describe('Tarea 3.3 orden estricto (D3)', () => {
    it('W1-AC1-T3 [ST] enviar "verificacion" antes de "datos" -> 409 STEP_OUT_OF_ORDER y progreso intacto', async () => {
      const ini = await iniciarOnboarding(app);
      const id = ini.body.onboardingId;
      const res = await enviarPaso(app, id, 'verificacion', { codigo: OTP_VALIDO });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('STEP_OUT_OF_ORDER');
      const g = await http(app).get(`/onboarding/${id}`);
      expect(g.body.currentStep).toBe('datos');
    });

    it('W1-AC1-T3 [ST] enviar "identidad" antes de "datos" -> 409 STEP_OUT_OF_ORDER', async () => {
      const ini = await iniciarOnboarding(app);
      const res = await enviarPaso(app, ini.body.onboardingId, 'identidad', { documento: DOC_VALIDO });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('STEP_OUT_OF_ORDER');
    });
  });

  describe('W1-AC3 activación de la wallet (RN-10)', () => {
    it('W1-AC3-T2 [ST] tras los tres pasos el onboarding queda COMPLETADO y la wallet ACTIVA (tarea 4.1)', async () => {
      const { onboardingId, walletId, fin } = await onboardingCompleto(app);
      expect(fin.status).toBe(200);
      const w = await http(app).get(`/wallets/${walletId}`);
      expect(w.status).toBe(200);
      expect(w.body.status).toBe('ACTIVA');
      const o = await http(app).get(`/onboarding/${onboardingId}`);
      expect(o.body.status).toBe('COMPLETADO');
    });

    it('W1-AC3-T3 [ST] con pasos pendientes la wallet sigue en PENDIENTE_ONBOARDING (tarea 4.2)', async () => {
      const ini = await iniciarOnboarding(app);
      const { onboardingId, walletId } = ini.body;
      let w = await http(app).get(`/wallets/${walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
      await enviarPaso(app, onboardingId, 'datos', { nombre: 'Ana Prueba', celular: celularUnico() });
      await enviarPaso(app, onboardingId, 'identidad', { documento: DOC_VALIDO });
      w = await http(app).get(`/wallets/${walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
    });

    it('W1-AC3-T3 [EG] wallet inexistente -> 404 (código de motivo estable)', async () => {
      const res = await http(app).get('/wallets/no-existe-000');
      expect(res.status).toBe(404);
      expect(typeof res.body.code).toBe('string');
    });
  });

  describe('W1-AC4 eventos del onboarding (tarea 5.1)', () => {
    // BLOQUEADO: el spec no define cómo consultar los eventos (DR-01). No se inventa un endpoint.
    it.todo('W1-AC4-T2 recorrido completo produce 1 onboarding_started, 3 onboarding_step_completed y 1 onboarding_completed, en ese orden, con marca de tiempo del servidor');
    it.todo('W1-AC4-T3 un paso inválido NO registra onboarding_step_completed');
  });

  describe('SEC-04 / SEC-05 entradas hostiles y errores sin detalles internos', () => {
    const hostiles: Array<[string, unknown]> = [
      ['SQL en nombre', "Robert'); DROP TABLE wallets;--"],
      ['JS en nombre', '<script>alert(1)</script>'],
      ['unicode/emoji', '𝕬𝖓𝖆 😀'],
      ['espacios', '     '],
      ['nombre enorme', 'A'.repeat(10000)],
      ['nombre nulo', null],
      ['nombre numérico', 123456789],
    ];

    it.each(hostiles)(
      'W1-AC2-T3 [EG] nombre hostil (%s) no provoca 5xx ni expone stack trace',
      async (_n, valor) => {
        const ini = await iniciarOnboarding(app);
        const res = await enviarPaso(app, ini.body.onboardingId, 'datos', {
          nombre: valor,
          celular: celularUnico(),
        });
        expect(res.status).toBeLessThan(500);
        const texto = JSON.stringify(res.body);
        expect(texto).not.toMatch(/at .*\(.*:\d+:\d+\)|node_modules|SQLITE|QueryFailedError/i);
      },
    );

    it('W1-AC2-T3 [EG] campos extra no autorizados (p. ej. status=ACTIVA) no activan la wallet', async () => {
      const ini = await iniciarOnboarding(app);
      const { onboardingId, walletId } = ini.body;
      await enviarPaso(app, onboardingId, 'datos', {
        nombre: 'Ana Prueba',
        celular: celularUnico(),
        status: 'ACTIVA',
        walletStatus: 'ACTIVA',
      });
      const w = await http(app).get(`/wallets/${walletId}`);
      expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
    });

    it('W1-AC2-T3 [EG] celular numérico enorme -> 400 VALIDATION_ERROR', async () => {
      const ini = await iniciarOnboarding(app);
      const res = await enviarPaso(app, ini.body.onboardingId, 'datos', {
        nombre: 'Ana Prueba',
        celular: 9e30,
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('W1-AC2-T3 [EG] paso desconocido -> 4xx sin stack trace', async () => {
      const ini = await iniciarOnboarding(app);
      const res = await enviarPaso(app, ini.body.onboardingId, 'inexistente', {});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at .*\.ts:\d+/);
    });
  });
});