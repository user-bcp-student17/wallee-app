<!-- test/evidence.md -->
# Evidencia — Sprint 1 (W1 y W2)

Comando para todas las filas: `python tools/wallee.py test backend`
Resultado: **NO EJECUTADO** hasta que `main.py` entregue la salida real. Commit y PR: pendientes (los completa el owner).

| HU | AC / tarea | Test ID | Archivo | Resultado | Commit | PR |
|---|---|---|---|---|---|---|
| W1 | 2.1 | 2.1-T2 arranque | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | 2.2 | 2.2-T2 OTP correcto / distinto | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | 2.2 | prueba unitaria directa del mock | por definir (DECISIÓN 2) | NO EJECUTADO (propuesto) | pendiente | pendiente |
| W1 | W1-AC1 | W1-AC1-T2 inicio, avance; T3 orden | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC2 | W1-AC2-T2 celular, nombre, documento, código; T3 reintento | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC3 | W1-AC3-T2, W1-AC3-T3 | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | W1-AC4 | W1-AC4-T2 | onboarding-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W1 | UI 6.1 a 6.3 | propuestos (Vitest) | por crear | NO EJECUTADO | pendiente | pendiente |
| W1 | 7.1 recorrido | recorrido por URL | — | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC1 | W2-AC1-T2, T3 | payments-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC2 | W2-AC2-T2 (x5), T3 callback | payments-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC3 | W2-AC3-T2 | payments-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC4 | W2-AC4-T2, W2-AC4-T3 | payments-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W2 | W2-AC6 (PARCIAL) | W2-AC6-T2 | payments-qa.e2e-spec.ts | NO EJECUTADO | pendiente | pendiente |
| W2 | UI 5.1 a 5.4 | propuestos (Vitest) | por crear | NO EJECUTADO | pendiente | pendiente |
| Sec. | npm audit, eslint-plugin-security, gitleaks | propuestos | — | NO EJECUTADO | — | — |
| Crew | `python -m unittest discover -s tests` (SEC-07, SEC-08) | fuera de este sprint | — | NO EJECUTADO | — | — |

## Ejecución de pruebas solicitada

- Fecha: 2026-11-06T15:31:51-05:00
- Comando configurado: `python tools/wallee.py test`
- Comando ejecutado: `C:\Users\Usuario\AppData\Local\Programs\Python\Python313\python.exe tools/wallee.py test`
- Estado: **FALLÓ** (`failed`)
- Código de salida: `1`
- Duración: 9.5 segundos
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
Time:        4.559 s, estimated 8 s
Ran all test suites.

```

</details>
