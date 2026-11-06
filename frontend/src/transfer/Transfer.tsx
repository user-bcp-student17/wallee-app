import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { completeProvider, createPayment, getReceipt, getWallet, listPayments, resolvePayment } from '../api/payments';
import type { ApiResult, Escalation, Payment, Receipt, Wallet } from '../api/payments';
import type { FieldError } from '../api/onboarding';

const DEMO_WALLET_ID = 'wallet-demo';
const MAX_CENTS = 100_000_000;
const recipients = [
  { id: 'contact-demo', label: 'Contacto Demo' },
  { id: 'merchant-demo', label: 'Comercio Demo' },
];
const scenarios = [
  { id: 'APPROVED', label: 'Aprobado' },
  { id: 'REJECTED', label: 'Rechazado' },
  { id: 'PENDING', label: 'Queda pendiente' },
];
const statusLabels: Record<Payment['status'], string> = { PENDING: 'Pendiente', SUCCEEDED: 'Exitosa', REJECTED: 'Rechazada', REVERSED: 'Reversada' };
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const formatCents = (cents: number) => money.format(cents / 100);
const recipientName = (id: string) => recipients.find((item) => item.id === id)?.label ?? id;
const OFFLINE = 'No se pudo conectar con el servicio. Inténtalo de nuevo.';

export function toCents(text: string): number | null {
  if (!/^\d+([.,]\d{1,2})?$/.test(text.trim())) return null;
  const cents = Math.round(Number(text.trim().replace(',', '.')) * 100);
  return cents >= 1 && cents <= MAX_CENTS ? cents : null;
}

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const isPayment = (value: Payment | Escalation): value is Payment => 'id' in value;

type Outcome = { payment: Payment; receipt?: Receipt; pending: boolean };

export default function Transfer({ walletId = DEMO_WALLET_ID }: { walletId?: string }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [recipient, setRecipient] = useState(recipients[0].id);
  const [amount, setAmount] = useState('');
  const [scenario, setScenario] = useState(scenarios[0].id);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Se conserva entre reintentos para que un reenvío no duplique el pago.
  const idempotencyKey = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [walletResult, historyResult] = await Promise.all([getWallet(walletId), listPayments(walletId)]);
      if (!walletResult.ok) {
        setLoadError(walletResult.status === 404 ? 'No se encontró la wallet. Completa el registro o inicia el backend con DB_SEED=true.' : walletResult.message);
      } else if (!historyResult.ok) {
        setLoadError(historyResult.message);
      } else {
        setWallet(walletResult.data);
        setHistory(historyResult.data);
      }
    } catch {
      setLoadError(OFFLINE);
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function fail(result: Extract<ApiResult<unknown>, { ok: false }>) {
    setMessage(result.message);
    setErrors(result.errors.map((error) => (error.field === 'amountCents' ? { ...error, field: 'amount' } : error)));
    if (result.code === 'IDEMPOTENCY_CONFLICT') idempotencyKey.current = null;
  }

  async function settle(created: Payment) {
    const resolved = await resolvePayment(created.id);
    if (!resolved.ok) return fail(resolved);
    if (!isPayment(resolved.data)) {
      setOutcome({ payment: created, pending: true });
    } else {
      const receipt = resolved.data.status === 'SUCCEEDED' ? await getReceipt(created.id) : undefined;
      setOutcome({ payment: resolved.data, receipt: receipt?.ok ? receipt.data : undefined, pending: false });
    }
    await refresh();
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    setErrors([]);
    try {
      await action();
    } catch {
      setMessage(OFFLINE);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const cents = toCents(amount);
    if (cents === null) {
      setOutcome(null);
      setMessage('');
      setErrors([{ field: 'amount', message: 'Ingresa un importe válido, por ejemplo 15.50.' }]);
      return;
    }
    setOutcome(null);
    idempotencyKey.current ??= newKey();
    void run(async () => {
      const created = await createPayment({ walletId, recipient, amountCents: cents, scenario }, idempotencyKey.current as string);
      if (!created.ok) return fail(created);
      idempotencyKey.current = null;
      setAmount('');
      await settle(created.data);
    });
  }

  function simulateProvider() {
    if (!outcome || busy) return;
    const { payment } = outcome;
    void run(async () => {
      const completed = await completeProvider(payment.id, 'SUCCEEDED');
      if (!completed.ok) return fail(completed);
      await settle(payment);
    });
  }

  const amountError = errors.find((item) => item.field === 'amount');
  const otherErrors = errors.filter((item) => item.field !== 'amount');

  return (
    <div className="layout">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Wallee, inicio"><span className="brand-mark">w</span> wallee<span className="brand-dot">.</span></a>
        <span className="top-note">TRANSFERENCIAS</span>
      </header>
      <main className="transfer">
        <div className="section-label">ENVÍA DINERO <span>WALLEE / 02</span></div>
        <h1>Transferir</h1>
        <p className="mock-note">Transferencia simulada desde {walletId === DEMO_WALLET_ID ? 'la wallet de demostración' : 'tu wallet'}. No mueve dinero real ni se conecta a BCP.</p>

        <section className="balance" aria-label="Saldo">
          {loading && <p role="status">Cargando tu wallet...</p>}
          {!loading && loadError && (
            <div className="form-error" role="alert">{loadError} <button className="link" type="button" onClick={() => void refresh()}>Reintentar</button></div>
          )}
          {wallet && (
            <dl>
              <div><dt>Disponible</dt><dd>{formatCents(wallet.available)}</dd></div>
              <div><dt>Saldo</dt><dd>{formatCents(wallet.balance)}</dd></div>
              <div><dt>Reservado</dt><dd>{formatCents(wallet.reserved)}</dd></div>
            </dl>
          )}
        </section>

        <section aria-label="Nueva transferencia">
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="recipient">Destinatario</label>
              <select id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)}>
                {recipients.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amount">Importe (S/)</label>
              <input id="amount" inputMode="decimal" autoComplete="off" value={amount} aria-invalid={Boolean(amountError)} aria-describedby={amountError ? 'amount-error' : undefined}
                onChange={(event) => { setAmount(event.target.value); setErrors(errors.filter((item) => item.field !== 'amount')); }} />
              {amountError && <span className="field-error" id="amount-error" role="alert">{amountError.message}</span>}
            </div>
            <div className="field">
              <label htmlFor="scenario">Resultado simulado del proveedor</label>
              <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value)}>
                {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <span className="hint">Solo para probar la demo: define cómo responde el proveedor simulado.</span>
            </div>
            {message && <div className="form-error" role="alert">{message}</div>}
            {otherErrors.map((item) => <div className="form-error" role="alert" key={item.field}>{item.message}</div>)}
            <button className="primary" disabled={busy || !wallet} type="submit">{busy ? 'Enviando...' : 'Transferir'} <span aria-hidden="true">→</span></button>
          </form>
        </section>

        {outcome && (
          <section className={`outcome ${outcome.payment.status.toLowerCase()}`} role="status" aria-label="Resultado">
            {outcome.pending && (
              <>
                <h2>Pago pendiente</h2>
                <p>El proveedor aún no confirma {formatCents(outcome.payment.amountCents)} para {recipientName(outcome.payment.recipient)}. El caso quedó escalado a soporte.</p>
                <button className="primary" type="button" disabled={busy} onClick={simulateProvider}>Simular confirmación del proveedor <span aria-hidden="true">→</span></button>
              </>
            )}
            {!outcome.pending && outcome.payment.status === 'SUCCEEDED' && (
              <>
                <h2>Transferencia exitosa</h2>
                <p>Enviaste {formatCents(outcome.payment.amountCents)} a {recipientName(outcome.payment.recipient)}.</p>
                {outcome.receipt && <p className="wallet-id">COMPROBANTE<br /><strong>{outcome.receipt.receiptId}</strong></p>}
              </>
            )}
            {!outcome.pending && outcome.payment.status === 'REJECTED' && (
              <>
                <h2>Transferencia rechazada</h2>
                <p>El proveedor rechazó el pago. No se descontó saldo.</p>
              </>
            )}
          </section>
        )}

        <section aria-label="Historial" className="history">
          <h2>Historial</h2>
          {!loading && !loadError && history.length === 0 && <p>Aún no tienes transferencias.</p>}
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <span>{recipientName(item.recipient)}</span>
                <strong>{formatCents(item.amountCents)}</strong>
                <span className={`tag ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
