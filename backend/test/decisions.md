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