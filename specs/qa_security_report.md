# Informe final de QA & Security — Sprint W1 + W2 (post-ejecución)

**Fecha:** 2026-11-06 · **Rama de QA:** `qa-security` · **Comando configurado:** `python tools/wallee.py test`
**Resultado del ejecutor de `main.py`:** FALLÓ (código de salida 1, duración 8,5 s, sin error de ejecución).
**Resumen de la salida:** `Test Suites: 1 failed, 1 passed, 2 total` · `Tests: 14 failed, 2 todo, 2 passed, 18 total`.

> **Aviso de honestidad.** La salida real está truncada (se muestra solo el final). Solo cito lo que demuestra. No sé qué archivo cubrió el suite aprobado, y no puedo atribuir a ninguna prueba un resultado que no aparezca en la salida.

---

## 1. Qué demuestra la salida y qué no

**Suites identificables:**
- `FAIL test/onboarding.e2e-spec.ts` (1 suite fallida). Es una suite preexistente del repositorio de la app, con describe «W1 onboarding — API de integración» y su propio helper `crearOnboarding`.
- La salida muestra `/app.e2e-spec.ts` justo antes. El texto está cortado, por lo que no puedo confirmar su estado individual. Es coherente con la suite aprobada («1 passed»), pero esa atribución es una inferencia, no un hecho demostrado.

**Lo que NO aparece en la salida (casos NO EJECUTADO):**
- Los archivos propuestos en el borrador, `test/w1-onboarding-qa.e2e-spec.ts` y `test/w2-payments-qa.e2e-spec.ts`, no figuran en la parte visible. Con 2 suites totales, la salida es coherente con que no se ejecutaron (o no se copiaron). No puedo afirmarlo ni negarlo.
- Por tanto, todos mis casos W1-* y W2-* del borrador, `W2-BASE-T2` y `SEC-05-T3` permanecen **NO EJECUTADO**.

## 2. Hecho verificado: fallos en `onboarding.e2e-spec.ts`

Los 14 fallos mostrados comparten la misma causa visible. `POST /onboarding` con cuerpo `{}` devuelve **404** en lugar de **201** (`expect(response.status).toBe(201)` en `crearOnboarding`, línea 38). Esto ocurre antes de cualquier validación de negocio.

| Caso (nombre en la suite de la app) | AC | Resultado demostrado |
|---|---|---|
| W1-AC1-T2 [EP] inicio lista los pasos y marca datos como actual | W1-AC1 | EJECUTADO-FALLÓ (201 esperado, 404 recibido) |
| W1-AC1-T2 [ST] completar datos actualiza el paso actual | W1-AC1 | EJECUTADO-FALLÓ (ídem) |
| W1-AC1-T3 [ST] paso fuera de orden devuelve 409 | W1-AC1 / D3 | EJECUTADO-FALLÓ (falla en la precondición de crear el onboarding) |
| W1-AC2-T2 nombre vacío | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T2 celular ausente | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T2 celular de 8 dígitos | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T2 celular de 10 dígitos | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T2 celular de 9 dígitos que no empieza en 9 | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T3 documento de 7 dígitos | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T3 documento de 9 dígitos | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T3 documento alfanumérico | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC2-T3 OTP incorrecto permite reintentar | W1-AC2 | EJECUTADO-FALLÓ (ídem) |
| W1-AC3-T3 wallet incompleta permanece pendiente | W1-AC3 | EJECUTADO-FALLÓ (ídem) |
| W1-AC3-T2 wallet se activa tras los tres pasos | W1-AC3 | EJECUTADO-FALLÓ (ídem) |

**Matiz importante:** estos casos fallaron por la precondición (crear el onboarding), no por la regla que pretenden verificar. No demuestran, por ejemplo, que la validación del celular sea incorrecta; solo que no pudo evaluarse porque la ruta no responde. El resultado es «bloqueado por la ausencia de `POST /onboarding`», no «regla incumplida».

**Conteos que no puedo desglosar:** 2 pruebas aprobadas y 2 `todo`. No se ven sus nombres, así que no los asigno a ningún AC.

## 3. Hallazgo

ID: BUG-01 | HU/AC: W1-AC1 a W1-AC3 (bloquea todo W1 y la tarea 1.1 de W2) | Severidad: Alta | Dueño: Architect / AI Engineer 1
Pasos: 1) En la rama `qa-security`, ejecutar `python tools/wallee.py test`. 2) Observar los 14 fallos de `test/onboarding.e2e-spec.ts` en `crearOnboarding`.
Esperado: `POST /onboarding` con `{}` responde `201` con `onboardingId` y `walletId` (design D5 de W1).
Obtenido: `404` en todas las llamadas (salida real arriba).
Evidencia: comando `python tools/wallee.py test`, código de salida 1, «Tests: 14 failed».
Causa probable (hipótesis, NO confirmada): el módulo de onboarding no está en `backend/src` de la rama. El mapa de la app lista solo `health` y esto es coherente con el 404. No puedo afirmar que esté ausente ni que el módulo exista pero no esté registrado en `AppModule`.

Consecuencia: la dependencia W1 de W2 (tarea 1.1, `GET /wallets/:id` con `ACTIVA` y `PENDIENTE_ONBOARDING`) **no queda verificada y está BLOQUEADA**. W2 no puede probarse en la práctica hasta resolverlo.

## 4. Estado por HU

| HU | Estado | Motivo |
|---|---|---|
| W1 | **PARCIAL, checkpoint ROJO** | AC1–AC4 sin ningún caso en verde. Los fallos evidencian que `POST /onboarding` no responde. AC5 y AC6 diferidos (KPI). Pasos, campos y documento de 8 dígitos siguen PROPUESTOS (PENDIENTE DE CONFIRMAR) |
| W2 | **PARCIAL, checkpoint ROJO/BLOQUEADO** | Sin evidencia de ningún AC. Tarea 1.1 bloqueada por BUG-01. AC6 PARCIAL por regla (no se mide el MAU) |
| W3, W4, W5, W6 | FUERA DEL ALCANCE DEL SPRINT | — |

Se reporta al Architect y a AI Engineer 1 (BUG-01) y al Product Owner (checkpoint rojo).

## 5. Estado de las tareas de `tasks.md` (las mías y de apoyo)

| Tarea | Estado |
|---|---|
| W2 1.1 (Architect) | No es mía; BLOQUEADA por BUG-01. No se marca hecha |
| W2 1.2 (AI Engineer 2) | No es mía; sin evidencia de las fixtures. No se marca hecha |
| W1 3.1, 3.2, 4.1, 4.2 (pruebas) | Pendientes: las pruebas fallaron por BUG-01 |
| W1 3.3, 5.1, 2.2, 7.1 | Pendientes, bloqueadas por BUG-01 (sin salida demostrativa) |
| W2 3.x, 4.x, 5.x, 7.1 | Pendientes: sin salida |
| 7.2 (matriz de trazabilidad) | Pendiente: ninguna fila tiene evidencia |

## 6. Evidencia y trazabilidad

| HU | AC | Test ID | Comando | Resultado |
|---|---|---|---|---|
| W1 | W1-AC1 | W1-AC1-T2 (×2), W1-AC1-T3 (suite de la app) | `python tools/wallee.py test` | EJECUTADO-FALLÓ (404 en la precondición) |
| W1 | W1-AC2 | W1-AC2-T2 (×5), W1-AC2-T3 (×4) | ídem | EJECUTADO-FALLÓ (ídem) |
| W1 | W1-AC3 | W1-AC3-T2, W1-AC3-T3 | ídem | EJECUTADO-FALLÓ (ídem) |
| W1 | W1-AC4 | W1-AC4-T2, W1-AC4-T3 | ídem | NO EJECUTADO (no aparece en la salida) |
| W1 | Verificación simulada (2.2) | W1-REQ-IDENT-T2 | ídem | NO EJECUTADO |
| W2 | W2-AC1 a W2-AC6, W2-BASE | todos mis casos | ídem | NO EJECUTADO |
| Transversal | SEC-04/05 | SEC-05-T3 | ídem | NO EJECUTADO |
| UI / E2E | — | no escritos | `python tools/wallee.py test frontend` | NO EJECUTADO (sin MCP ni navegador) |

Commit y PR: **no afirmo que existan**; la publicación es un paso separado.

**Cobertura:** no se reporta cobertura en la salida visible, por lo que no se midió frente a la meta del 85 %. Particiones y límites EJECUTADOS: 0 que den evidencia útil (los casos ejecutados fallaron en la precondición); el resto es PROPUESTO.

## 7. Revisión de seguridad (actualización)

| Control | Estado tras la ejecución |
|---|---|
| SEC-01, 02, 03 | PENDIENTE: requieren escaneo de secretos y revisión de logs por la persona |
| SEC-04, SEC-05 | NO EJECUTADO: los casos `SEC-05-T3` no aparecen en la salida |
| SEC-06 / SEC-06b (wallet ajena, callback sin firma) | Riesgo declarado; sin prueba (NO PROBABLE sin modelo de usuario); decisión QA-D3 pendiente |
| SEC-07, SEC-08 | N/A en este sprint (W5) |
| SEC-09 | CUMPLIDO: solo se citan resultados presentes en la salida |
| `npm audit` | PENDIENTE: lo ejecuta la persona |

## 8. Discrepancias abiertas

1. La salida muestra pruebas con nombres de la suite de la app (`crearOnboarding`, «API de integración»). No son las de mi borrador. Hay que confirmar si mis dos archivos nuevos se copiaron a `backend/test/`.
2. Persisten las discrepancias previas: `backend-nestjs/` frente a `backend/`; `VALIDATION_ERROR` frente a `VALIDATION_FAILED` (manda `tasks.md`); nombre del destino oculto (discovery) frente a solo «identidad» (spec); bordes de W2-AC4-T3 ausentes como Scenario.

## 9. Decisiones requeridas

DECISIÓN REQUERIDA — Categoría: crítica | Contexto: W1-AC1 a AC3, tarea 1.1 de W2 (BUG-01: `POST /onboarding` devuelve 404) | Opciones: A) El Architect confirma si el módulo de onboarding está en `qa-security` y lo integra o registra en `AppModule` B) Mergear W1 a `qa-security` antes de repetir la ejecución C) Declarar W1 y W2 NO HECHAS en esta ronda | Recomendación: B y luego repetir la ejecución, porque sin W1 ningún caso de W2 puede correr | Impacto: W1 y W2 permanecen rojos y W2 queda sin evidencia | Pregunta a: Architect y AI Engineer 1

DECISIÓN REQUERIDA — Categoría: alcance/ruta | Contexto: archivos de QA nuevos | Opciones: A) Confirmar que `w1-onboarding-qa.e2e-spec.ts`, `w2-payments-qa.e2e-spec.ts` y `helpers/qa-helpers.ts` están en `backend/test/` y reejecutar B) Mantenerlos fuera | Recomendación: A | Impacto: sin ello mis casos siguen NO EJECUTADO | Pregunta a: Architect

Siguen vigentes, sin cambios, las decisiones del borrador sobre el contrato de W2, el saldo inicial, SEC-06, el monto mínimo/decimales/pago propio y el enmascarado del destino (Product Owner / Architect).

## 10. Checklist previo al Freeze

- [ ] Tests en verde con salida real: **NO** (14 fallos).
- [ ] `evidence.md` con salida real: registrada la salida del ejecutor; sin casos en verde para W1/W2.
- [ ] Cobertura ≥ 85 % medida: NO.
- [ ] Matriz de trazabilidad con commit y PR: pendiente.
- [ ] README honesto con mocks y limitaciones: pendiente (Presenter).
- [ ] Código en la rama `qa-security`: no verificado.
- [ ] `npm audit` y escaneo de secretos: pendientes.

## 11. Aporte al README

**Sección 6 (Evidencia y pruebas):** Jest + Supertest en `backend/test/`; casos con ID `Wx-ACn-Tm`; técnicas EP, BVA, DT, ST y EG; comando `python tools/wallee.py test`. Resultado real de la primera ejecución: suite fallida (14 fallos, 2 aprobadas, 2 `todo`). `POST /onboarding` devolvió 404, así que W1 y W2 no tienen evidencia en verde.

**Sección 7 (Trade-offs y deuda):**
- El mock del proveedor es un fixture, no una integración real.
- Sin autenticación ni autorización por wallet (SEC-06); callback sin firma.
- Saldo inicial PROPUESTO; monto mínimo, decimales y pago propio por definir.
- No probados: UI, E2E, idempotencia y concurrencia (W4), reversos (W5), unitarias del mock y migración.
- W1-AC5, W1-AC6 y W2-AC5 son KPI sin medir; solo se verifica el evento.
- W1 y W2 permanecen PARCIAL con checkpoint rojo hasta resolver BUG-01 y reejecutar.