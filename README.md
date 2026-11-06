# Wallee App

Aplicación web de Wallee: **React** (frontend) y **NestJS** (backend), con **Podman** para pruebas y despliegue.
El repo [wallee](https://github.com/user-bcp-student17/wallee) contiene el Crew de agentes; este repo contiene el producto.

## Estructura

```text
backend/    NestJS 10 + TypeScript (API en :3000)
frontend/   React 18 + Vite + TypeScript (dev en :5173)
tools/      wallee.py: ejecuta instalación, pruebas y despliegue
compose.yaml  despliegue local con Podman
AGENTS.md   instrucciones para agentes de IA
```

El backend conserva el endpoint `GET /health`; el frontend presenta una demostración de onboarding.

## W1: demostración de onboarding

La pantalla permite completar los pasos propuestos `datos`, `identidad` y `verificacion`. La API valida los datos y el orden, y activa la wallet simulada al completarlos. Las rutas propuestas son `POST /onboarding`, `GET /onboarding/:id` y `PUT /onboarding/:id/steps/:step`; el frontend las consume mediante `/api`. Los errores de validación devuelven `400` con código `VALIDATION_ERROR` y una lista `errors` con campo y mensaje; los pasos fuera de orden devuelven `409` con código `STEP_OUT_OF_ORDER`.

La identidad y el OTP son simulados, sin proveedores externos. El código de prueba es `123456` o el valor de `MOCK_OTP`, exclusivamente fuera de producción. En producción la verificación simulada devuelve `503`; el Compose local configura explícitamente `NODE_ENV=development` para la demo. Los registros y eventos se guardan solo en memoria y se pierden al reiniciar. El formato de documento de 8 dígitos y las rutas son propuestas pendientes de aprobación. No se implementan pagos ni integración BCP.

## Base de datos

El backend persiste en **SQLite con TypeORM** (`backend/src/database/`), modelada a partir de `mock-api/bcp-wallet-mock-openapi.yaml`. Es la propuesta del arquitecto y sigue **pendiente de confirmación del Product Owner**. Aún no hay servicios que lean o escriban estas tablas: el onboarding W1 sigue guardando en memoria.

| Tabla | Contenido |
| --- | --- |
| `customers` | Cliente; documento y datos personales opcionales hasta completar el onboarding. |
| `wallets` | Estado `ACTIVE/PENDING/REJECTED`, `balance` y `reserved` en céntimos de PEN (`available = balance - reserved`, se calcula). |
| `kyc_verifications` | Verificación KYC simulada por wallet (`APPROVED/REJECTED/MANUAL_REVIEW`). |
| `onboarding_processes`, `onboarding_events` | Proceso W1 y eventos `onboarding_started`, `onboarding_step_completed`, `onboarding_completed`. |
| `recipients`, `qrs` | Destinatarios (`contact-demo`, `merchant-demo`) y QR `qrmock:ID` con monto abierto (`null`) o fijo. |
| `payments`, `reversals`, `payment_events` | Pagos con `Idempotency-Key` única por wallet, un reverso por pago y eventos con contador `delivered`. |
| `provider_payments` | Fuente del proveedor simulado; sin FK a `payments` porque el modo `ORPHAN` crea IDs desconocidos. |
| `ledger_entries` | Partida doble con importes con signo; `account` es wallet, `funding` o `clearing`. |
| `support_cases`, `settlement_adjustments`, `reconciliation_incidents` | Soporte, alteraciones del reporte y conciliación. |

Los importes son enteros en céntimos y las restricciones (`CHECK`, `UNIQUE`, claves foráneas) replican los rangos y enums del contrato. El esquema se crea con la migración `InitialSchema1730000000000` al arrancar; `synchronize` está desactivado.

Variables (ver `backend/.env.example`): `DB_PATH` (por defecto `data/wallee.sqlite`, o `:memory:`) y `DB_SEED`. Con `DB_SEED=true` se repone idempotentemente `wallet-demo` con 100000 céntimos, dos asientos `FUNDING` de apertura y los destinatarios demo, como `/control/reset` del mock. Compose activa la semilla y guarda la base en el volumen `wallee-data` (`/app/data`). Los datos son simulados, no una integración con BCP.

## Requisitos

- Node.js 20 o superior (recomendado 22) y npm.
- Python 3.11 o superior, solo para `tools/wallee.py`.
- Podman 4 o superior con un proveedor de `podman compose` (`podman-compose` o `docker-compose`).
  En Windows y macOS inicia la máquina con `podman machine start`.

## Desarrollo local

```sh
python tools/wallee.py setup        # npm ci en backend y frontend
python tools/wallee.py start backend    # http://localhost:3000
python tools/wallee.py start frontend   # http://localhost:5173
```

En desarrollo Vite redirige `/api` al backend (`http://localhost:3000`). Copia `backend/.env.example` a `backend/.env` si necesitas cambiar el puerto o los orígenes CORS.

## Pruebas

```sh
python tools/wallee.py test                 # local: pruebas, cobertura (85 %) y build
python tools/wallee.py test backend         # solo un componente
python tools/wallee.py podman-test          # en contenedores, con la misma cobertura
```

`podman-test` construye la etapa `test` de cada `Dockerfile` (`podman build --target test`); falla si las pruebas o el umbral de cobertura fallan.

## Despliegue con Podman

```sh
python tools/wallee.py up      # equivale a: podman compose up --build -d
python tools/wallee.py down    # equivale a: podman compose down
```

- Frontend (nginx sin privilegios): `http://localhost:8090`. Cambia el puerto con `FRONTEND_PORT`.
- Backend: `http://localhost:3000/health`.
- nginx reenvía `/api/` al backend dentro de la red de Compose.
- Los puertos se publican solo en `127.0.0.1`.

## Integración continua

`.github/workflows/ci.yml` ejecuta pruebas, cobertura y build de cada componente, y las pruebas en contenedores con Podman.
Cada PR sigue la plantilla de `.github/PULL_REQUEST_TEMPLATE.md` y requiere revisión humana.
