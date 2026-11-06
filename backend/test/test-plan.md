<!-- test/test-plan.md -->
# Plan de pruebas — W1 Onboarding guiado

## Condiciones

- Alcance: W1-AC1 a W1-AC4 del cambio OpenSpec activo `w1-onboarding-guiado`.
- Los nombres de pasos, campos de documento y OTP fijo están pendientes de confirmación cuando proceden del diseño PROPUESTO.
- Los casos de este plan se generaron como propuestas (columna «Estado al generar el plan»). El estado real tras la ejecución del 2026-11-06 está en la sección «Estado real» y, con la salida, en `evidence.md`.
- Datos sintéticos solamente. No efectuar pagos, reversos ni acciones monetarias.
- Comando global definido por el mapa: `python tools/wallee.py test`.

## Casos

| ID / nombre | Task | AC / requisito / RN | Técnica | Precondición y entrada sintética | Resultado esperado | Prioridad | Estado al generar el plan |
|---|---|---|---|---|---|---|---|
| W1-AC1-T2 inicio lista pasos y actual | #7 / 3.1 | W1-AC1 | EP | POST nuevo onboarding; pasos propuestos. | Pasos visibles y `datos` como actual. | Alta | NO EJECUTADO |
| W1-AC1-T2 avanzar actualiza el paso | #7 / 3.1 | W1-AC1 | ST | Completar `datos` con nombre sintético y `912345678`. | Paso completado; `identidad` como actual. | Alta | NO EJECUTADO |
| W1-AC1-T3 intento fuera de orden | #7 / 3.3 | W1-AC1 | ST | Enviar `verificacion` antes de `datos`. | HTTP 409, `STEP_OUT_OF_ORDER`; progreso intacto. | Alta | NO EJECUTADO |
| W1-AC2-T2 nombre vacío o celular ausente | #7 / 3.2 | W1-AC2, RN-09 | EP/DT | Probar cada campo por separado en blanco/ausente. | HTTP 400, `VALIDATION_ERROR`, campo accionable, sin avance. | Alta | NO EJECUTADO |
| W1-AC2-T2 celular de 8 dígitos | #7 / 3.2 | W1-AC2 | BVA | `91234567`. | HTTP 400, error de formato, sin avance. | Alta | NO EJECUTADO |
| W1-AC2-T2 celular de 10 dígitos | #7 / 3.2 | W1-AC2 | BVA | `9123456780`. | HTTP 400, error de formato, sin avance. | Alta | NO EJECUTADO |
| W1-AC2-T2 celular de 9 dígitos con prefijo 8 | #7 / 3.2 | W1-AC2, RN-04 | EP | `812345678`. | HTTP 400, error de formato, sin avance. | Alta | NO EJECUTADO |
| W1-AC2-T3 documento de 7/9 dígitos o alfanumérico | #7 / 3.2 | W1-AC2, D6 PROPUESTO | EP/BVA | `1234567`, `123456789`, `12ABC678`. | Si se confirma la regla propuesta, HTTP 400 y sin avance. | Media | NO EJECUTADO; regla pendiente de confirmar |
| W1-AC2-T3 OTP incorrecto | #6 / 2.2; #7 / 3.2 | W1-AC2; mock | EP/ST | OTP sintético `000000`. | HTTP 400, código estable, reintento permitido, wallet no activa. | Alta | NO EJECUTADO |
| W1-AC2-T3 OTP válido de prueba | #6 / 2.2; #7 / 3.2 | Verificación simulada | EP/ST | OTP `123456` fuera de producción; datos sintéticos. | Paso de verificación completado sin proveedor externo. | Alta | NO EJECUTADO; OTP propuesto |
| W1-AC3-T2 recorrido completo | #8 / 4.1 | W1-AC3, RN-10 | ST | Completar los tres pasos propuestos. | Onboarding COMPLETADO y wallet ACTIVA al final. | Alta | NO EJECUTADO |
| W1-AC3-T3 onboarding incompleto | #8 / 4.2 | W1-AC3, RN-10 | ST/DT | Consultar wallet inmediatamente tras crear onboarding. | PENDIENTE_ONBOARDING y sin acceso de pago. | Alta | NO EJECUTADO |
| W1-AC3-T2 punto de pago en UI | #10 / 6.3 | W1-AC3, RN-10 | DT | Componente con wallet pendiente y activa. | Punto de entrada visible solo con ACTIVA. | Alta | NO EJECUTADO; componente no identificado |
| W1-AC4-T2 eventos y marcas de tiempo | #9 / 5.1 | W1-AC4; frontera aprobada | ST | Recorrido completo con observación autorizada. | Inicio, tres eventos de paso y cierre, en orden y con hora del servidor. | Media | NO EJECUTADO; sin contrato de observación |

## Estado real (ejecución del 2026-11-06)

Comando: `python tools/wallee.py test backend`. Detalle y salida en `evidence.md`.

| Casos | Task | Estado real |
|---|---|---|
| W1-AC1-T2 (2), W1-AC1-T3 | #7 / 3.1, 3.3 | EJECUTADO-FALLÓ: `Expected: 201`, `Received: 404` en `POST /onboarding` (endpoint sin implementar) |
| W1-AC2-T2 y W1-AC2-T3 (celular, documento, OTP) | #6 / 2.2, #7 / 3.2 | EJECUTADO-FALLÓ: 404 (sin implementar) |
| W1-AC3-T2, W1-AC3-T3 | #8 / 4.1, 4.2 | EJECUTADO-FALLÓ: 404 (sin implementar) |
| W1-AC3-T2 punto de pago en UI | #10 / 6.3 | NO EJECUTADO: el componente no existe |
| W1-AC4-T2 eventos | #9 / 5.1 | NO EJECUTADO: falta un contrato para observar los eventos (ver `decisions.md`) |

Resultado global: 14 pruebas fallan, 2 quedan `todo` y 2 existentes pasan. Ninguna tarea de OpenSpec se marca como completada.

## Trazabilidad AC ↔ caso ↔ tarea

| AC | Casos | Tasks relacionadas |
|---|---|---|
| W1-AC1 | `W1-AC1-T2`, `W1-AC1-T3` | 3.1, 3.3 |
| W1-AC2 | `W1-AC2-T2`, `W1-AC2-T3` | 2.2, 3.2 |
| W1-AC3 | `W1-AC3-T2`, `W1-AC3-T3` | 4.1, 4.2, 6.3 |
| W1-AC4 | `W1-AC4-T2` | 5.1 |

## Cobertura de técnicas y estado

- EP/BVA de celular: 8, 9 y 10 dígitos, y prefijo distinto de 9; propuestos, NO EJECUTADOS.
- EP/BVA de documento: 7/8/9 dígitos y alfanumérico; supuesto PROPUESTO de diseño, pendiente de confirmar, NO EJECUTADO.
- EP de OTP correcto/incorrecto: valores propuestos, NO EJECUTADOS.
- ST: inicio, avance, orden y activación; propuestos, NO EJECUTADOS.
- DT: wallet activa/inactiva para entrada de pago; componente no identificado, NO EJECUTADO.
- Eventos AC4: resultado esperado tomado del spec y la frontera aprobada; verificación bloqueada por falta de interfaz de observación.
- No se ejecutaron comandos ni se dispone de cobertura observada.