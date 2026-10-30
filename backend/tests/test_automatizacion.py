from alertas.aplicacion.automatizacion import Automatizacion
from alertas.aplicacion.casos import GestionarAlertas
from alertas.aplicacion.motor import MotorDeDeteccion
from alertas.infraestructura.memoria import (RepositorioAlertasMemoria, RepositorioIncidentesMemoria,
                                             RepositorioVecinosMemoria)
from alertas.infraestructura.simulador_sms import SimuladorSMS


class FuenteFalsa:
    def __init__(self, consultas):
        self._consultas = list(consultas)

    def consultar(self):
        return self._consultas.pop(0)


def zona(i, nivel="1", distrito="Sullana"):
    return {"id": i, "region": "PIURA", "distrito": distrito, "peligro": "Huaico", "nivel": nivel,
            "lat": -4.9, "lon": -80.6}


def _montar(consultas):
    vecinos = RepositorioVecinosMemoria()
    vecinos.registrar("v1", "900000001", "Sullana")
    sms = SimuladorSMS()
    alertas = RepositorioAlertasMemoria()
    gestion = GestionarAlertas(alertas, vecinos, sms)
    incidentes = RepositorioIncidentesMemoria()
    return Automatizacion(MotorDeDeteccion(FuenteFalsa(consultas)), incidentes, gestion), sms, alertas, incidentes


def test_zona_nueva_crea_incidente_y_borrador_sin_enviar():
    auto, sms, alertas, incidentes = _montar([[zona(1)]])
    r = auto.ejecutar_ciclo()
    assert len(r.incidentes) == 1
    assert incidentes.listar()[0].lat == -4.9
    assert sms.mensajes == []                       # nivel preventivo: no se envía solo
    assert alertas.listar()[0].estado.value == "borrador"


def test_nivel_4_de_ingemmet_se_envia_solo_a_los_vecinos_registrados():
    auto, sms, alertas, _ = _montar([[zona(1, nivel="Nivel 4")]])
    r = auto.ejecutar_ciclo()
    assert r.alertas_enviadas == 1
    assert [m.telefono for m in sms.mensajes] == ["900000001"]
    assert alertas.listar()[0].aprobada_por == "sistema-automatico"


def test_nivel_2_queda_como_borrador_sin_envio():
    auto, sms, alertas, _ = _montar([[zona(1, nivel="Nivel 2")]])
    assert auto.ejecutar_ciclo().alertas_enviadas == 0
    assert sms.mensajes == []
    assert alertas.listar()[0].estado.value == "borrador"


def test_una_zona_ya_conocida_no_genera_otro_incidente():
    auto, _, _, incidentes = _montar([[zona(1)], [zona(1)]])
    auto.ejecutar_ciclo()
    assert auto.ejecutar_ciclo().incidentes == []
    assert len(incidentes.listar()) == 1
