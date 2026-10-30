"""Automatización: el motor detecta zonas nuevas, las guarda como incidentes y crea la alerta.

Reglas:
- Las brigadas ven el incidente y la alerta de inmediato en el panel.
- La alerta solo se envía sola a los vecinos si: la fuente es oficial (INGEMMET o Indeci) Y el nivel es «urgente».
  Todo lo demás queda como borrador para que un administrador lo apruebe.
"""
from dataclasses import dataclass

from alertas.aplicacion.casos import ErrorDeNegocio, GestionarAlertas
from alertas.aplicacion.motor import MotorDeDeteccion
from alertas.dominio.incidente import Incidente
from alertas.infraestructura.memoria import RepositorioIncidentesMemoria

FUENTES_OFICIALES = ("INGEMMET", "INDECI")
# Niveles de INGEMMET que se consideran urgentes. Los valores que trae la capa son «Nivel 2», «Nivel 3» y «Nivel 4».
# Solo «Nivel 4» se toma como urgente. VERIFICAR con INGEMMET qué significa cada nivel antes de usarlo en serio.
NIVELES_URGENTES = ("Nivel 4",)
APROBADOR_AUTOMATICO = "sistema-automatico"


@dataclass
class ResultadoCiclo:
    incidentes: list[Incidente]
    alertas_enviadas: int


class Automatizacion:
    def __init__(self, motor: MotorDeDeteccion, incidentes: RepositorioIncidentesMemoria, gestion: GestionarAlertas) -> None:
        self._motor = motor
        self._incidentes = incidentes
        self._gestion = gestion

    def ejecutar_ciclo(self) -> ResultadoCiclo:
        nuevas = self._motor.ciclo()
        creados: list[Incidente] = []
        enviadas = 0
        for zona in nuevas:
            incidente = self._incidentes.guardar(Incidente(
                id=self._incidentes.siguiente_id(),
                tipo=zona["peligro"] or "Peligro geológico",
                distrito=zona["distrito"] or "Sin distrito",
                region=zona["region"] or "",
                lat=zona.get("lat"),
                lon=zona.get("lon"),
                fuente="INGEMMET",
                origen="automatico",
                nivel_fuente=zona.get("nivel"),
            ))
            creados.append(incidente)
            nivel = "urgente" if str(zona.get("nivel")) in NIVELES_URGENTES else "preventivo"
            alerta = self._gestion.redactar(
                texto=f"{incidente.tipo} en {incidente.distrito}. Zona en alerta según INGEMMET.",
                fuente="INGEMMET",
                nivel=nivel,
                distritos=(incidente.distrito,),
                brigadista="sistema",
            )
            # Por defecto queda como borrador. Solo se envía sola si la fuente es oficial y el nivel es urgente.
            if alerta.fuente in FUENTES_OFICIALES and alerta.nivel == "urgente":
                enviadas += self._gestion.aprobar_y_enviar(alerta.id, APROBADOR_AUTOMATICO).enviados
        return ResultadoCiclo(creados, enviadas)
