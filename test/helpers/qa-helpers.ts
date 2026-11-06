// test/helpers/qa-helpers.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * Helpers de QA. Todo contrato marcado PROPUESTO (nombres de campos del body y de la
 * respuesta, forma del callback, nombres de entidad) sale de design.md/architect_report
 * y está pendiente de confirmar. Se centraliza aquí para ajustar en un solo lugar.
 * Datos 100% sintéticos, sin secretos.
 */
export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  // PROPUESTO: replica el ValidationPipe de main.ts (si main.ts lo configura distinto, ajustar).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  return app;
}

export const http = (app: INestApplication) => request(app.getHttpServer());

export const OTP_OK = '123456'; // mock D7 (fuera de producción)
export const ALIAS_OK = process.env.QA_ALIAS ?? 'ana.demo'; // PROPUESTO: debe existir en el directorio sintético

/** Directorio sintético PROPUESTO (tarea 1.2): '90000000' + último dígito. */
export const DIR: Record<number, string> = {};
for (let d = 0; d <= 9; d++) DIR[d] = '90000000' + d;

let seq = 0;
/** Celular sintético válido del pagador; prefijo 98 para no chocar con el directorio. */
export const payerPhone = (): string =>
  '98' + String((Date.now() + seq++) % 10000000).padStart(7, '0');

export const codeOf = (res: request.Response): string | undefined =>
  res.body?.code ?? res.body?.message?.code ?? res.body?.error?.code;

export const idOf = (b: any): string => b.onboardingId ?? b.id;
export const stepKeys = (b: any): string[] => (b.steps ?? []).map((s: any) => s.id ?? s.key);

/** SEC-04: la respuesta no debe filtrar stack trace ni detalles internos. */
export function assertNoLeak(res: request.Response): void {
  expect(JSON.stringify(res.body ?? {})).not.toMatch(
    /node_modules|\bat .*\(.*:\d+:\d+\)|"stack"|QueryFailedError|SQLITE_|TypeORM/i,
  );
}

/** Acceso a repositorios por nombre de entidad (PROPUESTO: Wallet, OnboardingEvent, PaymentEvent). */
export function repo(app: INestApplication, entity: string): any {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DataSource } = require('typeorm');
  return app.get(DataSource).getRepository(entity);
}

export const startOnboarding = (app: INestApplication) => http(app).post('/onboarding').send({});
export const submitStep = (app: INestApplication, id: string, key: string, body: any) =>
  http(app).put(`/onboarding/${id}/steps/${key}`).send(body);

export const STEP_BODIES = {
  datos: () => ({ nombre: 'Ana Prueba', celular: payerPhone() }),
  identidad: () => ({ documento: '12345678' }),
  verificacion: () => ({ codigo: OTP_OK }),
};

/** Wallet PENDIENTE_ONBOARDING (solo se inicia el onboarding). */
export async function pendingWallet(app: INestApplication) {
  const res = await startOnboarding(app);
  return { onboardingId: idOf(res.body), walletId: res.body.walletId as string };
}

/** Wallet ACTIVA tras los tres pasos válidos. */
export async function activeWallet(app: INestApplication) {
  const { onboardingId, walletId } = await pendingWallet(app);
  await submitStep(app, onboardingId, 'datos', STEP_BODIES.datos());
  await submitStep(app, onboardingId, 'identidad', STEP_BODIES.identidad());
  await submitStep(app, onboardingId, 'verificacion', STEP_BODIES.verificacion());
  return { onboardingId, walletId };
}

export const getWallet = (app: INestApplication, id: string) => http(app).get(`/wallets/${id}`);
export const balanceOf = async (app: INestApplication, id: string) =>
  Number((await getWallet(app, id)).body.balance);
/** Fija un saldo sintético (PROPUESTO: balance en soles con decimales). */
export const setBalance = (app: INestApplication, id: string, v: number) =>
  repo(app, 'Wallet').update(id, { balance: v });

export const pay = (app: INestApplication, walletId: string, destination: any, amount: any, extra: any = {}) =>
  http(app).post('/payments').send({ walletId, destination, amount, ...extra });

export const history = async (app: INestApplication, walletId: string): Promise<any[]> => {
  const b = (await http(app).get(`/wallets/${walletId}/payments`)).body;
  return Array.isArray(b) ? b : b.items ?? b.payments ?? [];
};

export const callback = (app: INestApplication, paymentId: string, providerStatus: string) =>
  http(app).post(`/payments/${paymentId}/callback`).send({ providerStatus });