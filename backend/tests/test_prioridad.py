import pytest

from alertas.dominio.prioridad import Factores, calcular_prioridad, normalizar


def test_producto_de_los_tres_factores():
    p = calcular_prioridad(Factores(0.5, 0.8, 0.5))
    assert p.puntaje == pytest.approx(0.2)
    assert p.desglose == {"exposicion": 0.5, "vulnerabilidad": 0.8, "urgencia": 0.5}


def test_un_factor_en_cero_anula_la_prioridad():
    assert calcular_prioridad(Factores(0.0, 1.0, 1.0)).puntaje == 0.0


def test_factor_fuera_de_rango_se_rechaza():
    with pytest.raises(ValueError):
        Factores(1.2, 0.5, 0.5)


def test_normalizar_con_tope_y_maximo_cero():
    assert normalizar(50, 100) == 0.5
    assert normalizar(500, 100) == 1.0
    assert normalizar(5, 0) == 0.0
