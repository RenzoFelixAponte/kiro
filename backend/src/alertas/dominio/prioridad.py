"""Prioridad de un distrito: exposición × vulnerabilidad × urgencia.

Cada factor va de 0 a 1. El resultado se devuelve con su desglose para que la brigada
vea por qué un distrito sube. No depende de la base de datos ni del canal de envío.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Factores:
    exposicion: float      # zonas críticas de peligro (INGEMMET), normalizado
    vulnerabilidad: float  # población vulnerable y viviendas precarias (INEI), normalizado
    urgencia: float        # alertas vigentes y lluvia prevista, normalizado

    def __post_init__(self) -> None:
        for nombre, valor in (("exposicion", self.exposicion),
                              ("vulnerabilidad", self.vulnerabilidad),
                              ("urgencia", self.urgencia)):
            if not 0.0 <= valor <= 1.0:
                raise ValueError(f"{nombre} debe estar entre 0 y 1, llegó {valor}")


@dataclass(frozen=True)
class Prioridad:
    puntaje: float
    desglose: dict[str, float]


def calcular_prioridad(f: Factores) -> Prioridad:
    puntaje = round(f.exposicion * f.vulnerabilidad * f.urgencia, 4)
    return Prioridad(
        puntaje=puntaje,
        desglose={"exposicion": f.exposicion, "vulnerabilidad": f.vulnerabilidad, "urgencia": f.urgencia},
    )


def normalizar(valor: float, maximo: float) -> float:
    """Lleva un conteo a la escala 0-1 con tope. Un máximo de 0 o menos devuelve 0."""
    if maximo <= 0:
        return 0.0
    return min(max(valor / maximo, 0.0), 1.0)
