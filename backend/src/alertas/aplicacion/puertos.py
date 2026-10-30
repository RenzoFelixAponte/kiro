"""Puertos: lo que la aplicación necesita del mundo exterior. Las implementaciones viven en infraestructura."""
from typing import Protocol

from alertas.dominio.alerta import Alerta


class ProveedorSMS(Protocol):
    def enviar(self, telefono: str, texto: str) -> bool:
        """Devuelve True si el mensaje quedó enviado (o guardado, en el simulador)."""
        ...


class RepositorioAlertas(Protocol):
    def guardar(self, alerta: Alerta) -> Alerta: ...
    def obtener(self, alerta_id: int) -> Alerta | None: ...
    def listar(self) -> list[Alerta]: ...
    def siguiente_id(self) -> int: ...


class RepositorioVecinos(Protocol):
    def con_consentimiento(self, distritos: tuple[str, ...]) -> list[tuple[str, str]]:
        """Devuelve (vecino_id, teléfono) de quienes aceptaron alertas y no se dieron de baja."""
        ...
