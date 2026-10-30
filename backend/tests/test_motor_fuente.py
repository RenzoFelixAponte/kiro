from alertas.aplicacion.motor import MotorDeDeteccion
from alertas.infraestructura.ingemmet import FuenteNoDisponible


class FuenteQueFalla:
    def __init__(self):
        self.llamadas = 0

    def consultar(self):
        self.llamadas += 1
        if self.llamadas == 2:
            raise FuenteNoDisponible("caída")
        return [{"id": 1, "distrito": "Sullana"}]


def test_una_caida_no_vuelve_a_avisar_lo_conocido():
    motor = MotorDeDeteccion(FuenteQueFalla())
    assert len(motor.ciclo()) == 1
    assert motor.ciclo() == []          # la fuente cayó: no hay avisos
    assert motor.ciclo() == []          # al volver, la zona 1 ya era conocida
