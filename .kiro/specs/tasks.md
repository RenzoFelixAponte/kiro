# Tareas · Quebrada Alerta (Piura)

## Hecho

- [x] Dominio de alertas (estados, reglas de aprobación) con pruebas.
- [x] Prioridad por distrito con desglose, con pruebas.
- [x] Motor de detección de zonas nuevas, con pruebas (incluida la caída de la fuente).
- [x] Automatización: incidentes y alertas; envío automático solo con fuente oficial y nivel urgente.
- [x] API de alertas, incidentes y vecinos (consentimiento obligatorio).
- [x] Simulador de SMS con bitácora de mensajes.
- [x] Login por SMS (código de demo 123456), perfil con rol, alertas cercanas, capas de calor e histórico.
- [x] Subida de fotos (subir, registrar, código) con almacén local o Cloudinary.
- [x] Búsqueda de calle en Piura.
- [x] Búsqueda histórica por distrito con mapa y barras.
- [x] Pruebas del backend: 23 pasan.

## Pendiente

- [ ] Endpoints de brigadista: mapa operativo, casos, cambio de estado, verificación en campo.
- [ ] Endpoints de autoridad: tablero, ranking, siniestros, asignación de brigadas, SMS masivo con confirmación y bitácora.
- [ ] Pantalla de vigilancia de un punto.
- [ ] Punto de respaldo cuando no hay puntos cerca de la ubicación.
- [ ] Revisión en navegador de cada perfil de punta a punta.
- [ ] `lambda_handler` con Mangum y despliegue real con `sam deploy`.
- [ ] Publicar el frontend y obtener la URL pública https.
- [ ] Decidir la lista final de servicios externos para la entrega.
