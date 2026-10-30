# Quebrada Alerta · Piura

Plataforma de alerta temprana de huaicos, desbordes e inundaciones en Piura, alimentada con fotos de vecinos. Tres perfiles: **vecino**, **brigadista** y **autoridad**.

Especificaciones completas en `.kiro/specs/` (requisitos, diseño y tareas).

## Estructura

```
alertas-brigadas/
  .kiro/specs/        requisitos, diseño y tareas
  backend/            API en Python (FastAPI, arquitectura hexagonal)
    src/alertas/      dominio · aplicacion · infraestructura · interfaces
    tests/            pruebas automáticas
    data/             datos públicos de Piura (INGEMMET, INEI)
  app/                aplicación web (React + Vite + Leaflet)
  template.yaml       despliegue en AWS SAM (Lambda + API Gateway)
  schema.sql          esquema de la base de datos (PostgreSQL)
```

## Correr en tu computadora

Backend:

```bash
cd backend
python -m pip install -r requirements.txt truststore
set PYTHONPATH=src
python -m uvicorn alertas.interfaces.http:app --app-dir src --port 8000
```

App:

```bash
cd app
npm install
npm run dev
```

Abre `http://localhost:5173/login`. Celular de prueba: cualquiera que empiece en 9. Código: **123456**.

## Pruebas

```bash
cd backend
set PYTHONPATH=src
python -m pytest -q tests
```

## Configuración (variables de entorno)

| Variable | Para qué | Valor por defecto |
|---|---|---|
| `AGENTE_ALMACEN_IMAGENES` | `local` o `cloudinary` | `local` |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta de Cloudinary | — |
| `CLOUDINARY_API_KEY` | Clave pública de Cloudinary | — |
| `CLOUDINARY_API_SECRET` | Secreto de Cloudinary (nunca en el código) | — |
| `ALERTAS_INTERVALO_S` | Cada cuántos segundos revisa el motor INGEMMET (0 = apagado) | `600` |
| `VITE_USE_MOCK` (app) | `true` = datos simulados; `false` = API real | `false` |
| `VITE_API_URL` (app) | Dirección de la API | `http://localhost:8000` |

## Fuentes de datos y servicios externos

Declarados para transparencia; ninguno recibe datos personales.

- **INGEMMET** (geocatmin.ingemmet.gob.pe): zonas críticas y peligros geológicos, consulta de solo lectura.
- **OpenStreetMap** (tiles y Nominatim): mapa base y búsqueda de calles.
- **Open-Meteo** (api.open-meteo.com): pronóstico de lluvia por coordenada.
- **Cloudinary** (opcional): almacén de fotos de vecinos.
- **INEI**: Censo 2017 y mapa de pobreza, datos agregados por distrito.

## Aviso

Los datos de peligros son históricos y se indican como tales en la app. Los SMS son simulados: no se envía ningún mensaje a celulares reales en la demo.

## Despliegue (AWS)

```bash
sam build
sam deploy --guided
```

El `template.yaml` crea la función Lambda y la API HTTP. El frontend se publica como sitio estático.
