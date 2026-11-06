import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Transfer, { toCents } from './Transfer';

const wallet = { id: 'wallet-demo', status: 'ACTIVE', balance: 100000, reserved: 0, available: 100000, currency: 'PEN' };
const payment = (overrides = {}) => ({ id: 'pay_1', walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1550, currency: 'PEN', status: 'PENDING', scenario: 'APPROVED', ...overrides });

type Reply = { status?: number; body: unknown } | Error;
type Routes = Record<string, Reply | (() => Reply)>;

// Servidor simulado: cada ruta "METODO /ruta" devuelve una respuesta fija o calculada.
function stubApi(routes: Routes) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.replace('/api', '')}`;
    const route = routes[key];
    if (!route) throw new Error(`Unexpected request ${key}`);
    const reply = typeof route === 'function' ? route() : route;
    if (reply instanceof Error) throw reply;
    const status = reply.status ?? 200;
    return { ok: status < 400, status, json: async () => reply.body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
const base = (): Routes => ({
  'GET /wallets/wallet-demo': { body: wallet },
  'GET /payments?walletId=wallet-demo': { body: [] },
});
const postsTo = (fetchMock: ReturnType<typeof stubApi>, path: string) => fetchMock.mock.calls.filter(([url, init]) => url === `/api${path}` && init?.method === 'POST');

async function fillAndSubmit(amount: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Importe (S/)'), amount);
  await user.click(screen.getByRole('button', { name: /Transferir/ }));
  return user;
}

describe('toCents', () => {
  it('converts valid soles amounts and rejects the rest', () => {
    expect(toCents('15.50')).toBe(1550);
    expect(toCents('15,5')).toBe(1550);
    expect(toCents('0.01')).toBe(1);
    expect(toCents(' 20 ')).toBe(2000);
    expect(toCents('1000000')).toBe(100_000_000);
    for (const bad of ['', '0', '0.00', 'abc', '-5', '1.234', '1000000.01']) expect(toCents(bad)).toBeNull();
  });
});

describe('W2: pantalla de transferencia', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows loading, then the balances and an empty history', async () => {
    stubApi(base());
    render(<Transfer />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    expect(await screen.findByText('Disponible')).toBeInTheDocument();
    expect(screen.getAllByText(/1[,.\s\u00a0]?000[.,]00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Aún no tienes transferencias.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir/ })).toBeEnabled();
  });

  it('transfers, resolves the payment and shows the receipt and updated history', async () => {
    const routes = base();
    const fetchMock = stubApi(routes);
    routes['POST /payments'] = { status: 202, body: payment() };
    routes['POST /payments/pay_1/resolve'] = () => {
      routes['GET /payments?walletId=wallet-demo'] = { body: [payment({ status: 'SUCCEEDED' })] };
      routes['GET /wallets/wallet-demo'] = { body: { ...wallet, balance: 98450, available: 98450 } };
      return { body: payment({ status: 'SUCCEEDED' }) };
    };
    routes['GET /payments/pay_1/receipt'] = { body: { receiptId: 'rcp_pay_1', paymentId: 'pay_1' } };
    render(<Transfer />);
    await fillAndSubmit('15.50');
    expect(await screen.findByText('Transferencia exitosa')).toBeInTheDocument();
    expect(screen.getByText('rcp_pay_1')).toBeInTheDocument();
    const [, init] = postsTo(fetchMock, '/payments')[0];
    expect(JSON.parse(init?.body as string)).toEqual({ walletId: 'wallet-demo', recipient: 'contact-demo', amountCents: 1550, scenario: 'APPROVED' });
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
    const history = within(screen.getByRole('region', { name: 'Historial' }));
    expect(await history.findByText('Exitosa')).toBeInTheDocument();
    expect(screen.getByLabelText('Importe (S/)')).toHaveValue('');
  });

  it('lets the user pick the recipient and a rejecting provider', async () => {
    const routes = base();
    const fetchMock = stubApi(routes);
    routes['POST /payments'] = { status: 202, body: payment({ recipient: 'merchant-demo', scenario: 'REJECTED' }) };
    routes['POST /payments/pay_1/resolve'] = { body: payment({ recipient: 'merchant-demo', status: 'REJECTED' }) };
    render(<Transfer />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Destinatario'), 'merchant-demo');
    await user.selectOptions(screen.getByLabelText('Resultado simulado del proveedor'), 'REJECTED');
    await user.type(screen.getByLabelText('Importe (S/)'), '15.50');
    await user.click(screen.getByRole('button', { name: /Transferir/ }));
    expect(await screen.findByText('Transferencia rechazada')).toBeInTheDocument();
    expect(JSON.parse(postsTo(fetchMock, '/payments')[0][1]?.body as string)).toMatchObject({ recipient: 'merchant-demo', scenario: 'REJECTED' });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/payments/pay_1/receipt', expect.anything());
  });

  it('escalates a pending payment and completes it with the simulated provider', async () => {
    const routes = base();
    stubApi(routes);
    routes['POST /payments'] = { status: 202, body: payment({ scenario: 'PENDING' }) };
    let resolves = 0;
    routes['POST /payments/pay_1/resolve'] = () => (++resolves === 1 ? { status: 202, body: { status: 'PENDING', escalated: true } } : { body: payment({ status: 'SUCCEEDED' }) });
    routes['POST /control/provider/pay_1/complete'] = { body: { eventId: 'evt_1' } };
    routes['GET /payments/pay_1/receipt'] = { status: 500, body: {} };
    render(<Transfer />);
    const user = await fillAndSubmit('15.50');
    expect(await screen.findByText('Pago pendiente')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Simular confirmación/ }));
    expect(await screen.findByText('Transferencia exitosa')).toBeInTheDocument();
    expect(screen.queryByText('rcp_pay_1')).not.toBeInTheDocument();
  });

  it('validates the amount on the client without calling the API', async () => {
    const fetchMock = stubApi(base());
    render(<Transfer />);
    const user = await fillAndSubmit('abc');
    expect(await screen.findByText('Ingresa un importe válido, por ejemplo 15.50.')).toBeInTheDocument();
    expect(screen.getByLabelText('Importe (S/)')).toHaveAttribute('aria-invalid', 'true');
    expect(postsTo(fetchMock, '/payments')).toHaveLength(0);
    await user.type(screen.getByLabelText('Importe (S/)'), '1');
    expect(screen.queryByText('Ingresa un importe válido, por ejemplo 15.50.')).not.toBeInTheDocument();
  });

  it('shows server errors by field and by message', async () => {
    const routes = base();
    stubApi(routes);
    routes['POST /payments'] = { status: 400, body: { code: 'VALIDATION_ERROR', message: 'Corrige los campos indicados.', errors: [{ field: 'amountCents', message: 'El importe mínimo es 1 céntimo.' }, { field: 'recipient', message: 'Elige un destinatario válido.' }] } };
    render(<Transfer />);
    const user = await fillAndSubmit('5');
    expect(await screen.findByText('El importe mínimo es 1 céntimo.')).toBeInTheDocument();
    expect(screen.getByText('Elige un destinatario válido.')).toBeInTheDocument();
    routes['POST /payments'] = { status: 409, body: { code: 'INSUFFICIENT_FUNDS', message: 'Saldo insuficiente.' } };
    await user.click(screen.getByRole('button', { name: /Transferir/ }));
    expect(await screen.findByText('Saldo insuficiente.')).toBeInTheDocument();
    expect(screen.queryByText('Transferencia exitosa')).not.toBeInTheDocument();
  });

  it('reuses the Idempotency-Key after a network failure and renews it after a conflict', async () => {
    const routes = base();
    const fetchMock = stubApi(routes);
    routes['POST /payments'] = new Error('offline');
    render(<Transfer />);
    const user = await fillAndSubmit('15.50');
    expect(await screen.findByText('No se pudo conectar con el servicio. Inténtalo de nuevo.')).toBeInTheDocument();
    routes['POST /payments'] = { status: 409, body: { code: 'IDEMPOTENCY_CONFLICT', message: 'Esta clave ya se usó con otros datos.' } };
    await user.click(screen.getByRole('button', { name: /Transferir/ }));
    expect(await screen.findByText('Esta clave ya se usó con otros datos.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Transferir/ }));
    await screen.findByText('Esta clave ya se usó con otros datos.');
    const keys = postsTo(fetchMock, '/payments').map(([, init]) => (init?.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(3);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('reports a failing resolve or provider completion', async () => {
    const routes = base();
    stubApi(routes);
    routes['POST /payments'] = { status: 202, body: payment() };
    routes['POST /payments/pay_1/resolve'] = { status: 404, body: { code: 'PAYMENT_NOT_FOUND', message: 'No se encontró el pago.' } };
    render(<Transfer />);
    await fillAndSubmit('15.50');
    expect(await screen.findByText('No se encontró el pago.')).toBeInTheDocument();

    routes['POST /payments'] = { status: 202, body: payment({ id: 'pay_2' }) };
    routes['POST /payments/pay_2/resolve'] = { status: 202, body: { status: 'PENDING', escalated: true } };
    routes['POST /control/provider/pay_2/complete'] = { status: 409, body: { code: 'PROVIDER_ALREADY_FINAL', message: 'El proveedor ya terminó este pago.' } };
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Importe (S/)'), '2');
    await user.click(screen.getByRole('button', { name: /Transferir/ }));
    await user.click(await screen.findByRole('button', { name: /Simular confirmación/ }));
    expect(await screen.findByText('El proveedor ya terminó este pago.')).toBeInTheDocument();
  });

  it('explains a missing demo wallet and retries loading', async () => {
    const routes = base();
    routes['GET /wallets/wallet-demo'] = { status: 404, body: { code: 'WALLET_NOT_FOUND', message: 'No se encontró la wallet.' } };
    stubApi(routes);
    render(<Transfer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('DB_SEED=true');
    expect(screen.getByRole('button', { name: /Transferir/ })).toBeDisabled();
    routes['GET /wallets/wallet-demo'] = { body: wallet };
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Disponible')).toBeInTheDocument();
  });

  it('shows other load failures: server message, history error and offline', async () => {
    const routes = base();
    routes['GET /wallets/wallet-demo'] = { status: 500, body: {} };
    stubApi(routes);
    const first = render(<Transfer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la solicitud.');
    first.unmount();

    routes['GET /wallets/wallet-demo'] = { body: wallet };
    routes['GET /payments?walletId=wallet-demo'] = { status: 500, body: { message: 'Historial no disponible.' } };
    const second = render(<Transfer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Historial no disponible.');
    expect(screen.queryByText('Aún no tienes transferencias.')).not.toBeInTheDocument();
    second.unmount();

    routes['GET /wallets/wallet-demo'] = new Error('offline');
    render(<Transfer />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
  });
});
