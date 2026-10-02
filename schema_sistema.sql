-- =========================================================
-- Schema: db_sistema
-- Modelo relacional y de negocio para Consulta Laboral Bolivia
-- =========================================================

CREATE TABLE tipo_documento (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE configuracion_sistema (
    id_configuracion INTEGER PRIMARY KEY DEFAULT 1 CHECK (id_configuracion = 1),
    temperatura NUMERIC(2,1) NOT NULL DEFAULT 0.2 CHECK (temperatura BETWEEN 0.0 AND 1.0),
    max_tokens INTEGER NOT NULL DEFAULT 1024 CHECK (max_tokens BETWEEN 256 AND 2048),
    k_chunks INTEGER NOT NULL DEFAULT 5 CHECK (k_chunks BETWEEN 1 AND 10),
    system_prompt TEXT NOT NULL,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracion_sistema (system_prompt)
VALUES ('Eres un abogado laboralista boliviano. Responde con tono formal, claro y preciso. Cita obligatoriamente los artículos y normas disponibles en el contexto.')
ON CONFLICT (id_configuracion) DO NOTHING;

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    departamento VARCHAR(50),
    correo VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'USUARIO',
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

CREATE TABLE referencia_legal (
    id_referencia SERIAL PRIMARY KEY,
    id_respuesta INTEGER NOT NULL REFERENCES respuesta(id_respuesta) ON DELETE CASCADE,
    id_fragmento UUID NOT NULL,
    relevancia DOUBLE PRECISION NOT NULL DEFAULT 0
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

-- Índices B-tree para llaves foráneas
CREATE INDEX idx_sesion_id_usuario ON sesion (id_usuario);
CREATE INDEX idx_chat_id_usuario ON chat (id_usuario);
CREATE INDEX idx_consulta_id_chat ON consulta (id_chat);
CREATE INDEX idx_respuesta_id_consulta ON respuesta (id_consulta);
CREATE INDEX idx_referencia_legal_id_respuesta ON referencia_legal (id_respuesta);
CREATE INDEX idx_calculo_laboral_id_usuario ON calculo_laboral (id_usuario);
CREATE INDEX idx_detalle_calculo_id_calculo ON detalle_calculo (id_calculo);
CREATE INDEX idx_documento_laboral_id_usuario ON documento_laboral (id_usuario);
CREATE INDEX idx_documento_laboral_id_tipo ON documento_laboral (id_tipo);
CREATE INDEX idx_finiquito_id_documento ON finiquito (id_documento);
CREATE INDEX idx_carta_despido_id_documento ON carta_despido (id_documento);
