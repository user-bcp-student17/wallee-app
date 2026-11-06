import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const stepNames = ['datos', 'identidad', 'verificacion'];
function progress(index: number) {
  return {
    onboardingId: 'onb_1', walletId: 'wal_1', status: index === 3 ? 'COMPLETADO' : 'EN_CURSO',
    currentStep: stepNames[index] ?? null, walletStatus: index === 3 ? 'ACTIVA' : 'PENDIENTE_ONBOARDING',
    steps: stepNames.map((id, stepIndex) => ({ id, status: stepIndex < index ? 'COMPLETADO' : 'PENDIENTE' })),
  };
}
function response(data: unknown, ok = true) {
  return { ok, json: async () => data };
}

describe('W1 AC1-AC3: asistente de onboarding', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('completes the three steps and displays the active wallet', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(progress(0))).mockResolvedValueOnce(response(progress(1))).mockResolvedValueOnce(response(progress(2))).mockResolvedValueOnce(response(progress(3)));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    await user.type(await screen.findByLabelText('Nombre completo'), 'Ana');
    await user.type(screen.getByLabelText('Número de celular'), '912345678');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(await screen.findByLabelText('Número de documento'), '12345678');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await user.type(await screen.findByLabelText('Código de verificación'), '123456');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Tu wallet está activa.')).toBeInTheDocument();
    expect(screen.getByText('wal_1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hacer una transferencia/ })).toHaveAttribute('href', '/transferir');
    fetchMock.mockResolvedValueOnce(response({ id: 'wal_1', status: 'ACTIVE', balance: 100000, reserved: 0, available: 100000, currency: 'PEN' })).mockResolvedValueOnce(response([]));
    try {
      await user.click(screen.getByRole('link', { name: /Hacer una transferencia/ }));
      expect(await screen.findByRole('heading', { name: 'Transferir' })).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/api/wallets/wal_1', undefined);
      expect(fetchMock).toHaveBeenCalledWith('/api/payments?walletId=wal_1', undefined);
    } finally {
      window.history.pushState({}, '', '/');
    }
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/onboarding/onb_1/steps/datos', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ nombre: 'Ana', celular: '912345678' }) }));
  });

  it('shows field errors from the server and clears them when edited', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(progress(0))).mockResolvedValueOnce(response({ message: 'Corrige los campos indicados.', errors: [{ field: 'nombre', message: 'Ingresa tu nombre.' }] }, false)));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Ingresa tu nombre.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana');
    expect(screen.queryByText('Ingresa tu nombre.')).not.toBeInTheDocument();
  });

  it('offers an error when the service cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar');
    expect(screen.getByRole('button', { name: 'Crear mi wallet' })).toBeEnabled();
  });

  it('shows a fallback error for an unexpected API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, false)));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar');
  });

  it('shows the transfer screen on /transferir', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    window.history.pushState({}, '', '/transferir');
    try {
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'Transferir' })).toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('does not claim activation for invalid progress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...progress(3), walletStatus: 'PENDIENTE_ONBOARDING' })));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('progreso recibido no es válido');
  });
});