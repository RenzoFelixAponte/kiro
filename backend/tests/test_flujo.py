import pytest
from fastapi.testclient import TestClient

from alertas.infraestructura.memoria import RepositorioVecinosMemoria
from alertas.interfaces.http import crear_app


@pytest.fixture
def cliente():
    vecinos = RepositorioVecinosMemoria()
    vecinos.registrar("v1", "900000001", "Sullana")  # número de prueba, no real
    vecinos.registrar("v2", "900000002", "Piura")
    vecinos.registrar("v3", "900000003", "Sullana")
    vecinos.dar_de_baja("v3")  # se dio de baja: no debe recibir nada
    return TestClient(crear_app(vecinos=vecinos))


def _alerta(cliente, brigadista="brigada_1"):
    r = cliente.post("/alertas", json={
        "texto": "Huaico en Sullana, evite la quebrada", "fuente": "brigada",
        "nivel": "urgente", "distritos": ["Sullana"], "brigadista": brigadista})
    assert r.status_code == 201
    return r.json()


def test_brigada_redacta_admin_aprueba_y_se_envia_al_simulador(cliente):
    a = _alerta(cliente)
    assert a["estado"] == "borrador"
    r = cliente.post(f"/alertas/{a['id']}/aprobar", json={"administrador": "admin_1"})
    assert r.status_code == 200
    assert r.json()["enviados"] == 1
    assert r.json()["alerta"]["estado"] == "enviada"
    msgs = cliente.get("/mensajes-simulados").json()
    assert [m["telefono"] for m in msgs] == ["900000001"]


def test_quien_redacta_no_puede_aprobar(cliente):
    a = _alerta(cliente, brigadista="admin_1")
    r = cliente.post(f"/alertas/{a['id']}/aprobar", json={"administrador": "admin_1"})
    assert r.status_code == 409


def test_no_se_aprueba_dos_veces(cliente):
    a = _alerta(cliente)
    cliente.post(f"/alertas/{a['id']}/aprobar", json={"administrador": "admin_1"})
    r = cliente.post(f"/alertas/{a['id']}/aprobar", json={"administrador": "admin_1"})
    assert r.status_code == 409


def test_prioridad_devuelve_desglose(cliente):
    r = cliente.post("/prioridad", json={"exposicion": 0.5, "vulnerabilidad": 0.8, "urgencia": 0.5})
    assert r.status_code == 200
    assert r.json()["puntaje"] == pytest.approx(0.2)


def test_registro_exige_consentimiento():
    c = TestClient(crear_app())
    r = c.post("/vecinos", json={"vecino_id": "x1", "telefono": "900000009", "distrito": "Sullana", "consentimiento": False})
    assert r.status_code == 422
    r = c.post("/vecinos", json={"vecino_id": "x1", "telefono": "900000009", "distrito": "Sullana", "consentimiento": True})
    assert r.status_code == 201


def test_telefono_con_formato_peruano():
    c = TestClient(crear_app())
    r = c.post("/vecinos", json={"vecino_id": "x2", "telefono": "12345", "distrito": "Sullana", "consentimiento": True})
    assert r.status_code == 422
