"""Una alerta pasa por tres estados: borrador (la brigada la redacta), aprobada (el administrador la aprueba) y enviada."""
from dataclasses import dataclass, field, replace
from enum import Enum


class Estado(str, Enum):
    BORRADOR = "borrador"
    APROBADA = "aprobada"
    ENVIADA = "enviada"


FUENTES = ("INGEMMET", "INDECI", "SENAMHI", "brigada")
NIVELES = ("informativo", "preventivo", "urgente")


@dataclass(frozen=True)
class Alerta:
    id: int
    texto: str
    fuente: str
    nivel: str
    distritos: tuple[str, ...]
    redactada_por: str
    estado: Estado = Estado.BORRADOR
    aprobada_por: str | None = None
    enviados: int = 0
    detalle: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.texto.strip():
            raise ValueError("La alerta necesita texto")
        if self.fuente not in FUENTES:
            raise ValueError(f"Fuente no válida: {self.fuente}")
        if self.nivel not in NIVELES:
            raise ValueError(f"Nivel no válido: {self.nivel}")
        if not self.distritos:
            raise ValueError("La alerta necesita al menos un distrito")

    def aprobar(self, administrador: str) -> "Alerta":
        if self.estado is not Estado.BORRADOR:
            raise ValueError("Solo se aprueba una alerta en borrador")
        if administrador == self.redactada_por:
            raise ValueError("Quien redacta no puede aprobar su propia alerta")
        return replace(self, estado=Estado.APROBADA, aprobada_por=administrador)

    def marcar_enviada(self, cuantos: int) -> "Alerta":
        if self.estado is not Estado.APROBADA:
            raise ValueError("Solo se envía una alerta aprobada")
        return replace(self, estado=Estado.ENVIADA, enviados=cuantos)
