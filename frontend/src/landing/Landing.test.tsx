import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

describe('Landing de Wallee', () => {
  it('presents the value proposition, the three steps and the benefits', () => {
    render(<Landing busy={false} message="" onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Tu dinero,\s*a tu manera\./);
    expect(screen.getByRole('heading', { name: 'Tres pasos y listo.' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole('link', { name: 'Ver cómo funciona' })).toHaveAttribute('href', '#como-funciona');
    expect(screen.getByText(/verificación de identidad es simulada/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('starts the onboarding from the main call to action', async () => {
    const onStart = vi.fn();
    render(<Landing busy={false} message="" onStart={onStart} />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear mi wallet' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('disables the action and announces progress while busy', () => {
    render(<Landing busy message="" onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Iniciando/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Iniciando...');
  });

  it('shows an error message accessibly', () => {
    render(<Landing busy={false} message="No se pudo conectar con el servicio." onStart={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar');
  });
});
