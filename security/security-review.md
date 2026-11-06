<!-- security/security-review.md -->
# Revisión de seguridad W1 + W2 (borrador; nada ejecutado)

| Control | Hallazgo / riesgo | Ubicación | Impacto | Corrección propuesta | Verificación | Estado |
|---|---|---|---|---|---|---|
| SEC-01 sin secretos | No revisado: falta salida de búsqueda de patrones. OTP `123456` debe estar en config y solo fuera de producción | repo, `.env.example`, config del mock | Medio | `gitleaks detect` o búsqueda por patrones; `.env.example` con valores falsos | La persona ejecuta el escaneo | PENDIENTE |
| SEC-02 solo sintéticos | Fixtures (directorio, celulares `9000000dd`) deben ser inventados | fixtures de la tarea 1.2 | Medio | Revisión manual | W2-BASE-T2 verifica existencia, no la naturaleza sintética | PENDIENTE |
| SEC-03 logs sin celular completo, documento ni tokens | No revisado: los logs no están en el contexto | módulos onboarding y payments | Medio | Enmascarar `phone` y `documento` en logs | Revisión de código y de logs por la persona | PENDIENTE |
| SEC-04 errores sin stack | Cubierto por `assertNoLeak` en errores 400/404/409/422 | todos los controladores | Medio | Filtro global de excepciones con código estable | SEC-05-T3 y los casos de error | NO EJECUTADO |
| SEC-05 entradas hostiles y parametrizadas | Lotes de monto, destino y campos extra; el ValidationPipe puede configurarse solo en `main.ts` y no en el módulo | DTOs, `main.ts` | Alto si falla | `ValidationPipe` global como `APP_PIPE`; consultas parametrizadas TypeORM | SEC-05-T3; `eslint-plugin-security` (propuesto) | NO EJECUTADO |
| SEC-06 un usuario solo ve y paga con SU wallet | **Riesgo:** el diseño identifica al pagador solo por `walletId` (sin autenticación, Non-Goal) y cualquiera con un id puede pagar o leer el historial de otra wallet | `POST /payments`, `GET /wallets/:id/payments` | Alto en producción; Medio en el alcance MOCK | Declarar la limitación en README (trade-off) o añadir token de sesión mock | No se escribió prueba porque no hay modelo de usuario: **NO PROBABLE** | DECISIÓN QA-D3 |
| SEC-06b callback sin autenticación | **Riesgo:** `POST /payments/:id/callback` permite a cualquiera forzar APPROVED sobre un PENDING | callback | Alto en producción; mock | Firma o secreto compartido del callback mock; endpoint solo fuera de producción | W2-AC2-T2 cubre el flujo, no la autenticación | PENDIENTE (declarar en README) |
| SEC-07 agente no mueve dinero | Fuera de este sprint (W5); no hay Crew en el alcance de W1/W2 | — | — | — | `python -m unittest discover -s tests` no aplica | N/A |
| SEC-08 HITL en reversos | Fuera de alcance (W5) | — | — | — | — | N/A |
| SEC-09 sin pruebas ni resultados inventados | Todo caso figura NO EJECUTADO; las suposiciones de contrato están declaradas | `test/` | — | — | Esta revisión | CUMPLIDO en el borrador |
| Dependencias | `npm audit` en `backend/` y `frontend/` | package.json | Medio | Ejecutarlo | Salida aportada por la persona | PENDIENTE |
| Integridad de datos | La migración de W2 debe conservar wallets de W1; UNIQUE en `reference`; saldo sin float (céntimos) | tarea 2.1 | Alto | Restricción UNIQUE; decimales fijos | Prueba de migración (PROPUESTO, no escrita) | PENDIENTE |
| Concurrencia sobre el saldo | Dos pagos simultáneos a la misma wallet podrían gastar de más. Es W4, no se prueba aquí | tarea 4.4 | Alto | Transacción con bloqueo | W4 | FUERA DEL ALCANCE (declarado) |