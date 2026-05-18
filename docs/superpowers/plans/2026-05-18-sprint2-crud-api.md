# Sprint 2 — CRUD API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar endpoints CRUD completos para las 4 entidades (usuarios, pastillas, horarios, contactos_emergencia) con validacion Zod y autenticacion Supabase Auth JWT.

**Architecture:** MVC — las rutas reciben el request, los controllers validan con Zod y delegan al service, los services ejecutan las queries en Supabase. Un middleware de auth valida el JWT antes de cada request protegido.

**Tech Stack:** Node.js + TypeScript + Express + Supabase JS v2 + Zod

---

## Mapa de archivos

| Archivo | Accion | Responsabilidad |
|---------|--------|-----------------|
| `src/middlewares/auth.middleware.ts` | Crear | Validar JWT de Supabase Auth |
| `src/schemas/usuarios.schema.ts` | Crear | Schemas Zod para crear/editar usuario |
| `src/schemas/pastillas.schema.ts` | Crear | Schemas Zod para crear/editar pastilla |
| `src/schemas/horarios.schema.ts` | Crear | Schemas Zod para crear/editar horario |
| `src/schemas/contactos.schema.ts` | Crear | Schemas Zod para crear/editar contacto |
| `src/services/usuarios.service.ts` | Crear | Queries Supabase para usuarios |
| `src/services/pastillas.service.ts` | Crear | Queries Supabase para pastillas |
| `src/services/horarios.service.ts` | Crear | Queries Supabase para horarios |
| `src/services/contactos.service.ts` | Crear | Queries Supabase para contactos |
| `src/controllers/usuarios.controller.ts` | Crear | Validar + delegar a usuarios.service |
| `src/controllers/pastillas.controller.ts` | Crear | Validar + delegar a pastillas.service |
| `src/controllers/horarios.controller.ts` | Crear | Validar + delegar a horarios.service |
| `src/controllers/contactos.controller.ts` | Crear | Validar + delegar a contactos.service |
| `src/routes/usuarios.routes.ts` | Crear | Definir rutas /api/usuarios |
| `src/routes/pastillas.routes.ts` | Crear | Definir rutas /api/pastillas |
| `src/routes/horarios.routes.ts` | Crear | Definir rutas /api/horarios |
| `src/routes/contactos.routes.ts` | Crear | Definir rutas /api/contactos |
| `src/app.ts` | Modificar | Registrar las 4 routers, quitar /test-db |

---

## Task 0: Instalar Zod

- [ ] **Instalar dependencia**

```bash
cd C:\Users\User\Documents\GitHub\proyecto-voitos
npm install zod
```

Salida esperada: `added 1 package`

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: instalar zod para validacion"
```

---

## Task 1: Auth Middleware

**Archivos:**
- Crear: `src/middlewares/auth.middleware.ts`

- [ ] **Crear el middleware**

```typescript
// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Token requerido" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: "Token invalido o expirado" });
    return;
  }

  (req as any).user = data.user;
  next();
};
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/middlewares/auth.middleware.ts
git commit -m "feat: middleware de autenticacion Supabase Auth JWT"
```

---

## Task 2: Schemas Zod

**Archivos:**
- Crear: `src/schemas/usuarios.schema.ts`
- Crear: `src/schemas/pastillas.schema.ts`
- Crear: `src/schemas/horarios.schema.ts`
- Crear: `src/schemas/contactos.schema.ts`

- [ ] **Crear schema de usuarios**

```typescript
// src/schemas/usuarios.schema.ts
import { z } from "zod";

export const UsuarioCreateSchema = z.object({
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  mail: z.string().email("mail invalido"),
  edad: z.number().int().positive("edad debe ser positiva"),
});

export const UsuarioUpdateSchema = UsuarioCreateSchema.partial();

export type UsuarioCreate = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;
```

- [ ] **Crear schema de pastillas**

```typescript
// src/schemas/pastillas.schema.ts
import { z } from "zod";

export const PastillaCreateSchema = z.object({
  usuario_id: z.string().uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  tipo: z.string().min(1, "tipo requerido"),
  caracteristicas: z.string().optional(),
});

export const PastillaUpdateSchema = PastillaCreateSchema.partial();

export type PastillaCreate = z.infer<typeof PastillaCreateSchema>;
export type PastillaUpdate = z.infer<typeof PastillaUpdateSchema>;
```

- [ ] **Crear schema de horarios**

```typescript
// src/schemas/horarios.schema.ts
import { z } from "zod";

export const HorarioCreateSchema = z.object({
  pastilla_id: z.string().uuid("pastilla_id debe ser UUID"),
  dia: z.string().min(1, "dia requerido"),
  hora: z.number().int().min(0).max(23, "hora debe estar entre 0 y 23"),
  minuto: z.number().int().min(0).max(59, "minuto debe estar entre 0 y 59"),
});

export const HorarioUpdateSchema = HorarioCreateSchema.partial();

export type HorarioCreate = z.infer<typeof HorarioCreateSchema>;
export type HorarioUpdate = z.infer<typeof HorarioUpdateSchema>;
```

- [ ] **Crear schema de contactos**

```typescript
// src/schemas/contactos.schema.ts
import { z } from "zod";

export const ContactoCreateSchema = z.object({
  usuario_id: z.string().uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  numero: z.string().min(1, "numero requerido"),
  dni: z.string().min(1, "dni requerido"),
});

export const ContactoUpdateSchema = ContactoCreateSchema.partial();

export type ContactoCreate = z.infer<typeof ContactoCreateSchema>;
export type ContactoUpdate = z.infer<typeof ContactoUpdateSchema>;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/schemas/
git commit -m "feat: schemas Zod para las 4 entidades"
```

---

## Task 3: Usuarios — Service, Controller, Routes

**Archivos:**
- Crear: `src/services/usuarios.service.ts`
- Crear: `src/controllers/usuarios.controller.ts`
- Crear: `src/routes/usuarios.routes.ts`

- [ ] **Crear el service**

```typescript
// src/services/usuarios.service.ts
import { supabase } from "../config/supabase";
import { UsuarioCreate, UsuarioUpdate } from "../schemas/usuarios.schema";

export const getAllUsuarios = async () => {
  const { data, error } = await supabase.from("usuarios").select("*");
  if (error) throw new Error(error.message);
  return data;
};

export const getUsuarioById = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createUsuario = async (body: UsuarioCreate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateUsuario = async (id: string, body: UsuarioUpdate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteUsuario = async (id: string) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
```

- [ ] **Crear el controller**

```typescript
// src/controllers/usuarios.controller.ts
import { Request, Response } from "express";
import { UsuarioCreateSchema, UsuarioUpdateSchema } from "../schemas/usuarios.schema";
import * as usuariosService from "../services/usuarios.service";

export const getAll = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await usuariosService.getAllUsuarios();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await usuariosService.getUsuarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = UsuarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await usuariosService.createUsuario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = UsuarioUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await usuariosService.updateUsuario(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Usuario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await usuariosService.deleteUsuario(req.params.id);
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

- [ ] **Crear las rutas**

```typescript
// src/routes/usuarios.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as usuariosController from "../controllers/usuarios.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", usuariosController.getAll);
router.get("/:id", usuariosController.getById);
router.post("/", usuariosController.create);
router.put("/:id", usuariosController.update);
router.delete("/:id", usuariosController.remove);

export default router;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/services/usuarios.service.ts src/controllers/usuarios.controller.ts src/routes/usuarios.routes.ts
git commit -m "feat: CRUD usuarios — service, controller, routes"
```

---

## Task 4: Pastillas — Service, Controller, Routes

**Archivos:**
- Crear: `src/services/pastillas.service.ts`
- Crear: `src/controllers/pastillas.controller.ts`
- Crear: `src/routes/pastillas.routes.ts`

- [ ] **Crear el service**

```typescript
// src/services/pastillas.service.ts
import { supabase } from "../config/supabase";
import { PastillaCreate, PastillaUpdate } from "../schemas/pastillas.schema";

export const getAllPastillas = async (usuario_id?: string) => {
  let query = supabase.from("pastillas").select("*");
  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getPastillaById = async (id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createPastilla = async (body: PastillaCreate) => {
  const { data, error } = await supabase
    .from("pastillas")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updatePastilla = async (id: string, body: PastillaUpdate) => {
  const { data, error } = await supabase
    .from("pastillas")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deletePastilla = async (id: string) => {
  const { error } = await supabase.from("pastillas").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
```

- [ ] **Crear el controller**

```typescript
// src/controllers/pastillas.controller.ts
import { Request, Response } from "express";
import { PastillaCreateSchema, PastillaUpdateSchema } from "../schemas/pastillas.schema";
import * as pastillasService from "../services/pastillas.service";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await pastillasService.getAllPastillas(usuario_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await pastillasService.getPastillaById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = PastillaCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await pastillasService.createPastilla(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = PastillaUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await pastillasService.updatePastilla(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Pastilla no encontrada" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await pastillasService.deletePastilla(req.params.id);
    res.json({ success: true, message: "Pastilla eliminada" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

- [ ] **Crear las rutas**

```typescript
// src/routes/pastillas.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as pastillasController from "../controllers/pastillas.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", pastillasController.getAll);
router.get("/:id", pastillasController.getById);
router.post("/", pastillasController.create);
router.put("/:id", pastillasController.update);
router.delete("/:id", pastillasController.remove);

export default router;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/services/pastillas.service.ts src/controllers/pastillas.controller.ts src/routes/pastillas.routes.ts
git commit -m "feat: CRUD pastillas — service, controller, routes"
```

---

## Task 5: Horarios — Service, Controller, Routes

**Archivos:**
- Crear: `src/services/horarios.service.ts`
- Crear: `src/controllers/horarios.controller.ts`
- Crear: `src/routes/horarios.routes.ts`

- [ ] **Crear el service**

```typescript
// src/services/horarios.service.ts
import { supabase } from "../config/supabase";
import { HorarioCreate, HorarioUpdate } from "../schemas/horarios.schema";

export const getAllHorarios = async (pastilla_id?: string) => {
  let query = supabase.from("horarios").select("*");
  if (pastilla_id) query = query.eq("pastilla_id", pastilla_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getHorarioById = async (id: string) => {
  const { data, error } = await supabase
    .from("horarios")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createHorario = async (body: HorarioCreate) => {
  const { data, error } = await supabase
    .from("horarios")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateHorario = async (id: string, body: HorarioUpdate) => {
  const { data, error } = await supabase
    .from("horarios")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteHorario = async (id: string) => {
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
```

- [ ] **Crear el controller**

```typescript
// src/controllers/horarios.controller.ts
import { Request, Response } from "express";
import { HorarioCreateSchema, HorarioUpdateSchema } from "../schemas/horarios.schema";
import * as horariosService from "../services/horarios.service";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const pastilla_id = req.query.pastilla_id as string | undefined;
    const data = await horariosService.getAllHorarios(pastilla_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await horariosService.getHorarioById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Horario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = HorarioCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await horariosService.createHorario(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = HorarioUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await horariosService.updateHorario(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Horario no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await horariosService.deleteHorario(req.params.id);
    res.json({ success: true, message: "Horario eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

- [ ] **Crear las rutas**

```typescript
// src/routes/horarios.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as horariosController from "../controllers/horarios.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", horariosController.getAll);
router.get("/:id", horariosController.getById);
router.post("/", horariosController.create);
router.put("/:id", horariosController.update);
router.delete("/:id", horariosController.remove);

export default router;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/services/horarios.service.ts src/controllers/horarios.controller.ts src/routes/horarios.routes.ts
git commit -m "feat: CRUD horarios — service, controller, routes"
```

---

## Task 6: Contactos — Service, Controller, Routes

**Archivos:**
- Crear: `src/services/contactos.service.ts`
- Crear: `src/controllers/contactos.controller.ts`
- Crear: `src/routes/contactos.routes.ts`

- [ ] **Crear el service**

```typescript
// src/services/contactos.service.ts
import { supabase } from "../config/supabase";
import { ContactoCreate, ContactoUpdate } from "../schemas/contactos.schema";

export const getAllContactos = async (usuario_id?: string) => {
  let query = supabase.from("contactos_emergencia").select("*");
  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getContactoById = async (id: string) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createContacto = async (body: ContactoCreate) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateContacto = async (id: string, body: ContactoUpdate) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteContacto = async (id: string) => {
  const { error } = await supabase
    .from("contactos_emergencia")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};
```

- [ ] **Crear el controller**

```typescript
// src/controllers/contactos.controller.ts
import { Request, Response } from "express";
import { ContactoCreateSchema, ContactoUpdateSchema } from "../schemas/contactos.schema";
import * as contactosService from "../services/contactos.service";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuario_id = req.query.usuario_id as string | undefined;
    const data = await contactosService.getAllContactos(usuario_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await contactosService.getContactoById(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = ContactoCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await contactosService.createContacto(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const result = ContactoUpdateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.errors });
    return;
  }
  try {
    const data = await contactosService.updateContacto(req.params.id, result.data);
    if (!data) {
      res.status(404).json({ success: false, error: "Contacto no encontrado" });
      return;
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await contactosService.deleteContacto(req.params.id);
    res.json({ success: true, message: "Contacto eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

- [ ] **Crear las rutas**

```typescript
// src/routes/contactos.routes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import * as contactosController from "../controllers/contactos.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", contactosController.getAll);
router.get("/:id", contactosController.getById);
router.post("/", contactosController.create);
router.put("/:id", contactosController.update);
router.delete("/:id", contactosController.remove);

export default router;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit**

```bash
git add src/services/contactos.service.ts src/controllers/contactos.controller.ts src/routes/contactos.routes.ts
git commit -m "feat: CRUD contactos emergencia — service, controller, routes"
```

---

## Task 7: Registrar todas las rutas en app.ts

**Archivos:**
- Modificar: `src/app.ts`

- [ ] **Reemplazar el contenido de app.ts**

```typescript
// src/app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import usuariosRoutes from "./routes/usuarios.routes";
import pastillasRoutes from "./routes/pastillas.routes";
import horariosRoutes from "./routes/horarios.routes";
import contactosRoutes from "./routes/contactos.routes";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check (publico)
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "Voitos API funcionando" });
});

// Rutas protegidas
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pastillas", pastillasRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/contactos", contactosRoutes);

export default app;
```

- [ ] **Verificar que compila**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Levantar el servidor y verificar health check**

```bash
npm run dev
```

Abrir en el navegador: `http://localhost:3000/health`
Respuesta esperada: `{ "success": true, "message": "Voitos API funcionando" }`

- [ ] **Verificar que auth bloquea sin token**

Con Thunder Client o curl:
```
GET http://localhost:3000/api/usuarios
```
Respuesta esperada: `{ "success": false, "error": "Token requerido" }` con status 401

- [ ] **Commit final**

```bash
git add src/app.ts
git commit -m "feat: registrar rutas CRUD en app.ts — Sprint 2 completo"
```

---

## Resumen de commits del sprint

```
feat: instalar zod para validacion
feat: middleware de autenticacion Supabase Auth JWT
feat: schemas Zod para las 4 entidades
feat: CRUD usuarios — service, controller, routes
feat: CRUD pastillas — service, controller, routes
feat: CRUD horarios — service, controller, routes
feat: CRUD contactos emergencia — service, controller, routes
feat: registrar rutas CRUD en app.ts — Sprint 2 completo
```
