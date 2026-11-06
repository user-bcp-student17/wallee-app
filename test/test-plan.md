<!-- test/test-plan.md -->
# Plan de pruebas — W1 + W2 (borrador, todo NO EJECUTADO)

Comando: `python tools/wallee.py test backend` (cobertura meta 85 %, no medida).
Lo ejecutado = solo con salida real aportada por `main.py`. Contratos de body/respuesta, `callback`, nombres de entidad y saldo inicial: **PROPUESTO / PENDIENTE DE CONFIRMAR** (centralizados en `test/helpers/qa-helpers.ts`).
El mock del proveedor es un fixture controlable: se dispara por último dígito del celular de destino y no se prueba como integración real.

## Casos W1 (archivo `test/w1-onboarding-qa.e2e-spec.ts`)
| ID | AC/RN | Técnica | Entrada sintética | Resultado esperado | Prior. | Estado |
|---|---|---|---|---|---|---|
| W1-AC1-T2 (inicio) | W1-AC1 | EP | POST /onboarding | 201, pasos datos/identidad/verificacion, actual=datos, wallet PENDIENTE | Alta | NO EJECUTADO |
| W1-AC1-T2 (avance) | W1-AC1 | ST | datos válidos | actual=identidad | Media | NO EJECUTADO |
| W1-AC1-T3 | W1-AC1 | EP | id inexistente | 404 ONBOARDING_NOT_FOUND sin stack | Media | NO EJECUTADO |
| W1-AC2-T2 ×5 | W1-AC2, RN-04, RN-09 | BVA/EP | celular 8 dígitos, 10 dígitos, empieza con 8, texto, vacío | 400 VALIDATION_ERROR con "celular"; no avanza | Alta | NO EJECUTADO |
| W1-AC2-T2 (9 dígitos) | RN-04 | BVA | 912345678 | 200 | Alta | NO EJECUTADO |
| W1-AC2-T2 nombre / documento ×4 / OTP vacío | RN-09 | EP/BVA | nombre vacío; documento 7, 9, letras, vacío; código vacío | 400; paso actual intacto (documento de 8 dígitos: PENDIENTE DE CONFIRMAR) | Media | NO EJECUTADO |
| W1-AC2-T3 | RN-09 | EG | body vacío; campos extra `status: ACTIVA` | 400 / nunca 5xx; wallet sigue PENDIENTE | Alta | NO EJECUTADO |
| W1-REQ-IDENT-T2 (tarea 2.2) | spec verificación simulada | EP | OTP 123456 y 654321 | 200 / 400 | Media | NO EJECUTADO |
| W1-AC3-T2 | W1-AC3, RN-10 | ST | 3 pasos válidos | wallet ACTIVA | Alta | NO EJECUTADO |
| W1-AC3-T3 (pendiente) | RN-10 | ST | 2 de 3 pasos | PENDIENTE_ONBOARDING | Alta | NO EJECUTADO |
| W1-AC3-T3 (orden) | D3 | ST | verificacion antes de datos | 409 STEP_OUT_OF_ORDER, progreso igual | Media | NO EJECUTADO |
| W1-AC4-T2 | W1-AC4 | ST | recorrido completo | started, 3× step_completed (con paso), completed, en orden, con timestamp | Alta | NO EJECUTADO |
| W1-AC4-T3 | W1-AC4 | EP | paso inválido | sin step_completed | Media | NO EJECUTADO |

## Casos W2 (archivo `test/w2-payments-qa.e2e-spec.ts`)
| ID | AC/RN | Técnica | Entrada sintética | Resultado esperado | Prior. | Estado |
|---|---|---|---|---|---|---|
| W2-BASE-T2 ×3 (tareas 1.1 y 1.2) | RN-10, SUP-15 | ST/EP | GET wallet ACTIVA y PENDIENTE; directorio 0,1,2,3,9; saldo inicial > 0 | según cada caso | Alta | NO EJECUTADO |
| W2-AC1-T2 ×3 | W2-AC1 | EP | celular y alias válidos; consulta sin cobro | 200 con nombre; sin transacción ni descuento | Alta | NO EJECUTADO |
| W2-AC1-T2 ×5 | RN-04 | EP/BVA | 8 dígitos, 10 dígitos, empieza con 8, texto, alias inexistente | 400 DESTINATION_INVALID | Alta | NO EJECUTADO |
| W2-AC2-T2 ×4 | RN-05, RN-06, RN-08 | EP/BVA | dígito 0, 1, 3, 9 | fallido, expirado, exitoso, exitoso | Alta | NO EJECUTADO |
| W2-AC2-T2 (PENDING) | RN-07 | EP | dígito 2 | sin terminal; saldo intacto | Alta | NO EJECUTADO |
| W2-AC2-T2 (callback) | RN-06/07 | ST | dígito 2 + callback APPROVED | exitoso, saldo −monto una vez | Alta | NO EJECUTADO |
| W2-AC2-T3 | RN-06 | ST | segundo callback DECLINED sobre exitoso | estado y saldo sin cambio | Alta | NO EJECUTADO |
| W2-AC3-T2 / T3 | W2-AC3, RN-11 | EP/EG | pago exitoso; dos pagos | referencia en historial; referencias únicas | Alta | NO EJECUTADO |
| W2-AC4-T2 ×3 | W2-AC4, RN-12 | EP/ST | fallido, expirado, reintento | saldo intacto; reintento exitoso descuenta 1 vez | Alta | NO EJECUTADO |
| W2-AC4-T3 BVA monto | RN-01 | BVA | 499.99 / 500 / 500.01 | permitido / permitido / 422 AMOUNT_OVER_LIMIT sin transacción | Alta | NO EJECUTADO |
| W2-AC4-T3 BVA saldo | RN-18 | BVA | saldo = monto; monto = saldo + 0.01 | permitido (saldo 0) / 422 INSUFFICIENT_FUNDS, saldo intacto | Alta | NO EJECUTADO |
| W2-AC4-T3 monto 0/neg/texto/3 decimales | RN-01 | EP/BVA | 0, −5, "abc", 10.005 | 4xx, sin transacción (mínimo y decimales: PENDIENTE DE CONFIRMAR) | Media | NO EJECUTADO |
| W2-AC4-T3 DT destino, wallet, uno mismo | RN-04, RN-10 | DT | celular inválido; PENDIENTE_ONBOARDING; wallet inexistente; propio número | 4xx; sin transacción | Alta | NO EJECUTADO |
| W2-AC6-T2 / T3 | W2-AC6 (PARCIAL), RN-17 | EP/ST | exitoso; dígito 0 y 1; PENDING + callbacks | un evento; ninguno; un evento tras el callback, sin duplicar | Alta | NO EJECUTADO |
| SEC-05-T3 monto ×10, destino ×6, campos extra | SEC-04/05 | EG | SQL, JS, unicode, 1e21, null, arreglo, campos extra | 4xx, nunca 5xx, sin stack; campos extra ignorados | Alta | NO EJECUTADO |

## Casos propuestos y no escritos
| ID | Motivo | Estado |
|---|---|---|
| Unitaria del mock de identidad (tarea 2.2) y del mock de proveedor (3.1) | Faltan nombres de clase en el contexto; cubiertas por API | NO EJECUTADO (no escrita) |
| OTP rechazado con `NODE_ENV=production` (D7) | Falta el mecanismo de configuración | PROPUESTO |
| UNIQUE en `reference` y rechazo de duplicado a nivel BD | Requiere acceso al esquema | PROPUESTO |
| Frontend (tareas W1 6.1–6.3, W2 5.1–5.4): Vitest + Testing Library | Faltan nombres de componentes; `frontend/src` solo tiene `api/` | NO EJECUTADO (no escrita) |
| E2E UI (alta → pago → fallo) | El mapa no trae MCP ni navegador | NO EJECUTADO |
| Concurrencia, misma clave y callback duplicado con identificador | Es W4 | FUERA DEL ALCANCE |

## Cobertura de particiones y límites
- **Propuestos (en esta entrega):** monto 499.99/500/500.01, 0, negativo, texto, 3 decimales; saldo = monto y monto + 0.01; celular de 8, 9, 10 dígitos y primer dígito 8; destino 0, 1, 2, 3, 9; documento de 7, 8, 9 dígitos.
- **Ejecutados:** 0 (sin salida).
- **No cubierto:** el valor previo del límite 500 es 499.99 (ya incluido); el mínimo de 0.01 es PENDIENTE; la ventana de 24 h es W4.

## Trazabilidad AC/RN ↔ caso
| AC / RN | Casos |
|---|---|
| W1-AC1 | W1-AC1-T2 (×2), W1-AC1-T3 |
| W1-AC2 / RN-04 / RN-09 | W1-AC2-T2, W1-AC2-T3 |
| W1-AC3 / RN-10 | W1-AC3-T2, W1-AC3-T3 (×2), W2-BASE-T2 |
| W1-AC4 / RN-17 | W1-AC4-T2, W1-AC4-T3 |
| Verificación simulada (tarea 2.2) | W1-REQ-IDENT-T2 |
| W2-AC1 | W2-AC1-T2 |
| W2-AC2 / RN-05–08 | W2-AC2-T2, W2-AC2-T3 |
| W2-AC3 / RN-11 | W2-AC3-T2, W2-AC3-T3 |
| W2-AC4 / RN-12 | W2-AC4-T2 |
| W2-AC4-T3 / RN-01, RN-04, RN-10, RN-18 | BVA monto y saldo, DT destino, wallet, uno mismo |
| W2-AC6 / RN-17 | W2-AC6-T2, W2-AC6-T3 |
| SEC-04, SEC-05 | SEC-05-T3 |