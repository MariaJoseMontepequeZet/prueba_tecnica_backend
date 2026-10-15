-- Esquema de la base de datos de pólizas de importación.
-- Una póliza (correlativo) tiene datos de cabecera y varios ítems,
-- por eso se separa en dos tablas para no repetir la cabecera en cada fila.

DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS polizas;
DROP TABLE IF EXISTS registros_rechazados;

-- Cabecera de la póliza: un registro por correlativo
CREATE TABLE polizas (
  correlativo        VARCHAR(20)   PRIMARY KEY,
  fecha_declaracion  DATE          NOT NULL,
  aduana             VARCHAR(100)  NOT NULL,
  tipo_regimen       VARCHAR(100)  NOT NULL,
  tipo_cambio_dolar  NUMERIC(10,4) NOT NULL CHECK (tipo_cambio_dolar > 0)
);

-- Detalle: cada fila del CSV es un ítem de una póliza
CREATE TABLE items (
  id                          BIGSERIAL     PRIMARY KEY,
  correlativo                 VARCHAR(20)   NOT NULL REFERENCES polizas(correlativo) ON DELETE CASCADE,
  sac                         VARCHAR(12)   NOT NULL,  -- texto para no perder ceros a la izquierda
  descripcion                 TEXT,
  pais                        VARCHAR(100)  NOT NULL,
  tipo_unidad_medida          VARCHAR(30),
  cantidad_fraccion           NUMERIC(18,4) NOT NULL CHECK (cantidad_fraccion >= 0),
  tasa_dai                    NUMERIC(6,2)  CHECK (tasa_dai >= 0),
  valor_dai                   NUMERIC(18,2) CHECK (valor_dai >= 0),
  valor_cif_uds               NUMERIC(18,2) NOT NULL CHECK (valor_cif_uds >= 0),
  tasa_cif_cantidad_fraccion  NUMERIC(24,6)
);

-- Filas del CSV que no pasaron la validación, para poder revisarlas
CREATE TABLE registros_rechazados (
  id         BIGSERIAL PRIMARY KEY,
  linea      INTEGER   NOT NULL,
  motivo     TEXT      NOT NULL,
  contenido  TEXT
);

-- Índices para los filtros y agrupaciones de los endpoints
CREATE INDEX idx_items_correlativo ON items (correlativo);
CREATE INDEX idx_items_sac         ON items (sac);
CREATE INDEX idx_items_pais        ON items (pais);
CREATE INDEX idx_polizas_aduana    ON polizas (aduana);
