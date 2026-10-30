"""Motor de detección: revisa la fuente oficial cada cierto tiempo y avisa de lo que es nuevo.

No envía nada por sí mismo. Lo nuevo entra como borrador y el administrador decide si se aprueba.
Se usa sondeo (consultar cada N minutos), porque INGEMMET publica capas consultables, no un canal de eventos.
"""
from typing import Protocol


class FuenteAlertasExternas(Protocol):
    def consultar(self) -> list[dict]:
        """Devuelve las zonas en alerta vigentes: cada una con 'id', 'distrito', 'region', 'peligro', 'nivel'."""
        ...


def detectar_nuevas(conocidas: set[str], actuales: list[dict]) -> list[dict]:
    """Solo las zonas que no estaban en la consulta anterior. Función pura: se prueba sin red."""
    return [zona for zona in actuales if str(zona["id"]) not in conocidas]


class MotorDeDeteccion:
    def __init__(self, fuente: FuenteAlertasExternas) -> None:
        self._fuente = fuente
        self._conocidas: set[str] = set()

    def ciclo(self) -> list[dict]:
        """Una vuelta del motor. Devuelve solo lo nuevo desde la vuelta anterior.
        Si la fuente falla, devuelve lista vacía y conserva lo ya conocido: un fallo no genera avisos falsos."""
        try:
            actuales = self._fuente.consultar()
        except Exception:  # la fuente puede caer por red o por un error de INGEMMET
            return []
        nuevas = detectar_nuevas(self._conocidas, actuales)
        self._conocidas = {str(z["id"]) for z in actuales}
        return nuevas
