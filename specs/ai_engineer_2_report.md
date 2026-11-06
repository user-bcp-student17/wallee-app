La interfaz consume la API para consultar y avanzar el onboarding; los eventos y sus marcas de tiempo deben registrarse en el servidor. No implemento esa persistencia en el frontend ni modifico reglas del backend: la tarea 5.1 corresponde a AI Engineer 1 y queda pendiente de su implementación y verificación.

```tsx
// frontend-react/src/onboarding/types.ts — cubre W1-AC1 y el contrato de progreso usado en 6.1–6.3

export type OnboardingStepId = "datos" | "identidad" | "verificacion";

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  status: string;
}

export interface OnboardingProgress {
  onboardingId: string;
  walletId: string;
  status: string;
  currentStep: OnboardingStepId | null;
  steps: OnboardingStep[];
  wallet?: {
    id?: string;
    status: string;
  };
  walletStatus?: string;
}

export type StepPayload =
  | { nombre: string; celular: string }
  | { documento: string }
  | { codigo: string };

export const STEP_LABELS: Record<OnboardingStepId, string> = {
  datos: "Tus datos",
  identidad: "Identidad",
  verificacion: "Verificación",
};

export function isStepCompleted(status: string): boolean {
  return ["COMPLETADO", "COMPLETED", "DONE"].includes(status.toUpperCase());
}

export function isWalletActive(progress: OnboardingProgress): boolean {
  const status = progress.wallet?.status ?? progress.walletStatus ?? "";
  return status.toUpperCase() === "ACTIVA";
}
```

```ts
// frontend-react/src/onboarding/api.ts — cubre el consumo de API y los errores de validación de 6.2

import type {
  OnboardingProgress,
  OnboardingStepId,
  StepPayload,
} from "./types";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractError(
  body: unknown,
): { message: string; fieldErrors: Record<string, string> } {
  if (!body || typeof body !== "object") {
    return { message: "No se pudo completar la solicitud. Inténtalo de nuevo.", fieldErrors: {} };
  }

  const data = body as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(data.errors)) {
    for (const item of data.errors) {
      if (!item || typeof item !== "object") continue;
      const error = item as Record<string, unknown>;
      const field = String(error.field ?? error.property ?? "");
      const message = Array.isArray(error.constraints)
        ? String(error.constraints[0] ?? "")
        : String(error.message ?? "");
      if (field && message) fieldErrors[field] = message;
    }
  } else if (data.errors && typeof data.errors === "object") {
    for (const [field, value] of Object.entries(
      data.errors as Record<string, unknown>,
    )) {
      fieldErrors[field] = Array.isArray(value)
        ? String(value[0] ?? "")
        : String(value);
    }
  }

  const message = Array.isArray(data.message)
    ? data.message.map(String).join(" ")
    : typeof data.message === "string"
      ? data.message
      : "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo.";

  return { message, fieldErrors };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      "No fue posible conectar con el servicio. Inténtalo de nuevo.",
      0,
    );
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = extractError(body);
    throw new ApiError(error.message, response.status, error.fieldErrors);
  }

  return body as T;
}

export function startOnboarding(): Promise<OnboardingProgress> {
  return request<OnboardingProgress>("/onboarding", { method: "POST" });
}

export function getOnboarding(id: string): Promise<OnboardingProgress> {
  return request<OnboardingProgress>(`/onboarding/${encodeURIComponent(id)}`);
}

export function submitOnboardingStep(
  id: string,
  step: OnboardingStepId,
  payload: StepPayload,
): Promise<OnboardingProgress> {
  return request<OnboardingProgress>(
    `/onboarding/${encodeURIComponent(id)}/steps/${step}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
```

```tsx
// frontend-react/src/onboarding/useOnboarding.ts — cubre carga, error y envío secuencial para 6.1 y 6.2

import { useCallback, useState } from "react";
import {
  ApiError,
  getOnboarding,
  startOnboarding,
  submitOnboardingStep,
} from "./api";
import type {
  OnboardingProgress,
  OnboardingStepId,
  StepPayload,
} from "./types";

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const run = useCallback(
    async (operation: () => Promise<OnboardingProgress>) => {
      setLoading(true);
      setError("");
      setFieldErrors({});
      try {
        const result = await operation();
        setProgress(result);
        return result;
      } catch (cause) {
        if (cause instanceof ApiError) {
          setError(cause.message);
          setFieldErrors(cause.fieldErrors);
        } else {
          setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const start = useCallback(() => run(startOnboarding), [run]);

  const load = useCallback(
    (id: string) => run(() => getOnboarding(id)),
    [run],
  );

  const submitStep = useCallback(
    (step: OnboardingStepId, payload: StepPayload) => {
      if (!progress) return Promise.resolve(null);
      return run(() =>
        submitOnboardingStep(progress.onboardingId, step, payload),
      );
    },
    [progress, run],
  );

  return {
    progress,
    loading,
    error,
    fieldErrors,
    start,
    load,
    submitStep,
  };
}
```

```tsx
// frontend-react/src/onboarding/OnboardingWizard.tsx — cubre W1-AC1, W1-AC2, W1-AC3 y los criterios 6.1–6.3

import { FormEvent, useMemo, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import {
  isStepCompleted,
  isWalletActive,
  OnboardingStepId,
  STEP_LABELS,
} from "./types";

const FIELD_ALIASES: Record<string, string[]> = {
  nombre: ["nombre", "name"],
  celular: ["celular", "phone", "telefono"],
  documento: ["documento", "documentNumber", "document"],
  codigo: ["codigo", "code", "otp"],
};

export function OnboardingWizard() {
  const { progress, loading, error, fieldErrors, start, submitStep } =
    useOnboarding();
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [documento, setDocumento] = useState("");
  const [codigo, setCodigo] = useState("");

  const currentStep = useMemo(() => {
    if (!progress) return null;
    return (
      progress.currentStep ??
      progress.steps.find((step) => !isStepCompleted(step.status))?.id ??
      null
    );
  }, [progress]);

  function fieldError(field: string): string | undefined {
    return FIELD_ALIASES[field]
      .map((alias) => fieldErrors[alias])
      .find(Boolean);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentStep) return;

    if (currentStep === "datos") {
      await submitStep("datos", { nombre: nombre.trim(), celular: celular.trim() });
    } else if (currentStep === "identidad") {
      await submitStep("identidad", { documento: documento.trim() });
    } else {
      await submitStep("verificacion", { codigo: codigo.trim() });
    }
  }

  if (!progress) {
    return (
      <main className="onboarding">
        <h1>Activa tu wallet</h1>
        <p>Completa los pasos para dejar tu wallet lista.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="button" onClick={() => void start()} disabled={loading}>
          {loading ? "Iniciando…" : "Comenzar onboarding"}
        </button>
      </main>
    );
  }

  const active = isWalletActive(progress);

  return (
    <main className="onboarding">
      <h1>Activa tu wallet</h1>

      <ol className="step-list" aria-label="Pasos del onboarding">
        {progress.steps.map((step) => {
          const completed = isStepCompleted(step.status);
          const isCurrent = !active && step.id === currentStep;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className={completed ? "step completed" : isCurrent ? "step current" : "step"}
            >
              <span className="step-name">{step.label || STEP_LABELS[step.id]}</span>
              <span className="step-status">
                {completed ? "Completado" : isCurrent ? "Paso actual" : "Pendiente"}
              </span>
            </li>
          );
        })}
      </ol>

      {active ? (
        <section aria-labelledby="wallet-ready-title" className="wallet-ready">
          <h2 id="wallet-ready-title">Tu wallet está activa</h2>
          <p>Ya puedes acceder al punto de entrada de pagos de bajo monto.</p>
          <a className="button-link" href="/payments">Ir a pagos</a>
        </section>
      ) : (
        <section aria-labelledby="current-step-title">
          <h2 id="current-step-title">
            {currentStep ? STEP_LABELS[currentStep] : "Onboarding"}
          </h2>

          {error && <p className="error" role="alert">{error}</p>}

          {!currentStep ? (
            <p role="status">No hay un paso actual disponible. Actualiza el progreso.</p>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} noValidate>
              {currentStep === "datos" && (
                <>
                  <label htmlFor="nombre">Nombre</label>
                  <input
                    id="nombre"
                    name="nombre"
                    autoComplete="name"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    aria-invalid={Boolean(fieldError("nombre"))}
                    aria-describedby={fieldError("nombre") ? "nombre-error" : undefined}
                  />
                  {fieldError("nombre") && (
                    <p id="nombre-error" className="field-error" role="alert">{fieldError("nombre")}</p>
                  )}

                  <label htmlFor="celular">Celular</label>
                  <input
                    id="celular"
                    name="celular"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="9 dígitos, empezando por 9"
                    value={celular}
                    onChange={(event) => setCelular(event.target.value)}
                    aria-invalid={Boolean(fieldError("celular"))}
                    aria-describedby={fieldError("celular") ? "celular-error" : undefined}
                  />
                  {fieldError("celular") && (
                    <p id="celular-error" className="field-error" role="alert">{fieldError("celular")}</p>
                  )}
                </>
              )}

              {currentStep === "identidad" && (
                <>
                  <label htmlFor="documento">Número de documento</label>
                  <input
                    id="documento"
                    name="documento"
                    autoComplete="off"
                    value={documento}
                    onChange={(event) => setDocumento(event.target.value)}
                    aria-invalid={Boolean(fieldError("documento"))}
                    aria-describedby={fieldError("documento") ? "documento-error" : undefined}
                  />
                  {fieldError("documento") && (
                    <p id="documento-error" className="field-error" role="alert">{fieldError("documento")}</p>
                  )}
                  <p>La verificación de identidad es simulada; no se consulta a un proveedor externo.</p>
                </>
              )}

              {currentStep === "verificacion" && (
                <>
                  <label htmlFor="codigo">Código de verificación</label>
                  <input
                    id="codigo"
                    name="codigo"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value)}
                    aria-invalid={Boolean(fieldError("codigo"))}
                    aria-describedby={fieldError("codigo") ? "codigo-error" : undefined}
                  />
                  {fieldError("codigo") && (
                    <p id="codigo-error" className="field-error" role="alert">{fieldError("codigo")}</p>
                  )}
                  <p>Ingresa el código de prueba habilitado por el entorno de demo.</p>
                </>
              )}

              <button type="submit" disabled={loading}>
                {loading ? "Validando…" : "Continuar"}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
```

```tsx
// frontend-react/src/App.tsx — punto de entrada React para W1-AC1 y W1-AC2

import { OnboardingWizard } from "./onboarding/OnboardingWizard";
import "./onboarding/onboarding.css";

export default function App() {
  return <OnboardingWizard />;
}
```

```css
/* frontend-react/src/onboarding/onboarding.css — presentación accesible de los estados de W1-AC1 a W1-AC3 */

:root {
  font-family: system-ui, sans-serif;
  color: #172033;
  background: #f7f8fb;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.onboarding {
  width: min(100% - 2rem, 42rem);
  margin: 2rem auto;
  padding: 1.5rem;
  background: #fff;
  border: 1px solid #d9deea;
  border-radius: 0.75rem;
}

.step-list {
  display: grid;
  gap: 0.75rem;
  padding-left: 1.5rem;
}

.step {
  padding: 0.75rem;
  border: 1px solid #d9deea;
  border-radius: 0.5rem;
}

.step[aria-current="step"] {
  border: 2px solid #2457c5;
  background: #f1f5ff;
}

.step.completed {
  border-color: #27804a;
}

.step-name,
.step-status {
  display: block;
}

.step-status {
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

form {
  display: grid;
  gap: 0.6rem;
  margin-top: 1rem;
}

input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem;
  border: 1px solid #737d90;
  border-radius: 0.35rem;
  font: inherit;
}

input[aria-invalid="true"] {
  border: 2px solid #b42318;
}

button,
.button-link {
  display: inline-block;
  width: fit-content;
  min-height: 2.75rem;
  margin-top: 0.75rem;
  padding: 0.65rem 1rem;
  color: #fff;
  background: #2457c5;
  border: 0;
  border-radius: 0.4rem;
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.error,
.field-error {
  color: #b42318;
}

.wallet-ready {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #27804a;
  border-radius: 0.5rem;
}
```

```ts
// frontend-react/src/vite-env.d.ts — tipado de VITE_API_URL para el consumo de API

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```