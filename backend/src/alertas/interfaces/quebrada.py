"""Contrato de la app «Quebrada Alerta» (vecino): login por SMS, perfil, alertas cercanas y capas del mapa.

Los datos vienen de la misma fuente que el resto del sistema: incidentes en vivo (automáticos y de brigadas)
y las zonas críticas de INGEMMET (data/zonas_piura.json). El código de la demo es 123456.
"""
import json
import math
import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from alertas.dominio.incidente import Incidente

CODIGO_DEMO = "123456"
ZONAS = json.loads((Path(__file__).resolve().parents[3] / "data" / "zonas_piura.json").read_text(encoding="utf-8"))
NIVELES_ORDEN = ["normal", "atencion", "alerta", "emergencia"]


def _distancia_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _nivel_de_incidente(i: Incidente) -> str:
    return "alerta" if i.origen == "brigada" else "atencion"


class OtpPedido(BaseModel):
    phone: str = Field(min_length=9, max_length=20)

    def celular(self) -> str:
        """Acepta 987654321, +51 987 654 321 o 51987654321; devuelve los 9 dígitos."""
        digitos = "".join(ch for ch in self.phone if ch.isdigit())
        if digitos.startswith("51") and len(digitos) == 11:
            digitos = digitos[2:]
        if not (len(digitos) == 9 and digitos.startswith("9")):
            raise ValueError("El celular debe tener 9 dígitos y empezar en 9")
        return digitos


class OtpVerificacion(BaseModel):
    request_id: str
    code: str


class Perfil(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    role: str
    district: str | None = None
    lat: float | None = None
    lon: float | None = None


def registrar_contrato_vecino(app, incidentes_repo, almacen=None) -> None:
    """Monta las rutas del contrato. `incidentes_repo` son los incidentes en vivo; `almacen` guarda las fotos."""
    subidas: dict[str, dict] = {}    # token de subida -> {content_type, image_url}
    fotos: list[dict] = []           # fotos registradas por vecinos
    codigos = iter(range(100000, 999999))
    usuarios: dict[str, dict] = {}   # token -> usuario
    por_telefono: dict[str, dict] = {}
    pedidos: dict[str, str] = {}     # request_id -> teléfono
    router = APIRouter()

    def usuario_actual(request: Request) -> dict:
        token = (request.headers.get("authorization") or "").removeprefix("Bearer ").strip()
        if token not in usuarios:
            raise HTTPException(status_code=401, detail="Sesión no válida")
        return usuarios[token]

    @router.post("/auth/otp/request")
    def pedir_codigo(p: OtpPedido) -> dict:
        try:
            telefono = p.celular()
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        rid = secrets.token_urlsafe(8)
        pedidos[rid] = telefono
        return {"request_id": rid, "expires_in": 300}

    @router.post("/auth/otp/verify")
    def verificar_codigo(v: OtpVerificacion) -> dict:
        telefono = pedidos.get(v.request_id)
        if telefono is None or v.code != CODIGO_DEMO:
            raise HTTPException(status_code=401, detail="Código incorrecto")
        usuario = por_telefono.get(telefono)
        if usuario is None:
            usuario = {"id": secrets.token_hex(6), "phone": telefono, "name": None, "role": None,
                       "status": "nuevo", "district": None, "lat": None, "lon": None}
            por_telefono[telefono] = usuario
        token = secrets.token_urlsafe(24)
        usuarios[token] = usuario
        return {"access_token": token, "refresh_token": token, "user": usuario}

    @router.get("/me")
    def yo(request: Request) -> dict:
        return usuario_actual(request)

    @router.post("/me/profile")
    def completar_perfil(p: Perfil, request: Request) -> dict:
        u = usuario_actual(request)
        if p.role not in ("vecino", "brigadista", "autoridad"):
            raise HTTPException(status_code=422, detail="Rol no válido")
        u.update(name=p.name, role=p.role, district=p.district, lat=p.lat, lon=p.lon)
        # Por defecto todos quedan aprobados (demo). Para exigir aprobación, cambiar aquí a "pendiente_aprobacion".
        u["status"] = "activo"
        return u

    @router.get("/alerts/nearby")
    def alertas_cerca(lat: float, lon: float, radius_m: int = 5000) -> dict:
        cercanos = []
        for i in incidentes_repo.listar():
            if i.lat is None or i.lon is None:
                continue
            d = _distancia_m(lat, lon, i.lat, i.lon)
            if d <= radius_m:
                cercanos.append({"id": str(i.id), "code": f"INC-{i.id}", "name": i.tipo, "type": "quebrada",
                                 "level": _nivel_de_incidente(i), "lat": i.lat, "lon": i.lon,
                                 "distance_m": round(d), "is_official_critical": i.origen == "automatico"})
        historicos = sum(1 for z in ZONAS if _distancia_m(lat, lon, z["lat"], z["lon"]) <= radius_m)
        nivel = max((c["level"] for c in cercanos), key=NIVELES_ORDEN.index, default="normal")
        razon = (f"{len(cercanos)} evento(s) activo(s) a menos de {radius_m} m" if cercanos
                 else "Sin eventos activos cerca de tu ubicación")
        return {"zone_level": nivel, "reason": razon,
                "rain_warning": {"active": False, "source": "Open-Meteo"},
                "points": sorted(cercanos, key=lambda c: c["distance_m"]), "historical_nearby": historicos}

    def _fc(features: list[dict]) -> dict:
        return {"type": "FeatureCollection", "features": features}

    @router.get("/layers/historical_events")
    def historicos() -> dict:
        return _fc([{"type": "Feature", "geometry": {"type": "Point", "coordinates": [z["lon"], z["lat"]]},
                     "properties": {"type": "huaico" if "flujo" in z["tipo"].lower() or "detritos" in z["tipo"].lower() else "inundacion", "date": "El Niño 2026-2027", "source": "INGEMMET", "distrito": z["distrito"], "tipo": z["tipo"]}}
                    for z in ZONAS])

    @router.get("/layers/critical_zones")
    def zonas_criticas() -> dict:
        return historicos()

    @router.get("/layers/heatmap")
    def mapa_de_calor() -> dict:
        feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [z["lon"], z["lat"]]},
                  "properties": {"weight": 1, "fuente": "INGEMMET"}} for z in ZONAS]
        feats += [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [i.lon, i.lat]},
                   "properties": {"weight": 3 if i.origen == "brigada" else 2, "fuente": i.fuente}}
                  for i in incidentes_repo.listar() if i.lat is not None and i.lon is not None]
        return _fc(feats)

    @router.get("/layers/monitoring_points")
    def puntos_en_vivo() -> dict:
        return _fc([{"type": "Feature", "geometry": {"type": "Point", "coordinates": [i.lon, i.lat]},
                     "properties": {"id": str(i.id), "name": i.tipo, "level": _nivel_de_incidente(i), "distrito": i.distrito}}
                    for i in incidentes_repo.listar() if i.lat is not None and i.lon is not None])

    inventario = json.loads((Path(__file__).resolve().parents[3] / "data" / "inventario_piura.json").read_text(encoding="utf-8"))

    @router.get("/historico/distritos")
    def distritos_con_eventos() -> list[dict]:
        """Distritos de Piura con eventos registrados en el inventario de INGEMMET, del que más tiene al que menos."""
        cuenta: dict[str, int] = {}
        for e in inventario:
            cuenta[e["distrito"]] = cuenta.get(e["distrito"], 0) + 1
        return [{"distrito": d, "eventos": n} for d, n in sorted(cuenta.items(), key=lambda x: (-x[1], x[0]))]

    @router.get("/historico")
    def historico_por_distrito(distrito: str | None = None) -> dict:
        """Eventos históricos de un distrito (o de todo Piura si no se indica). Cada punto trae su distrito y su estudio."""
        elegidos = [e for e in inventario if not distrito or e["distrito"].lower() == distrito.lower()]
        return _fc([{"type": "Feature", "geometry": {"type": "Point", "coordinates": [e["lon"], e["lat"]]},
                     "properties": {"distrito": e["distrito"], "codigo_peligro": e["codigo_peligro"], "estudio": e["estudio"]}}
                    for e in elegidos])

    @router.post("/photos/upload-url")
    def pedir_subida(request: Request, cuerpo: dict) -> dict:
        usuario_actual(request)
        token = secrets.token_urlsafe(16)
        subidas[token] = {"content_type": cuerpo.get("content_type", "image/jpeg"), "image_url": None}
        base = str(request.base_url).rstrip("/")
        return {"upload_url": f"{base}/photos/upload/{token}", "image_url": f"{base}/photos/upload/{token}"}

    @router.put("/photos/upload/{token}")
    async def recibir_foto(token: str, request: Request) -> dict:
        if token not in subidas:
            raise HTTPException(status_code=404, detail="Subida no válida o vencida")
        if almacen is None:
            raise HTTPException(status_code=503, detail="No hay almacén de fotos configurado")
        contenido = await request.body()
        if not contenido or len(contenido) > 8 * 1024 * 1024:
            raise HTTPException(status_code=422, detail="La foto debe pesar entre 1 byte y 8 MB")
        from starlette.concurrency import run_in_threadpool
        from alertas.aplicacion.imagenes import AlmacenImagenes  # noqa: F401
        try:
            guardada = await run_in_threadpool(almacen.guardar, contenido, "vecinos")
        except Exception as error:
            raise HTTPException(status_code=502, detail=f"No pude guardar la foto: {error}") from error
        subidas[token]["image_url"] = guardada.url
        return {"image_url": guardada.url}

    class NuevaFoto(BaseModel):
        point_id: str
        image_url: str = ""
        target: str
        signal: str
        comment: str | None = None
        lat: float | None = None
        lon: float | None = None
        taken_at: str

    @router.post("/photos")
    def registrar_foto(f: NuevaFoto, request: Request) -> dict:
        usuario = usuario_actual(request)
        foto = {"id": secrets.token_hex(6), "usuario": usuario["id"], **f.model_dump()}
        fotos.append(foto)
        codigo = str(next(codigos))
        recientes = sum(1 for x in fotos if x["point_id"] == f.point_id)
        nivel = "atencion" if recientes < 3 else "alerta"
        return {"photo_id": foto["id"], "code": codigo,
                "point": {"id": f.point_id, "level": nivel, "score": min(1.0, recientes / 5), "photos_last_hour": recientes},
                "brigade_notified": False}

    @router.get("/geocode")
    def buscar_calle(q: str) -> dict:
        """Convierte una calle o dirección de Piura en coordenadas (OpenStreetMap / Nominatim)."""
        import httpx
        if len(q.strip()) < 3:
            raise HTTPException(status_code=422, detail="Escribe al menos 3 letras de la calle")
        import truststore, ssl
        cliente = httpx.Client(verify=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT), timeout=20,
                               headers={"User-Agent": "QuebradaAlerta-demo/1.0"})
        try:
            r = cliente.get("https://nominatim.openstreetmap.org/search",
                            params={"q": f"{q}, Piura, Perú", "format": "json", "limit": 1, "countrycodes": "pe"})
            r.raise_for_status()
            datos = r.json()
        except httpx.HTTPError as error:
            raise HTTPException(status_code=502, detail="No pude buscar esa calle ahora") from error
        if not datos:
            raise HTTPException(status_code=404, detail="No encontré esa calle en Piura. Prueba con el distrito")
        return {"lat": float(datos[0]["lat"]), "lon": float(datos[0]["lon"]), "direccion": datos[0]["display_name"]}

    app.include_router(router)
