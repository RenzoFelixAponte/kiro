"""Canal SMS de la demo: no envía nada a nadie. Guarda cada mensaje para mostrarlo en el panel."""
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class MensajeSimulado:
    telefono: str
    texto: str
    enviado_en: datetime


@dataclass
class SimuladorSMS:
    mensajes: list[MensajeSimulado] = field(default_factory=list)

    def enviar(self, telefono: str, texto: str) -> bool:
        self.mensajes.append(MensajeSimulado(telefono, texto, datetime.now(timezone.utc)))
        return True
