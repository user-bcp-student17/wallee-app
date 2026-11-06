<!-- test/evidence.md -->
# Evidencia QA — W1 Onboarding guiado

## Estado de ejecución

Ejecución real el 2026-11-06 en la rama `qa-security` de la app, con el comando `python tools/wallee.py test backend` (`npm run test:cov` y `npm run test:e2e`; el `build` no corrió porque el comando se detuvo en el paso anterior). Código de salida: `1`.

| Paso | Resultado real |
|---|---|
| `npm run test:cov` | `PASS src/health/health.controller.spec.ts`; `Tests: 1 passed, 1 total` |
| `npm run test:e2e` | `PASS test/app.e2e-spec.ts` y `FAIL test/onboarding.e2e-spec.ts`; `Test Suites: 1 failed, 1 passed, 2 total`; `Tests: 14 failed, 2 todo, 2 passed, 18 total` |

Causa de las 14 fallas: todas terminan en `Expected: 201` y `Received: 404` al llamar `POST /onboarding`. El backend de esta rama solo tiene `GET /health`: las rutas de onboarding no están implementadas (AI Engineer 1). Es el resultado esperado y no un defecto de las pruebas. Los 2 `todo` son casos de la propia suite que quedan pendientes.

| HU | AC | Caso(s) | Comando exacto | Resultado | Commit | PR |
|---|---|---|---|---|---|---|
| W1 | W1-AC1 | `W1-AC1-T2`, `W1-AC1-T3` | `python tools/wallee.py test backend` | EJECUTADO-FALLÓ (404, endpoint sin implementar) | Pendiente | Pendiente |
| W1 | W1-AC2 | `W1-AC2-T2`, `W1-AC2-T3` | `python tools/wallee.py test backend` | EJECUTADO-FALLÓ (404, endpoint sin implementar) | Pendiente | Pendiente |
| W1 | W1-AC3 | `W1-AC3-T2`, `W1-AC3-T3` | `python tools/wallee.py test backend` | EJECUTADO-FALLÓ (404, endpoint sin implementar) | Pendiente | Pendiente |
| W1 | W1-AC4 | `W1-AC4-T2` | `python tools/wallee.py test backend` | NO EJECUTADO; además, falta contrato observable de lectura de eventos | Pendiente | Pendiente |

## Evidencia pendiente

- Adjuntar la salida real del comando de prueba de la app en rama `qa-security`.
- Registrar commit y PR cuando existan; no se inventan identificadores.
- Para 7.1, aportar evidencia del recorrido local completo por backend y frontend. MCP no está configurado; no se ha ejercitado UI.
- Para 7.2, verificar que las filas W1-AC1 a W1-AC4 de la matriz de discovery incluyan test, commit, PR y evidencia reales.
- Registrar cobertura observada y contrastarla con el umbral del mapa: 85%.
- No marcar ninguna tarea de OpenSpec como completada sin código y salida real que la sustenten.