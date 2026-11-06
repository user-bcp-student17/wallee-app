<!-- test/test-plan.md -->
# Plan de pruebas — Sprint 1 (W1 y W2)

Estado de TODOS los casos: **NO EJECUTADO**. Comando: `python tools/wallee.py test backend`.
Datos 100 % sintéticos. Mock de identidad y proveedor son MOCK: se usan como fixture, no como integración real.
Contrato PROPUESTO (nombres de campos): `nombre`, `celular`, `documento`, `codigo`; errores `{code, message, ...}`.

## W1 — Onboarding (archivo `test/onboarding-qa.e2e-spec.ts`)

| ID | AC / RN / tarea | Técnica | Entrada sintética | Resultado esperado | Prior. | Estado |
|---|---|---|---|---|---|---|
| W1-AC1-T2 inicio | AC1, 3.1 | EP | POST /onboarding | 201, 3 pasos (datos, identidad, verificacion), actual = datos, walletId | Alta | NO EJECUTADO |
| W1-AC1-T2 avance | AC1 | ST | datos válido y GET | datos completado, actual = identidad | Alta | NO EJECUTADO |
| W1-AC2-T2 celular (x6) | AC2, RN-04, RN-09, 3.2 | EP/BVA | vacío; 8 díg.; 10 díg.; empieza con 8; con letra; solo espacios | 400 VALIDATION_ERROR, menciona `celular`, no avanza | Alta | NO EJECUTADO |
| W1-AC2-T2 celular válido | AC2 | BVA | 912345678 (9 díg., empieza con 9) | 200, avanza | Alta | NO EJECUTADO |
| W1-AC2-T2 nombre (x3) | AC2 | EP | ausente; ""; "   " | 400, menciona `nombre` | Alta | NO EJECUTADO |
| W1-AC2-T2 documento (x4) | AC2, D6 (PROPUESTO) | BVA/EP | 7 díg.; 9 díg.; letras; vacío | 400, menciona `documento`, no avanza | Media | NO EJECUTADO |
| W1-AC2-T2 código (x4) | AC2, 2.2 | EP | vacío; 000000; 12345; 1234567 | 400, no avanza | Alta | NO EJECUTADO |
| W1-AC2-T3 reintento OTP | AC2 (código incorrecto permite reintentar) | ST | 654321 y luego 123456 | 400 y luego 200 | Alta | NO EJECUTADO |
| W1-AC1-T3 fuera de orden (x2) | 3.3, D3 | ST | verificacion o identidad antes de datos | 409 STEP_OUT_OF_ORDER, progreso intacto | Alta | NO EJECUTADO |
| W1-AC1-T3 onboarding inexistente | D5 | EP | id inexistente | 404 ONBOARDING_NOT_FOUND | Media | NO EJECUTADO |
| W1-AC3-T2 | AC3, RN-10, 4.1 | ST | 3 pasos válidos | onboarding COMPLETADO; GET /wallets/:id = ACTIVA | Alta | NO EJECUTADO |
| W1-AC3-T3 | AC3, RN-10, 4.2 | ST | solo `datos`, luego `identidad` | PENDIENTE_ONBOARDING tras cada paso | Alta | NO EJECUTADO |
| W1-AC4-T2 | AC4, 5.1 | ST | recorrido completo; lectura de `OnboardingEvent` | started, 3 step_completed (con paso), completed; en orden | Alta | NO EJECUTADO |
| 2.2-T2 OTP correcto | verificación simulada, 2.2 | EP | 123456 | 200, completa el paso, sin proveedor externo | Alta | NO EJECUTADO |
| 2.2-T2 OTP distinto | idem | EP | 654321 | 400 | Alta | NO EJECUTADO |
| 2.2-T3 OTP en producción | D7 | EP | NODE_ENV=production | `it.todo`: comportamiento PENDIENTE DE CONFIRMAR | Media | NO EJECUTADO |
| 2.1-T2 arranque | tarea 2.1 | EP | app inicia, POST /onboarding | 201 (tablas creadas) | Alta | NO EJECUTADO |
| W1-SEC05 hostiles (x5) | SEC-05 | EG | SQL, `<script>`, 10 000 caracteres, null, número | nunca 5xx; wallet sigue PENDIENTE | Alta | NO EJECUTADO |
| W1-SEC05 campos extra | SEC-05 | EG | `status: ACTIVA` y `isAdmin` en paso datos | wallet sigue PENDIENTE_ONBOARDING | Alta | NO EJECUTADO |
| W1-SEC04 sin stack | SEC-04 | EG | 400 y 409 | cuerpo sin traza ni rutas internas | Media | NO EJECUTADO |
| W1-SEC03 wallet sin documento | SEC-03 | EG | GET /wallets/:id | cuerpo sin el documento | Media | NO EJECUTADO |

## W2 — Pago a contacto (archivo `test/payments-qa.e2e-spec.ts`)

Contrato PROPUESTO por el spec, sin esquema completo: `POST /payments {walletId, destination, amount}`, respuesta con `id`, `reference`, `outcome`.

| ID | AC / RN / tarea | Técnica | Entrada | Resultado esperado | Prior. | Estado |
|---|---|---|---|---|---|---|
| W2-AC1-T2 directorio | AC1, 4.1 | EP | GET /directory/<celular válido> | 200 con nombre | Media | NO EJECUTADO |
| W2-AC1-T3 destino inválido | 4.1 | EP | GET /directory/812345678 | 400 DESTINATION_INVALID | Media | NO EJECUTADO |
| W2-AC2-T2 escenarios (x4) | AC2, RN-05, RN-08 | DT | destino terminado en 0, 1, 3 y 9 | fallido, expirado, exitoso, exitoso | Alta | NO EJECUTADO |
| W2-AC2-T2 PENDING | RN-07, 4.3 | ST | terminado en 2 | outcome no terminal | Alta | NO EJECUTADO |
| W2-AC2-T3 callback | RN-06, 4.3 | ST | callback APPROVED y luego DECLINED | exitoso y se conserva | Alta | NO EJECUTADO |
| W2-AC4-T3 BVA monto (x3) | RN-01, 3.2 | BVA | 499.99; 500.00; 500.01 | permitido, permitido, 422 AMOUNT_OVER_LIMIT | Alta | NO EJECUTADO |
| W2-AC4-T3 montos inválidos (x6) | EG/EP | EP/EG | 0; -1; "abc"; 10.001; 1e12; null | 4xx, nunca 5xx, saldo intacto | Alta | NO EJECUTADO |
| W2-AC4-T3 destino (x3) | RN-04 | EP | 8 díg.; empieza con 8; alias inexistente | 4xx, sin transacción | Alta | NO EJECUTADO |
| W2-AC4-T3 wallet pendiente | RN-10 | DT | wallet PENDIENTE_ONBOARDING | 4xx, historial vacío | Alta | NO EJECUTADO |
| W2-AC4-T3 saldo insuficiente | RN-18 | BVA | saldo+0.01 y saldo | `it.todo` (necesita saldo fijo ≤ 500) | Alta | NO EJECUTADO |
| W2-AC4-T3 pago a uno mismo | discovery | EP | | `it.todo` PENDIENTE DE CONFIRMAR | Baja | NO EJECUTADO |
| W2-AC3-T2 | RN-11, 4.4 | EP | pago exitoso | referencia; historial con la misma referencia | Alta | NO EJECUTADO |
| W2-AC4-T2 fallido y expirado (x2) | RN-12, 4.4 | DT | terminados en 0 y 1 | saldo igual al inicial | Alta | NO EJECUTADO |
| W2-AC4-T2 reintento | RN-12 | ST | falla y luego pago a un destino aprobado | descuento exactamente una vez | Alta | NO EJECUTADO |
| W2-AC6-T2 | AC6 PARCIAL, 4.5 | ST | exitoso; fallido; expirado | 1 evento / 0 / 0 | Media | NO EJECUTADO |

## Propuestos sin código (NO EJECUTADO)

| ID | Qué | Motivo |
|---|---|---|
| W1-AC1-T2 UI (6.1), AC2 UI (6.2), AC3 UI (6.3) | Vitest + Testing Library | el frontend solo tiene `src/api`; no existen los componentes |
| W2-AC1-T2 UI, AC2/AC3/AC4 UI (5.1 a 5.4) | Vitest + Testing Library | idem |
| W1/W2-E2E (7.1) | recorrido alta → pago por navegador | no hay MCP |
| 2.2 prueba unitaria directa del mock | `*.spec.ts` junto al código | ruta de la clase del mock desconocida; ver DECISIÓN REQUERIDA 2 |

## Matriz de trazabilidad AC/RN ↔ caso

| AC / RN | Casos |
|---|---|
| W1-AC1 | W1-AC1-T2 (inicio, avance), W1-AC1-T3 (orden, inexistente) |
| W1-AC2, RN-09, RN-04 | W1-AC2-T2 (celular, nombre, documento, código), W1-AC2-T3, SEC-05 |
| W1-AC3, RN-10 | W1-AC3-T2, W1-AC3-T3, W2-AC4-T3 wallet pendiente |
| W1-AC4 | W1-AC4-T2 |
| Verificación simulada (2.2) | 2.2-T2 (correcto y distinto), 2.2-T3 todo |
| Tarea 2.1 | 2.1-T2 |
| W2-AC1 | W2-AC1-T2, W2-AC1-T3 |
| W2-AC2, RN-05 a RN-08 | W2-AC2-T2 (x4, PENDING), W2-AC2-T3 |
| W2-AC3, RN-11 | W2-AC3-T2 |
| W2-AC4, RN-01, RN-04, RN-12, RN-18 | W2-AC4-T2, W2-AC4-T3 |
| W2-AC6 (PARCIAL) | W2-AC6-T2 |
| RN-17 | solo se verifica el evento (W1-AC4-T2, W2-AC6-T2) |

## Cobertura propuesta vs ejecutada
Propuestas: ~35 casos entre particiones y límites. Ejecutados: **0**.