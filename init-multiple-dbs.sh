#!/bin/bash
set -euo pipefail

if [ -z "${POSTGRES_USER:-}" ]; then
  export POSTGRES_USER=postgres
fi

if [ -z "${POSTGRES_DB:-}" ]; then
  export POSTGRES_DB=postgres
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'SQL'
SELECT 'CREATE DATABASE db_sistema OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'db_sistema')\gexec

SELECT 'CREATE DATABASE db_vectorial OWNER postgres'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'db_vectorial')\gexec
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "db_vectorial" <<-'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "db_sistema" -f /docker-entrypoint-initdb.d/schema_sistema.sql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "db_vectorial" -f /docker-entrypoint-initdb.d/schema_vectorial.sql
