"""Puerto de imágenes: la aplicación guarda y pide fotos sin saber si están en disco o en Cloudinary."""
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ImagenGuardada:
    id: str
    url: str
    bytes: int


class AlmacenImagenes(Protocol):
    def guardar(self, contenido: bytes, carpeta: str) -> ImagenGuardada:
        """Guarda la imagen y devuelve su identificador y su dirección pública."""
        ...
