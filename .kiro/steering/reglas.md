# Reglas del proyecto · Quebrada Alerta

- **Hexagonal:** la lógica de negocio no importa nada de FastAPI, de la base ni de un proveedor externo. Los adaptadores van en `infraestructura/`.
- **Datos:** solo simulados o públicos. Nunca datos personales reales (nombres, celulares o correos) en el repositorio.
- **Secretos:** las credenciales se leen de variables de entorno. Nunca en el código ni en el zip.
- **Consentimiento:** un celular solo se registra con consentimiento explícito. La baja siempre es posible.
- **Alertas:** un dato no oficial no se envía a la gente. Lo automático solo se envía con fuente oficial y nivel urgente.
- **SMS:** en la demo, siempre al simulador. Un envío masivo exige confirmación explícita.
- **Pruebas:** cada regla de negocio tiene una prueba automática antes de integrarse.
