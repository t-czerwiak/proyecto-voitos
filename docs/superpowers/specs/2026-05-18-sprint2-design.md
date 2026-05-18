# Sprint 2 — CRUD API con Auth y Validacion

**Fecha:** 2026-05-18
**Proyecto:** Voitos Backend
**Stack:** Node.js + TypeScript + Express + Supabase + Zod

---

## Objetivo

Implementar endpoints CRUD completos para las 4 entidades del sistema (usuarios, pastillas, horarios, contactos_emergencia), con validacion de datos via Zod y autenticacion via Supabase Auth JWT.

---

## Arquitectura — MVC (Routes → Controllers → Services)

```
Request HTTP
    ↓
auth.middleware.ts     ← valida JWT de Supabase Auth
    ↓
*.routes.ts            ← define endpoint y llama al controller
    ↓
*.controller.ts        ← valida body con Zod, llama al service
    ↓
*.service.ts           ← ejecuta query en Supabase
    ↓
Supabase PostgreSQL
```

---

## Estructura de archivos nuevos

```
src/
├── middlewares/
│   └── auth.middleware.ts
├── schemas/
│   ├── usuarios.schema.ts
│   ├── pastillas.schema.ts
│   ├── horarios.schema.ts
│   └── contactos.schema.ts
├── routes/
│   ├── usuarios.routes.ts
│   ├── pastillas.routes.ts
│   ├── horarios.routes.ts
│   └── contactos.routes.ts
├── controllers/
│   ├── usuarios.controller.ts
│   ├── pastillas.controller.ts
│   ├── horarios.controller.ts
│   └── contactos.controller.ts
├── services/
│   ├── usuarios.service.ts
│   ├── pastillas.service.ts
│   ├── horarios.service.ts
│   └── contactos.service.ts
```

---

## Endpoints

### Usuarios
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/usuarios | Traer todos los usuarios |
| GET | /api/usuarios/:id | Traer un usuario por id |
| POST | /api/usuarios | Crear usuario |
| PUT | /api/usuarios/:id | Editar usuario |
| DELETE | /api/usuarios/:id | Eliminar usuario |

### Pastillas
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/pastillas?usuario_id=x | Traer pastillas de un usuario |
| GET | /api/pastillas/:id | Traer una pastilla por id |
| POST | /api/pastillas | Crear pastilla |
| PUT | /api/pastillas/:id | Editar pastilla |
| DELETE | /api/pastillas/:id | Eliminar pastilla |

### Horarios
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/horarios?pastilla_id=x | Traer horarios de una pastilla |
| GET | /api/horarios/:id | Traer un horario por id |
| POST | /api/horarios | Crear horario |
| PUT | /api/horarios/:id | Editar horario |
| DELETE | /api/horarios/:id | Eliminar horario |

### Contactos de emergencia
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | /api/contactos?usuario_id=x | Traer contactos de un usuario |
| GET | /api/contactos/:id | Traer un contacto por id |
| POST | /api/contactos | Crear contacto |
| PUT | /api/contactos/:id | Editar contacto |
| DELETE | /api/contactos/:id | Eliminar contacto |

---

## Autenticacion

- Supabase Auth maneja el registro y login de usuarios
- Cada request protegido lleva el header: `Authorization: Bearer <jwt>`
- `auth.middleware.ts` verifica el token con el cliente Supabase
- Si el token es invalido o falta, responde 401
- El usuario autenticado queda disponible en `req.user` para los controllers

---

## Validacion con Zod

Un schema por entidad. Ejemplo para usuarios:

```typescript
const UsuarioSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  mail: z.string().email(),
  edad: z.number().int().positive(),
});
```

El controller valida el body antes de llamar al service. Si falla, responde 400 con los errores de Zod.

---

## Manejo de errores

- **400** — validacion fallida (Zod)
- **401** — token invalido o ausente
- **404** — recurso no encontrado
- **500** — error interno (Supabase u otro)

Todos los errores responden con `{ success: false, error: "mensaje" }` para mantener consistencia con el formato ya usado en Sprint 1.

---

## Dependencias nuevas

- `zod` — validacion de schemas
- (Supabase Auth ya viene incluido en `@supabase/supabase-js`)
