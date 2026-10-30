from alertas.aplicacion.motor import MotorDeDeteccion, detectar_nuevas


class FuenteFalsa:
    """Simula dos consultas seguidas de INGEMMET: en la segunda aparece una zona nueva."""

    def __init__(self, consultas):
        self._consultas = list(consultas)

    def consultar(self):
        return self._consultas.pop(0)


def zona(i, distrito="Sullana"):
    return {"id": i, "region": "PIURA", "distrito": distrito, "peligro": "Huaico", "nivel": 1}


def test_detecta_solo_lo_nuevo():
    assert detectar_nuevas({"1"}, [zona(1), zona(2)]) == [zona(2)]


def test_el_motor_avisa_una_vez_por_zona():
    motor = MotorDeDeteccion(FuenteFalsa([[zona(1)], [zona(1), zona(2, "Tambo Grande")], [zona(1), zona(2, "Tambo Grande")]]))
    assert motor.ciclo() == [zona(1)]
    assert motor.ciclo() == [zona(2, "Tambo Grande")]
    assert motor.ciclo() == []


def test_si_una_zona_deja_de_estar_en_alerta_y_vuelve_se_avisa_otra_vez():
    motor = MotorDeDeteccion(FuenteFalsa([[zona(1)], [], [zona(1)]]))
    motor.ciclo()
    assert motor.ciclo() == []          # hoy no hay alertas: correcto
    assert motor.ciclo() == [zona(1)]   # volvió a estar en alerta: se avisa de nuevo
