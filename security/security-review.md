<!-- security/security-review.md -->
# Revisión de seguridad — W1 y W2 (borrador, NO EJECUTADO)

No se ejecutó ninguna herramienta. Lo siguiente es lo revisado sobre el spec y lo propuesto como verificación. Aún no se vio el código del módulo de onboarding ni el de pagos.

| ID | Control | Hallazgo o riesgo | Ubicación | Impacto | Corrección propuesta | Verificación | Estado |
|---|---|---|---|---|---|---|---|
| SEC-01 | Sin secretos / `.env.example` falso | El OTP fijo y el límite deben ir en configuración; no se vio `.env.example` | repo de la app | Medio | `.env.example` con valores falsos | gitleaks o búsqueda por patrones | NO EJECUTADO |
| SEC-02 | Solo datos sintéticos | Los tests usan celulares y documentos inventados | `test/*.e2e-spec.ts` | Bajo | Mantenerlo | Revisión | Cubierto en diseño |
| SEC-03 | Logs sin celular completo ni documento | Sin evidencia de cómo registra la app | módulos nuevos | Medio | Enmascarar | W1-SEC03-T3 (parcial) y revisión de logs | NO EJECUTADO |
| SEC-04 | Errores sin stack trace | Riesgo con DTOs mal configurados o ids con formato inválido | filtros globales | Medio | Filtro de excepciones | W1-SEC04-T3 | NO EJECUTADO |
| SEC-05 | Entradas hostiles; consultas parametrizadas | Campos extra podrían activar la wallet (mass assignment) | DTOs y TypeORM | **Alto si ocurre** | `whitelist` y `forbidNonWhitelisted`; sin SQL concatenado | W1-SEC05-T3, W2-AC4-T3 EG | NO EJECUTADO |
| SEC-06 | Un usuario solo ve y paga con SU wallet | **No hay autenticación (non-goal W1/W2).** Cualquiera con un `walletId` consulta y paga | `/wallets/:id`, `/payments` | **Alto (aceptado en el MVP)** | Documentarlo en el README como deuda; no hay prueba posible hoy | n/a | **NO PROBABLE: falta insumo** (DECISIÓN 3) |
| SEC-07 | El agente no mueve dinero | No aplica a W1/W2; tests solo contra mocks | — | — | — | `python -m unittest discover -s tests` | NO EJECUTADO (fuera del sprint) |
| SEC-08 | HITL en reversos | No aplica (W5) | — | — | — | — | FUERA DEL ALCANCE |
| SEC-09 | No inventar resultados | Todo marcado NO EJECUTADO | `test/evidence.md` | — | — | Salida real de `main.py` | Cumplido en este borrador |

## Riesgos adicionales

- **OTP fijo en producción (D7).** Si no se bloquea fuera de producción, es una puerta de entrada. Queda `it.todo`.
- **Idempotencia.** Dos POST /payments idénticos duplican el cobro hasta que exista W4. Está fuera de este sprint, pero hay que declararlo.
- **Restricción UNIQUE en BD** para la referencia de transacción. Se exigirá en W4 para la clave de idempotencia.
- **Dependencias.** `npm audit` y `eslint-plugin-security` propuestos; los ejecuta la persona.