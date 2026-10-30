-- Esquema de la demo de alertas para brigadas (PostgreSQL).
-- No guarda dirección exacta ni documentos de identidad.

CREATE TABLE distritos (
    ubigeo        CHAR(6) PRIMARY KEY,           -- código oficial INEI
    departamento  TEXT NOT NULL,
    provincia     TEXT NOT NULL,
    nombre        TEXT NOT NULL,
    latitud       NUMERIC(9,6),
    longitud      NUMERIC(9,6),
    poblacion     INTEGER,                       -- Censo 2017 (agregado)
    poblacion_vulnerable INTEGER,                -- adultos mayores, niños, discapacidad (agregado)
    viviendas_precarias  INTEGER                 -- mapa de pobreza (agregado)
);

CREATE TABLE vecinos (
    id              BIGSERIAL PRIMARY KEY,
    telefono_hash   TEXT NOT NULL UNIQUE,        -- el teléfono se guarda cifrado o como hash
    telefono_cifrado BYTEA NOT NULL,             -- para poder enviar; acceso restringido
    ubigeo          CHAR(6) NOT NULL REFERENCES distritos(ubigeo),
    consentimiento  BOOLEAN NOT NULL DEFAULT FALSE,
    consentido_en   TIMESTAMPTZ,                 -- cuándo aceptó
    baja_en         TIMESTAMPTZ,                 -- cuándo se dio de baja (NULL = activo)
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (consentimiento = FALSE OR consentido_en IS NOT NULL)
);

CREATE TABLE usuarios_panel (
    id        BIGSERIAL PRIMARY KEY,
    correo    TEXT NOT NULL UNIQUE,
    rol       TEXT NOT NULL CHECK (rol IN ('administrador', 'brigada')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alertas (
    id          BIGSERIAL PRIMARY KEY,
    texto       TEXT NOT NULL,
    fuente      TEXT NOT NULL CHECK (fuente IN ('INGEMMET', 'INDECI', 'SENAMHI', 'brigada')),
    nivel       TEXT NOT NULL CHECK (nivel IN ('informativo', 'preventivo', 'urgente')),
    creada_por  BIGINT NOT NULL REFERENCES usuarios_panel(id),
    creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerta_distritos (
    alerta_id BIGINT REFERENCES alertas(id),
    ubigeo    CHAR(6) REFERENCES distritos(ubigeo),
    PRIMARY KEY (alerta_id, ubigeo)
);

CREATE TABLE envios (
    id          BIGSERIAL PRIMARY KEY,
    alerta_id   BIGINT NOT NULL REFERENCES alertas(id),
    vecino_id   BIGINT NOT NULL REFERENCES vecinos(id),
    canal       TEXT NOT NULL CHECK (canal IN ('simulador', 'sns')),
    estado      TEXT NOT NULL CHECK (estado IN ('pendiente', 'enviado', 'fallido', 'dado_de_baja')),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    enviado_en  TIMESTAMPTZ,
    UNIQUE (alerta_id, vecino_id)
);

CREATE INDEX idx_vecinos_distrito_activo ON vecinos (ubigeo) WHERE consentimiento AND baja_en IS NULL;
CREATE INDEX idx_envios_alerta ON envios (alerta_id);
