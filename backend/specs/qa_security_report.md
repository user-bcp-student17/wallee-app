# Informe QA & Security — W1 Onboarding guiado

**Destino:** repositorio de la app `wallee-app`, rama `qa-security`; rutas de los bloques relativas a `backend/`, según `output_target_dir`.  
**Alcance:** cambio activo `w1-onboarding-guiado`, únicamente W1-AC1 a W1-AC4.  
**Ejecución:** no se ejecutaron comandos ni pruebas. Todo caso y revisión propuestos están **NO EJECUTADO** hasta que la persona ejecute los comandos y aporte la salida real.  
**Estado de tareas:** no marco tareas de OpenSpec como hechas. No hay salida real que sustente su cierre.

## 0. Inventario de alcance y discrepancias

| HU / AC | Criterio en alcance | Fuente principal | Contraparte en discovery | Observación |
|---|---|---|---|---|
| W1-AC1 | Mostrar la secuencia completa de pasos y el paso actual; avanzar al paso siguiente tras completar el actual. | OpenSpec, `wallet-onboarding`: “Secuencia de pasos visible”. | W1-AC1; RN-09, RN-10. | El diseño propone tres pasos (`datos`, `identidad`, `verificacion`); esa secuencia no está definida por el discovery. |
| W1-AC2 | Bloquear avance ante campos obligatorios vacíos, celular inválido o código de verificación incorrecto; mostrar error accionable. | OpenSpec: “Bloqueo del avance con datos faltantes o inválidos”. | W1-AC2; RN-09. | El documento de 8 dígitos, los campos y el OTP fijo `123456` son propuestas de `design.md`, pendientes de confirmar. |
| W1-AC3 | Activar la wallet únicamente al completar todos los pasos; la wallet incompleta sigue pendiente y no accede al pago. | OpenSpec: “Activación de la wallet al finalizar”. | W1-AC3; RN-10. | El contrato permite comprobar estado por API, pero no especifica una ruta para probar acceso visual al punto de pago. |
| W1-AC4 | Registrar inicio, un evento por paso y cierre, con marca de tiempo del servidor. | OpenSpec: “Registro de eventos del onboarding”. | W1-AC4; RN-17. | No se define una interfaz de lectura de eventos para una prueba de caja negra. |

**Requisitos adicionales del spec dentro de W1:** la verificación simulada reproducible (OTP/KYC) se prueba como parte de W1-AC2 y del recorrido de W1-AC3. No se invoca ni se presenta un proveedor externo real.

**Fuera del alcance del sprint:** W2, W3, W4, W5 y W6. W1-AC5 y W1-AC6 también están fuera del alcance: son KPI diferidos; solo corresponde verificar que se emitan los eventos comprometidos de AC4.

### Diferencias spec/discovery y límites de lo que se puede verificar

- El spec añade un escenario de código incorrecto y un requisito explícito de verificación simulada; el discovery cubre la validación de datos de forma general, sin especificar OTP.
- Los nombres y cantidad de pasos, los campos por paso, el documento de 8 dígitos y el OTP `123456` provienen del diseño y están marcados PROPUESTO. Los casos los tratan como valores de prueba propuestos, no como decisiones de producto confirmadas.
- La tarea 5.1 define el orden y cantidad esperados de eventos, pero no hay una API de lectura de eventos en el contrato D5. El caso de AC4 queda propuesto, pero bloqueado para ejecución verificable por API hasta acordar una vía de observación.
- El contexto aprobado indica que DEC-04/DEC-05 resolvieron PA-01 a PA-10. Por ello, no trato PA-01 ni PA-10 como decisiones abiertas, aunque algunos documentos y tareas citados aún los describan como pendientes. Para PA-01 uso la frontera aprobada en el discovery: inicio en `onboarding_started`, fin en `onboarding_completed` con wallet activa.
- `tasks.md` registra **0/16 tareas hechas**. El mapa identifica la rama `qa-security`, backend con pruebas Jest/Supertest, frontend con Vitest/Testing Library, cobertura objetivo de 85% y MCP no configurado. No se ha comprobado el estado de ejecución ni la cobertura.

## 1. Plan de pruebas

Las entradas siguen el contrato descrito por el spec y el diseño propuesto: `name`, `phone`, `document`, `code`; rutas `POST /onboarding`, `GET /onboarding/:id`, `PUT /onboarding/:id/steps/:stepKey` y `GET /wallets/:id`. Los campos y pasos marcados como propuestos deben confirmarse antes de considerar definitivo el resultado esperado.

| ID / nombre del caso | Tarea | AC / requisito / regla | Técnica | Precondiciones y datos sintéticos | Resultado esperado | Prioridad | Estado |
|---|---|---|---|---|---|---|---|
| `W1-AC1-T2` — inicio lista los pasos y marca el actual | #7, 3.1 | W1-AC1; secuencia visible | EP | Backend de prueba; `POST /onboarding`; pasos propuestos `datos`, `identidad`, `verificacion`. | `201`; lista de pasos contiene la secuencia acordada y `currentStep` identifica el primero. | Alta | NO EJECUTADO |
| `W1-AC1-T2` — avance actualiza paso visible | #7, 3.1 | W1-AC1; avance al siguiente paso | ST | Onboarding nuevo; `datos={name:"Usuario Sintetico", phone:"912345678"}`. | Tras completar el paso válido, este figura completado y `currentStep` pasa a `identidad`. | Alta | NO EJECUTADO |
| `W1-AC1-T3` — paso fuera de orden no altera progreso | #7, 3.3 | W1-AC1; orden propuesto D3 | ST | Onboarding nuevo; intentar `verificacion` antes de `datos`. | `409`, código estable `STEP_OUT_OF_ORDER`; el progreso y el paso actual no cambian. | Alta | NO EJECUTADO |
| `W1-AC2-T2` — campo obligatorio ausente o vacío | #7, 3.2 | W1-AC2; RN-09 | EP / DT | Probar por separado nombre vacío y celular ausente en `datos`. | `400`, `VALIDATION_ERROR`; error accionable identifica el campo y el paso no avanza. | Alta | NO EJECUTADO |
| `W1-AC2-T2` — celular de 8 dígitos | #7, 3.2 | W1-AC2; formato indicado en spec | BVA | Celular sintético `91234567`. | `400`, `VALIDATION_ERROR`, mensaje indica el formato esperado; progreso intacto. | Alta | NO EJECUTADO |
| `W1-AC2-T2` — celular de 10 dígitos | #7, 3.2 | W1-AC2; formato indicado en spec | BVA | Celular sintético `9123456780`. | `400`, `VALIDATION_ERROR`; progreso intacto. | Alta | NO EJECUTADO |
| `W1-AC2-T2` — celular de 9 dígitos con prefijo inválido | #7, 3.2 | W1-AC2; RN-04 | EP | Celular sintético `812345678`. | `400`, `VALIDATION_ERROR`; error accionable y sin avance. | Alta | NO EJECUTADO |
| `W1-AC2-T3` — documento no conforme al diseño propuesto | #7, 3.2 | W1-AC2; D6 PROPUESTO | BVA / EP | Probar `1234567`, `123456789` y `12ABC678`. | Si se confirma el formato propuesto de ocho dígitos numéricos: cada valor inválido devuelve `400`, señala `document` y no avanza. | Media | NO EJECUTADO; formato pendiente de confirmar |
| `W1-AC2-T3` — código OTP incorrecto permite reintentar | #6, 2.2; #7, 3.2 | W1-AC2; requisito de verificación simulada | EP / ST | Completar pasos anteriores con datos sintéticos; enviar código `000000`. | `400`, `VALIDATION_ERROR`, mensaje de reintento; permanece en verificación y no activa la wallet. | Alta | NO EJECUTADO; OTP fijo propuesto |
| `W1-AC2-T3` — OTP válido en mock de prueba | #6, 2.2; #7, 3.2 | W1-AC2; requisito de verificación simulada | EP / ST | Completar datos e identidad; enviar `123456` fuera de producción. | El paso se completa sin depender de un proveedor externo; OTP correcto no debe activar por sí solo la wallet antes de completar todo el flujo. | Alta | NO EJECUTADO; OTP fijo propuesto |
| `W1-AC3-T2` — recorrido completo activa wallet | #8, 4.1 | W1-AC3; transición de wallet | ST | Completar los tres pasos con datos sintéticos y OTP propuesto. | Onboarding `COMPLETADO`; `GET /wallets/:id` devuelve `ACTIVA` solo tras completar todos los pasos. | Alta | NO EJECUTADO |
| `W1-AC3-T3` — paso pendiente mantiene wallet inactiva | #8, 4.2 | W1-AC3; RN-10 | ST / DT | Iniciar onboarding sin completar pasos; consultar wallet. | `GET /wallets/:id` devuelve `PENDIENTE_ONBOARDING`; no se concede acceso de pago. La comprobación de interfaz queda pendiente. | Alta | NO EJECUTADO |
| `W1-AC3-T2` — punto de pago visible solo con wallet activa | #10, 6.3 | W1-AC3; RN-10 | DT | Prueba de componente frontend para estados `PENDIENTE_ONBOARDING` y `ACTIVA`. | El punto de entrada aparece solo para `ACTIVA`. No hay componente/ruta frontend identificada en el mapa actual para emitir aquí una prueba de componente ejecutable. | Alta | NO EJECUTADO; bloqueado por disponibilidad del componente |
| `W1-AC4-T2` — eventos del recorrido en orden y con hora de servidor | #9, 5.1 | W1-AC4; frontera aprobada de PA-01 | ST | Recorrido completo; observar eventos por una interfaz de prueba acordada. | Un `onboarding_started`, tres `onboarding_step_completed` identificando el paso y un `onboarding_completed`, en ese orden, con marcas de tiempo del servidor. | Media | NO EJECUTADO; falta contrato de observación |

### Matriz de trazabilidad bidireccional

| AC / requirement | Casos propuestos | Tasks cubiertas |
|---|---|---|
| W1-AC1 — secuencia y paso actual | `W1-AC1-T2` (inicio, avance), `W1-AC1-T3` (orden) | #7: 3.1, 3.3 |
| W1-AC2 — validación y mensajes accionables | `W1-AC2-T2` (campos requeridos, celular), `W1-AC2-T3` (documento y OTP) | #6: 2.2; #7: 3.2 |
| W1-AC3 — activación condicionada | `W1-AC3-T2` (recorrido completo), `W1-AC3-T3` (wallet pendiente), `W1-AC3-T2` (UI, bloqueado) | #8: 4.1, 4.2; #10: 6.3 |
| W1-AC4 — registro de eventos | `W1-AC4-T2` | #9: 5.1 |

**Particiones y límites propuestos:** para celular se cubren 8, 9 y 10 dígitos y prefijo inválido frente al prefijo 9 especificado; para documento se propone 7/8/9 dígitos y entrada alfanumérica, pero el formato sigue pendiente de confirmar; para OTP se cubren código incorrecto y código de prueba propuesto. No hay límites de monto en W1. **Ejecución real:** ninguna partición o límite tiene evidencia aportada.

## 2. Pruebas automatizadas propuestas

El siguiente archivo es una propuesta para integración/API. No fue ejecutado. Se debe revisar y adaptar al módulo y a los DTOs reales de la app antes de integrarlo; no se ha comprobado que todas las importaciones o el esquema de respuesta existan. Los casos de eventos y de UI quedan como pendientes, no como pruebas pasadas.

```typescript
// test/onboarding.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('W1 onboarding — API de integración', () => {
  let app: INestApplication;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    // El OTP fijo propuesto solo debe estar habilitado fuera de producción.
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  async function crearOnboarding(): Promise<Record<string, any>> {
    const response = await request(app.getHttpServer())
      .post('/onboarding')
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.onboardingId).toBeTruthy();
    expect(response.body.walletId).toBeTruthy();

    return response.body;
  }

  async function completarPaso(
    onboardingId: string,
    stepKey: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .put(`/onboarding/${onboardingId}/steps/${stepKey}`)
      .send(body);
  }

  it('W1-AC1-T2 [EP] inicio lista los pasos propuestos y marca datos como actual', async () => {
    const onboarding = await crearOnboarding();

    expect(Array.isArray(onboarding.steps)).toBe(true);
    expect(JSON.stringify(onboarding.steps)).toContain('datos');
    expect(JSON.stringify(onboarding.steps)).toContain('identidad');
    expect(JSON.stringify(onboarding.steps)).toContain('verificacion');
    expect(onboarding.currentStep).toBe('datos');
  });

  it('W1-AC1-T2 [ST] completar datos actualiza el paso actual', async () => {
    const onboarding = await crearOnboarding();

    const update = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });

    expect(update.status).toBe(200);

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);

    expect(progress.status).toBe(200);
    expect(progress.body.currentStep).toBe('identidad');
  });

  it('W1-AC1-T3 [ST] paso fuera de orden devuelve 409 y no cambia el progreso', async () => {
    const onboarding = await crearOnboarding();

    const update = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '123456' },
    );

    expect(update.status).toBe(409);
    expect(update.body.code).toBe('STEP_OUT_OF_ORDER');

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);

    expect(progress.status).toBe(200);
    expect(progress.body.currentStep).toBe('datos');
  });

  it.each([
    {
      label: 'nombre vacío',
      body: { name: '', phone: '912345678' },
      field: 'name',
    },
    {
      label: 'celular ausente',
      body: { name: 'Usuario Sintetico' },
      field: 'phone',
    },
    {
      label: 'celular de 8 dígitos',
      body: { name: 'Usuario Sintetico', phone: '91234567' },
      field: 'phone',
    },
    {
      label: 'celular de 10 dígitos',
      body: { name: 'Usuario Sintetico', phone: '9123456780' },
      field: 'phone',
    },
    {
      label: 'celular de 9 dígitos que no empieza en 9',
      body: { name: 'Usuario Sintetico', phone: '812345678' },
      field: 'phone',
    },
  ])(
    'W1-AC2-T2 [EP/BVA] $label bloquea el avance con error accionable',
    async ({ body, field }) => {
      const onboarding = await crearOnboarding();
      const response = await completarPaso(
        onboarding.onboardingId,
        'datos',
        body,
      );

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(response.body).toLowerCase()).toContain(
        field.toLowerCase(),
      );
      expect(JSON.stringify(response.body)).not.toMatch(
        /stack trace|node_modules|at \w+\s*\(/i,
      );

      const progress = await request(app.getHttpServer())
        .get(`/onboarding/${onboarding.onboardingId}`);

      expect(progress.status).toBe(200);
      expect(progress.body.currentStep).toBe('datos');
    },
  );

  it.each([
    { label: 'documento de 7 dígitos', document: '1234567' },
    { label: 'documento de 9 dígitos', document: '123456789' },
    { label: 'documento alfanumérico', document: '12ABC678' },
  ])(
    'W1-AC2-T3 [EP/BVA] $label no completa identidad según el formato propuesto',
    async ({ document }) => {
      const onboarding = await crearOnboarding();

      const datos = await completarPaso(onboarding.onboardingId, 'datos', {
        name: 'Usuario Sintetico',
        phone: '912345678',
      });
      expect(datos.status).toBe(200);

      const identidad = await completarPaso(
        onboarding.onboardingId,
        'identidad',
        { document },
      );

      expect(identidad.status).toBe(400);
      expect(identidad.body.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(identidad.body).toLowerCase()).toContain(
        'document',
      );
    },
  );

  it('W1-AC2-T3 [EP/ST] OTP incorrecto permite reintentar sin activar la wallet', async () => {
    const onboarding = await crearOnboarding();

    const datos = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });
    expect(datos.status).toBe(200);

    const identidad = await completarPaso(
      onboarding.onboardingId,
      'identidad',
      { document: '12345678' },
    );
    expect(identidad.status).toBe(200);

    const verificacion = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '000000' },
    );

    expect(verificacion.status).toBe(400);
    expect(verificacion.body.code).toBe('VALIDATION_ERROR');

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC3-T3 [ST] wallet incompleta permanece pendiente', async () => {
    const onboarding = await crearOnboarding();

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('PENDIENTE_ONBOARDING');
  });

  it('W1-AC3-T2 [ST] wallet se activa solo tras completar los tres pasos', async () => {
    const onboarding = await crearOnboarding();

    const datos = await completarPaso(onboarding.onboardingId, 'datos', {
      name: 'Usuario Sintetico',
      phone: '912345678',
    });
    expect(datos.status).toBe(200);

    const identidad = await completarPaso(
      onboarding.onboardingId,
      'identidad',
      { document: '12345678' },
    );
    expect(identidad.status).toBe(200);

    const verificacion = await completarPaso(
      onboarding.onboardingId,
      'verificacion',
      { code: '123456' },
    );
    expect(verificacion.status).toBe(200);

    const progress = await request(app.getHttpServer())
      .get(`/onboarding/${onboarding.onboardingId}`);
    expect(progress.status).toBe(200);
    expect(progress.body.status).toBe('COMPLETADO');

    const wallet = await request(app.getHttpServer())
      .get(`/wallets/${onboarding.walletId}`);

    expect(wallet.status).toBe(200);
    expect(wallet.body.status).toBe('ACTIVA');
  });

  it.todo(
    'W1-AC3-T3 [UI] verificar que el punto de entrada de pago no aparece con wallet pendiente y aparece con ACTIVA; falta componente frontend identificable',
  );

  it.todo(
    'W1-AC4-T2 [ST] observar eventos de inicio, tres pasos y cierre, orden y marcas de tiempo; falta contrato de lectura de eventos para caja negra',
  );
});
```

**Cobertura de tareas de construcción no asumida:** la prueba de integración propuesta no sustituye la prueba unitaria de 2.2 solicitada por `tasks.md`; no se ha identificado en la estructura disponible un módulo de mock de identidad junto al cual crearla. Tampoco se generó una prueba de componente frontend: el mapa tiene como destino QA `backend/`, el frontend detectado solo muestra `src/api`, y no se identificó un componente de onboarding. Las tareas de construcción son responsabilidad de sus roles asignados.

## 3. Evidencia por AC

```markdown
<!-- test/evidence.md -->
# Evidencia QA — W1 Onboarding guiado

## Estado de ejecución

No se ejecutaron pruebas ni comandos durante la elaboración de este documento. No hay salida real aportada por la persona; por tanto, ningún caso se marca como pasado o fallido.

| HU | AC | Caso(s) | Comando exacto a ejecutar | Resultado | Commit | PR |
|---|---|---|---|---|---|---|
| W1 | W1-AC1 | `W1-AC1-T2`, `W1-AC1-T3` | `python tools/wallee.py test` | NO EJECUTADO | No registrado | No registrado |
| W1 | W1-AC2 | `W1-AC2-T2`, `W1-AC2-T3` | `python tools/wallee.py test` | NO EJECUTADO | No registrado | No registrado |
| W1 | W1-AC3 | `W1-AC3-T2`, `W1-AC3-T3` | `python tools/wallee.py test` | NO EJECUTADO | No registrado | No registrado |
| W1 | W1-AC4 | `W1-AC4-T2` | `python tools/wallee.py test` | NO EJECUTADO; además, falta contrato observable de lectura de eventos | No registrado | No registrado |

## Evidencia pendiente

- Adjuntar la salida real del comando de prueba de la app en rama `qa-security`.
- Registrar commit y PR cuando existan; no se inventan identificadores.
- Para 7.1, aportar evidencia del recorrido local completo por backend y frontend. MCP no está configurado; no se ha ejercitado UI.
- Para 7.2, verificar que las filas W1-AC1 a W1-AC4 de la matriz de discovery incluyan test, commit, PR y evidencia reales.
- Registrar cobertura observada y contrastarla con el umbral del mapa: 85%.
- No marcar ninguna tarea de OpenSpec como completada sin código y salida real que la sustenten.
```

**Comando definido por el mapa:** `python tools/wallee.py test`. Se registra como comando futuro; no se ejecutó aquí.

## 4. Revisión de seguridad

```markdown
<!-- security/security-review.md -->
# Revisión de seguridad — W1 Onboarding

## Alcance y limitación

Revisión de escritorio basada solo en el spec, discovery, mapa y detección estructural proporcionados. No se ejecutó análisis estático, auditoría de dependencias, revisión de logs ni prueba dinámica. No se inspeccionó código fuente suficiente para confirmar controles implementados. Los estados de abajo no afirman que una verificación haya pasado.

| Control | Ubicación / evidencia disponible | Impacto si falla | Corrección o control requerido | Verificación propuesta | Estado |
|---|---|---|---|---|---|
| SEC-01 Secretos y `.env.example` | No se aportó contenido del repositorio ni del `.env.example`. | Exposición de credenciales, OTP o configuración sensible. | Revisar que solo existan valores ficticios en `.env.example`; excluir secretos del repo; rotar cualquier secreto real si se descubre. | Búsqueda por patrones y gitleaks ejecutados por la persona; registrar salida real. | NO VERIFICADO |
| SEC-02 Datos sintéticos | Las entradas de prueba propuestas son datos inventados; no se inspeccionó la base de datos ni fixtures existentes. | Exposición de datos personales en pruebas/demo. | Usar exclusivamente fixtures sintéticos para nombre, celular y documento; no copiar datos reales. | Inspeccionar fixtures, pruebas y datos locales antes de compartir evidencia. | PROPUESTO; NO VERIFICADO |
| SEC-03 Logs sin datos sensibles | No se aportaron logs de la app. | Fuga de celular completo, documento, OTP o tokens en logs. | Enmascarar o excluir identificadores y secretos de logs; evitar registrar el código OTP. | Ejecutar recorrido sintético y revisar logs reales; comprobar ausencia de valores completos. | NO VERIFICADO |
| SEC-04 Errores sin detalles internos | El contrato propone HTTP adecuado, código de motivo estable y mensajes accionables; no se inspeccionó la implementación. | Filtración de stack trace, rutas, SQL o configuración interna. | Mantener errores públicos controlados; registrar detalle técnico solo en logs protegidos y saneados. | Casos de validación y errores; revisar respuestas para stack traces y detalles internos. | NO VERIFICADO |
| SEC-05 Entradas manipuladas | El spec define validación de nombre, celular y código; diseño propone documento de ocho dígitos. No se inspeccionaron DTOs ni consultas. | Inyección, corrupción de datos, fallos de validación o XSS si el nombre se muestra sin escape. | DTOs con validación del servidor; límites de longitud; consultas parametrizadas; escapar salida en UI. La política de caracteres permitidos para nombre no está definida y no debe inventarse. | Casos EP/BVA propuestos; revisar consultas y renderizado; entradas hostiles con evidencia real. | PARCIALMENTE DEFINIDO; NO EJECUTADO |
| SEC-06 Separación por usuario / wallet | `design.md` declara autenticación y sesiones fuera de alcance. No hay mecanismo de identidad/propiedad especificado para restringir `GET /onboarding/:id` y `GET /wallets/:id`. | Un cliente que conozca o adivine un identificador podría leer datos o consultar otra wallet. | Definir un mecanismo de propiedad/autorización antes de exponer los endpoints fuera de demo aislada. El identificador opaco por sí solo no sustituye autorización. | Prueba con dos identidades sintéticas; confirmar acceso propio y rechazo de acceso cruzado. | RIESGO DE DISEÑO ALTO; decisión requerida |
| SEC-07 El agente no mueve dinero ni ejecuta reversos | Pagos y reversos están fuera del alcance W1; no se aportó comportamiento del Crew. | Acción monetaria autónoma si un agente se conecta indebidamente a herramientas. | Mantener W1 aislado de herramientas monetarias; revisar guardrails del Crew en la capa que incluya ese alcance. | Pruebas deterministas del Crew cuando corresponda; no se ejecutaron en este trabajo. | FUERA DEL ALCANCE W1; NO VERIFICADO |
| SEC-08 HITL para reversos, disputas y excepciones críticas | W1 no implementa reversos ni disputas; no se aportó evidencia del Crew. | Ejecución sin aprobación humana de acciones críticas. | Aprobación humana obligatoria en el alcance que gestione dichas acciones; escalar excepciones con contexto. | Suite de guardrails/HITL correspondiente; no ejecutada aquí. | FUERA DEL ALCANCE W1; NO VERIFICADO |
| SEC-09 No inventar resultados | No se ejecutaron comandos ni pruebas; la evidencia se marca NO EJECUTADO. | Reportes engañosos o decisiones basadas en resultados ficticios. | Adjuntar salidas reales de la persona antes de marcar tests o tareas como hechos. | Revisar que cada resultado incluya comando y salida real aportada. | CUMPLIDO EN ESTE INFORME; sin ejecución que reportar |

## Dependencias de seguridad pendientes

- Auditoría de dependencias con `npm audit` en la app; no ejecutada.
- Revisión de código con `eslint-plugin-security`; no se conoce ni se ejecutó el comando disponible.
- Búsqueda de secretos con gitleaks o patrones; no ejecutada.
- Confirmar autorización y propiedad de wallet, además de política de acceso para endpoints de onboarding.
- Confirmar valores de diseño marcados PROPUESTO antes de cerrar las pruebas dependientes de ellos.
```

## 5. Bugs y hallazgos

**Bugs confirmados:** ninguno reportable. No se ejecutaron casos contra la app y no se aportó una salida que permita reproducir un comportamiento observado. No se inventan resultados `Obtenido` ni evidencias.

**Hallazgos de diseño/riesgo, no bugs confirmados:**

- **SEC-06 — riesgo alto:** el diseño excluye autenticación/sesiones y no define cómo se vincula una solicitud con la wallet de su usuario. Esto impide verificar el control “un usuario solo ve su wallet”. Se necesita decisión antes de considerar seguros los endpoints fuera de una demo aislada.
- **AC4 — brecha de verificabilidad:** el spec exige persistir eventos, pero el contrato de API no define cómo observarlos en una prueba de integración de caja negra. La prueba queda bloqueada por falta de interfaz de observación aprobada.
- **Pruebas frontend — pendientes:** no se identificó el componente de onboarding en la estructura disponible y MCP no está configurado. No hay prueba de componente ni E2E de UI emitido; el recorrido 7.1 queda NO EJECUTADO.
- **Diseño propuesto — pendiente de confirmación:** cantidad/nombres de pasos, campos, documento de ocho dígitos y OTP fijo. Los resultados que dependan de estos valores no deben tratarse como criterio de producto definitivo sin confirmación.

## 6. Decisiones HITL pendientes

**DECISIÓN REQUERIDA — Categoría: alto impacto | Contexto: W1-AC1/W1-AC2/W1-AC3, D2/D6/D7 | Opciones: A) aprobar los tres pasos y campos propuestos, documento de ocho dígitos y OTP fijo `123456` solo fuera de producción; B) definir una secuencia y formatos distintos; C) dejar estos detalles sin confirmar y no cerrar los tests que dependen de ellos | Recomendación: A si representa el flujo acordado, registrando formalmente la aprobación; de lo contrario, B | Impacto: cambian los datos de prueba, las validaciones esperadas y el recorrido completo; sin confirmación estos casos siguen pendientes | Pregunta a: Product Owner humano.**

**DECISIÓN REQUERIDA — Categoría: ambigüedad | Contexto: W1-AC4, task 5.1 | Opciones: A) aprobar una interfaz de lectura de eventos disponible solo para pruebas; B) autorizar consulta de persistencia en una prueba de integración con fixture controlado; C) aceptar otra evidencia verificable definida por Architect | Recomendación: A o B con acceso restringido a pruebas y sin exponer datos de eventos innecesariamente | Impacto: sin observabilidad acordada, no se puede verificar AC4 por la API ni cerrar la tarea 5.1 | Pregunta a: Architect.**

**DECISIÓN REQUERIDA — Categoría: alto impacto | Contexto: SEC-06, endpoints de W1 y D5 | Opciones: A) definir autenticación/propiedad de wallet antes de exponerlos; B) limitar explícitamente el uso a una demo local aislada y no considerarlos seguros para usuarios; C) aceptar acceso sin identidad | Recomendación: A para cualquier uso fuera de demo aislada; B solo como límite temporal documentado; no recomendar C | Impacto: sin decisión no es verificable que un usuario no consulte otra wallet; riesgo de acceso no autorizado | Pregunta a: Architect para contrato técnico y Product Owner humano si requiere modificar alcance.**

Los valores globales aprobados de negocio no se vuelven a consultar aquí. La discrepancia entre documentos antiguos que llaman pendientes a PA-01/PA-10 y la aprobación DEC-04/DEC-05 del contexto se registra como documentación desactualizada, no como nueva decisión de producto.

## 7. Estado de HU y checkpoint

| HU | Estado | Checkpoint | Motivo / reporte |
|---|---|---|---|
| W1 | **PARCIAL** | **ROJO** | El discovery ya clasifica W1 como PARCIAL por AC5/AC6 diferidos. Dentro del alcance del sprint, AC1–AC4 siguen sin evidencia de ejecución; las tareas del cambio figuran pendientes. Reportar a Product Owner y Architect; solicitar al equipo implementador evidencia y contrato de eventos. |
| W2 | FUERA DEL ALCANCE DEL SPRINT | No aplica | No se prueban pagos en este sprint. |
| W3 | FUERA DEL ALCANCE DEL SPRINT | No aplica | Stretch no activado. |
| W4 | FUERA DEL ALCANCE DEL SPRINT | No aplica | No se prueban idempotencia ni callbacks en este sprint. |
| W5 | FUERA DEL ALCANCE DEL SPRINT | No aplica | No se prueban soporte ni reversos en este sprint. |
| W6 | FUERA DEL ALCANCE DEL SPRINT | No aplica | Stretch no activado. |

El checkpoint **no está verde**: no hay pruebas ejecutadas aportadas, no se ha demostrado el recorrido local de 7.1 y no se ha completado la evidencia de 7.2. No afirmo que la app falle; su comportamiento queda sin verificar.

## 8. Freeze y aporte propuesto al README

### Checklist previo al Freeze

- [ ] README documenta ejecución backend/frontend, contrato vigente y que KYC/OTP son MOCK.
- [ ] El README no declara cobertura ni resultados sin salida real.
- [ ] Los valores de diseño pendientes de confirmar están resueltos o señalados como pendientes.
- [ ] Se dispone de prueba verificable para la secuencia de eventos de AC4.
- [ ] Se define el control de autorización/propiedad de wallet antes de exposición no aislada.
- [ ] Casos propuestos ejecutados por la persona con salidas reales y fallos reportados.
- [ ] Cobertura real de las HU del alcance informada frente al umbral de 85% del mapa.
- [ ] Recorrido local completo hasta wallet `ACTIVA` verificado sin intervención manual.
- [ ] La matriz W1-AC1 a W1-AC4 incluye test, commit, PR y evidencia reales.
- [ ] El equipo revisa diagrama e instrucciones en un clon limpio; no verificado en este informe.
- [ ] Se registra en GitHub el código de QA revisado e integrado; no se afirma que haya sido subido.

### Texto propuesto para README, sección 6 “Evidencia y pruebas”

> **Evidencia y pruebas — W1:** las pruebas de onboarding y la revisión de seguridad están en preparación. Hasta adjuntar salidas reales en `backend/test/evidence.md`, los casos se consideran **NO EJECUTADOS**. La meta de cobertura configurada en el mapa del proyecto es 85%; no se reporta cobertura obtenida en este momento. El recorrido completo de alta, la lectura de eventos y las pruebas de interfaz están pendientes de verificación.

### Texto propuesto para README, sección 7 “Trade-offs”

> **Trade-offs y deuda conocida — W1:** KYC, OTP y biometría son simulados; no existe integración real con proveedores de identidad. La secuencia de pasos, los campos, el formato de documento y el OTP fijo descritos en el diseño están pendientes de confirmación. El contrato de API no define una forma de observar los eventos para una prueba de caja negra. Además, el diseño excluye autenticación y sesiones, por lo que la propiedad de wallet requiere una decisión y verificación antes de cualquier exposición más allá de una demo local aislada. W1-AC5 y W1-AC6 son KPI diferidos; no se miden en este sprint.

## 9. Archivos de QA y decisiones

```markdown
<!-- test/test-plan.md -->
# Plan de pruebas — W1 Onboarding guiado

## Condiciones

- Alcance: W1-AC1 a W1-AC4 del cambio OpenSpec activo `w1-onboarding-guiado`.
- Los nombres de pasos, campos de documento y OTP fijo están pendientes de confirmación cuando proceden del diseño PROPUESTO.
- Los casos y comandos de este plan son propuestas. No se ejecutaron pruebas: todos los estados son NO EJECUTADO.
- Datos sintéticos solamente. No efectuar pagos, reversos ni acciones monetarias.
- Comando global definido por el mapa: `python tools/wallee.py test`.

## Casos

| ID / nombre | Task | AC / requisito / RN | Técnica | Precondición y entrada sintética | Resultado esperado | Prioridad | Estado |
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
```

```markdown
<!-- test/decisions.md -->
# Decisiones QA pendientes — W1 Onboarding

## Decisiones de producto/diseño pendientes de confirmar

1. **D2/D6/D7 — pasos y formatos propuestos.** El diseño propone `datos`, `identidad`, `verificacion`; nombre/celular, documento de ocho dígitos y OTP fijo `123456` fuera de producción. Los casos usan estos valores solo como datos propuestos. Confirmación requerida al Product Owner humano antes de convertirlos en contrato definitivo.
2. **Observabilidad de AC4.** El spec exige eventos, pero no hay endpoint de lectura en D5. Solicitar al Architect una forma autorizada de verificar eventos sin inventar una API ni afirmar que el registro existe.
3. **SEC-06 — propiedad/autorización.** El diseño declara autenticación y sesiones fuera del alcance. Solicitar al Architect una definición de protección de los recursos y al Product Owner una decisión si supone ampliar el alcance.

## Referencias desactualizadas

El contexto aprobado indica DEC-04/DEC-05 y resolución de PA-01 a PA-10. Por eso no se reabren PA-01 o PA-10. Los documentos que todavía las llaman pendientes deben sincronizarse con esas decisiones; la frontera de eventos usada es `onboarding_started` a `onboarding_completed` con wallet activa.

## Estado de ejecución

No se ejecutaron comandos ni pruebas. No se registra ningún resultado, commit o PR como existente.
```

**No se escriben pruebas en `wallee`.** Los bloques son propuestas para revisión en la app y no constan como guardados, ejecutados, subidos ni integrados.