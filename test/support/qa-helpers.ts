// test/support/qa-helpers.ts
// Helpers de QA & Security. Datos 100% sintéticos (SEC-02). Sin secretos (SEC-01).
// Los nombres de campo (nombre, celular, documento, codigo, walletId, destination, amount,
// balance, outcome, reference) son PROPUESTOS en design.md: PENDIENTE DE CONFIRMAR.
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const OTP_VALIDO = '123456'; // mock de identidad (D7). PROPUESTO.
export const DOC_VALIDO = '12345678'; // documento de 8 dígitos. PROPUESTO.

export function http(app: INestApplication) {
  return request(app.getHttpServer());
}

/** Celular sintético único de 9 dígitos que empieza con 9. */
let seq = 0;
export function celularUnico(): string {
  seq += 1;
  const tail = String((Date.now() + seq * 7919) % 100000000).padStart(8, '0');
  return `9${tail}`;
}

/** Destino sintético cuyo último dígito dispara el escenario del mock (RN-08). */
export function destinoConDigito(d: number): string {
  return `90000000${d}`;
}

export async function iniciarOnboarding(app: INestApplication) {
  const res = await http(app).post('/onboarding').send({});
  return res;
}

export async function enviarPaso(
  app: INestApplication,
  onboardingId: string,
  paso: string,
  body: Record<string, unknown>,
) {
  return http(app).put(`/onboarding/${onboardingId}/steps/${paso}`).send(body);
}

export async function onboardingCompleto(app: INestApplication, celular = celularUnico()) {
  const ini = await iniciarOnboarding(app);
  const { onboardingId, walletId } = ini.body;
  await enviarPaso(app, onboardingId, 'datos', { nombre: 'Ana Prueba', celular });
  await enviarPaso(app, onboardingId, 'identidad', { documento: DOC_VALIDO });
  const fin = await enviarPaso(app, onboardingId, 'verificacion', { codigo: OTP_VALIDO });
  return { onboardingId, walletId, celular, fin };
}

export async function saldo(app: INestApplication, walletId: string): Promise<number> {
  const res = await http(app).get(`/wallets/${walletId}`);
  return Number(res.body.balance);
}

export async function pagar(
  app: INestApplication,
  walletId: string,
  destination: string,
  amount: unknown,
) {
  return http(app).post('/payments').send({ walletId, destination, amount });
}

export async function historial(app: INestApplication, walletId: string) {
  const res = await http(app).get(`/wallets/${walletId}/payments`);
  return Array.isArray(res.body) ? res.body : (res.body.items ?? []);
}

/**
 * Baja el saldo hasta `objetivo` con pagos APPROVED (último dígito 3) para poder probar BVA de saldo
 * sin depender del saldo inicial de las fixtures (SUP-15). Montos <= 500 para no chocar con RN-01.
 */
export async function reducirSaldoA(app: INestApplication, walletId: string, objetivo: number) {
  let actual = await saldo(app, walletId);
  let guard = 0;
  while (actual - objetivo > 0.0001 && guard < 200) {
    const paso = Math.min(500, Math.round((actual - objetivo) * 100) / 100);
    const r = await pagar(app, walletId, destinoConDigito(3), paso);
    if (r.status >= 400) throw new Error(`No se pudo reducir el saldo: HTTP ${r.status}`);
    actual = await saldo(app, walletId);
    guard += 1;
  }
}