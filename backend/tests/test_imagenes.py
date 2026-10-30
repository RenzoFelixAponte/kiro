import httpx
import pytest

from alertas.infraestructura.almacen_imagenes import (AlmacenCloudinary, AlmacenLocal, ErrorAlmacen,
                                                     firma_cloudinary)


def test_firma_ordena_parametros_y_agrega_el_secret():
    # Cloudinary firma: "folder=x&timestamp=1" + secret, en SHA-1
    import hashlib
    esperado = hashlib.sha1(b"folder=x&timestamp=1secreto").hexdigest()
    assert firma_cloudinary({"timestamp": "1", "folder": "x"}, "secreto") == esperado


def test_almacen_local_guarda_y_devuelve_url(tmp_path):
    almacen = AlmacenLocal(tmp_path)
    img = almacen.guardar(b"\xff\xd8jpeg", "vecinos")
    assert img.url.startswith("/imagenes/vecinos/")
    assert (tmp_path / "vecinos" / f"{img.id}.jpg").read_bytes() == b"\xff\xd8jpeg"
    assert img.bytes == 6


def test_cloudinary_sin_credenciales_falla_al_crear():
    with pytest.raises(ErrorAlmacen):
        AlmacenCloudinary("", "", "")


def test_cloudinary_sube_con_firma_y_devuelve_url_segura():
    def respuesta(request: httpx.Request) -> httpx.Response:
        assert "api.cloudinary.com/v1_1/mi-nube/image/upload" in str(request.url)
        cuerpo = request.content.decode("latin-1")
        assert "signature" in cuerpo and "api_key" in cuerpo
        return httpx.Response(200, json={"public_id": "alertas/vecinos/abc", "secure_url": "https://res.cloudinary.com/x.jpg", "bytes": 7})

    cliente = httpx.Client(transport=httpx.MockTransport(respuesta))
    almacen = AlmacenCloudinary("mi-nube", "clave", "secreto", cliente=cliente)
    img = almacen.guardar(b"fotodata", "vecinos")
    assert img.url == "https://res.cloudinary.com/x.jpg"
    assert img.id == "alertas/vecinos/abc"


def test_cloudinary_error_se_reporta():
    cliente = httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(401, text="Invalid signature")))
    almacen = AlmacenCloudinary("mi-nube", "clave", "secreto", cliente=cliente)
    with pytest.raises(ErrorAlmacen):
        almacen.guardar(b"x", "vecinos")
