# MiniDrive

Sistema de gestion documental empresarial para organizar archivos por proyectos (actuaciones).

## Requisitos previos

- Node.js >= 22
- pnpm >= 9
- PostgreSQL 16
- MinIO (opcional para desarrollo inicial)

## Configuracion de PostgreSQL

### 1. Crear usuario y base de datos

Abre `psql` como superusuario (`postgres`) y ejecuta:

```sql
-- Crear usuario
CREATE USER minidrive WITH PASSWORD 'minidrive';

-- Crear base de datos
CREATE DATABASE minidrive OWNER minidrive;

-- Conectarse a la base de datos
\c minidrive

-- Extensiones necesarias (ejecutar como superusuario)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2. Verificar conexion

```bash
psql -U minidrive -d minidrive -h localhost -p 5432
```

Si usas una contrasena distinta o un puerto diferente, ajusta el `DATABASE_URL` en el archivo `.env`.

## Configuracion del proyecto

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Crear archivo .env

Crea un archivo `.env` en la raiz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://minidrive:minidrive@localhost:5432/minidrive

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=minidrive

# Auth
AUTH_SECRET=tu-secreto-aqui-cambialo-en-produccion
BETTER_AUTH_URL=http://localhost:3001

# API
API_PORT=3001
API_HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:3001
```

### 3. Ejecutar migraciones

```bash
pnpm db:migrate
```

### 4. Crear usuario superadmin inicial

```bash
pnpm --filter @minidrive/api seed
```

Esto crea el usuario `admin@minidrive.com` con contrasena `admin123` y rol `superadmin`.

## Esquema de base de datos

```
users
  id              varchar(36) PK    -- UUID v7
  email           varchar(255)      -- UNIQUE
  name            varchar(255)
  role            enum(superadmin, admin, user)
  email_verified  boolean
  image           varchar(1000)
  created_at      timestamptz
  updated_at      timestamptz
  deleted_at      timestamptz       -- soft delete

accounts (Better Auth)
  id              varchar(36) PK
  user_id         varchar(36) FK -> users.id
  provider_id     varchar(255)
  account_id      varchar(255)
  password        text              -- hash bcrypt
  access_token    text
  refresh_token   text
  created_at      timestamptz
  updated_at      timestamptz

sessions (Better Auth)
  id              varchar(36) PK
  user_id         varchar(36) FK -> users.id
  token           varchar(255)
  expires_at      timestamptz
  ip_address      varchar(255)
  user_agent      text
  created_at      timestamptz
  updated_at      timestamptz

actuaciones
  id              varchar(36) PK
  name            varchar(500)
  created_by_id   varchar(36) FK -> users.id
  coliseo_status  boolean
  created_at      timestamptz
  updated_at      timestamptz

documents
  id              varchar(36) PK
  actuacion_id    varchar(36) FK -> actuaciones.id
  folder          enum(postes, camaras, fachadas, fotos, pets, planos)
  filename        varchar(500)
  storage_key     varchar(1000)
  mime_type       varchar(255)
  size            bigint
  uploaded_by_id  varchar(36) FK -> users.id
  uploaded_at     timestamptz

verifications (Better Auth)
  id              varchar(36) PK
  identifier      varchar(255)
  value           text
  expires_at      timestamptz
  created_at      timestamptz
  updated_at      timestamptz
```

### Diagrama de relaciones

```
users ─────────┬──< accounts
               ├──< sessions
               ├──< actuaciones
               └──< documents

actuaciones ───┴──< documents
```

- Todas las foreign keys son `NO ACTION` (sin cascade delete) para preservar trazabilidad.
- `users.deleted_at` implementa soft delete: los usuarios nunca se borran fisicamente.

## Comandos

```bash
pnpm install              # Instalar dependencias
pnpm dev                  # Levantar API + Web
pnpm dev --filter=@minidrive/api   # Solo API
pnpm dev --filter=@minidrive/web   # Solo Frontend
pnpm db:generate          # Generar migracion Drizzle
pnpm db:migrate           # Ejecutar migraciones
pnpm db:studio            # Abrir Drizzle Studio
pnpm test                 # Tests en todo el monorepo
```

## Roles y permisos

| Accion | Superadmin | Admin | User |
|--------|-----------|-------|------|
| CRUD usuarios | SI | NO | NO |
| Crear actuaciones | SI | SI | NO |
| Eliminar actuaciones | TODAS | Solo propias | NO |
| Subir archivos | SI | SI | SI |
| Descargar archivos | SI | SI | SI |
| Marcar coliseo | SI | SI | NO |
