// test/onboarding.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('W1 onboarding — API de integración', () => {
  let app: INestApplication;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    // El OTP fijo propuesto solo debe estar habilitado fuera de producción.
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  async function crearOnboarding(): Promise<Record<string, any>> {
    const response = await request(app.getHttpServer())
      .post('/onboarding')
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.onboardingId).toBeTruthy();
    expect(response.body.walletId).toBeTruthy();

    return response.body;
  }

  async function completarPaso(
    onboardingId: string,
    stepKey: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .put(`/onboarding/${onboardingId}/steps/${stepKey}`)
      .send(body);
  }

  it('W1-AC1-T2 [EP] inicio lista los pasos propuestos y marca datos como actual', async () => {
    const onboarding = await crearOnboarding();

    expect(Array.isArray(onboarding.steps)).toBe(true);
    expect(JSON.stringify(onboarding.steps)).toContain('datos');
    expect(JSON.stringify(onboarding.steps)).toContain('identidad');
    expect(JSON.stringify(onboarding.steps)).toContain('verificacion');
    expect(onboarding.currentStep).toBe('datos');
  });

  it('W1-AC1-T2 [ST] completar datos actualiza el paso actual', async () => {
    const onboarding = await crearOnboarding();

    const update = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });

    expect(update.status).toBe(200);

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);

    expect(progress.status).toBe(200);
    expect(progress.body.currentStep).toBe('identidad');
  });

  it('W1-AC1-T3 [ST] paso fuera de orden devuelve 409 y no cambia el progreso', async () => {
    const onboarding = await crearOnboarding();

    const update = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '123456' },
    );

    expect(update.status).toBe(409);
    expect(update.body.code).toBe('STEP_OUT_OF_ORDER');

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);

    expect(progress.status).toBe(200);
    expect(progress.body.currentStep).toBe('datos');
  });

  it.each([
    {
      label: 'nombre vacío',
      body: { name: '', phone: '912345678' },
      field: 'name',
    },
    {
      label: 'celular ausente',
      body: { name: 'Usuario Sintetico' },
      field: 'phone',
    },
    {
      label: 'celular de 8 dígitos',
      body: { name: 'Usuario Sintetico', phone: '91234567' },
      field: 'phone',
    },
    {
      label: 'celular de 10 dígitos',
      body: { name: 'Usuario Sintetico', phone: '9123456780' },
      field: 'phone',
    },
    {
      label: 'celular de 9 dígitos que no empieza en 9',
      body: { name: 'Usuario Sintetico', phone: '812345678' },
      field: 'phone',
    },
  ])(
    'W1-AC2-T2 [EP/BVA] $label bloquea el avance con error accionable',
    async ({ body, field }) => {
      const onboarding = await crearOnboarding();
      const response = await completarPaso(
        onboarding.onboardingId,
        'datos',
        body,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(response.body).toLowerCase()).toContain(
        field.toLowerCase(),
      );
      expect(JSON.stringify(response.body)).not.toMatch(
        /stack trace|node_modules|at \w+\s*\(/i,
      );

      const progress = await request(app.getHttpServer())
        .get(`/onboarding/${onboarding.onboardingId}`);

      expect(progress.status).toBe(200);
      expect(progress.body.currentStep).toBe('datos');
    },
  );

  it.each([
    { label: 'documento de 7 dígitos', document: '1234567' },
    { label: 'documento de 9 dígitos', document: '123456789' },
    { label: 'documento alfanumérico', document: '12ABC678' },
  ])(
    'W1-AC2-T3 [EP/BVA] $label no completa identidad según el formato propuesto',
    async ({ document }) => {
      const onboarding = await crearOnboarding();

      const datos = await completarPaso(onboarding.onboardingId, 'datos', {
        name: 'Usuario Sintetico',
        phone: '912345678',
      });
      expect(datos.status).toBe(200);

      const identidad = await completarPaso(
        onboarding.onboardingId,
        'identidad',
        { document },
      );

      expect(identidad.status).toBe(400);
      expect(identidad.body.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(identidad.body).toLowerCase()).toContain(
        'document',
      );
    },
  );

  it('W1-AC2-T3 [EP/ST] OTP incorrecto permite reintentar sin activar la wallet', async () => {
    const onboarding = await crearOnboarding();

    const datos = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });
    expect(datos.status).toBe(200);

    const identidad = await completarPaso(
      onboarding.onboardingId,
      'identidad',
      { document: '12345678' },
    );
    expect(identidad.status).toBe(200);

    const verificacion = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '000000' },
    );

    expect(verificacion.status).toBe(400);
    expect(verificacion.body.code).toBe('VALIDATION_ERROR');

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC3-T3 [ST] wallet incompleta permanece pendiente', async () => {
    const onboarding = await crearOnboarding();

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC3-T2 [ST] wallet se activa solo tras completar los tres pasos', async () => {
    const onboarding = await crearOnboarding();

    const datos = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });
    expect(datos.status).toBe(200);

    const identidad = await completarPaso(
      onboarding.onboardingId,
      'identidad',
      { document: '12345678' },
    );
    expect(identidad.status).toBe(200);

    const verificacion = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '123456' },
    );
    expect(verificacion.status).toBe(200);

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);
    expect(progress.status).toBe(200);
    expect(progress.body.status).toBe('COMPLETADO');

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('ACTIVA');
  });

  it.todo(
    'W1-AC3-T3 [UI] verificar que el punto de entrada de pago no aparece con wallet pendiente y aparece con ACTIVA; falta componente frontend identificable',
  );

  it.todo(
    'W1-AC4-T2 [ST] observar eventos de inicio, tres pasos y cierre, orden y marcas de tiempo; falta contrato de lectura de eventos para caja negra',
  );
});