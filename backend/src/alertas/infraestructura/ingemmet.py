"""Adaptador de INGEMMET: zonas críticas en alerta por lluvias (capa pública de Perú en Alerta).

Fuente: https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_PERU_ALERTA_V/MapServer/1
Si el servicio no responde, lanza FuenteNoDisponible; el motor lo registra y sigue sin cambiar su memoria.
"""
import logging
import ssl

import httpx
import truststore

URL_ZONAS_EN_ALERTA = (
    "https://geocatmin.ingemmet.gob.pe/arcgis/rest/services/SERV_PERU_ALERTA_V/MapServer/1/query"
)
# Solo Piura: la demo es para Piura. Para todo el país, usar "1=1".
FILTRO_REGION = "UPPER(REGION)='PIURA'"
log = logging.getLogger("alertas.ingemmet")


class FuenteNoDisponible(Exception):
    """La fuente no respondió bien. El motor no cambia su memoria en ese caso."""


class IngemmetZonasEnAlerta:
    def __init__(self, cliente: httpx.Client | None = None) -> None:
        # El certificado del gobierno peruano lo reconoce el almacén de Windows, no el de Python.
        contexto = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        self._cliente = cliente or httpx.Client(verify=contexto, timeout=30)

    def consultar(self) -> list[dict]:
        try:
            r = self._cliente.get(URL_ZONAS_EN_ALERTA, params={
                "where": FILTRO_REGION, "outFields": "OBJECTID,REGION,PROVINCIA,DISTRITO,PELIGROS_G,NIVEL,NRO_AVISO",
                "returnGeometry": "true", "outSR": "4326", "f": "json",
            })
            r.raise_for_status()
            datos = r.json()
        except (httpx.HTTPError, ValueError) as error:
            log.warning("No pude consultar INGEMMET: %s", error)
            raise FuenteNoDisponible(str(error)) from error
        if "error" in datos:
            log.warning("INGEMMET respondió error: %s", datos["error"])
            raise FuenteNoDisponible(str(datos["error"]))
        return [
            {
                "id": f["attributes"]["OBJECTID"],
                "region": (f["attributes"].get("REGION") or "").strip(),
                "distrito": (f["attributes"].get("DISTRITO") or "").strip(),
                "peligro": (f["attributes"].get("PELIGROS_G") or "").strip(),
                "nivel": f["attributes"].get("NIVEL"),
                "lat": (f.get("geometry") or {}).get("y"),
                "lon": (f.get("geometry") or {}).get("x"),
            }
            for f in datos.get("features", [])
        ]
