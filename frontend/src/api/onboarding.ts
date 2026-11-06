export type Step = 'datos' | 'identidad' | 'verificacion';
export type Progress = {
  onboardingId: string;
  walletId: string;
  status: 'EN_CURSO' | 'COMPLETADO';
  currentStep: Step | null;
  steps: { id: Step; status: 'PENDIENTE' | 'COMPLETADO' }[];
  walletStatus: 'PENDIENTE_ONBOARDING' | 'ACTIVA';
};
export type FieldError = { field: string; message: string };

export async function requestOnboarding(path: string, method: 'POST' | 'PUT', body: Record<string, string>) {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) {
    return {
      message: typeof payload.message === 'string' ? payload.message : 'No se pudo completar la solicitud.',
      errors: (Array.isArray(payload.errors) ? payload.errors : []) as FieldError[],
    };
  }
  return { progress: payload as Progress };
}