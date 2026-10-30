# Quebrada Alerta · Frontend

Plataforma web **mobile first** de alerta temprana de huaicos, desbordes e inundaciones en Piura, alimentada con fotos de los vecinos. Tres perfiles con login por SMS: **vecino**, **brigadista** y **autoridad**.

Este frontend sigue el contrato de la **"Guía de integración frontend ↔ backend"**. Arranca con datos simulados y se conecta al backend real cambiando una variable.

---

## 1. Correrlo en 2 minutos

Requisitos: Node.js 18 o superior.

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run dev
```

Abre http://localhost:5173 (en el celular, usa la IP de tu laptop en la misma red: `npm run dev -- --host`).

**Modo demo** (`VITE_USE_MOCK=true`): ingresa cualquier celular válido (9 dígitos que empiecen en 9) y el código **123456**. Luego elige el perfil. Para probar otro perfil: Perfil → Cerrar sesión.

## 2. Conectar el backend real

En `.env`:

```
VITE_USE_MOCK=false
VITE_API_URL=/api/v1
```

- **En desarrollo**: `vite.config.ts` tiene un proxy de `/api` hacia `http://localhost:3000`. Cambia ese `target` por la URL del backend y te evitas problemas de CORS.
- **En producción**: pon la URL completa, por ejemplo `VITE_API_URL=https://api.tudominio.com/api/v1`, y habilita CORS en el backend para el dominio del frontend.

Todo el tráfico pasa por un solo archivo: `src/api/client.ts` (agrega el token `Bearer`, renueva sesión con `/auth/refresh` si recibe 401 y convierte errores `{ "error": { "code", "message" } }` en mensajes para el usuario).

## 3. Qué tiene que implementar el backend

Los tipos exactos están en `src/api/types.ts` y cada endpoint en `src/api/endpoints.ts`. Si el backend responde con esas formas, las pantallas funcionan sin tocar nada más. `src/api/mock.ts` sirve como ejemplo vivo de cada respuesta.

| Pantalla | Archivo | Endpoints |
| --- | --- | --- |
| Login por SMS | `pages/Login.tsx` | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /me/profile`, `GET /me` |
| Vecino · Alerta temprana | `pages/vecino/Inicio.tsx` | `GET /alerts/nearby`, `GET /layers/historical_events` |
| Vecino · Subir foto | `pages/vecino/SubirFoto.tsx` | `POST /photos/upload-url`, PUT a la URL firmada, `POST /photos` |
| Vecino · Vigilancia | `pages/vecino/Vigilancia.tsx` | `GET /points/{id}`, `GET /points/{id}/photos`, `POST /points/{id}/follow` |
| Brigadista · Mapa operativo | `pages/brigadista/MapaOperativo.tsx` | `GET /brigade/cases`, `GET /layers/heatmap`, `GET /layers/households`, `GET /points/{id}/impact`, `GET /points/{id}/routes` |
| Brigadista · Casos | `pages/brigadista/Casos.tsx` | `GET /brigade/cases?status=`, `PATCH /assignments/{id}`, `POST /assignments/{id}/verification` |
| Autoridad · Tablero | `pages/autoridad/Tablero.tsx` | `GET /dashboard/summary`, `GET /dashboard/ranking`, `POST /assignments` |
| Autoridad · Siniestro y SMS | `pages/autoridad/Siniestro.tsx` | `GET /points/{id}`, `POST /incidents`, `POST /incidents/{id}/broadcast/preview`, `POST /incidents/{id}/broadcast`, `GET /broadcasts/{id}` |
| Autoridad · Centro (escritorio) | `pages/autoridad/Centro.tsx` | `GET /dashboard/*`, `GET /layers/*`, `GET /points/{id}/photos` |

Reglas que el backend debe cumplir (detalle en la guía):

- El rol se valida en **cada endpoint**; el frontend solo oculta pantallas.
- Brigadista y autoridad quedan en `status: "pendiente_aprobacion"` hasta que una autoridad los apruebe. El login ya muestra la pantalla "Cuenta en revisión".
- `POST /photos` recalcula puntaje y nivel del punto y responde el nivel nuevo.
- El SMS masivo solo sale con `"confirm": true` y debe quedar en bitácora.
- Coordenadas en GeoJSON como `[longitud, latitud]`.

## 4. Estructura

```
src/
  api/
    types.ts        ← contrato (tipos de cada request y response)
    endpoints.ts    ← una función por endpoint
    client.ts       ← fetch, token, refresh, errores, subida de fotos
    mock.ts         ← backend simulado para la demo
  auth/AuthContext.tsx   ← sesión, OTP y perfil
  components/
    MapView.tsx     ← mapa Leaflet + OpenStreetMap (puntos, historial, calor, viviendas, rutas)
    ui.tsx          ← niveles, íconos, navegación, utilidades
  pages/            ← pantallas por perfil
  styles.css        ← tokens de la identidad visual
```

Rutas: `/login`, `/vecino`, `/vecino/foto`, `/vecino/punto/:id`, `/brigadista`, `/brigadista/casos`, `/autoridad`, `/autoridad/siniestro/:pointId`, `/autoridad/centro`, `/perfil`.

## 5. Notas para la demo

- En modo demo la ubicación se simula en Castilla (Piura) para que el mapa tenga datos; el botón **"Usar mi GPS"** activa el GPS real del celular. Con el backend real, el GPS se usa por defecto.
- El GPS y la cámara del celular solo funcionan en **HTTPS** o en `localhost`. Para probar en el celular con datos reales, despliega en Vercel o Netlify (son gratis) o usa un túnel HTTPS.
- Todos los números del mock son de ejemplo. Los eventos históricos del mock dicen `[fuente de ejemplo]`: se reemplazan con la capa real que integra el backend.
- Guion sugerido: vecino sube foto de alerta → el punto sube de nivel → brigadista ve la quebrada activada, familias y ruta, y confirma → autoridad activa el siniestro y envía el SMS.

## 6. Desplegar

```bash
npm run build      # genera dist/
```

Sube `dist/` a Vercel, Netlify o cualquier hosting estático. Como es una SPA, configura que toda ruta devuelva `index.html` (en Netlify: archivo `public/_redirects` con `/* /index.html 200`; en Vercel se detecta solo con Vite).

Para producción, cambia los tiles de `tile.openstreetmap.org` por un proveedor de mapas con plan propio: los servidores públicos de OSM no están pensados para tráfico alto.

## 7. Pendiente (fase 2)

Canal WhatsApp (reutiliza `POST /photos` desde un webhook), aprobación de cuentas, prevención con historial, registro de familias afectadas y exportación de reportes.
