"""Casos de uso: redactar, aprobar y enviar alertas, y calcular la prioridad de los distritos."""
from dataclasses import dataclass

from alertas.aplicacion.puertos import ProveedorSMS, RepositorioAlertas, RepositorioVecinos
from alertas.dominio.alerta import Alerta
from alertas.dominio.prioridad import Factores, Prioridad, calcular_prioridad


class ErrorDeNegocio(Exception):
    """Un error que se le muestra a la persona (por ejemplo, un permiso que no tiene)."""


@dataclass(frozen=True)
class ResultadoEnvio:
    alerta: Alerta
    enviados: int


class GestionarAlertas:
    def __init__(self, alertas: RepositorioAlertas, vecinos: RepositorioVecinos, sms: ProveedorSMS) -> None:
        self._alertas = alertas
        self._vecinos = vecinos
        self._sms = sms

    def redactar(self, texto: str, fuente: str, nivel: str, distritos: tuple[str, ...], brigadista: str) -> Alerta:
        alerta = Alerta(self._alertas.siguiente_id(), texto, fuente, nivel, distritos, brigadista)
        return self._alertas.guardar(alerta)

    def aprobar_y_enviar(self, alerta_id: int, administrador: str) -> ResultadoEnvio:
        alerta = self._alertas.obtener(alerta_id)
        if alerta is None:
            raise ErrorDeNegocio("Esa alerta no existe")
        try:
            aprobada = alerta.aprobar(administrador)
        except ValueError as error:
            raise ErrorDeNegocio(str(error)) from error
        destinatarios = self._vecinos.con_consentimiento(aprobada.distritos)
        enviados = 0
        detalle = []
        for vecino_id, telefono in destinatarios:
            if self._sms.enviar(telefono, aprobada.texto):
                enviados += 1
            detalle.append(vecino_id)
        final = self._alertas.guardar(aprobada.marcar_enviada(enviados))
        return ResultadoEnvio(final, enviados)

    def listar(self) -> list[Alerta]:
        return self._alertas.listar()


class CalcularPrioridad:
    def ejecutar(self, factores: Factores) -> Prioridad:
        return calcular_prioridad(factores)
