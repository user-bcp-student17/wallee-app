// test/w1-onboarding-qa.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import {
  activeWallet, assertNoLeak, codeOf, createApp, getWallet, http, idOf, pendingWallet,
  repo, startOnboarding, stepKeys, STEP_BODIES, submitStep,
} from './helpers/qa-helpers';

describe('W1 Onboarding (QA) — NO EJECUTADO hasta confirmación de main.py', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createApp(); });
  afterAll(async () => { await app.close(); });

  // ---------- W1-AC1 ----------
  it('W1-AC1-T2 [EP] el inicio lista los tres pasos con "datos" como actual', async () => {
    const res = await startOnboarding(app);
    expect(res.status).toBe(201);
    expect(stepKeys(res.body)).toEqual(['datos', 'identidad', 'verificacion']);
    expect(res.body.currentStep).toBe('datos');
    const w = await getWallet(app, res.body.walletId);
    expect(w.body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC1-T2 [ST] al completar "datos" el actual pasa a "identidad"', async () => {
    const { onboardingId } = await pendingWallet(app);
    const res = await submitStep(app, onboardingId, 'datos', STEP_BODIES.datos());
    expect(res.status).toBe(200);
    expect((await http(app).get(`/onboarding/${onboardingId}`)).body.currentStep).toBe('identidad');
  });

  it('W1-AC1-T3 [EP] onboarding inexistente → 404 ONBOARDING_NOT_FOUND sin stack', async () => {
    const res = await http(app).get('/onboarding/no-existe-000');
    expect(res.status).toBe(404);
    expect(codeOf(res)).toBe('ONBOARDING_NOT_FOUND');
    assertNoLeak(res);
  });

  // ---------- W1-AC2 (RN-04, RN-09) ----------
  it.each([
    ['8 dígitos', '91234567'],
    ['10 dígitos', '9123456789'],
    ['empieza con 8', '812345678'],
    ['texto', 'abc123456'],
    ['vacío', ''],
  ])('W1-AC2-T2 [BVA/EP] celular %s rechazado con 400 VALIDATION_ERROR y no avanza', async (_n, celular) => {
    const { onboardingId } = await pendingWallet(app);
    const res = await submitStep(app, onboardingId, 'datos', { nombre: 'Ana Prueba', celular });
    expect(res.status).toBe(400);
    expect(codeOf(res)).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body)).toContain('celular'); // indica el campo a corregir
    assertNoLeak(res);
    expect((await http(app).get(`/onboarding/${onboardingId}`)).body.currentStep).toBe('datos');
  });

  it('W1-AC2-T2 [BVA] celular de 9 dígitos que empieza con 9 es aceptado', async () => {
    const { onboardingId } = await pendingWallet(app);
    const res = await submitStep(app, onboardingId, 'datos', { nombre: 'Ana Prueba', celular: '912345678' });
    expect(res.status).toBe(200);
  });

  it('W1-AC2-T2 [EP] nombre obligatorio vacío → 400 e indica "nombre"', async () => {
    const { onboardingId } = await pendingWallet(app);
    const res = await submitStep(app, onboardingId, 'datos', { nombre: '', celular: '912345678' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('nombre');
  });

  it.each([
    ['7 dígitos', '1234567'],
    ['9 dígitos', '123456789'],
    ['letras', 'ABCDEFGH'],
    ['vacío', ''],
  ])('W1-AC2-T2 [BVA/EP] documento %s rechazado (documento de 8 dígitos = PENDIENTE DE CONFIRMAR)', async (_n, documento) => {
    const { onboardingId } = await pendingWallet(app);
    await submitStep(app, onboardingId, 'datos', STEP_BODIES.datos());
    const res = await submitStep(app, onboardingId, 'identidad', { documento });
    expect(res.status).toBe(400);
    expect(codeOf(res)).toBe('VALIDATION_ERROR');
    expect((await http(app).get(`/onboarding/${onboardingId}`)).body.currentStep).toBe('identidad');
  });

  it('W1-AC2-T2 [EP] código OTP vacío → 400 y permite reintentar', async () => {
    const { onboardingId } = await pendingWallet(app);
    await submitStep(app, onboardingId, 'datos', STEP_BODIES.datos());
    await submitStep(app, onboardingId, 'identidad', STEP_BODIES.identidad());
    const res = await submitStep(app, onboardingId, 'verificacion', { codigo: '' });
    expect(res.status).toBe(400);
    expect((await http(app).get(`/onboarding/${onboardingId}`)).body.currentStep).toBe('verificacion');
  });

  it('W1-AC2-T3 [EG] body vacío y campos extra no rompen (nunca 5xx) ni filtran stack', async () => {
    const { onboardingId } = await pendingWallet(app);
    const a = await submitStep(app, onboardingId, 'datos', {});
    expect(a.status).toBe(400);
    assertNoLeak(a);
    const b = await submitStep(app, onboardingId, 'datos', { ...STEP_BODIES.datos(), status: 'ACTIVA', walletStatus: 'ACTIVA' });
    expect(b.status).toBeLessThan(500);
    const w = await getWallet(app, (await http(app).get(`/onboarding/${onboardingId}`)).body.walletId);
    expect(w.body.status).toBe('PENDIENTE_ONBOARDING'); // el cliente no puede activar la wallet
  });

  // ---------- Tarea 2.2 (verificación simulada, vía API) ----------
  it('W1-REQ-IDENT-T2 [EP] OTP 123456 pasa y uno distinto falla (sin proveedor externo)', async () => {
    const ok = await pendingWallet(app);
    await submitStep(app, ok.onboardingId, 'datos', STEP_BODIES.datos());
    await submitStep(app, ok.onboardingId, 'identidad', STEP_BODIES.identidad());
    const good = await submitStep(app, ok.onboardingId, 'verificacion', { codigo: '123456' });
    expect(good.status).toBe(200);

    const bad = await pendingWallet(app);
    await submitStep(app, bad.onboardingId, 'datos', STEP_BODIES.datos());
    await submitStep(app, bad.onboardingId, 'identidad', STEP_BODIES.identidad());
    const wrong = await submitStep(app, bad.onboardingId, 'verificacion', { codigo: '654321' });
    expect(wrong.status).toBe(400);
    expect(codeOf(wrong)).toBe('VALIDATION_ERROR');
  });

  // ---------- W1-AC3 (RN-10) ----------
  it('W1-AC3-T2 [ST] tras los tres pasos la wallet es ACTIVA', async () => {
    const { walletId } = await activeWallet(app);
    const w = await getWallet(app, walletId);
    expect(w.status).toBe(200);
    expect(w.body.status).toBe('ACTIVA');
  });

  it('W1-AC3-T3 [ST] con un paso pendiente la wallet sigue PENDIENTE_ONBOARDING', async () => {
    const { onboardingId, walletId } = await pendingWallet(app);
    await submitStep(app, onboardingId, 'datos', STEP_BODIES.datos());
    await submitStep(app, onboardingId, 'identidad', STEP_BODIES.identidad());
    expect((await getWallet(app, walletId)).body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC3-T3 [ST] "verificacion" antes de "datos" → 409 STEP_OUT_OF_ORDER sin cambiar el progreso', async () => {
    const { onboardingId } = await pendingWallet(app);
    const res = await submitStep(app, onboardingId, 'verificacion', STEP_BODIES.verificacion());
    expect(res.status).toBe(409);
    expect(codeOf(res)).toBe('STEP_OUT_OF_ORDER');
    expect((await http(app).get(`/onboarding/${onboardingId}`)).body.currentStep).toBe('datos');
  });

  // ---------- W1-AC4 ----------
  it('W1-AC4-T2 [ST] recorrido completo: 1 inicio, 3 pasos, 1 cierre, en ese orden', async () => {
    const { onboardingId } = await activeWallet(app);
    const events: any[] = await repo(app, 'OnboardingEvent').find({ where: { onboardingId } });
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'onboarding_started',
      'onboarding_step_completed',
      'onboarding_step_completed',
      'onboarding_step_completed',
      'onboarding_completed',
    ]);
    expect(events.map((e) => e.step).filter(Boolean)).toEqual(['datos', 'identidad', 'verificacion']);
    events.forEach((e) => expect(e.occurredAt).toBeTruthy());
  });

  it('W1-AC4-T3 [EP] un paso inválido no emite onboarding_step_completed', async () => {
    const { onboardingId } = await pendingWallet(app);
    await submitStep(app, onboardingId, 'datos', { nombre: 'Ana', celular: '123' });
    const events: any[] = await repo(app, 'OnboardingEvent').find({ where: { onboardingId } });
    expect(events.filter((e) => e.type === 'onboarding_step_completed')).toHaveLength(0);
  });
});