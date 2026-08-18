# Sprint 3 — Sensor API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear tabla `lecturas_sensor` en Supabase y los endpoints `POST /api/sensor` y `GET /api/sensor` para recibir y consultar lecturas del dispensador ESP32.

**Architecture:** Mismo patron MVC del Sprint 2 — schema Zod valida el JSON entrante, controller delega al service, service ejecuta queries en Supabase. Los endpoints son publicos (sin authMiddleware).

**Tech Stack:** Node.js + TypeScript + Express + Supabase JS v2 + Zod

---

## Mapa de archivos

| Archivo | Accion | Responsabilidad |
|---------|--------|-----------------|
| Supabase Dashboard | Crear tabla | Tabla `lecturas_sensor` con RLS deshabilitado |
| `src/schemas/sensor.schema.ts` | Crear | Schema Zod para validar lectura del ESP32 |
| `src/services/sensor.service.ts` | Crear | Queries Supabase para lecturas_sensor |
| `src/controllers/sensor.controller.ts` | Crear | Validar + delegar al service |
| `src/routes/sensor.routes.ts` | Crear | Endpoints publicos POST y GET |
| `src/app.ts` | Modificar | Registrar sensorRoutes en /api/sensor |

---

## Task 0: Crear tabla lecturas_sensor en Supabase

**Archivos:**
- Ninguno en el repo — se ejecuta en el dashboard de Supabase

- [ ] **Ir al SQL Editor de Supabase**

URL: `https://supabase.com/dashboard/project/pshejdspqqhuhyjbzslx/sql/new`

- [ ] **Ejecutar este SQL:**

```sql
CREATE TABLE lecturas_sensor (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id      text NOT NULL,
  pastilla_id         uuid REFERENCES pastillas(id) ON DELETE SET NULL,
  pastilla_dispensada boolean NOT NULL,
  bateria             integer NOT NULL CHECK (bateria >= 0 AND bateria <= 100),
  timestamp           timestamptz NOT NULL DEFAULT now()
);

-- Sin RLS — endpoint publico para el ESP32
ALTER TABLE lecturas_sensor DISABLE ROW LEVEL SECURITY;

-- Indice para filtrar por pastilla
CREATE INDEX idx_lecturas_pastilla_id ON lecturas_sensor(pastilla_id);
CREATE INDEX idx_lecturas_timestamp ON lecturas_sensor(timestamp DESC);
```

Salida esperada: `Success. No rows returned`

- [ ] **Verificar que la tabla existe**

En el dashboard: `https://supabase.com/dashboard/project/pshejdspqqhuhyjbzslx/editor`

Ejecutar: `SELECT * FROM lecturas_sensor LIMIT 1;`
Salida esperada: tabla vacia sin errores

---

## Task 1: Schema Zod para sensor

**Archivos:**
- Crear: `src/schemas/sensor.schema.ts`

- [ ] **Crear el schema:**

```typescript
// src/schemas/sensor.schema.ts
import { z } from "zod";

export const LecturaCreateSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  pastilla_id: z.string().uuid("pastilla_id debe ser UUID").optional(),
  pastilla_dispensada: z.boolean(),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),
  timestamp: z.string().datetime().optional(),
});

export type LecturaCreate = z.infer<typeof LecturaCreateSchema>;
```

- [ ] **Verificar compilacion:**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit:**

```bash
git add src/schemas/sensor.schema.ts
git commit -m "feat: schema Zod para lecturas del sensor ESP32"
```

---

## Task 2: Service para sensor

**Archivos:**
- Crear: `src/services/sensor.service.ts`

- [ ] **Crear el service:**

```typescript
// src/services/sensor.service.ts
import { supabase } from "../config/supabase";
import { LecturaCreate } from "../schemas/sensor.schema";

export const createLectura = async (body: LecturaCreate) => {
  const { data, error } = await supabase
    .from("lecturas_sensor")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const getAllLecturas = async (pastilla_id?: string) => {
  let query = supabase
    .from("lecturas_sensor")
    .select("*")
    .order("timestamp", { ascending: false });
  if (pastilla_id) query = query.eq("pastilla_id", pastilla_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
```

- [ ] **Verificar compilacion:**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit:**

```bash
git add src/services/sensor.service.ts
git commit -m "feat: service para lecturas_sensor — createLectura, getAllLecturas"
```

---

## Task 3: Controller para sensor

**Archivos:**
- Crear: `src/controllers/sensor.controller.ts`

- [ ] **Crear el controller:**

```typescript
// src/controllers/sensor.controller.ts
import { Request, Response } from "express";
import { LecturaCreateSchema } from "../schemas/sensor.schema";
import * as sensorService from "../services/sensor.service";

export const create = async (req: Request, res: Response): Promise<void> => {
  const result = LecturaCreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.flatten() });
    return;
  }
  try {
    const data = await sensorService.createLectura(result.data);
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const pastilla_id = req.query.pastilla_id as string | undefined;
    const data = await sensorService.getAllLecturas(pastilla_id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

- [ ] **Verificar compilacion:**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Commit:**

```bash
git add src/controllers/sensor.controller.ts
git commit -m "feat: controller para sensor — create, getAll"
```

---

## Task 4: Routes + registrar en app.ts

**Archivos:**
- Crear: `src/routes/sensor.routes.ts`
- Modificar: `src/app.ts`

- [ ] **Crear las rutas:**

```typescript
// src/routes/sensor.routes.ts
import { Router } from "express";
import * as sensorController from "../controllers/sensor.controller";

const router = Router();

// Sin authMiddleware — endpoints publicos para ESP32 y frontend
router.post("/", sensorController.create);
router.get("/", sensorController.getAll);

export default router;
```

- [ ] **Actualizar app.ts — agregar el import y la ruta:**

Agregar el import junto a los otros routers:
```typescript
import sensorRoutes from "./routes/sensor.routes";
```

Agregar la ruta junto a las otras rutas protegidas:
```typescript
app.use("/api/sensor", sensorRoutes);
```

El archivo completo debe quedar asi:
```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import usuariosRoutes from "./routes/usuarios.routes";
import pastillasRoutes from "./routes/pastillas.routes";
import horariosRoutes from "./routes/horarios.routes";
import contactosRoutes from "./routes/contactos.routes";
import sensorRoutes from "./routes/sensor.routes";

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

// Rutas publicas
app.use("/api/sensor", sensorRoutes);

export default app;
```

- [ ] **Verificar compilacion:**

```bash
npm run lint
```

Salida esperada: sin errores

- [ ] **Levantar el servidor y verificar GET:**

```bash
npm run dev
```

Abrir: `http://localhost:3000/api/sensor`
Respuesta esperada: `{ "success": true, "data": [] }`

- [ ] **Commit:**

```bash
git add src/routes/sensor.routes.ts src/app.ts
git commit -m "feat: rutas sensor registradas en app.ts — Sprint 3 completo"
```

---

## Resumen de commits del sprint

```
feat: schema Zod para lecturas del sensor ESP32
feat: service para lecturas_sensor — createLectura, getAllLecturas
feat: controller para sensor — create, getAll
feat: rutas sensor registradas en app.ts — Sprint 3 completo
```
