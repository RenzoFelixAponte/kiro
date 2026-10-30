"""Un incidente: un punto del mapa con su tipo de peligro, su distrito y su origen (automático o reportado por una brigada)."""
from dataclasses import dataclass


ORIGENES = ("automatico", "brigada")


@dataclass(frozen=True)
class Incidente:
    id: int
    tipo: str
    distrito: str
    region: str
    lat: float | None
    lon: float | None
    fuente: str
    origen: str
    nivel_fuente: object = None

    def __post_init__(self) -> None:
        if self.origen not in ORIGENES:
            raise ValueError(f"Origen no válido: {self.origen}")
        if self.lat is not None and not -90 <= self.lat <= 90:
            raise ValueError("Latitud fuera de rango")
        if self.lon is not None and not -180 <= self.lon <= 180:
            raise ValueError("Longitud fuera de rango")
