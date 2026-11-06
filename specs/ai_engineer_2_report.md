### `frontend-react/src/onboarding/onboarding.types.ts` — 6.1, 6.2 y 6.3: progreso, pasos y errores de API

```ts
// frontend-react/src/onboarding/onboarding.types.ts
// Cubre 6.1 (pasos), 6.2 (errores de validación) y 6.3 (estado de wallet).

export const ONBOARDING_STEPS = [
  { id: "datos", label: "Tus datos" },
  { id: "identidad", label: "Identidad" },
  { id: "verificacion", label: "Verificación" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["id"];
export type OnboardingStepStatus = "PENDIENTE" | "COMPLETADO";
export type OnboardingStatus = "EN_CURSO" | "COMPLETADO";
export type WalletStatus = "PENDIENTE_ONBOARDING" | "ACTIVA";

export interface OnboardingStep {
  id: OnboardingStepKey;
  status: OnboardingStepStatus;
}

export interface OnboardingProgress {
  onboardingId: string;
  walletId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepKey | null;
  steps: OnboardingStep[];
  walletStatus: WalletStatus;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  errors?: ApiFieldError[];
}
```

### `frontend-react/src/onboarding/onboarding-api.ts` — 6.1 y 6.2: consumo del contrato REST y normalización de errores

```ts
// frontend-react/src/onboarding/onboarding-api.ts
// Cubre 6.1 (inicio y envío de pasos) y 6.2 (lectura de errores de API).

import type {
  ApiErrorPayload,
  ApiFieldError,
  OnboardingProgress,
  OnboardingStepKey,
} from "./onboarding.types";

const configuredBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");

export class OnboardingApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: ApiFieldError[];

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "OnboardingApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new OnboardingApiError(
      "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.",
      0,
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = (payload ?? {}) as ApiErrorPayload;
    const fieldErrors = Array.isArray(body.errors)
      ? body.errors.filter(
          (item): item is ApiFieldError =>
            typeof item?.field === "string" && typeof item?.message === "string",
        )
      : [];

    const message = Array.isArray(body.message)
      ? body.message.join(" ")
      : typeof body.message === "string"
        ? body.message
        : "No se pudo completar la solicitud. Inténtalo de nuevo.";

    throw new OnboardingApiError(
      message,
      response.status,
      body.code,
      fieldErrors,
    );
  }

  return payload as T;
}

export const onboardingApi = {
  start(): Promise<OnboardingProgress> {
    return request<OnboardingProgress>("/onboarding", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  getProgress(onboardingId: string): Promise<OnboardingProgress> {
    return request<OnboardingProgress>(
      `/onboarding/${encodeURIComponent(onboardingId)}`,
    );
  },

  completeStep(
    onboardingId: string,
    step: OnboardingStepKey,
    payload: Record<string, string>,
  ): Promise<OnboardingProgress> {
    return request<OnboardingProgress>(
      `/onboarding/${encodeURIComponent(onboardingId)}/steps/${step}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },
};
```

### `frontend-react/src/onboarding/useOnboarding.ts` — 6.1 y 6.2: estado de carga, envío y errores

```ts
// frontend-react/src/onboarding/useOnboarding.ts
// Cubre 6.1 (progreso) y 6.2 (bloqueo ante error y errores por campo).

import { useState } from "react";
import {
  onboardingApi,
  OnboardingApiError,
} from "./onboarding-api";
import type {
  ApiFieldError,
  OnboardingProgress,
  OnboardingStepKey,
} from "./onboarding.types";

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([]);

  async function start() {
    setIsStarting(true);
    setFormError(null);
    setFieldErrors([]);

    try {
      const result = await onboardingApi.start();
      setProgress(result);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar el onboarding.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function submitCurrentStep(payload: Record<string, string>) {
    if (!progress?.currentStep || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors([]);

    try {
      const result = await onboardingApi.completeStep(
        progress.onboardingId,
        progress.currentStep as OnboardingStepKey,
        payload,
      );
      setProgress(result);
    } catch (error) {
      if (error instanceof OnboardingApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError("No se pudo enviar el paso. Inténtalo de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => current.filter((error) => error.field !== field));
  }

  return {
    progress,
    isStarting,
    isSubmitting,
    formError,
    fieldErrors,
    start,
    submitCurrentStep,
    clearFieldError,
  };
}
```

### `frontend-react/src/onboarding/OnboardingWizard.tsx` — 6.1, 6.2 y 6.3: asistente accesible

```tsx
// frontend-react/src/onboarding/OnboardingWizard.tsx
// Cubre 6.1 (indicador y formularios), 6.2 (errores y bloqueo) y 6.3 (entrada solo con wallet ACTIVA).

import { FormEvent, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import {
  ONBOARDING_STEPS,
  OnboardingStepKey,
} from "./onboarding.types";
import "./onboarding.css";

type FormValues = Record<string, string>;
type LocalErrors = Record<string, string>;

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  celular: "Celular",
  documento: "Documento",
  codigo: "Código de verificación",
};

function validateStep(
  step: OnboardingStepKey,
  values: FormValues,
): LocalErrors {
  const errors: LocalErrors = {};

  if (step === "datos") {
    if (!values.nombre?.trim()) {
      errors.nombre = "Ingresa tu nombre.";
    }

    if (!values.celular?.trim()) {
      errors.celular = "Ingresa tu celular.";
    } else if (!/^9\d{8}$/.test(values.celular)) {
      errors.celular = "Debe tener 9 dígitos y empezar con 9.";
    }
  }

  if (step === "identidad") {
    if (!values.documento?.trim()) {
      errors.documento = "Ingresa tu documento.";
    } else if (!/^\d{8}$/.test(values.documento)) {
      errors.documento = "El documento debe tener 8 dígitos.";
    }
  }

  if (step === "verificacion" && !values.codigo?.trim()) {
    errors.codigo = "Ingresa el código de verificación.";
  }

  return errors;
}

function PaymentEntry() {
  return (
    <section className="payment-entry" aria-labelledby="payment-entry-title">
      <h2 id="payment-entry-title">Punto de entrada de pagos</h2>
      <p>Tu wallet está activa y habilita el acceso al flujo de pagos.</p>
      <a href="/payments">Ir al punto de pagos</a>
      <p className="helper-text">
        Esta entrada no ejecuta pagos; las operaciones de pago pertenecen a
        otro flujo.
      </p>
    </section>
  );
}

export function OnboardingWizard() {
  const {
    progress,
    isStarting,
    isSubmitting,
    formError,
    fieldErrors,
    start,
    submitCurrentStep,
    clearFieldError,
  } = useOnboarding();

  const [values, setValues] = useState<FormValues>({});
  const [localErrors, setLocalErrors] = useState<LocalErrors>({});

  function updateField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setLocalErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    clearFieldError(field);
  }

  function serverErrorFor(field: string) {
    return fieldErrors.find((error) => error.field === field)?.message;
  }

  function renderField(
    field: string,
    label: string,
    options: {
      type?: string;
      inputMode?: "text" | "numeric" | "tel";
      autoComplete?: string;
      maxLength?: number;
      hint?: string;
    } = {},
  ) {
    const error = localErrors[field] ?? serverErrorFor(field);
    const errorId = `${field}-error`;
    const hintId = `${field}-hint`;

    return (
      <div className="form-field" key={field}>
        <label htmlFor={field}>{label}</label>
        <input
          id={field}
          name={field}
          type={options.type ?? "text"}
          inputMode={options.inputMode}
          autoComplete={options.autoComplete}
          maxLength={options.maxLength}
          value={values[field] ?? ""}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [options.hint ? hintId : null, error ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) => updateField(field, event.target.value)}
        />
        {options.hint && (
          <span className="helper-text" id={hintId}>
            {options.hint}
          </span>
        )}
        {error && (
          <span className="field-error" id={errorId} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const step = progress?.currentStep;
    if (!step || isSubmitting) return;

    const errors = validateStep(step, values);
    setLocalErrors(errors);

    if (Object.keys(errors).length > 0) return;

    const fieldsByStep: Record<OnboardingStepKey, string[]> = {
      datos: ["nombre", "celular"],
      identidad: ["documento"],
      verificacion: ["codigo"],
    };

    const payload = Object.fromEntries(
      fieldsByStep[step].map((field) => [field, values[field] ?? ""]),
    );

    void submitCurrentStep(payload);
  }

  if (!progress) {
    return (
      <main className="onboarding-shell">
        <h1>Crear tu wallet</h1>
        <p>Completa los pasos para activar tu wallet.</p>

        {formError && (
          <div className="form-error" role="alert">
            {formError}
          </div>
        )}

        <button type="button" onClick={() => void start()} disabled={isStarting}>
          {isStarting ? "Iniciando…" : "Comenzar"}
        </button>

        {isStarting && (
          <p role="status" aria-live="polite">
            Iniciando el onboarding…
          </p>
        )}
      </main>
    );
  }

  const currentStep = progress.currentStep;
  const isComplete =
    progress.status === "COMPLETADO" && progress.currentStep === null;

  return (
    <main className="onboarding-shell">
      <h1>Crear tu wallet</h1>

      <nav aria-label="Progreso del onboarding">
        <ol className="step-indicator">
          {ONBOARDING_STEPS.map((item, index) => {
            const stepStatus = progress.steps.find(
              (step) => step.id === item.id,
            )?.status;
            const isCurrent = currentStep === item.id;
            const isCompleted = stepStatus === "COMPLETADO";

            return (
              <li
                key={item.id}
                className={[
                  "step-indicator__item",
                  isCurrent ? "is-current" : "",
                  isCompleted ? "is-completed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="step-indicator__number" aria-hidden="true">
                  {isCompleted ? "✓" : index + 1}
                </span>
                <span>{item.label}</span>
                <span className="sr-only">
                  {isCompleted
                    ? "Completado"
                    : isCurrent
                      ? "Paso actual"
                      : "Pendiente"}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {formError && (
        <div className="form-error" role="alert" aria-live="assertive">
          {formError}
        </div>
      )}

      {isComplete ? (
        <section aria-labelledby="completion-title">
          <h2 id="completion-title">Onboarding completado</h2>
          <p>Tu wallet está activa.</p>
        </section>
      ) : (
        <section aria-labelledby="current-step-title">
          <h2 id="current-step-title">
            {ONBOARDING_STEPS.find((step) => step.id === currentStep)?.label}
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {currentStep === "datos" && (
              <>
                {renderField("nombre", FIELD_LABELS.nombre, {
                  autoComplete: "name",
                })}
                {renderField("celular", FIELD_LABELS.celular, {
                  type: "tel",
                  inputMode: "tel",
                  autoComplete: "tel",
                  maxLength: 9,
                  hint: "Usa 9 dígitos y comienza con 9.",
                })}
              </>
            )}

            {currentStep === "identidad" && (
              <>
                {renderField("documento", FIELD_LABELS.documento, {
                  inputMode: "numeric",
                  autoComplete: "off",
                  maxLength: 8,
                  hint: "Ingresa 8 dígitos.",
                })}
                <p className="helper-text">
                  La verificación de identidad de este flujo es simulada
                  (MOCK); no se conecta a un proveedor real.
                </p>
              </>
            )}

            {currentStep === "verificacion" && (
              <>
                {renderField("codigo", FIELD_LABELS.codigo, {
                  inputMode: "numeric",
                  autoComplete: "one-time-code",
                  hint: "Verificación simulada (MOCK).",
                })}
                <p className="helper-text">
                  Esta verificación no envía ni valida códigos mediante un
                  proveedor externo.
                </p>
              </>
            )}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Continuar"}
            </button>
            {isSubmitting && (
              <p role="status" aria-live="polite">
                Enviando el paso…
              </p>
            )}
          </form>
        </section>
      )}

      {progress.walletStatus === "ACTIVA" && <PaymentEntry />}
    </main>
  );
}

export default OnboardingWizard;
```

### `frontend-react/src/App.tsx` — 6.1: punto de entrada React

```tsx
// frontend-react/src/App.tsx
// Cubre 6.1: monta el asistente de onboarding como vista principal de la aplicación.

import { OnboardingWizard } from "./onboarding/OnboardingWizard";

export default function App() {
  return <OnboardingWizard />;
}
```

### `frontend-react/src/onboarding/onboarding.css` — 6.1 y 6.2: estados visibles y presentación accesible

```css
/* frontend-react/src/onboarding/onboarding.css */
/* Cubre 6.1 (indicador y formularios) y 6.2 (errores visibles junto al campo). */

.onboarding-shell {
  width: min(100% - 2rem, 42rem);
  margin: 2rem auto;
  color: #172033;
  font-family: system-ui, sans-serif;
}

.onboarding-shell button,
.onboarding-shell input {
  font: inherit;
}

.onboarding-shell button {
  min-height: 2.75rem;
  padding: 0.6rem 1rem;
  border: 0;
  border-radius: 0.4rem;
  color: #fff;
  background: #174ea6;
  cursor: pointer;
}

.onboarding-shell button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.onboarding-shell a {
  color: #174ea6;
}

.onboarding-shell :focus-visible {
  outline: 3px solid #f0a000;
  outline-offset: 3px;
}

.step-indicator {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}

.step-indicator__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0.5rem;
  border-bottom: 3px solid #c9ced8;
  color: #4a5363;
}

.step-indicator__item.is-current {
  border-color: #174ea6;
  color: #102f63;
  font-weight: 700;
}

.step-indicator__item.is-completed {
  border-color: #16834a;
  color: #145c38;
}

.step-indicator__number {
  display: inline-grid;
  width: 1.6rem;
  height: 1.6rem;
  flex: 0 0 1.6rem;
  place-items: center;
  border: 1px solid currentColor;
  border-radius: 50%;
}

.form-field {
  display: grid;
  gap: 0.35rem;
  margin: 1rem 0;
}

.form-field input {
  box-sizing: border-box;
  width: 100%;
  min-height: 2.75rem;
  padding: 0.5rem;
  border: 1px solid #70798a;
  border-radius: 0.3rem;
}

.form-field input[aria-invalid="true"] {
  border: 2px solid #b42318;
}

.field-error,
.form-error {
  color: #b42318;
}

.form-error {
  margin: 1rem 0;
  padding: 0.75rem;
  border-left: 4px solid currentColor;
  background: #fff4f2;
}

.helper-text {
  display: block;
  margin-top: 0.35rem;
  color: #4a5363;
  font-size: 0.9rem;
}

.payment-entry {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #16834a;
  border-radius: 0.5rem;
  background: #f3fbf6;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 34rem) {
  .step-indicator {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}
```