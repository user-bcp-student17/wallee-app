<!-- test/evidence.md -->
# Evidencia (historia → task → test → evidencia)

Comando único: `python tools/wallee.py test backend`. Resultado: **NO EJECUTADO** hasta recibir la salida de `main.py`. Commit y PR: pendientes (los completa el Presenter, tarea 7.2).

| HU | AC | Task (tasks.md) | Test ID (archivo) | Comando | Resultado | Commit | PR |
|---|---|---|---|---|---|---|---|
| W1 | W1-AC1 | 3.1 | W1-AC1-T2 (`w1-onboarding-qa.e2e-spec.ts`) | `python tools/wallee.py test backend` | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC2 | 3.2 | W1-AC2-T2, W1-AC2-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC3 | 3.3, 4.1, 4.2 | W1-AC3-T2, W1-AC3-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC4 | 5.1 | W1-AC4-T2, W1-AC4-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W1 | verificación simulada | 2.2 | W1-REQ-IDENT-T2 | ídem | NO EJECUTADO | pendiente | pendiente |
| W1 | UI | 6.1–6.3 | no escrita | `python tools/wallee.py test frontend` | NO EJECUTADO | pendiente | pendiente |
| W2 | base | 1.1, 1.2 | W2-BASE-T2 | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC1 | 4.1 | W2-AC1-T2 (`w2-payments-qa.e2e-spec.ts`) | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC2 | 3.1, 4.2, 4.3 | W2-AC2-T2, W2-AC2-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC3 | 4.4 | W2-AC3-T2, W2-AC3-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC4 | 3.2, 4.4 | W2-AC4-T2, W2-AC4-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC6 (PARCIAL) | 4.5 | W2-AC6-T2, W2-AC6-T3 | ídem | NO EJECUTADO | pendiente | pendiente |
| W2 | UI | 5.1–5.4 | no escrita | `python tools/wallee.py test frontend` | NO EJECUTADO | pendiente | pendiente |
| Transversal | SEC-04/05 | — | SEC-05-T3 | `python tools/wallee.py test backend` | NO EJECUTADO | pendiente | pendiente |
| W1 / W2 | Integración | W1 7.1, W2 7.1 | recorrido por URL `http://localhost:3000` | — | NO EJECUTADO (no hay MCP ni navegador) | pendiente | pendiente |

## Ejecución de pruebas solicitada

- Fecha: 2026-11-06T15:43:52-05:00
- Comando configurado: `python tools/wallee.py test`
- Comando ejecutado: `C:\Users\Usuario\AppData\Local\Programs\Python\Python313\python.exe tools/wallee.py test`
- Estado: **FALLÓ** (`failed`)
- Código de salida: `1`
- Duración: 8.5 segundos
- Detalle: ninguno

<details><summary>Salida real (máximo 12 000 caracteres)</summary>

```text
[salida truncada; se muestra el final]
/app.e2e-spec.ts
FAIL test/onboarding.e2e-spec.ts
  ● W1 onboarding — API de integración › W1-AC1-T2 [EP] inicio lista los pasos propuestos y marca datos como actual

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:56:24)

  ● W1 onboarding — API de integración › W1-AC1-T2 [ST] completar datos actualiza el paso actual

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:66:24)

  ● W1 onboarding — API de integración › W1-AC1-T3 [ST] paso fuera de orden devuelve 409 y no cambia el progreso

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:83:24)

  ● W1 onboarding — API de integración › W1-AC2-T2 [EP/BVA] nombre vacío bloquea el avance con error accionable

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:130:26

  ● W1 onboarding — API de integración › W1-AC2-T2 [EP/BVA] celular ausente bloquea el avance con error accionable

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:130:26

  ● W1 onboarding — API de integración › W1-AC2-T2 [EP/BVA] celular de 8 dígitos bloquea el avance con error accionable

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:130:26

  ● W1 onboarding — API de integración › W1-AC2-T2 [EP/BVA] celular de 10 dígitos bloquea el avance con error accionable

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:130:26

  ● W1 onboarding — API de integración › W1-AC2-T2 [EP/BVA] celular de 9 dígitos que no empieza en 9 bloquea el avance con error accionable

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:130:26

  ● W1 onboarding — API de integración › W1-AC2-T3 [EP/BVA] documento de 7 dígitos no completa identidad según el formato propuesto

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:161:26

  ● W1 onboarding — API de integración › W1-AC2-T3 [EP/BVA] documento de 9 dígitos no completa identidad según el formato propuesto

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:161:26

  ● W1 onboarding — API de integración › W1-AC2-T3 [EP/BVA] documento alfanumérico no completa identidad según el formato propuesto

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at onboarding.e2e-spec.ts:161:26

  ● W1 onboarding — API de integración › W1-AC2-T3 [EP/ST] OTP incorrecto permite reintentar sin activar la wallet

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:184:24)

  ● W1 onboarding — API de integración › W1-AC3-T3 [ST] wallet incompleta permanece pendiente

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:216:24)

  ● W1 onboarding — API de integración › W1-AC3-T2 [ST] wallet se activa solo tras completar los tres pasos

    expect(received).toBe(expected) // Object.is equality

    Expected: 201
    Received: 404

    [0m [90m 36 |[39m       [33m.[39msend({})[33m;[39m
     [90m 37 |[39m
    [31m[1m>[22m[39m[90m 38 |[39m     expect(response[33m.[39mstatus)[33m.[39mtoBe([35m201[39m)[33m;[39m
     [90m    |[39m                             [31m[1m^[22m[39m
     [90m 39 |[39m     expect(response[33m.[39mbody[33m.[39monboardingId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 40 |[39m     expect(response[33m.[39mbody[33m.[39mwalletId)[33m.[39mtoBeTruthy()[33m;[39m
     [90m 41 |[39m[0m

      at crearOnboarding (onboarding.e2e-spec.ts:38:29)
      at Object.<anonymous> (onboarding.e2e-spec.ts:226:24)

Test Suites: 1 failed, 1 passed, 2 total
Tests:       14 failed, 2 todo, 2 passed, 18 total
Snapshots:   0 total
Time:        3.911 s, estimated 4 s
Ran all test suites.

```

</details>
