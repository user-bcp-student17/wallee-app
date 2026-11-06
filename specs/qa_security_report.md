# Informe final de QA & Security: Sprint 1, W1 y W2 (posterior a la ejecución)

**Fecha:** 2026-11-06. **Rama de QA:** `qa-security` (según el mapa; la app en disco ya está en esa rama).
**Comando configurado:** `python tools/wallee.py test`. **Código de salida:** 1. **Duración:** 9,5 s. **Error de ejecución:** ninguno.

No se generan ni modifican archivos de prueba en esta tarea. No se afirma que commit, push o PR hayan ocurrido: esa publicación es un paso separado.

---

## 1. Resumen ejecutivo

- La suite **falló** (estado FALLÓ, código 1).
- La salida real aportada está **truncada** (se muestra solo el final). Solo muestra dos archivos de prueba:
  - `test/app.e2e-spec.ts`: aparece como superado (el resumen indica 1 suite superada). La salida truncada no muestra su nombre completo.
  - `test/onboarding.e2e-spec.ts`: **FAIL**.
- Resumen del ejecutor: **Test Suites: 1 failed, 1 passed, 2 total. Tests: 14 failed, 2 todo, 2 passed, 18 total.**
- Causa común de los 14 fallos visibles: `POST /onboarding` respondió **404** donde se esperaba **201** (helper `crearOnboarding`, `onboarding.e2e-spec.ts:38`). Es consistente con que el módulo de onboarding no está expuesto en la app. En disco solo existe el módulo `health`, y esto confirma el riesgo del borrador. Es una observación a verificar por el dueño del código, no un diagnóstico confirmado.
- **Hallazgo importante sobre la ejecución:** los tests que corrieron pertenecen a `test/onboarding.e2e-spec.ts`, un archivo que ya existía en la app (con casos nombrados `W1-AC1-T2 [EP] inicio lista los pasos propuestos...`). **Los archivos `onboarding-qa.e2e-spec.ts` y `payments-qa.e2e-spec.ts` del borrador de QA no aparecen en la salida**. Puede deberse a la truncación o a que no se copiaron o no se ejecutaron. No hay evidencia de que se hayan ejecutado, así que sus casos **permanecen NO EJECUTADO**.
- Ningún AC de W1 o W2 puede declararse verificado. Los AC de W1 observados quedan **EJECUTADO-FALLÓ** (por el 404 anterior). W2 queda **NO EJECUTADO**.

---

## 2. Inventario de alcance (sin cambios respecto al borrador)

| HU | Estado | Fuente |
|---|---|---|
| W1 (AC1–AC4, verificación simulada) | PARCIAL | spec + discovery |
| W2 (AC1–AC4, AC6 PARCIAL) | PARCIAL | spec + discovery |
| W3, W4, W5, W6 | FUERA DEL ALCANCE DEL SPRINT | — |
| W1-AC5, W1-AC6, W2-AC5 (KPI) | No se prueban (RN-17) | — |

Las discrepancias spec/discovery y las decisiones pendientes del borrador siguen vigentes (sección 7).

---

## 3. Resultados verificables por caso (solo lo que demuestra la salida)

Los nombres provienen de la salida real, del archivo `test/onboarding.e2e-spec.ts`. Todos los fallos tienen la misma causa visible: `Expected: 201 / Received: 404` en `crearOnboarding` (línea 38).

| Caso (nombre en la salida) | AC / tarea | Resultado real |
|---|---|---|
| W1-AC1-T2 [EP] inicio lista los pasos propuestos y marca datos como actual | W1-AC1, 3.1 | **EJECUTADO-FALLÓ** (404 en lugar de 201) |
| W1-AC1-T2 [ST] completar datos actualiza el paso actual | W1-AC1 | **EJECUTADO-FALLÓ** (404) |
| W1-AC1-T3 [ST] paso fuera de orden devuelve 409 y no cambia el progreso | 3.3 | **EJECUTADO-FALLÓ** (falló en la creación del onboarding, no llegó a verificar el 409) |
| W1-AC2-T2 [EP/BVA] nombre vacío bloquea el avance | W1-AC2 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T2 [EP/BVA] celular ausente | W1-AC2 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T2 [EP/BVA] celular de 8 dígitos | W1-AC2, RN-04 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T2 [EP/BVA] celular de 10 dígitos | W1-AC2, RN-04 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T2 [EP/BVA] celular de 9 dígitos que no empieza en 9 | W1-AC2, RN-04 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T3 [EP/BVA] documento de 7 dígitos | W1-AC2 (PROPUESTO) | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T3 [EP/BVA] documento de 9 dígitos | W1-AC2 (PROPUESTO) | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T3 [EP/BVA] documento alfanumérico | W1-AC2 (PROPUESTO) | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC2-T3 [EP/ST] OTP incorrecto permite reintentar sin activar la wallet | W1-AC2, 2.2 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC3-T3 [ST] wallet incompleta permanece pendiente | W1-AC3, RN-10 | **EJECUTADO-FALLÓ** (404 previo) |
| W1-AC3-T2 [ST] wallet se activa solo tras completar los tres pasos | W1-AC3, RN-10 | **EJECUTADO-FALLÓ** (404 previo) |

**Total de fallos nombrados: 14**, que coincide con el resumen del ejecutor.

**Casos superados y `todo`:**
- El resumen indica **2 pruebas superadas y 2 `todo`**. La salida truncada **no permite identificar cuáles son**. Pueden pertenecer a `app.e2e-spec.ts` (por ejemplo, salud) o a `onboarding.e2e-spec.ts`. Esos casos se conservan como **no identificables**; no se atribuye aprobación a ningún AC.
- W1-AC4-T2 (eventos), 2.1-T2 (arranque y tablas) y 2.2-T2 (OTP correcto o distinto): **no aparecen por nombre** en la salida visible. Quedan **NO EJECUTADO / no identificable**.

**Nota sobre el 2.1 (arranque):** la app arrancó y los tests corrieron con la app creada en la prueba, pero la salida no demuestra que las tablas de `Onboarding`, `Wallet` y `OnboardingEvent` existan. La tarea 2.1 **no se puede dar por verificada**.

---

## 4. Casos NO EJECUTADO (sin evidencia en la salida)

| Grupo | Estado |
|---|---|
| Archivo `onboarding-qa.e2e-spec.ts` completo (todos sus casos, incluidos SEC-03/04/05, W1-AC4-T2 y 2.2) | NO EJECUTADO |
| Archivo `payments-qa.e2e-spec.ts` completo (W2-AC1 a AC4, AC6 PARCIAL, BVA de monto, escenarios del mock, callback) | NO EJECUTADO |
| Pruebas unitarias directas del mock de identidad (2.2) | NO EJECUTADO (ruta por definir) |
| Componentes de frontend (6.1 a 6.3, 5.1 a 5.4) y comando `python tools/wallee.py test frontend` | NO EJECUTADO |
| Recorrido E2E por navegador (7.1) | NO EJECUTADO (sin MCP) |
| `npm audit`, eslint-plugin-security, gitleaks | NO EJECUTADO (los ejecuta la persona) |
| Crew (`python -m unittest discover -s tests`, SEC-07/08) | NO EJECUTADO (fuera del sprint) |
| Cobertura (meta 85 %) | **No informada** en la salida visible: no se declara ningún valor |

---

## 5. Hallazgos

| Campo | BUG-01 |
|---|---|
| **ID** | BUG-01 |
| **HU/AC** | W1-AC1 a W1-AC3 (3.1, 3.2, 4.1) |
| **Severidad** | Alta (invalida el flujo de W1 y bloquea W2 por RN-10) |
| **Dueño** | AI Engineer 1 (endpoints); AI Engineer 2 (módulo y entidades, 2.1); Architect (cableado en `AppModule`) |
| **Pasos** | Ejecutar `python tools/wallee.py test`; el test `W1-AC1-T2 [EP] inicio lista los pasos propuestos y marca datos como actual` hace `POST /onboarding` con `{}` |
| **Esperado** | `201` con `onboardingId`, `walletId`, tres pasos y `currentStep = datos` |
| **Obtenido** | `404` (`Expected: 201 / Received: 404`, `onboarding.e2e-spec.ts:38`) en 14 casos |
| **Evidencia** | Comando `python tools/wallee.py test`, código de salida 1, resumen `Tests: 14 failed, 2 todo, 2 passed, 18 total` |

Causa probable, **no confirmada**: la ruta `/onboarding` no está registrada. No se leyó el código; se pide al dueño que la confirme.

**Riesgos del borrador (siguen sin verificar):**
- RIESGO-01: campos extra que activen la wallet (mass assignment). NO EJECUTADO.
- RIESGO-02: montos hostiles en pagos con 5xx. NO EJECUTADO.
- RIESGO-03: `ValidationPipe` solo en `main.ts`. NO EJECUTADO. Es relevante porque, tras resolver el 404, los casos de 400 podrían fallar por esto.

---

## 6. Evidencia y trazabilidad

El resultado real quedó registrado en `test/evidence.md`. Resumen por HU:

| HU | AC / tarea | Resultado | Commit | PR |
|---|---|---|---|---|
| W1 | W1-AC1, AC2, AC3 (casos del archivo existente) | EJECUTADO-FALLÓ (404 en `POST /onboarding`) | pendiente | pendiente |
| W1 | W1-AC4 (eventos) | NO EJECUTADO / no identificable | pendiente | pendiente |
| W1 | 2.1 (tablas) | No verificado | pendiente | pendiente |
| W1 | 2.2 (mock de identidad) | No verificado (el único caso nombrado de OTP falló por el 404) | pendiente | pendiente |
| W2 | AC1, AC2, AC3, AC4, AC6 | NO EJECUTADO | pendiente | pendiente |

Para la matriz de trazabilidad (7.2): **no se puede marcar ninguna fila como verde**.

---

## 7. Estado por HU, tareas y checkpoint

| HU | Estado | Motivo |
|---|---|---|
| W1 | **PARCIAL**, checkpoint 🔴 **rojo** | Los casos observados de AC1 a AC3 fallan. AC4 no demostrado. Pasos, campos, documento de 8 dígitos y OTP `123456` siguen PENDIENTE DE CONFIRMAR. |
| W2 | **PARCIAL**, checkpoint 🔴 **rojo / no demostrable** | Sin ejecución de sus casos. Depende de W1 (RN-10) y de fixtures. AC6 es PARCIAL por spec. |
| W3, W4, W5, W6 | FUERA DEL ALCANCE DEL SPRINT | — |

**Tareas propias de QA (tasks.md):** todas siguen **pendientes** o **bloqueadas por 2.1/3.x/4.x** (código ausente). No se marca ninguna como hecha.

**Reporte a:** AI Engineer 1/2 (BUG-01), Architect y Product Owner (checkpoint rojo).

---

## 8. Seguridad (SEC-01..SEC-09)

| ID | Estado tras la ejecución |
|---|---|
| SEC-01 | NO EJECUTADO (gitleaks o búsqueda por patrones pendientes) |
| SEC-02 | Los tests usan datos sintéticos (revisión documental) |
| SEC-03 | NO EJECUTADO |
| SEC-04 | NO EJECUTADO (el 404 no mostró stack trace en la salida visible, pero no es una verificación del control) |
| SEC-05 | NO EJECUTADO |
| SEC-06 | NO PROBABLE: falta insumo (no hay autenticación en el MVP) |
| SEC-07 / SEC-08 | Fuera del sprint |
| SEC-09 | Cumplido: solo se citan resultados presentes en la salida real |

---

## 9. Decisiones requeridas (pendientes, sin cambios)

- **DECISIÓN REQUERIDA** — Categoría: alto impacto | Contexto: W1/W2, checkpoint rojo por BUG-01 | Opciones: A) corregir el registro del módulo de onboarding y reejecutar B) recortar alcance de W2 hasta que W1 esté en verde | Recomendación: A | Impacto: sin W1 no hay wallet ACTIVA ni pago | Pregunta a: Product Owner / AI Engineer 1.
- **DECISIÓN REQUERIDA** — Categoría: ambigüedad | Contexto: ejecución | Opciones: A) confirmar si `onboarding-qa.e2e-spec.ts` y `payments-qa.e2e-spec.ts` se copiaron a `backend/test/` y reejecutar mostrando la salida completa B) conservar solo el archivo existente | Recomendación: A | Impacto: hoy casi todos los casos del borrador siguen NO EJECUTADO | Pregunta a: la persona operadora / Architect.
- Contrato de errores (`VALIDATION_ERROR` vs `VALIDATION_FAILED`), ruta de la prueba unitaria del mock (2.2), política del OTP en producción, SEC-06 (sin autenticación) y pago a uno mismo / saldo fijo: siguen abiertas según el borrador. Preguntar a Architect y PO.

---

## 10. Checklist previo al Freeze

- [ ] Corregir BUG-01 y reejecutar `python tools/wallee.py test backend` con la salida completa.
- [ ] Tests en verde y cobertura ≥ 85 % (aún sin dato).
- [ ] Evidencia, commit y PR completados en la matriz (7.2).
- [ ] README con secciones 6 y 7 honestas.
- [ ] Publicación en la rama `qa-security`: paso separado, no confirmado aquí.

**Aporte a README sección 6 "Evidencia y pruebas":** primera ejecución real: 18 pruebas visibles (14 fallidas, 2 superadas, 2 `todo`). Los fallos de W1 se deben a un 404 en `POST /onboarding`. El mock de identidad es MOCK. Ningún AC está verificado.

**Aporte a README sección 7 "Trade-offs":** no se probaron W2, UI, E2E, eventos, SEC-03/05 ni las herramientas de dependencias y secretos. La cobertura no se midió. La salida del ejecutor estaba truncada, lo que limita la trazabilidad por caso.