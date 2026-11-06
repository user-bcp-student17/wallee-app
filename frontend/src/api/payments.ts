import type { FieldError } from './onboarding';

export type Wallet = { id: string; status: string; balance: number; reserved: number; available: number; currency: string };
export type Payment = {
  id: string;
  walletId: string;
  recipient: string;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'SUCCEEDED' | 'REJECTED' | 'REVERSED';
  scenario: string;
  createdAt?: string;
};
export type Receipt = { receiptId: string; paymentId: string; amountCents: number; currency: string; recipient: string; status: string };
export type Escalation = { status: 'PENDING'; escalated: true };
export type CreatePaymentBody = { walletId: string; recipient: string; amountCents: number; scenario: string };

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: string; message: string; errors: FieldError[] };

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(`/api${path}`, init);
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, status: response.status, data: payload as T };
  return {
    ok: false,
    status: response.status,
    code: typeof payload.code === 'string' ? payload.code : 'UNKNOWN',
    message: typeof payload.message === 'string' ? payload.message : 'No se pudo completar la solicitud.',
    errors: Array.isArray(payload.errors) ? (payload.errors as FieldError[]) : [],
  };
}

const post = (body?: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body ?? {}),
});

export const getWallet = (id: string) => call<Wallet>(`/wallets/${encodeURIComponent(id)}`);
export const listPayments = (walletId: string) => call<Payment[]>(`/payments?walletId=${encodeURIComponent(walletId)}`);
export const createPayment = (body: CreatePaymentBody, idempotencyKey: string) =>
  call<Payment>('/payments', post(body, { 'Idempotency-Key': idempotencyKey }));
export const resolvePayment = (id: string) => call<Payment | Escalation>(`/payments/${encodeURIComponent(id)}/resolve`, post());
export const completeProvider = (id: string, status: 'SUCCEEDED' | 'REJECTED') =>
  call<{ eventId: string }>(`/control/provider/${encodeURIComponent(id)}/complete`, post({ status }));
export const getReceipt = (id: string) => call<Receipt>(`/payments/${encodeURIComponent(id)}/receipt`);
