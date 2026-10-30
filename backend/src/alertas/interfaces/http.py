"""API HTTP (FastAPI). Traduce peticiones a casos de uso y errores de negocio a respuestas claras."""
from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import asyncio
import os

from alertas.aplicacion.automatizacion import Automatizacion
from alertas.aplicacion.casos import CalcularPrioridad, ErrorDeNegocio, GestionarAlertas
from alertas.aplicacion.motor import MotorDeDeteccion
from alertas.dominio.incidente import Incidente
from alertas.infraestructura.ingemmet import FuenteNoDisponible, IngemmetZonasEnAlerta
from alertas.dominio.alerta import Alerta
from alertas.dominio.prioridad import Factores
from alertas.infraestructura.memoria import RepositorioAlertasMemoria, RepositorioIncidentesMemoria, RepositorioVecinosMemoria
from alertas.infraestructura.simulador_sms import SimuladorSMS
from alertas.interfaces.quebrada import registrar_contrato_vecino


class NuevaAlerta(BaseModel):
    texto: str = Field(min_length=5, max_length=480)
    fuente: str
    nivel: str
    distritos: list[str] = Field(min_length=1)
    brigadista: str


class NuevoFactores(BaseModel):
    exposicion: float = Field(ge=0, le=1)
    vulnerabilidad: float = Field(ge=0, le=1)
    urgencia: float = Field(ge=0, le=1)


class Aprobacion(BaseModel):
    administrador: str


class NuevoVecino(BaseModel):
    vecino_id: str = Field(min_length=1, max_length=64)
    telefono: str = Field(pattern=r"^9\d{8}$")  # celular peruano de 9 dígitos
    distrito: str
    consentimiento: bool  # sin consentimiento explícito no se registra


def _vista(alerta: Alerta) -> dict:
    datos = asdict(alerta)
    datos["estado"] = alerta.estado.value
    return datos


class NuevoIncidente(BaseModel):
    tipo: str = Field(min_length=3, max_length=80)
    distrito: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


def _incidente(i: Incidente) -> dict:
    return asdict(i)


def crear_app(sms: SimuladorSMS | None = None, vecinos: RepositorioVecinosMemoria | None = None,
              fuente=None, intervalo_s: int | None = None) -> FastAPI:
    alertas = RepositorioAlertasMemoria()
    vecinos = vecinos or RepositorioVecinosMemoria()
    sms = sms or SimuladorSMS()
    incidentes = RepositorioIncidentesMemoria()
    gestion = GestionarAlertas(alertas, vecinos, sms)
    prioridad = CalcularPrioridad()
    automatizacion = Automatizacion(MotorDeDeteccion(fuente or IngemmetZonasEnAlerta()), incidentes, gestion)
    intervalo = intervalo_s if intervalo_s is not None else int(os.getenv("ALERTAS_INTERVALO_S", "600"))
    app = FastAPI(title="Alertas para brigadas (demo)")
    # Los paneles corren en otro puerto (5174): el navegador exige permiso explícito para llamar a la API.
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
                       allow_methods=["*"], allow_headers=["*"])

    async def bucle_automatico() -> None:
        while True:
            try:
                await asyncio.to_thread(automatizacion.ejecutar_ciclo)
            except FuenteNoDisponible:
                pass
            await asyncio.sleep(intervalo)

    @app.on_event("startup")
    async def arrancar_motor() -> None:
        if intervalo > 0:
            asyncio.create_task(bucle_automatico())

    @app.post("/automatizacion/ciclo")
    def correr_ciclo() -> dict:
        """Corre una vuelta del motor ahora (para la demo, sin esperar los 10 minutos)."""
        resultado = automatizacion.ejecutar_ciclo()
        return {"incidentes_nuevos": len(resultado.incidentes), "alertas_enviadas": resultado.alertas_enviadas}

    @app.get("/incidentes")
    def listar_incidentes() -> list[dict]:
        return [_incidente(i) for i in incidentes.listar()]

    @app.post("/incidentes", status_code=201)
    def reportar_incidente(n: NuevoIncidente) -> dict:
        try:
            i = Incidente(incidentes.siguiente_id(), n.tipo, n.distrito, "", n.lat, n.lon,
                          fuente="brigada", origen="brigada")
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return _incidente(incidentes.guardar(i))


    @app.get("/salud")
    def salud() -> dict:
        return {"estado": "ok"}

    @app.post("/prioridad")
    def calcular(f: NuevoFactores) -> dict:
        p = prioridad.ejecutar(Factores(f.exposicion, f.vulnerabilidad, f.urgencia))
        return {"puntaje": p.puntaje, "desglose": p.desglose}

    @app.post("/alertas", status_code=201)
    def redactar(a: NuevaAlerta) -> dict:
        try:
            return _vista(gestion.redactar(a.texto, a.fuente, a.nivel, tuple(a.distritos), a.brigadista))
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @app.get("/alertas")
    def listar(distrito: str | None = None) -> list[dict]:
        """Todas las alertas, o solo las de un distrito (lo que ve un vecino)."""
        alertas_visibles = gestion.listar()
        if distrito:
            alertas_visibles = [a for a in alertas_visibles if distrito in a.distritos and a.estado.value == "enviada"]
        return [_vista(a) for a in alertas_visibles]

    @app.post("/alertas/{alerta_id}/aprobar")
    def aprobar(alerta_id: int, cuerpo: Aprobacion) -> dict:
        try:
            resultado = gestion.aprobar_y_enviar(alerta_id, cuerpo.administrador)
        except ErrorDeNegocio as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {"alerta": _vista(resultado.alerta), "enviados": resultado.enviados}

    @app.post("/vecinos", status_code=201)
    def registrar_vecino(v: NuevoVecino) -> dict:
        if not v.consentimiento:
            raise HTTPException(status_code=422, detail="Sin consentimiento no se registra el número")
        vecinos.registrar(v.vecino_id, v.telefono, v.distrito)
        return {"vecino_id": v.vecino_id, "distrito": v.distrito, "activo": True}

    @app.post("/vecinos/{vecino_id}/baja")
    def dar_de_baja(vecino_id: str) -> dict:
        vecinos.dar_de_baja(vecino_id)
        return {"vecino_id": vecino_id, "activo": False}

    from pathlib import Path
    from alertas.infraestructura.almacen_imagenes import almacen_desde_entorno
    registrar_contrato_vecino(app, incidentes, almacen_desde_entorno(Path(__file__).resolve().parents[3]))

    @app.get("/mensajes-simulados")
    def mensajes() -> list[dict]:
        return [{"telefono": m.telefono, "texto": m.texto, "enviado_en": m.enviado_en.isoformat()} for m in sms.mensajes]

    return app


app = crear_app()
