import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './health';

describe('health API', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads the backend health status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', service: 'wallee-backend' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchHealth()).resolves.toEqual({ status: 'ok', service: 'wallee-backend' });
    expect(fetchMock).toHaveBeenCalledWith('/api/health');
  });

  it('reports an unsuccessful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchHealth()).rejects.toThrow('El backend respondió 503');
  });
});