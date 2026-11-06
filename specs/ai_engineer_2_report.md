La tarea **5.1** está asignada a AI Engineer 1; los siguientes archivos proponen el registro e integración de eventos en el servicio proporcionado, sin marcar tareas como completadas. Los archivos frontend cubren las entregas **6.1, 6.2 y 6.3**. Los eventos y sus marcas de tiempo se generan exclusivamente en el servidor.

```ts
// backend-nestjs/src/onboarding/domain/onboarding-event.model.ts
// Criterio: 5.1 — tipos de eventos y marca de tiempo generada por el servidor.

import { OnboardingStepKey } from "./onboarding.model";

export type OnboardingEventType =
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed";

export interface OnboardingEvent {
  id: string;
  onboardingId: string;
  type: OnboardingEventType;
  step?: OnboardingStepKey;
  occurredAt: string;
}
```

```ts
// backend-nestjs/src/onboarding/application/onboarding.service.ts
// Criterios: 5.1 — registra eventos en orden; mantiene las transiciones existentes del onboarding.

import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  isOnboardingStepKey,
  ONBOARDING_STEP_KEYS,
  OnboardingProgress,
  OnboardingRecord,
  OnboardingStepKey,
} from "../domain/onboarding.model";
import { OnboardingEvent } from "../domain/onboarding-event.model";

@Injectable()
export class OnboardingService {
  // Persistencia en memoria, igual que los registros de onboarding existentes.
  private readonly onboardings = new Map<string, OnboardingRecord>();
  private readonly events = new Map<string, OnboardingEvent[]>();

  start(): OnboardingProgress {
    const onboardingId = `onb_${randomUUID()}`;
    const walletId = `wal_${randomUUID()}`;

    const record: OnboardingRecord = {
      id: onboardingId,
      walletId,
      status: "EN_CURSO",
      currentStep: ONBOARDING_STEP_KEYS[0],
      steps: ONBOARDING_STEP_KEYS.map((id) => ({
        id,
        status: "PENDIENTE",
      })),
      walletStatus: "PENDIENTE_ONBOARDING",
      data: {},
    };

    this.onboardings.set(record.id, record);
    this.events.set(record.id, []);
    this.recordEvent(record.id, "onboarding_started");

    return this.toProgress(record);
  }

  getProgress(id: string): OnboardingProgress {
    const record = this.onboardings.get(id);
    if (!record) {
      throw this.notFound();
    }

    return this.toProgress(record);
  }

  /**
   * Devuelve una copia de los eventos del intento para pruebas y consumidores
   * internos. No acepta marcas de tiempo proporcionadas por el cliente.
   */
  getEvents(id: string): OnboardingEvent[] {
    if (!this.onboardings.has(id)) {
      throw this.notFound();
    }

    return (this.events.get(id) ?? []).map((event) => ({ ...event }));
  }

  completeStep(
    id: string,
    stepKey: string,
    payload: Record<string, string>,
  ): OnboardingProgress {
    const record = this.onboardings.get(id);
    if (!record) {
      throw this.notFound();
    }

    if (!isOnboardingStepKey(stepKey) || record.currentStep !== stepKey) {
      throw new ConflictException({
        statusCode: 409,
        code: "STEP_OUT_OF_ORDER",
        message: "Completa primero el paso actual del onboarding.",
      });
    }

    const step = record.steps.find((item) => item.id === stepKey);
    if (!step || step.status === "COMPLETADO") {
      throw new ConflictException({
        statusCode: 409,
        code: "STEP_OUT_OF_ORDER",
        message: "El paso solicitado no está disponible.",
      });
    }

    record.data[stepKey] = payload;
    step.status = "COMPLETADO";

    const currentIndex = ONBOARDING_STEP_KEYS.indexOf(
      stepKey as OnboardingStepKey,
    );
    const nextStep = ONBOARDING_STEP_KEYS[currentIndex + 1] ?? null;

    if (nextStep) {
      record.currentStep = nextStep;
    } else {
      record.currentStep = null;
      record.status = "COMPLETADO";
      record.walletStatus = "ACTIVA";
    }

    this.recordEvent(record.id, "onboarding_step_completed", stepKey);

    if (record.status === "COMPLETADO") {
      this.recordEvent(record.id, "onboarding_completed");
    }

    return this.toProgress(record);
  }

  private recordEvent(
    onboardingId: string,
    type: OnboardingEvent["type"],
    step?: OnboardingStepKey,
  ): void {
    const onboardingEvents = this.events.get(onboardingId);
    if (!onboardingEvents) {
      return;
    }

    onboardingEvents.push({
      id: `evt_${randomUUID()}`,
      onboardingId,
      type,
      ...(step ? { step } : {}),
      occurredAt: new Date().toISOString(),
    });
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      code: "ONBOARDING_NOT_FOUND",
      message: "No se encontró el onboarding solicitado.",
    });
  }

  private toProgress(record: OnboardingRecord): OnboardingProgress {
    return {
      onboardingId: record.id,
      walletId: record.walletId,
      status: record.status,
      currentStep: record.currentStep,
      steps: record.steps.map((step) => ({ ...step })),
      walletStatus: record.walletStatus,
    };
  }
}
```

```ts
// backend-nestjs/src/onboarding/application/onboarding.service.spec.ts
// Criterio: 5.1 — prueba el orden de eventos y que sus timestamps los genera el servidor.

import { OnboardingService } from "./onboarding.service";

describe("OnboardingService — eventos (5.1)", () => {
  let service: OnboardingService;

  beforeEach(() => {
    service = new OnboardingService();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registra inicio, cada paso y cierre en el orden esperado", () => {
    const progress = service.start();

    jest.advanceTimersByTime(1_000);
    service.completeStep(progress.onboardingId, "datos", {
      nombre: "Usuario de prueba",
      celular: "900000000",
    });

    jest.advanceTimersByTime(1_000);
    service.completeStep(progress.onboardingId, "identidad", {
      documento: "00000000",
    });

    jest.advanceTimersByTime(1_000);
    const completed = service.completeStep(
      progress.onboardingId,
      "verificacion",
      { codigo: "000000" },
    );

    const events = service.getEvents(progress.onboardingId);

    expect(events.map(({ type, step }) => ({ type, step }))).toEqual([
      { type: "onboarding_started", step: undefined },
      { type: "onboarding_step_completed", step: "datos" },
      { type: "onboarding_step_completed", step: "identidad" },
      { type: "onboarding_step_completed", step: "verificacion" },
      { type: "onboarding_completed", step: undefined },
    ]);

    expect(events.map((event) => event.occurredAt)).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:01.000Z",
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:03.000Z",
      "2026-01-01T00:00:03.000Z",
    ]);

    expect(completed.status).toBe("COMPLETADO");
    expect(completed.walletStatus).toBe("ACTIVA");
  });

  it("no registra el evento de un paso rechazado por orden", () => {
    const progress = service.start();

    expect(() =>
      service.completeStep(progress.onboardingId, "identidad", {
        documento: "00000000",
      }),
    ).toThrow();

    expect(service.getEvents(progress.onboardingId)).toHaveLength(1);
  });
});
```

```ts
// frontend-react/src/onboarding/types.ts
// Criterios: 6.1 y 6.3 — tipos para el progreso consumido desde la API.

export const ONBOARDING_STEPS = [
  { id: "datos", label: "Datos personales" },
  { id: "identidad", label: "Identidad" },
  { id: "verificacion", label: "Verificación" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["id"];
export type OnboardingStatus = "EN_CURSO" | "COMPLETADO";
export type WalletStatus = "PENDIENTE_ONBOARDING" | "ACTIVA";

export interface OnboardingProgress {
  onboardingId: string;
  walletId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStepKey | null;
  steps: Array<{
    id: OnboardingStepKey;
    status: "PENDIENTE" | "COMPLETADO";
  }>;
  walletStatus: WalletStatus;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
  errors?: ApiFieldError[];
}
```

```ts
// frontend-react/src/onboarding/onboardingApi.ts
// Criterios: 6.1 y 6.2 — consumo de API, errores HTTP y URL configurable.

import type {
  ApiErrorBody,
  OnboardingProgress,
  OnboardingStepKey,
} from "./types";

const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000";

export class OnboardingApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: ApiErrorBody["errors"];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || "No se pudo completar la solicitud.");
    this.name = "OnboardingApiError";
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new OnboardingApiError(0, {
      message: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
    });
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new OnboardingApiError(
      response.status,
      body && typeof body === "object" ? (body as ApiErrorBody) : {},
    );
  }

  return body as T;
}

export function startOnboarding(): Promise<OnboardingProgress> {
  return request<OnboardingProgress>("/onboarding", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getOnboarding(
  onboardingId: string,
): Promise<OnboardingProgress> {
  return request<OnboardingProgress>(
    `/onboarding/${encodeURIComponent(onboardingId)}`,
  );
}

export function submitOnboardingStep(
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
}
```

```tsx
// frontend-react/src/onboarding/OnboardingApp.tsx
// Criterios: 6.1 — indicador y formularios; 6.2 — errores y paso conservado; 6.3 — acceso solo con wallet ACTIVA.

import { FormEvent, useState } from "react";
import {
  OnboardingApiError,
  startOnboarding,
  submitOnboardingStep,
} from "./onboardingApi";
import {
  ONBOARDING_STEPS,
  OnboardingProgress,
  OnboardingStepKey,
} from "./types";

type FieldName = "nombre" | "celular" | "documento" | "codigo";

const FIELD_BY_STEP: Record<OnboardingStepKey, FieldName[]> = {
  datos: ["nombre", "celular"],
  identidad: ["documento"],
  verificacion: ["codigo"],
};

const FIELD_LABELS: Record<FieldName, string> = {
  nombre: "Nombre",
  celular: "Celular",
  documento: "Documento",
  codigo: "Código de verificación",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof OnboardingApiError) {
    return error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export default function OnboardingApp() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [values, setValues] = useState<Partial<Record<FieldName, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeStep = progress?.currentStep ?? null;
  const fields = activeStep ? FIELD_BY_STEP[activeStep] : [];

  async function handleStart() {
    setLoading(true);
    setRequestError("");
    setFieldErrors({});

    try {
      const result = await startOnboarding();
      setProgress(result);
      setValues({});
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progress || !activeStep || loading) return;

    setLoading(true);
    setRequestError("");
    setFieldErrors({});

    try {
      const payload = Object.fromEntries(
        fields.map((field) => [field, values[field] ?? ""]),
      );
      const result = await submitOnboardingStep(
        progress.onboardingId,
        activeStep,
        payload,
      );
      setProgress(result);
      setValues({});
    } catch (error) {
      if (error instanceof OnboardingApiError) {
        const nextFieldErrors: Partial<Record<FieldName, string>> = {};

        for (const item of error.fieldErrors ?? []) {
          if (item.field in FIELD_LABELS) {
            nextFieldErrors[item.field as FieldName] = item.message;
          }
        }

        setFieldErrors(nextFieldErrors);
      }
      setRequestError(getErrorMessage(error));
      // El progreso no se altera ante un error: se conserva el paso actual.
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <main className="onboarding">
      <h1>Crear tu wallet</h1>
      <p>Completa los pasos para finalizar el onboarding.</p>

      {!progress ? (
        <section aria-labelledby="start-heading">
          <h2 id="start-heading">Comienza tu onboarding</h2>
          {requestError && (
            <p className="error-message" role="alert">
              {requestError}
            </p>
          )}
          <button type="button" onClick={handleStart} disabled={loading}>
            {loading ? "Iniciando…" : "Iniciar onboarding"}
          </button>
        </section>
      ) : (
        <>
          <nav aria-label="Pasos del onboarding">
            <ol className="step-list">
              {ONBOARDING_STEPS.map((item) => {
                const state = progress.steps.find(
                  (step) => step.id === item.id,
                )?.status;
                const isCurrent = progress.currentStep === item.id;

                return (
                  <li
                    key={item.id}
                    className={isCurrent ? "step-current" : undefined}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span>{item.label}</span>
                    <span className="step-status">
                      {state === "COMPLETADO"
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

          {requestError && (
            <p className="error-message" role="alert">
              {requestError}
            </p>
          )}

          {activeStep ? (
            <form onSubmit={handleSubmit} noValidate>
              <h2>
                {ONBOARDING_STEPS.find((step) => step.id === activeStep)?.label}
              </h2>

              {fields.map((field) => {
                const errorId = `${field}-error`;
                const inputType =
                  field === "codigo" || field === "celular" ? "text" : "text";

                return (
                  <div className="form-field" key={field}>
                    <label htmlFor={field}>{FIELD_LABELS[field]}</label>
                    <input
                      id={field}
                      name={field}
                      type={inputType}
                      value={values[field] ?? ""}
                      onChange={(event) =>
                        updateField(field, event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors[field])}
                      aria-describedby={
                        fieldErrors[field] ? errorId : undefined
                      }
                      autoComplete="off"
                    />
                    {fieldErrors[field] && (
                      <p id={errorId} className="field-error">
                        {fieldErrors[field]}
                      </p>
                    )}
                  </div>
                );
              })}

              <button type="submit" disabled={loading}>
                {loading ? "Guardando…" : "Continuar"}
              </button>
            </form>
          ) : (
            <section aria-live="polite">
              <h2>Onboarding completado</h2>
              {progress.walletStatus === "ACTIVA" && (
                <p>Tu wallet está activa. Ya puedes acceder a pagos.</p>
              )}
              {progress.walletStatus === "ACTIVA" && (
                <a href="/pagos">Ir a pagos</a>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
```

```tsx
// frontend-react/src/App.tsx
// Criterios: 6.1, 6.2 y 6.3 — punto de entrada React del flujo de onboarding.

import OnboardingApp from "./onboarding/OnboardingApp";
import "./onboarding/onboarding.css";

export default function App() {
  return <OnboardingApp />;
}
```

```css
/* frontend-react/src/onboarding/onboarding.css
 * Criterios: 6.1 y 6.2 — estados visuales legibles para pasos y errores.
 */

.onboarding {
  width: min(100% - 2rem, 42rem);
  margin: 2rem auto;
  color: #17212b;
  font-family: system-ui, sans-serif;
}

.step-list {
  display: grid;
  gap: 0.75rem;
  padding-left: 1.5rem;
}

.step-list li {
  padding: 0.75rem;
  border: 1px solid #aeb8c2;
  border-radius: 0.4rem;
}

.step-list li.step-current {
  border: 2px solid #1457a6;
  background: #f0f6ff;
}

.step-status {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

.form-field {
  display: grid;
  gap: 0.35rem;
  margin: 1rem 0;
}

input,
button {
  min-height: 2.75rem;
  font: inherit;
}

input {
  padding: 0.4rem 0.6rem;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
}

.error-message,
.field-error {
  color: #9e1b1b;
}

.error-message {
  padding: 0.75rem;
  border-left: 4px solid #9e1b1b;
  background: #fff3f3;
}
```