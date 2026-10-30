"""Entrada de AWS Lambda: convierte la petición de API Gateway en una petición a la API FastAPI."""
from mangum import Mangum

from alertas.interfaces.http import app

handler = Mangum(app)
