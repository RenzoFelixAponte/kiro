# Diseño · Quebrada Alerta (Piura)

## Arquitectura hexagonal

```
            ┌──────────────────────── interfaces ────────────────────────┐
 navegador ─┤  HTTP (FastAPI)   ·   Lambda (Mangum, AWS)                 │
            └───────────────┬────────────────────────────────────────────┘
                            ▼
            ┌──────────────────── aplicación ────────────────────────────┐
            │  casos de uso: GestionarAlertas, Automatizacion, motor     │
            │  puertos: AlmacenImagenes, ProveedorSMS, FuenteAlertas...  │
            └───────────────┬────────────────────────────────────────────┘
                            ▼
            ┌──────────────────── dominio ───────────────────────────────┐
            │  Alerta (borrador→aprobada→enviada), Incidente, prioridad  │
            └────────────────────────────────────────────────────────────┘
                            ▲
            ┌──────────────── infraestructura (adaptadores) ─────────────┐
            │  memoria · simulador SMS · INGEMMET · Cloudinary / local    │
            └────────────────────────────────────────────────────────────┘
```

Las reglas de negocio viven en el dominio y la aplicación. La infraestructura se cambia sin tocar esas reglas: por ejemplo, Cloudinary o almacenamiento local (`AGENTE_ALMACEN_IMAGENES`).

## Componentes

| Componente | Ubicación | Responsabilidad |
|---|---|---|
| Dominio de alertas | `backend/src/alertas/dominio/alerta.py` | Estados y reglas de la alerta |
| Prioridad | `backend/src/alertas/dominio/prioridad.py` | Exposición × vulnerabilidad × urgencia |
| Motor de detección | `backend/src/alertas/aplicacion/motor.py` | Detecta zonas nuevas; si la fuente cae, no genera avisos falsos |
| Automatización | `backend/src/alertas/aplicacion/automatizacion.py` | Crea incidentes y alertas; envío automático solo con fuente oficial y nivel urgente |
| Contrato vecino | `backend/src/alertas/interfaces/quebrada.py` | Login por SMS, perfil, alertas cercanas, capas, subida de fotos, búsqueda de calle, histórico |
| Almacén de imágenes | `backend/src/alertas/infraestructura/almacen_imagenes.py` | Local o Cloudinary (firma SHA-1) |
| Frontend | `app/src/` | Pantallas por rol; modo demo o API real con `VITE_USE_MOCK` |

## Modelo de datos (demo, en memoria)

- **Usuario:** id, celular, nombre, rol, estado, distrito, posición.
- **Incidente:** id, tipo, distrito, región, lat, lon, fuente, origen (automático o brigada), nivel de la fuente.
- **Alerta:** id, texto, fuente, nivel, distritos, redactada por, estado, aprobada por, enviados.
- **Foto:** id, usuario, punto, URL de la imagen, objetivo, señal, comentario, lat, lon, fecha.
- **Vecino (consentimiento):** celular, distrito, consentimiento, fecha de baja.

El esquema para PostgreSQL está en `alertas-brigadas/schema.sql`. Para la entrega en AWS, la capa de repositorios se cambia por DynamoDB o RDS sin tocar la aplicación.

## Decisiones

1. **Aprobación por defecto:** todos los roles quedan activos al elegir su rol (demo).
2. **SMS:** simulador; nunca se envía a números reales en la demo.
3. **Ubicación:** el GPS del vecino se calcula en su navegador y no se guarda en el servidor.
4. **Datos de peligro:** INGEMMET (zonas críticas y peligros geológicos). Son históricos para la demo y así se indica en pantalla.
5. **Fotos:** Cloudinary con firma; si no hay credenciales, almacenamiento local.

## Despliegue

- `template.yaml` (AWS SAM): una función Lambda con Python 3.12 que sirve la API a través de API Gateway (HTTP API).
- El frontend se publica como sitio estático (S3 + CloudFront o Amplify).
- Las variables de entorno se configuran en AWS, no en el código.
