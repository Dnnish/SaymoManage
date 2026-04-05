# MiniDrive — Guia de Prompts por Fases

Cada fase es un prompt que le das a Claude. Copia y pega el bloque completo.
Antes de cada fase, asegurate de tener `docker compose up -d` corriendo (PostgreSQL + MinIO).

**Protocolo de cierre de cada fase:**
1. Claude implementa + escribe tests
2. Claude ejecuta tests y verifica que pasen
3. Claude te muestra un resumen de TODOS los archivos creados/modificados
4. VOS revisas los cambios (`git diff`, leer archivos, probar manualmente)
5. Claude explica para tontos que se ha cambiado/que trabajo hizo
5. Claude te da el mensaje de commit
6. VOS haces el commit y push

---

## Fase 1 — Fundaciones: Schema, Tipos Compartidos y Conexion a BD

```
Implementa las fundaciones del proyecto MiniDrive:

1. **packages/shared**: Crear los tipos y constantes compartidos:
   - Enum `Folder` con los 6 valores (postes, camaras, fachadas, fotos, pets, planos)
   - Enum `Role` con los 3 valores (superadmin, admin, user)
   - Constante `ALLOWED_MIME_TYPES` que mapea cada Folder a sus MIME types permitidos
   - Schemas Zod de validacion para cada entidad (User, Actuacion, Document)
   - Exportar todo desde el index

2. **packages/db**: Crear el schema Drizzle completo:
   - Tabla `users`: id (UUID v7), email (unique), password_hash, name, role (enum), created_at, deleted_at (nullable)
   - Tabla `actuaciones`: id (UUID v7), name, created_by_id (FK users), coliseo_status (boolean default false), created_at, updated_at
   - Tabla `documents`: id (UUID v7), actuacion_id (FK actuaciones), folder (enum), filename, storage_key, mime_type, size (bigint), uploaded_by_id (FK users), uploaded_at
   - Configurar la conexion a PostgreSQL con postgres.js
   - Exportar el cliente db y todos los schemas desde el index

3. **Migracion inicial**: Generar la migracion con drizzle-kit

4. **Tests**:
   - Test unitario para las validaciones Zod en packages/shared (schemas aceptan datos validos, rechazan invalidos)
   - Test unitario para ALLOWED_MIME_TYPES (cada folder tiene los tipos correctos)

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar (conventional commits, en ingles)

Espera mi aprobacion antes de continuar.
```

---

## Fase 2 — Auth: Better Auth + Login/Register

```
Implementa el sistema de autenticacion con Better Auth:

1. **packages/db**: Agregar las tablas que Better Auth necesita (sessions, accounts, etc.) al schema existente. Better Auth tiene su propio schema — integralo con Drizzle sin duplicar la tabla users que ya existe.

2. **apps/api**: Configurar Better Auth en el backend:
   - Plugin de Fastify que registra Better Auth como middleware
   - Configurar Better Auth con el adapter de Drizzle (PostgreSQL)
   - Endpoints de auth: POST /api/auth/sign-up, POST /api/auth/sign-in, POST /api/auth/sign-out, GET /api/auth/session
   - El sign-up debe asignar role "user" por defecto
   - Crear un seed script que inserte un superadmin inicial (email: admin@minidrive.com, password: admin123)

3. **apps/api**: Crear el middleware de autenticacion:
   - Plugin de Fastify `authenticate` que verifica la sesion en cada request protegido
   - Decorar el request con el usuario autenticado (id, email, name, role)
   - Ruta GET /api/auth/me que devuelve el usuario actual

4. **Tests**:
   - Test de integracion: sign-up crea usuario y devuelve sesion
   - Test de integracion: sign-in con credenciales validas devuelve sesion
   - Test de integracion: sign-in con credenciales invalidas devuelve 401
   - Test de integracion: /api/auth/me sin sesion devuelve 401
   - Test de integracion: /api/auth/me con sesion devuelve el usuario

IMPORTANTE: Los tests de integracion deben usar una base de datos REAL (la de Docker), no mocks.

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 3 — RBAC + CRUD de Usuarios

```
Implementa el control de acceso basado en roles y la gestion de usuarios:

1. **apps/api**: Crear el middleware RBAC:
   - Plugin de Fastify `requireRole(...roles)` que verifica que el usuario tenga uno de los roles permitidos
   - Devolver 403 si el rol no es suficiente
   - Componer con el middleware `authenticate` (primero auth, luego role check)

2. **apps/api**: CRUD de usuarios (solo superadmin):
   - GET /api/users — listar usuarios (excluir deleted_at != null del listado por defecto, query param `includeDeleted` para mostrar todos)
   - GET /api/users/:id — detalle de usuario
   - POST /api/users — crear usuario (validar con Zod: email unico, role valido, password min 8 chars)
   - PATCH /api/users/:id — actualizar usuario (name, email, role). NO permitir cambiar password aqui
   - DELETE /api/users/:id — soft delete (setear deleted_at, NO borrar fisicamente). No permitir que un superadmin se elimine a si mismo

3. **Arquitectura**: Seguir el patron routes → handlers → services → repositories:
   - `src/routes/user-routes.ts` — definicion de rutas con schemas Zod
   - `src/handlers/user-handler.ts` — recibe request, llama al service, devuelve response
   - `src/services/user-service.ts` — logica de negocio
   - `src/repositories/user-repository.ts` — queries Drizzle

4. **Tests**:
   - Test unitario del service: crear usuario, actualizar, soft delete, listar (sin deleted)
   - Test de integracion: GET /api/users como superadmin → 200 con lista
   - Test de integracion: GET /api/users como admin → 403
   - Test de integracion: GET /api/users como user → 403
   - Test de integracion: POST /api/users con email duplicado → 409
   - Test de integracion: DELETE /api/users/:id → soft delete (verificar deleted_at)
   - Test de integracion: DELETE /api/users/self → 400 (no puede auto-eliminarse)

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 4 — CRUD de Actuaciones

```
Implementa la gestion de actuaciones:

1. **apps/api**: CRUD de actuaciones:
   - GET /api/actuaciones — listar todas, ordenadas por created_at DESC. Incluir el nombre del creador (join con users). Soportar query params: page, limit (paginacion)
   - GET /api/actuaciones/:id — detalle con conteo de documentos por carpeta
   - POST /api/actuaciones — crear (solo superadmin y admin). Campos: name. El created_by_id se toma del usuario autenticado
   - DELETE /api/actuaciones/:id — superadmin puede eliminar cualquiera, admin solo las propias, user no puede eliminar ninguna

2. **Arquitectura**: Seguir routes → handlers → services → repositories igual que users

3. **Tests**:
   - Test unitario del service: crear actuacion, listar, eliminar
   - Test de integracion: POST /api/actuaciones como admin → 201
   - Test de integracion: POST /api/actuaciones como user → 403
   - Test de integracion: DELETE /api/actuaciones/:id como admin (propia) → 200
   - Test de integracion: DELETE /api/actuaciones/:id como admin (ajena) → 403
   - Test de integracion: DELETE /api/actuaciones/:id como superadmin (cualquiera) → 200
   - Test de integracion: GET /api/actuaciones/:id devuelve conteo por carpeta

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 5 — Busqueda con Trigram

```
Implementa la busqueda de actuaciones en tiempo real:

1. **packages/db**: Agregar la extension pg_trgm y el indice trigram:
   - Nueva migracion que ejecuta CREATE EXTENSION IF NOT EXISTS pg_trgm
   - Indice GIN trigram en actuaciones.name

2. **apps/api**: Endpoint de busqueda:
   - GET /api/actuaciones?search=texto — filtrar por nombre usando similarity de pg_trgm
   - Combinar con la paginacion existente (page, limit)
   - Usar el operador % de trigram para fuzzy matching
   - Ordenar por similarity DESC cuando hay busqueda activa

3. **Tests**:
   - Test de integracion: buscar "camara" encuentra "Instalacion de Camaras" (fuzzy match)
   - Test de integracion: buscar con string vacio devuelve todas
   - Test de integracion: buscar algo que no existe devuelve array vacio
   - Test de integracion: busqueda respeta paginacion

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 6 — Storage: Cliente MinIO + Servicio de Archivos

```
Implementa la capa de almacenamiento con MinIO:

1. **apps/api**: Crear el cliente S3:
   - `src/lib/s3-client.ts` — instancia de @aws-sdk/client-s3 configurada con las env vars de MinIO
   - Funcion para asegurar que el bucket existe al iniciar la app (crear si no existe)

2. **apps/api**: Crear el servicio de storage:
   - `src/services/storage-service.ts` con metodos:
     - `upload(key: string, buffer: Buffer, contentType: string)` → sube archivo a MinIO
     - `download(key: string)` → devuelve readable stream
     - `remove(key: string)` → elimina archivo
   - El storage key sigue el formato: `{actuacionId}/{folder}/{filename}`

3. **Tests**:
   - Test de integracion: upload sube un archivo y se puede descargar
   - Test de integracion: download de key inexistente lanza error
   - Test de integracion: remove elimina el archivo (download posterior falla)

IMPORTANTE: Los tests necesitan MinIO corriendo (docker compose up -d).

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 7 — Upload de Documentos con Validacion por Carpeta

```
Implementa el upload de documentos con validacion de formato:

1. **apps/api**: Endpoint de upload:
   - POST /api/actuaciones/:actuacionId/documents — subir archivo a una carpeta
   - Body: multipart/form-data con campo `file` y campo `folder` (string del enum)
   - Validar que el MIME type del archivo coincide con los permitidos para esa carpeta (usar ALLOWED_MIME_TYPES de shared)
   - Generar storage_key: `{actuacionId}/{folder}/{timestamp}-{filename}`
   - Guardar metadata en la tabla documents + subir binario a MinIO
   - Responder con el document creado (sin el binario)

2. **apps/api**: Listado de documentos:
   - GET /api/actuaciones/:actuacionId/documents?folder=postes — listar documentos de una carpeta
   - Ordenar por uploaded_at DESC
   - Incluir nombre del uploader (join con users)

3. **apps/api**: Eliminar documento:
   - DELETE /api/documents/:id — eliminar metadata de BD + archivo de MinIO
   - Solo superadmin y admin pueden eliminar

4. **Tests**:
   - Test unitario: validacion de MIME type por carpeta (PDF en postes OK, imagen en postes FAIL, etc.)
   - Test de integracion: upload PDF a carpeta postes → 201
   - Test de integracion: upload imagen a carpeta postes → 400 (formato no permitido)
   - Test de integracion: upload imagen a carpeta fotos → 201
   - Test de integracion: listar documentos de una carpeta devuelve solo los de esa carpeta
   - Test de integracion: upload a carpeta planos con PDF → 201
   - Test de integracion: upload a carpeta planos con KMZ → 201
   - Test de integracion: eliminar documento borra de BD y MinIO

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 8 — Carpeta PETs (Conversion a JPG) + Download

```
Implementa la conversion automatica de PETs y el download de documentos:

1. **apps/api**: Conversion PETs:
   - Cuando se sube una imagen a la carpeta `pets`, convertirla automaticamente a JPG usando Sharp
   - Mantener el nombre original pero cambiar la extension a .jpg
   - Guardar el MIME type como image/jpeg en la BD
   - Si la imagen ya es JPG, no reconvertir (pasarla directamente)

2. **apps/api**: Download de documentos:
   - GET /api/documents/:id/download — descargar archivo
   - Setear headers correctos: Content-Type, Content-Disposition (attachment con filename original)
   - Stream directo desde MinIO al response (no buffear todo en memoria)

3. **Tests**:
   - Test unitario: conversion PNG a JPG produce un buffer JPG valido
   - Test unitario: imagen JPG no se reconvierte (passthrough)
   - Test de integracion: upload PNG a pets → documento guardado como .jpg con mime image/jpeg
   - Test de integracion: upload WEBP a pets → documento guardado como .jpg
   - Test de integracion: download devuelve el archivo con Content-Type correcto
   - Test de integracion: download de documento inexistente → 404

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 9 — Estado Coliseo

```
Implementa el toggle de estado Coliseo en actuaciones:

1. **apps/api**: Endpoint:
   - PATCH /api/actuaciones/:id/coliseo — toggle del campo coliseo_status
   - Body: { status: boolean }
   - Solo superadmin y admin pueden cambiar el estado
   - Actualizar updated_at al cambiar

2. **Tests**:
   - Test de integracion: toggle coliseo como admin → 200, estado cambia
   - Test de integracion: toggle coliseo como user → 403
   - Test de integracion: verificar que updated_at se actualiza

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 10 — Frontend: Shadcn + Routing + Layout + Auth Pages

```
Implementa la base del frontend:

1. **apps/web**: Inicializar Shadcn/ui:
   - Configurar shadcn con Tailwind CSS 4
   - Instalar los componentes base: Button, Input, Card, Form, Label, Separator, Avatar, DropdownMenu, Dialog, Badge, Skeleton, Toast/Sonner

2. **apps/web**: Configurar routing:
   - Instalar react-router-dom (o TanStack Router si prefieres, pero react-router es mas simple para empezar)
   - Rutas: /login, /dashboard, /users (protegida superadmin), /actuaciones, /actuaciones/:id

3. **apps/web**: Configurar TanStack Query:
   - QueryClientProvider en el root
   - Cliente HTTP base (fetch wrapper) que apunta a la API con credentials

4. **apps/web**: Layout:
   - Layout principal con sidebar/navbar: logo "MiniDrive", navegacion (Dashboard, Actuaciones, Usuarios), usuario actual con dropdown (cerrar sesion)
   - La opcion "Usuarios" solo visible para superadmin
   - Layout responsive (sidebar colapsable en mobile)

5. **apps/web**: Paginas de auth:
   - /login — formulario con email + password, React Hook Form + Zod
   - Redirect a /actuaciones despues de login exitoso
   - Proteger todas las rutas excepto /login (redirect a /login si no hay sesion)

6. **apps/web**: Hook de autenticacion:
   - `use-auth.ts` — hook que usa TanStack Query para GET /api/auth/me
   - Exponer: user, isLoading, isAuthenticated, login(), logout()

7. **Tests**:
   - Test de componente: formulario de login renderiza campos email y password
   - Test de componente: login con campos vacios muestra errores de validacion
   - Test de componente: layout muestra/oculta "Usuarios" segun rol

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- Screenshot mental de como se ve (describime la UI)
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 11 — Frontend: Gestion de Usuarios

```
Implementa la pagina de gestion de usuarios (solo superadmin):

1. **apps/web**: Pagina /users:
   - Tabla con columnas: Nombre, Email, Rol, Estado (activo/eliminado), Fecha de creacion
   - Boton "Nuevo usuario" que abre un Dialog/modal con formulario (nombre, email, password, rol)
   - Accion de editar en cada fila (abre modal con datos precargados, sin campo password)
   - Accion de eliminar en cada fila (confirmar con Dialog antes de soft delete)
   - Badge de color para el rol (superadmin: rojo, admin: azul, user: verde)
   - Badge para estado (activo: verde, eliminado: gris)

2. **apps/web**: Hooks y queries:
   - `use-users.ts` — queries TanStack: listar, crear, actualizar, eliminar
   - Invalidar cache despues de mutaciones

3. **apps/web**: Validacion de formularios con Zod (mismos schemas que el backend, importar de shared si es posible)

4. **Tests**:
   - Test de componente: tabla de usuarios renderiza las columnas correctas
   - Test de componente: formulario de nuevo usuario valida campos requeridos
   - Test de componente: badge de rol muestra el color correcto

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 12 — Frontend: Listado de Actuaciones + Busqueda

```
Implementa el listado y busqueda de actuaciones:

1. **apps/web**: Pagina /actuaciones:
   - Listado en cards o tabla con: nombre, creador, fecha, indicador coliseo (circulo verde/rojo)
   - Barra de busqueda con debounce de 300ms que filtra en tiempo real
   - Boton "Nueva actuacion" (visible solo para superadmin y admin) → Dialog con campo nombre
   - Boton eliminar en cada actuacion (respetando permisos: superadmin todas, admin solo propias)
   - Paginacion (botones anterior/siguiente o infinite scroll)
   - Click en una actuacion navega a /actuaciones/:id

2. **apps/web**: Hooks:
   - `use-actuaciones.ts` — queries: listar (con search y paginacion), crear, eliminar
   - `use-debounce.ts` — hook generico de debounce

3. **Tests**:
   - Test de componente: renderiza lista de actuaciones
   - Test de componente: indicador coliseo muestra color correcto (verde si true, rojo si false)
   - Test de componente: boton "Nueva actuacion" no aparece para role user
   - Test del hook use-debounce: actualiza valor despues del delay

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 13 — Frontend: Detalle de Actuacion + Carpetas

```
Implementa la vista de detalle de actuacion con sus carpetas:

1. **apps/web**: Pagina /actuaciones/:id:
   - Header con nombre de la actuacion + boton toggle coliseo (solo superadmin/admin)
   - 6 tabs o cards para las carpetas: Postes, Camaras, Fachadas, Fotos, PETs, Planos
   - Cada carpeta muestra el conteo de documentos como badge
   - Al seleccionar una carpeta, mostrar la lista de documentos (nombre, tamaño, subido por, fecha)

2. **apps/web**: Toggle Coliseo:
   - Switch o boton que cambia el estado
   - Indicador visual inmediato (optimistic update con TanStack Query)

3. **apps/web**: Hooks:
   - `use-actuacion.ts` — query de detalle + mutacion coliseo
   - `use-documents.ts` — query de documentos por carpeta

4. **Tests**:
   - Test de componente: renderiza las 6 carpetas con badge de conteo
   - Test de componente: toggle coliseo solo visible para admin/superadmin
   - Test de componente: lista de documentos muestra nombre y fecha

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 14 — Frontend: Upload de Archivos

```
Implementa la subida de archivos desde el frontend:

1. **apps/web**: Componente de upload:
   - Dropzone o input file dentro de cada carpeta
   - Validacion de formato en el frontend (como UX, no como seguridad):
     - Postes/Camaras/Fachadas: solo .pdf
     - Fotos: imagenes (jpg, png, webp, etc.)
     - PETs: imagenes (mostrar aviso "se convertira a JPG automaticamente")
     - Planos: .pdf y .kmz
   - Progress bar durante el upload
   - Toast de exito/error
   - Invalidar la lista de documentos despues de subir

2. **apps/web**: Componente de documento:
   - Cada documento muestra: icono segun tipo (PDF, imagen), nombre, tamaño formateado, fecha relativa
   - Boton descargar (inicia download del archivo)
   - Boton eliminar (con confirmacion, solo admin/superadmin)

3. **Tests**:
   - Test de componente: dropzone acepta archivos del formato correcto para la carpeta
   - Test de componente: dropzone rechaza archivos de formato incorrecto (muestra error)
   - Test de componente: carpeta PETs muestra el aviso de conversion
   - Test de componente: boton eliminar solo visible para admin/superadmin

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 15 — Frontend: Visor PDF + Preview de Imagenes

```
Implementa la previsualizacion de documentos:

1. **apps/web**: Visor PDF:
   - Al hacer click en un documento PDF, abrir un modal/drawer con react-pdf
   - Navegacion entre paginas (anterior/siguiente)
   - Indicador de pagina actual / total
   - Boton de descarga desde el visor
   - Boton de cerrar

2. **apps/web**: Preview de imagenes:
   - Al hacer click en una imagen (fotos o pets), abrir un lightbox/modal
   - Mostrar la imagen a tamaño completo
   - Boton de descarga

3. **Tests**:
   - Test de componente: visor PDF renderiza el componente Document de react-pdf
   - Test de componente: navegacion de paginas actualiza el numero de pagina
   - Test de componente: preview de imagen muestra la imagen con src correcto

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Fase 16 — Polish: Error Handling, Loading States, Responsive

```
Ultima fase — pulir la experiencia de usuario:

1. **apps/api**: Error handling global:
   - Plugin de Fastify que captura errores no manejados
   - Mapear errores de Zod a 400 con mensajes legibles
   - Mapear errores de Drizzle (unique constraint, FK violation) a codigos HTTP correctos
   - Nunca exponer stack traces en produccion

2. **apps/web**: Loading states:
   - Skeleton loaders en las listas (actuaciones, usuarios, documentos)
   - Estado vacio cuando no hay datos ("No hay actuaciones aun", "No hay documentos en esta carpeta")
   - Spinners en botones durante mutaciones (crear, eliminar, upload)

3. **apps/web**: Error states:
   - Componente ErrorBoundary para errores de render
   - Toast de error cuando una mutacion falla (con mensaje del backend)
   - Pagina 404 para rutas inexistentes

4. **apps/web**: Responsive:
   - Verificar que el layout funcione en mobile (sidebar colapsable)
   - Tablas con scroll horizontal en mobile
   - Modales a pantalla completa en mobile

5. **Tests**:
   - Test de integracion (API): error de validacion Zod devuelve 400 con formato legible
   - Test de integracion (API): violacion de unique constraint devuelve 409
   - Test de componente: skeleton loader se muestra mientras isLoading es true
   - Test de componente: estado vacio muestra mensaje correcto
   - Test de componente: ErrorBoundary captura errores y muestra fallback

Cuando termines, NO hagas commit. Mostrame:
- Lista de todos los archivos creados/modificados
- Resultado de los tests
- El mensaje de commit que deberia usar

Espera mi aprobacion antes de continuar.
```

---

## Resumen de Fases

| # | Fase | Scope | Archivos Principales |
|---|------|-------|---------------------|
| 1 | Fundaciones | shared + db | schemas, tipos, migracion |
| 2 | Auth | api + db | Better Auth, login, sesiones |
| 3 | RBAC + Users | api | middleware roles, CRUD users |
| 4 | Actuaciones | api | CRUD actuaciones |
| 5 | Busqueda | api + db | pg_trgm, fuzzy search |
| 6 | Storage | api | cliente MinIO, upload/download |
| 7 | Upload docs | api | validacion por carpeta, upload |
| 8 | PETs + Download | api | Sharp conversion, streaming |
| 9 | Coliseo | api | toggle status |
| 10 | Frontend base | web | Shadcn, routing, layout, auth |
| 11 | Frontend users | web | gestion usuarios |
| 12 | Frontend actuaciones | web | listado, busqueda, crear |
| 13 | Frontend detalle | web | carpetas, documentos, coliseo |
| 14 | Frontend upload | web | dropzone, validacion, progress |
| 15 | Frontend visor | web | react-pdf, lightbox imagenes |
| 16 | Polish | api + web | errores, loading, responsive |
