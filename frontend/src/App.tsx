import { FormEvent, useState } from 'react';
import { requestOnboarding } from './api/onboarding';
import Landing from './landing/Landing';
import Transfer from './transfer/Transfer';
import type { FieldError, Progress, Step } from './api/onboarding';
const steps: { id: Step; label: string; title: string; description: string }[] = [
  { id: 'datos', label: 'Tus datos', title: 'Empecemos por ti', description: 'Cuéntanos cómo podemos identificarte.' },
  { id: 'identidad', label: 'Identidad', title: 'Tu identidad', description: 'Ingresa tu documento para continuar.' },
  { id: 'verificacion', label: 'Verificación', title: 'Un último paso', description: 'Confirma tu código de verificación.' },
];
const fields: Record<Step, { name: string; label: string; hint?: string; type?: string; maxLength?: number; autoComplete?: string }[]> = {
  datos: [
    { name: 'nombre', label: 'Nombre completo', autoComplete: 'name' },
    { name: 'celular', label: 'Número de celular', type: 'tel', maxLength: 9, autoComplete: 'tel', hint: '9 dígitos, comienza con 9.' },
  ],
  identidad: [{ name: 'documento', label: 'Número de documento', maxLength: 8, hint: 'Ingresa 8 dígitos.' }],
  verificacion: [{ name: 'codigo', label: 'Código de verificación', autoComplete: 'one-time-code', hint: 'Código de la demo; por defecto, 123456.' }],
};

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);

  async function send(path: string, method: 'POST' | 'PUT', body: Record<string, string>) {
    setBusy(true);
    setMessage('');
    setErrors([]);
    try {
      const result = await requestOnboarding(path, method, body);
      if (!result.progress) {
        setMessage(result.message ?? 'No se pudo completar la solicitud.');
        setErrors(result.errors ?? []);
        return;
      }
      setProgress(result.progress);
      setValues({});
    } catch {
      setMessage('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progress?.currentStep || busy) return;
    const step = progress.currentStep;
    const body = Object.fromEntries(fields[step].map(({ name }) => [name, values[name] ?? '']));
    void send(`/onboarding/${encodeURIComponent(progress.onboardingId)}/steps/${step}`, 'PUT', body);
  }

  if (showTransfer && progress) return <Transfer walletId={progress.walletId} />;
  if (window.location.pathname === '/transferir') return <Transfer />;

  if (!progress) return <Landing busy={busy} message={message} onStart={() => void send('/onboarding', 'POST', {})} />;

  const current = steps.find((step) => step.id === progress.currentStep);
  const complete = progress.status === 'COMPLETADO' && progress.walletStatus === 'ACTIVA';

  return (
    <div className="layout">
      <header className="topbar"><a className="brand" href="/" aria-label="Wallee, inicio"><span className="brand-mark">w</span> wallee<span className="brand-dot">.</span></a><span className="top-note">TU WALLET DIGITAL</span></header>
      <main className="main">
        <aside className="intro">
          <div className="eyebrow"><span /> UNA FORMA MÁS SIMPLE</div>
          <h1>Tu dinero,<br /><em>a tu manera.</em></h1>
          <p>Tu wallet comienza aquí. Crea tu cuenta en unos pasos y ten todo listo para lo que viene.</p>
          <div className="intro-bottom"><span className="intro-number">01 / 03</span><span>Un comienzo<br />a tu ritmo.</span></div>
        </aside>
        <section className="workspace" aria-label="Crear wallet">
          <div className="workspace-inner">
            <div className="section-label">CREA TU WALLET <span>WALLEE / 01</span></div>
            <nav aria-label="Progreso del onboarding">
              <ol className="steps">
                {steps.map((step, index) => {
                  const done = progress.steps.find((item) => item.id === step.id)?.status === 'COMPLETADO';
                  const active = progress.currentStep === step.id;
                  return <li key={step.id} className={done ? 'done' : active ? 'active' : ''} aria-current={active ? 'step' : undefined}><span className="step-number">{done ? '✓' : `0${index + 1}`}</span><span>{step.label}</span></li>;
                })}
              </ol>
            </nav>
            {message && <div className="form-error" role="alert">{message}</div>}
            {complete ? (
              <div className="content"><div className="success-mark" aria-hidden="true">✓</div><div className="small-label">TODO LISTO</div><h2>Tu wallet está activa.</h2><p>Completaste tu registro. Tu wallet está lista.</p><p className="wallet-id">ID DE WALLET<br /><strong>{progress.walletId}</strong></p><a className="primary" href="/transferir" onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/transferir'); setShowTransfer(true); }}>Hacer una transferencia <span aria-hidden="true">→</span></a></div>
            ) : current ? (
              <div className="content"><div className="small-label">PASO 0{steps.findIndex((step) => step.id === current.id) + 1} DE 03</div><h2>{current.title}</h2><p>{current.description}</p>
                <form onSubmit={submit} noValidate>
                  {fields[current.id].map((field) => {
                    const error = errors.find((item) => item.field === field.name);
                    return <div className="field" key={field.name}><label htmlFor={field.name}>{field.label}</label><input id={field.name} name={field.name} type={field.type ?? 'text'} autoComplete={field.autoComplete} maxLength={field.maxLength} value={values[field.name] ?? ''} aria-invalid={Boolean(error)} aria-describedby={[field.hint ? `${field.name}-hint` : '', error ? `${field.name}-error` : ''].filter(Boolean).join(' ') || undefined} onChange={(event) => { setValues({ ...values, [field.name]: event.target.value }); setErrors(errors.filter((item) => item.field !== field.name)); }} />{field.hint && <span className="hint" id={`${field.name}-hint`}>{field.hint}</span>}{error && <span className="field-error" id={`${field.name}-error`} role="alert">{error.message}</span>}</div>;
                  })}
                  {current.id !== 'datos' && <p className="mock-note">Verificación simulada. No se conecta a un proveedor de identidad.</p>}
                  <button className="primary" disabled={busy} type="submit">{busy ? 'Enviando...' : 'Continuar'} <span aria-hidden="true">→</span></button>{busy && <p role="status">Enviando...</p>}
                </form>
              </div>
            ) : <p role="alert">El progreso recibido no es válido.</p>}
            <div className="workspace-footer"><span>DEMO · DATOS TEMPORALES</span><span>HECHO PARA AVANZAR</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}