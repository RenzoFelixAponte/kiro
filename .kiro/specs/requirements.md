# Requisitos · Quebrada Alerta (Piura)

Plataforma de alerta temprana de huaicos, desbordes e inundaciones en Piura, alimentada con fotos de vecinos.
Tres perfiles: **vecino**, **brigadista** y **autoridad**. Usa datos simulados o públicos. No guarda datos personales reales de la demo.

## Actores

- **Vecino:** recibe alertas de su zona, ve el mapa de riesgo y sube fotos de quebradas o ríos.
- **Brigadista:** ve el mapa operativo, los casos asignados y confirma en campo.
- **Autoridad:** ve el tablero priorizado, activa siniestros, envía SMS masivos (con confirmación) y asigna brigadas.

## Requisitos funcionales

### Acceso
- **RF-01** El usuario entra con su celular de 9 dígitos (acepta +51). Recibe un código por SMS de 6 dígitos.
- **RF-02** Al validar el código, el usuario elige su rol y su nombre.
- **RF-03** Vecino, brigadista y autoridad quedan activos al elegir su rol. (Demo: aprobación por defecto.)
- **RF-04** Cada endpoint valida el rol del usuario; la interfaz solo oculta pantallas.

### Vecino
- **RF-10** Ver un mapa de la zona con la posición del vecino, el historial de zonas críticas y los eventos activos.
- **RF-11** Ver la lista de eventos a menos de 5 km, ordenados por distancia.
- **RF-12** Subir una foto de una quebrada o río. La ubicación puede ser el GPS actual o una calle escrita.
- **RF-13** Al subir una foto, recibir un código de registro y el nivel del punto.
- **RF-14** Buscar una calle de Piura y obtener sus coordenadas.

### Brigadista
- **RF-20** Ver el mapa operativo con los puntos activos y su nivel.
- **RF-21** Ver los casos asignados y cambiar su estado (asignado, en camino, en campo, cerrado).
- **RF-22** Verificar un caso en campo con una nota.

### Autoridad
- **RF-30** Ver un tablero con el resumen y el ranking de puntos por prioridad.
- **RF-31** Crear un siniestro desde un punto.
- **RF-32** Previsualizar y enviar un SMS masivo. El envío exige `confirm: true` y queda registrado en la bitácora.
- **RF-33** Asignar una brigada a un punto.

### Datos y mapas
- **RF-40** Mostrar la capa de calor de zonas críticas de Piura (INGEMMET, El Niño 2026-2027).
- **RF-41** Mostrar incidentes en vivo: los detectados automáticamente y los reportados por brigadas.
- **RF-42** Buscar eventos históricos por distrito, con mapa y barras por distrito.

### Automatización
- **RF-50** Un motor consulta cada 10 minutos la fuente oficial (INGEMMET) y registra solo las zonas nuevas.
- **RF-51** Una zona nueva crea un incidente y una alerta en borrador.
- **RF-52** Una alerta solo se envía sola si la fuente es oficial y el nivel es urgente. Lo demás espera aprobación.

## Requisitos no funcionales

- **RNF-01 Privacidad:** no se guardan celulares ni nombres en texto plano en la bitácora pública; la ubicación del vecino se usa solo en su navegador para calcular distancias.
- **RNF-02 Seguridad:** las credenciales (Cloudinary, AWS) se leen de variables de entorno, nunca del código.
- **RNF-03 Accesibilidad:** la app funciona en celular, con texto legible y botones grandes.
- **RNF-04 Confiabilidad:** si una fuente externa no responde, el sistema sigue funcionando y no envía alertas falsas.
- **RNF-05 Pruebas:** la lógica de dominio y los casos de uso tienen pruebas automáticas (`python -m pytest -q tests`).

## Fuera de alcance (demo)

- Envío real de SMS (se usa un simulador).
- Cuentas con contraseña o verificación de identidad.
- Datos personales reales de vecinos.
