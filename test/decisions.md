<!-- test/decisions.md -->
# Decisiones — QA & Security

| ID | Fecha | Decisión | Estado | Responsable |
|---|---|---|---|---|
| D-QA-01 | 2026-11-06 | Cifras aprobadas (S/ 500, 24 h, mapeo mock, etiquetas) tratadas como reglas aprobadas (DEC-04, DEC-05). | Aprobada | PO |
| D-QA-02 | 2026-11-06 | Código de error `VALIDATION_ERROR` (tasks.md) en lugar de `VALIDATION_FAILED` (Architect). | Asumida, por confirmar | Architect |
| D-QA-03 | 2026-11-06 | Pasos, campos, documento de 8 dígitos y OTP `123456` PROPUESTOS en design.md. | PENDIENTE DE CONFIRMAR | PO |
| D-QA-04 | 2026-11-06 | Pruebas de W1 y W2 por contrato HTTP; lectura de eventos con `DataSource` (nombres de entidad `OnboardingEvent`, `PaymentEvent`). | Asumida | Architect |
| D-QA-05 | 2026-11-06 | W2-AC6 se mantiene PARCIAL; no se prueba MAU. | Aprobada (spec/discovery) | PO |
| D-QA-06 | 2026-11-06 | Prueba unitaria directa del mock (2.2): ver DECISIÓN REQUERIDA 2. | Abierta | Architect |