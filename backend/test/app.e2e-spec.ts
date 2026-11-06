import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('GET /health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 200 with the service status', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'wallee-backend' }));

  it('responds 404 for unknown routes', () => request(app.getHttpServer()).get('/unknown').expect(404));

  it('applies migrations and seeds wallet-demo in the database', async () => {
    const [wallet] = await app.get(DataSource).query("SELECT status, balance, reserved FROM wallets WHERE id = 'wallet-demo'");
    expect(wallet).toEqual({ status: 'ACTIVE', balance: 100000, reserved: 0 });
  });

  it('W1 AC1-AC3: validates and completes the onboarding over HTTP', async () => {
    const created = await request(app.getHttpServer()).post('/onboarding').send({}).expect(201);
    const id = created.body.onboardingId;
    await request(app.getHttpServer()).get(`/onboarding/${id}`).expect(200).expect((result) => {
      expect(result.body.walletStatus).toBe('PENDIENTE_ONBOARDING');
    });
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/identidad`).send({ documento: '12345678' }).expect(409);
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/datos`).send({ nombre: '', celular: '123' }).expect(400).expect((result) => {
      expect(result.body.code).toBe('VALIDATION_ERROR');
      expect(result.body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'celular' })]));
    });
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/datos`).send({ nombre: 'Ana', celular: '912345678' }).expect(200);
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/identidad`).send({ documento: '12345678' }).expect(200);
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/verificacion`).send({ codigo: '000000' }).expect(400);
    await request(app.getHttpServer()).put(`/onboarding/${id}/steps/verificacion`).send({ codigo: '123456' }).expect(200).expect((result) => {
      expect(result.body.walletStatus).toBe('ACTIVA');
    });
  });
});
