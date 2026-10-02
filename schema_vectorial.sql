-- =========================================================
-- Schema: db_vectorial
-- Modelo vectorial RAG / dominio legal para Consulta Laboral Bolivia
-- =========================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE normativa (
    id_normativa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    numero VARCHAR(100),
    fuente VARCHAR(255),
    fecha_publicacion DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'vigente',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documento_legal (
    id_documento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_normativa UUID NOT NULL REFERENCES normativa(id_normativa) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    url_fuente TEXT,
    contenido_completo TEXT,
    total_paginas INTEGER,
    version VARCHAR(50),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articulo (
    id_articulo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_documento UUID NOT NULL REFERENCES documento_legal(id_documento) ON DELETE CASCADE,
    numero_articulo INTEGER NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fragmento_legal (
    id_fragmento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_articulo UUID NULL REFERENCES articulo(id_articulo) ON DELETE CASCADE,
    numero_fragmento INTEGER NOT NULL,
    texto_fragmento TEXT NOT NULL,
    pagina INTEGER,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE embedding (
    id_embedding UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_fragmento UUID NOT NULL REFERENCES fragmento_legal(id_fragmento) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    modelo_embedding VARCHAR(100) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices B-tree para llaves foráneas
CREATE INDEX idx_documento_legal_id_normativa ON documento_legal (id_normativa);
CREATE INDEX idx_articulo_id_documento ON articulo (id_documento);
CREATE INDEX idx_fragmento_legal_id_articulo ON fragmento_legal (id_articulo);
CREATE INDEX idx_embedding_id_fragmento ON embedding (id_fragmento);

-- Índice HNSW para búsquedas semánticas con distancia coseno
CREATE INDEX idx_embedding_cosine_hnsw
    ON embedding
    USING hnsw (embedding vector_cosine_ops);
