# Consulta Laboral Bolivia

Aplicación web con autenticación, registro y recuperación de contraseña para la plataforma Consulta Laboral Bolivia.

## Tecnologías

- React + Vite + TypeScript
- Tailwind CSS
- Express + Node.js
- PostgreSQL / pgvector
- Ollama (integración base)

## Scripts

```bash
npm install
docker compose up -d
npm run dev
npm run build
```

`npm run dev` inicia Vite y la API Express al mismo tiempo. PostgreSQL debe estar ejecutándose con Docker Compose; la API utiliza los puertos `55432` y `55433` para sus bases de datos.

## Variables de entorno

Crea un archivo `.env` con las siguientes variables:

```env
PORT=3001
DATABASE_SISTEMA_URL=postgresql://postgres:postgres@localhost:5432/db_sistema
DATABASE_VECTORIAL_URL=postgresql://postgres:postgres@localhost:5432/db_vectorial
OLLAMA_BASE_URL=http://localhost:11434
```
# Consultas-Laborales-Bolivia
