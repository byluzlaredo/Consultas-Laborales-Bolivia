-- =========================================================
-- Consulta Laboral Bolivia - Base de Datos PostgreSQL
-- =========================================================
-- Este script crea la estructura del modelo relacional y vectorial
-- para la aplicación, incluyendo el soporte de pgvector para RAG.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- MODELO RELACIONAL
-- =========================================================

CREATE TABLE tipo_documento (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    departamento VARCHAR(50),
    correo VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'usuario',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tokens_recuperacion (
    id_token SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tokens_revocados (
    token_hash VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE sesion (
    id_sesion SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    ip VARCHAR(45),
    dispositivo VARCHAR(255),
    fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    estado VARCHAR(50) NOT NULL DEFAULT 'activa'
);

CREATE TABLE chat (
    id_chat SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE consulta (
    id_consulta SERIAL PRIMARY KEY,
    id_chat INTEGER NOT NULL REFERENCES chat(id_chat) ON DELETE CASCADE,
    pregunta TEXT NOT NULL,
    tipo_consulta VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    tiempo_respuesta DOUBLE PRECISION,
    fecha_consulta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE respuesta (
    id_respuesta SERIAL PRIMARY KEY,
    id_consulta INTEGER NOT NULL REFERENCES consulta(id_consulta) ON DELETE CASCADE,
    modelo_ia VARCHAR(100) NOT NULL,
    contenido TEXT NOT NULL,
    tokens_prompt INTEGER,
    tokens_respuesta INTEGER,
    fecha_respuesta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calculo_laboral (
    id_calculo SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo_calculo VARCHAR(100) NOT NULL,
    salario DECIMAL(12,2),
    fecha_ingreso DATE,
    fecha_salida DATE,
    resultado DECIMAL(12,2),
    fecha_calculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_calculo (
    id_detalle SERIAL PRIMARY KEY,
    id_calculo INTEGER NOT NULL REFERENCES calculo_laboral(id_calculo) ON DELETE CASCADE,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(12,2) NOT NULL
);

CREATE TABLE documento_laboral (
    id_documento SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_tipo INTEGER NOT NULL REFERENCES tipo_documento(id_tipo) ON DELETE RESTRICT,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT,
    formato VARCHAR(50),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finiquito (
    id_documento INTEGER PRIMARY KEY REFERENCES documento_laboral(id_documento) ON DELETE CASCADE,
    monto_total DECIMAL(12,2) NOT NULL,
    tiempo_servicio VARCHAR(100)
);

CREATE TABLE carta_despido (
    id_documento INTEGER PRIMARY KEY REFERENCES documento_laboral(id_documento) ON DELETE CASCADE,
    motivo_despido TEXT NOT NULL,
    fecha_notificacion DATE
);

-- =========================================================
-- MODELO VECTORIAL / RAG (DOMINIO LEGAL)
-- =========================================================

CREATE TABLE normativa (
    id_normativa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    numero VARCHAR(100),
    fuente VARCHAR(255),
    fecha_publicacion DATE,
    estado VARCHAR(50) NOT NULL DEFAULT 'vigente'
);

CREATE TABLE documento_legal (
    id_documento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_normativa UUID NOT NULL REFERENCES normativa(id_normativa) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    url_fuente TEXT,
    contenido_completo TEXT,
    total_paginas INTEGER,
    version VARCHAR(50)
);

CREATE TABLE articulo (
    id_articulo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_documento UUID NOT NULL REFERENCES documento_legal(id_documento) ON DELETE CASCADE,
    numero_articulo INTEGER NOT NULL,
    titulo VARCHAR(255) NOT NULL
);

CREATE TABLE fragmento_legal (
    id_fragmento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_articulo UUID NOT NULL REFERENCES articulo(id_articulo) ON DELETE CASCADE,
    numero_fragmento INTEGER NOT NULL,
    texto_fragmento TEXT NOT NULL,
    pagina INTEGER
);

CREATE TABLE embedding (
    id_embedding UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_fragmento UUID NOT NULL REFERENCES fragmento_legal(id_fragmento) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    modelo_embedding VARCHAR(100) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE referencia_legal (
    id_referencia SERIAL PRIMARY KEY,
    id_respuesta INTEGER NOT NULL REFERENCES respuesta(id_respuesta) ON DELETE CASCADE,
    id_fragmento UUID NOT NULL REFERENCES fragmento_legal(id_fragmento) ON DELETE CASCADE,
    relevancia DOUBLE PRECISION NOT NULL DEFAULT 0
);

-- =========================================================
-- ÍNDICES B-TREE PARA LLAVES FORÁNEAS
-- =========================================================

CREATE INDEX idx_sesion_id_usuario ON sesion (id_usuario);
CREATE INDEX idx_chat_id_usuario ON chat (id_usuario);
CREATE INDEX idx_consulta_id_chat ON consulta (id_chat);
CREATE INDEX idx_respuesta_id_consulta ON respuesta (id_consulta);
CREATE INDEX idx_calculo_laboral_id_usuario ON calculo_laboral (id_usuario);
CREATE INDEX idx_detalle_calculo_id_calculo ON detalle_calculo (id_calculo);
CREATE INDEX idx_documento_laboral_id_usuario ON documento_laboral (id_usuario);
CREATE INDEX idx_documento_laboral_id_tipo ON documento_laboral (id_tipo);
CREATE INDEX idx_finiquito_id_documento ON finiquito (id_documento);
CREATE INDEX idx_carta_despido_id_documento ON carta_despido (id_documento);
CREATE INDEX idx_documento_legal_id_normativa ON documento_legal (id_normativa);
CREATE INDEX idx_articulo_id_documento ON articulo (id_documento);
CREATE INDEX idx_fragmento_legal_id_articulo ON fragmento_legal (id_articulo);
CREATE INDEX idx_embedding_id_fragmento ON embedding (id_fragmento);
CREATE INDEX idx_referencia_legal_id_respuesta ON referencia_legal (id_respuesta);
CREATE INDEX idx_referencia_legal_id_fragmento ON referencia_legal (id_fragmento);

-- =========================================================
-- ÍNDICE HNSW PARA BÚSQUEDA SEMÁNTICA (COSENO)
-- =========================================================
CREATE INDEX idx_embedding_cosine_hnsw
    ON embedding
    USING hnsw (embedding vector_cosine_ops);

-- =========================================================
-- COMENTARIOS ADICIONALES
-- =========================================================
COMMENT ON TABLE tipo_documento IS 'Catálogo de tipos de documentos laborales.';
COMMENT ON TABLE usuario IS 'Usuarios del sistema de consulta laboral.';
COMMENT ON TABLE sesion IS 'Sesiones autenticadas de usuarios.';
COMMENT ON TABLE chat IS 'Conversaciones de cada usuario.';
COMMENT ON TABLE consulta IS 'Consultas realizadas por usuario dentro de un chat.';
COMMENT ON TABLE respuesta IS 'Respuestas generadas por IA para una consulta.';
COMMENT ON TABLE calculo_laboral IS 'Cálculos salariales realizados por el usuario.';
COMMENT ON TABLE detalle_calculo IS 'Detalles de conceptos o importes dentro de un cálculo.';
COMMENT ON TABLE documento_laboral IS 'Documentos laborales generados por el usuario.';
COMMENT ON TABLE finiquito IS 'Especialización de documento_laboral para finiquitos.';
COMMENT ON TABLE carta_despido IS 'Especialización de documento_laboral para cartas de despido.';
COMMENT ON TABLE normativa IS 'Normativas legales del dominio.';
COMMENT ON TABLE documento_legal IS 'Documentos legales asociados a una normativa.';
COMMENT ON TABLE articulo IS 'Artículos contenidos dentro de un documento legal.';
COMMENT ON TABLE fragmento_legal IS 'Fragmentos de texto extraídos de artículos para RAG.';
COMMENT ON TABLE embedding IS 'Embeddings vectoriales asociados a fragmentos legales.';
COMMENT ON TABLE referencia_legal IS 'Relación entre respuestas y fragmentos legales relevantes.';
