"""Adaptadores de imágenes.

- AlmacenLocal: guarda en una carpeta del proyecto. Para pruebas y desarrollo sin internet.
- AlmacenCloudinary: sube a Cloudinary con firma (api_key + api_secret). Se activa con AGENTE_ALMACEN_IMAGENES=cloudinary.

Las credenciales se leen de variables de entorno; nunca se escriben en el código.
"""
import hashlib
import os
import time
import uuid
from pathlib import Path

import httpx
import truststore
import ssl

from alertas.aplicacion.imagenes import AlmacenImagenes, ImagenGuardada


class ErrorAlmacen(Exception):
    """El almacén de imágenes no pudo guardar la foto."""


class AlmacenLocal:
    def __init__(self, carpeta: Path, url_base: str = "/imagenes") -> None:
        self._carpeta = carpeta
        self._url_base = url_base
        carpeta.mkdir(parents=True, exist_ok=True)

    def guardar(self, contenido: bytes, carpeta: str) -> ImagenGuardada:
        id_ = uuid.uuid4().hex
        destino = self._carpeta / carpeta
        destino.mkdir(parents=True, exist_ok=True)
        (destino / f"{id_}.jpg").write_bytes(contenido)
        return ImagenGuardada(id=id_, url=f"{self._url_base}/{carpeta}/{id_}.jpg", bytes=len(contenido))


def firma_cloudinary(parametros: dict[str, str], api_secret: str) -> str:
    """Firma según Cloudinary: parámetros ordenados por nombre, unidos con &, más el secret, en SHA-1."""
    base = "&".join(f"{k}={v}" for k, v in sorted(parametros.items()) if v not in (None, ""))
    return hashlib.sha1((base + api_secret).encode("utf-8")).hexdigest()


class AlmacenCloudinary:
    def __init__(self, cloud_name: str, api_key: str, api_secret: str, cliente: httpx.Client | None = None) -> None:
        if not (cloud_name and api_key and api_secret):
            raise ErrorAlmacen("Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET")
        self._cloud = cloud_name
        self._key = api_key
        self._secret = api_secret
        contexto = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        self._cliente = cliente or httpx.Client(verify=contexto, timeout=60)

    def guardar(self, contenido: bytes, carpeta: str) -> ImagenGuardada:
        marca = str(int(time.time()))
        firmados = {"folder": f"alertas/{carpeta}", "timestamp": marca}
        firma = firma_cloudinary(firmados, self._secret)
        try:
            r = self._cliente.post(
                f"https://api.cloudinary.com/v1_1/{self._cloud}/image/upload",
                data={**firmados, "api_key": self._key, "signature": firma},
                files={"file": ("foto.jpg", contenido, "image/jpeg")},
            )
        except httpx.HTTPError as error:
            raise ErrorAlmacen(f"No pude conectar con Cloudinary: {error}") from error
        if r.status_code != 200:
            raise ErrorAlmacen(f"Cloudinary respondió {r.status_code}: {r.text[:200]}")
        datos = r.json()
        return ImagenGuardada(id=datos["public_id"], url=datos["secure_url"], bytes=int(datos.get("bytes", len(contenido))))


def almacen_desde_entorno(raiz: Path) -> AlmacenImagenes:
    """Elige el almacén según AGENTE_ALMACEN_IMAGENES (local por defecto; cloudinary para la demo real)."""
    tipo = os.getenv("AGENTE_ALMACEN_IMAGENES", "local").lower()
    if tipo == "cloudinary":
        return AlmacenCloudinary(
            os.getenv("CLOUDINARY_CLOUD_NAME", ""),
            os.getenv("CLOUDINARY_API_KEY", ""),
            os.getenv("CLOUDINARY_API_SECRET", ""),
        )
    return AlmacenLocal(raiz / "imagenes_locales")
