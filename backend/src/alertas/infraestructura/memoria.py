"""Repositorios en memoria. Para la demo basta; después se cambian por PostgreSQL con el mismo contrato."""
from dataclasses import dataclass, field

from alertas.dominio.alerta import Alerta
from alertas.dominio.incidente import Incidente


@dataclass
class RepositorioAlertasMemoria:
    _datos: dict[int, Alerta] = field(default_factory=dict)
    _ultimo: int = 0

    def siguiente_id(self) -> int:
        self._ultimo += 1
        return self._ultimo

    def guardar(self, alerta: Alerta) -> Alerta:
        self._datos[alerta.id] = alerta
        return alerta

    def obtener(self, alerta_id: int) -> Alerta | None:
        return self._datos.get(alerta_id)

    def listar(self) -> list[Alerta]:
        return sorted(self._datos.values(), key=lambda a: a.id, reverse=True)


@dataclass
class RepositorioIncidentesMemoria:
    _datos: dict[int, Incidente] = field(default_factory=dict)
    _ultimo: int = 0

    def siguiente_id(self) -> int:
        self._ultimo += 1
        return self._ultimo

    def guardar(self, incidente: Incidente) -> Incidente:
        self._datos[incidente.id] = incidente
        return incidente

    def listar(self) -> list[Incidente]:
        return sorted(self._datos.values(), key=lambda i: i.id, reverse=True)


@dataclass
class RepositorioVecinosMemoria:
    """Vecinos que aceptaron recibir alertas. Empieza vacío: nadie entra sin consentimiento."""
    _vecinos: dict[str, dict] = field(default_factory=dict)

    def registrar(self, vecino_id: str, telefono: str, distrito: str) -> None:
        self._vecinos[vecino_id] = {"telefono": telefono, "distrito": distrito, "activo": True}

    def dar_de_baja(self, vecino_id: str) -> None:
        if vecino_id in self._vecinos:
            self._vecinos[vecino_id]["activo"] = False

    def con_consentimiento(self, distritos: tuple[str, ...]) -> list[tuple[str, str]]:
        return [(vid, v["telefono"]) for vid, v in self._vecinos.items()
                if v["activo"] and v["distrito"] in distritos]
