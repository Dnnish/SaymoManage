# MiniDrive — Sistema de Gestión Documental

## Descripcion del Proyecto

MiniDrive es un sistema web de gestión documental empresarial para organizar archivos por proyectos (actuaciones). Cada actuación contiene secciones fijas (postes, cámaras, fachadas, fotos) con validación de formato por sección, más una sección especial PETs con conversión automática de imágenes a JPG. Incluye control de acceso basado en roles (RBAC) con tres niveles de usuario.

## Stack Tecnologico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| UI | Shadcn/ui + Tailwind CSS 4 |
| State/Fetch | TanStack Query v5 |
| Backend | Node.js + TypeScript + Fastify |
| ORM | Drizzle ORM |
| Base de datos | PostgreSQL 16 |
| Storage | MinIO (S3-compatible) |
| Auth | Better Auth |
| Procesamiento de imagenes | Sharp |
| Visor PDF | react-pdf |
| Monorepo | Turborepo + pnpm workspaces |

## Estructura del Monorepo

```
MiniDrive/
├── apps/
│   ├── web/                 # React SPA (Vite)
│   └── api/                 # Fastify API
├── packages/
│   ├── shared/              # Tipos, constantes, validaciones compartidas
│   └── db/                  # Schema Drizzle + migraciones
├── turbo.json
├── package.json
├── docker-compose.yml       # PostgreSQL + MinIO para desarrollo
└── CLAUDE.md
```

## Modelo de Dominio

### Entidades

- **User**: id, email, passwordHash, name, role, createdAt, deletedAt (soft delete)
- **Actuacion**: id, name, createdById (FK User), coliseoStatus, createdAt, updatedAt
- **Document**: id, actuacionId (FK), folder (enum), filename, storageKey, mimeType, size, uploadedById (FK User), uploadedAt

### Roles y Permisos

| Accion | Superadmin | Admin | User |
|--------|-----------|-------|------|
| CRUD usuarios | SI | NO | NO |
| Crear actuaciones | SI | SI | NO |
| Eliminar actuaciones | TODAS | Solo propias | NO |
| Subir archivos | SI | SI | SI |
| Descargar archivos | SI | SI | SI |
| Marcar coliseo | SI | SI | NO |

### Carpetas por Actuacion (enum, no tabla)

```typescript
enum Folder {
  POSTES = 'postes',       // solo PDF
  CAMARAS = 'camaras',     // solo PDF
  FACHADAS = 'fachadas',   // solo PDF
  FOTOS = 'fotos',         // imagenes (cualquier formato)
  PETS = 'pets',           // imagenes (conversion automatica a JPG)
  PLANOS = 'planos',       // PDF + KMZ
}
```

### Validacion de Formatos por Carpeta

| Carpeta | Formatos permitidos |
|---------|-------------------|
| postes, camaras, fachadas | application/pdf |
| fotos | image/* |
| pets | image/* (conversion automatica a JPG via Sharp) |
| planos | application/pdf, application/vnd.google-earth.kmz |

## Reglas de Negocio

- Los usuarios eliminados se marcan con `deletedAt` (soft delete), NUNCA se borran fisicamente. Esto preserva la trazabilidad de quien subio/modifico documentos.
- La busqueda de actuaciones es en tiempo real con debounce (300ms) usando trigram indexes de PostgreSQL (`pg_trgm`).
- Los documentos dentro de cada carpeta se ordenan por `uploadedAt DESC` (mas reciente primero).
- Las actuaciones en el listado general se agrupan/filtran por fecha de creacion.
- El campo `coliseoStatus` en la actuacion indica si fue subida a Coliseo. El frontend muestra un indicador visual de color (verde = subido, rojo/gris = pendiente).
- Los archivos binarios se almacenan en MinIO/S3, NUNCA en PostgreSQL.
- La validacion de formato se hace SIEMPRE en el backend (el frontend valida tambien pero como UX, no como seguridad).

## Convenciones de Codigo

### General

- TypeScript estricto (`strict: true`) en todo el monorepo
- Sin `any` explicitos — usar tipos concretos o `unknown` cuando sea necesario
- Nombres de archivo: kebab-case (`user-service.ts`, `upload-button.tsx`)
- Imports con alias `@/` para cada app/package

### Backend (API)

- Arquitectura: routes -> handlers -> services -> repositories
- Validacion de input con esquemas Zod integrados en Fastify
- Errores tipados con codigos HTTP correctos (no todo es 500)
- Middleware de auth y RBAC como plugins de Fastify
- Logs estructurados con Pino (viene con Fastify)

### Frontend (Web)

- Componentes: PascalCase (`ActuacionCard.tsx`)
- Hooks custom: `use-` prefix en kebab-case (`use-actuaciones.ts`)
- Paginas en directorio `pages/` con lazy loading
- Formularios con React Hook Form + Zod
- NO usar estado global — TanStack Query como cache del servidor

### Base de Datos

- Nombres de tabla: snake_case plural (`users`, `actuaciones`, `documents`)
- Nombres de columna: snake_case (`created_at`, `uploaded_by_id`)
- Todas las tablas tienen `id` (UUID v7), `created_at`
- Foreign keys NO usan CASCADE DELETE — preservar integridad referencial
- Migraciones versionadas con Drizzle Kit

### Testing

- Tests unitarios para servicios y utilidades
- Tests de integracion para endpoints de la API con base de datos real (NO mocks de BD)
- Frontend: tests de componentes con Vitest + Testing Library

## Comandos de Desarrollo

```bash
pnpm install              # Instalar dependencias
pnpm dev                  # Levantar todo (API + Web + DB + MinIO)
pnpm dev --filter=api     # Solo API
pnpm dev --filter=web     # Solo Frontend
pnpm db:generate          # Generar migracion Drizzle
pnpm db:migrate           # Ejecutar migraciones
pnpm db:studio            # Abrir Drizzle Studio
pnpm test                 # Tests en todo el monorepo
pnpm lint                 # Lint en todo el monorepo
pnpm build                # Build de produccion
```

## Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://minidrive:minidrive@localhost:5433/minidrive

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=minidrive

# Auth
AUTH_SECRET=<random-secret-for-sessions>

# API
API_PORT=3001
API_HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:3001
```

## Reglas de Trabajo — OBLIGATORIAS

### 1. SDD Obligatorio para Cambios Sustanciales

TODO cambio que involucre mas de 1 archivo o agregue funcionalidad nueva DEBE pasar por SDD. No hay excepciones. Si la tarea parece "simple" pero toca multiples archivos, es SDD.

Solo se permite trabajo inline (sin SDD) para:
- Fix de 1 linea en 1 archivo
- Cambios cosmeticos (typos, formatting)
- Actualizacion de dependencias sin cambios de codigo

Para todo lo demas: `/sdd-ff <nombre-del-cambio>` o el flujo SDD completo.

### 2. Explicar CADA Cambio

Despues de implementar cualquier cosa, ANTES de pedir aprobacion, DEBES:

1. **Explicar QUE hiciste** — no solo listar archivos, sino describir el PROPOSITO de cada archivo/cambio en lenguaje claro
2. **Explicar POR QUE lo hiciste asi** — las decisiones tecnicas, tradeoffs, alternativas descartadas
3. **Explicar COMO encaja** — como se conecta con el resto del sistema, que depende de esto, que va a usar esto despues

Formato obligatorio para la explicacion:
```
### [nombre-del-archivo]
- QUE: descripcion del contenido
- POR QUE: razon tecnica de la decision
- CONEXION: como se relaciona con el resto
```

Si un cambio no se puede explicar claramente, probablemente no se entiende lo suficiente como para implementarlo.

### 3. Protocolo de Cierre de Tarea

Antes de dar cualquier tarea por terminada:
1. Ejecutar tests y mostrar resultado
2. Listar TODOS los archivos creados/modificados
3. Dar la explicacion completa (regla 2)
4. Proponer commit message (conventional commits, en ingles)
5. ESPERAR aprobacion del usuario — NUNCA hacer commit automaticamente

## Skills y Agentes — Protocolo OBLIGATORIO

ESTAS INSTRUCCIONES SON MANDATORIAS. Antes de escribir codigo o ejecutar cualquier tarea significativa, DEBES evaluar si una skill o combinacion de skills aplica. Si aplica, cargarla ANTES de actuar.

### Regla General

1. Leer el trigger de cada skill en la tabla de abajo
2. Si el contexto actual coincide con uno o mas triggers → cargar la skill con el Skill tool
3. Si multiples skills aplican → cargarlas TODAS (se combinan, no se excluyen)
4. NUNCA escribir codigo sin antes verificar si hay una skill aplicable

### Inventario de Skills

#### SDD — Spec-Driven Development (Cambios Sustanciales)

USAR SDD para cualquier cambio que involucre multiples archivos, nueva funcionalidad, o cambios arquitecturales. NO usar SDD para fixes puntuales de una linea o cambios cosmeticos.

| Skill | Trigger | Proposito |
|-------|---------|-----------|
| `sdd-init` | Primera vez que se usa SDD en el proyecto, o no existe contexto SDD en engram | Detecta stack, testing, convenciones. OBLIGATORIO antes de cualquier otro comando SDD |
| `sdd-explore` | "investigar", "explorar", "analizar opciones", comparar enfoques antes de decidir | Investiga el codebase, compara alternativas, recomienda enfoque. NO crea archivos |
| `sdd-propose` | Definir QUE se va a hacer y POR QUE. Inicio de un cambio nuevo | Crea propuesta con intent, scope, approach y Capabilities contract |
| `sdd-spec` | Escribir especificaciones, requisitos, escenarios Given/When/Then | Crea delta specs basados en la propuesta. Requiere: proposal |
| `sdd-design` | Decisiones de arquitectura, diseño tecnico, COMO se implementa | Crea design doc con decisiones, file changes, rationale. Requiere: proposal |
| `sdd-tasks` | Desglosar trabajo en tareas concretas e implementables | Crea checklist de tareas en 5 fases. Requiere: spec + design |
| `sdd-apply` | Implementar codigo siguiendo las tareas definidas | Escribe codigo, marca tareas completadas. Requiere: tasks + spec + design |
| `sdd-verify` | Validar que la implementacion cumple las specs | Ejecuta tests, build, coverage, genera compliance matrix. Requiere: spec + tasks |
| `sdd-archive` | Cerrar un cambio completado y archivarlo | Mueve a archivo, mergea delta specs a main specs |

**Flujo SDD completo:**
```
sdd-init (una vez) → sdd-explore → sdd-propose → sdd-spec + sdd-design (paralelo) → sdd-tasks → sdd-apply → sdd-verify → sdd-archive
```

**Meta-comandos SDD** (no son skills, el orchestrator los maneja directamente):
- `/sdd-new <cambio>` — Inicia un cambio nuevo delegando explore + propose
- `/sdd-continue [cambio]` — Ejecuta la siguiente fase pendiente
- `/sdd-ff <cambio>` — Fast-forward: proposal → specs → design → tasks sin pausas

#### Utilidades

| Skill | Trigger | Proposito |
|-------|---------|-----------|
| `branch-pr` | Crear un PR, preparar cambios para review, abrir pull request | Workflow de PR con issue linking, branch naming, conventional commits, type labels |
| `issue-creation` | Crear un issue en GitHub, reportar un bug, solicitar una feature | Templates de bug/feature, status labels, approval gate |
| `judgment-day` | Review adversarial de codigo, auditar calidad, "judgment day" | Lanza 2 jueces ciegos en paralelo, sintetiza findings, itera hasta convergencia |
| `go-testing` | Escribir tests en Go, usar teatest, testing de TUI Bubbletea | Patrones table-driven, golden files, screen transitions |
| `skill-creator` | Crear una nueva skill para el agente | Templates de SKILL.md, naming, estructura de assets |
| `skill-registry` | "actualizar skills", "skill registry", agregar/remover skills | Escanea skills, genera `.atl/skill-registry.md` con compact rules |
| `engram:memory` | SIEMPRE ACTIVA — no requiere trigger manual | Protocolo de memoria persistente. Guardar decisiones, bugs, discoveries |

### Combinaciones Obligatorias por Escenario

Estas son las combinaciones que DEBES aplicar segun el tipo de tarea:

| Escenario | Skills a Cargar | Orden |
|-----------|----------------|-------|
| Nueva feature (multi-archivo) | `sdd-init` (si no existe) → flujo SDD completo | Secuencial segun DAG |
| Bug fix complejo (multi-archivo) | `sdd-init` → `sdd-explore` → `sdd-apply` → `sdd-verify` | Secuencial |
| Bug fix simple (1 archivo) | Ninguna skill SDD. Solo fix + `engram:memory` para guardar root cause | Inline |
| Refactor arquitectural | `sdd-init` → flujo SDD completo con `sdd-design` como prioridad | Secuencial |
| Crear PR | `branch-pr` | Directa |
| Crear issue | `issue-creation` | Directa |
| Review de calidad profundo | `judgment-day` | Directa |
| Implementar feature + crear PR | Flujo SDD → al finalizar `branch-pr` | SDD primero, PR al final |
| Implementar + review + PR | Flujo SDD → `judgment-day` → `branch-pr` | Secuencial |
| Explorar sin comprometerse | `sdd-explore` (standalone, no requiere SDD completo) | Directa |
| Agregar tests | `go-testing` (si Go) o directamente (si Vitest) | Directa |
| Diseño de UI/componentes | `creative-design/frontend-design` (si disponible) | Directa |

### Agentes y Delegacion

El orchestrator (conversacion principal) DELEGA trabajo a sub-agentes. Reglas:

| Accion | Hacer Inline | Delegar a Sub-Agente |
|--------|-------------|---------------------|
| Leer 1-3 archivos para decidir | SI | — |
| Leer 4+ archivos para explorar | — | SI (Explore agent) |
| Escribir 1 archivo mecanico | SI | — |
| Escribir multiples archivos con logica nueva | — | SI (general-purpose agent) |
| Ejecutar tests o builds | — | SI (general-purpose agent) |
| Busqueda rapida (archivo/clase) | SI (Glob/Grep) | — |
| Investigacion profunda del codebase | — | SI (Explore agent) |
| Fase SDD completa | — | SI (skill correspondiente) |

**Asignacion de modelos por fase:**

| Fase/Tarea | Modelo |
|------------|--------|
| Orchestrator (esta conversacion) | opus |
| sdd-explore, sdd-spec, sdd-tasks, sdd-apply, sdd-verify | sonnet |
| sdd-propose, sdd-design | opus |
| sdd-archive | haiku |
| Delegacion general (no SDD) | sonnet |

### Protocolo de Inicio de Sesion SDD

Antes de ejecutar CUALQUIER comando SDD:
1. Buscar en engram: `mem_search(query: "sdd-init/minidrive", project: "minidrive")`
2. Si existe → proceder
3. Si NO existe → ejecutar `sdd-init` PRIMERO, sin preguntar

### Protocolo de Skill Resolver para Sub-Agentes

Los sub-agentes nacen SIN contexto. El orchestrator DEBE:
1. Obtener el skill registry (engram o `.atl/skill-registry.md`)
2. Matchear skills relevantes por contexto de archivos (.tsx → React, .ts backend → Fastify) y por tarea (review → judgment-day, PR → branch-pr)
3. Inyectar compact rules como `## Project Standards (auto-resolved)` en el prompt del sub-agente
4. NUNCA enviar paths a SKILL.md — siempre texto pre-digerido
