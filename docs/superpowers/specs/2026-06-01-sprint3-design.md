# Sprint 3 — Integración ESP32 y Sensor

**Fecha:** 2026-06-01
**Proyecto:** Voitos Backend
**Stack:** Node.js + TypeScript + Express + Supabase + Zod

---

## Objetivo

Crear los endpoints para recibir lecturas del dispensador ESP32 y exponerlas al frontend. Los endpoints son públicos (proyecto escolar, sin auth). La tabla `lecturas_sensor` guarda el historial completo.

---

## Tabla nueva en Supabase

```sql
lecturas_sensor
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  dispositivo_id    text NOT NULL
  pastilla_id       uuid REFERENCES pastillas(id)
  pastilla_dispensada boolean NOT NULL
  bateria           integer NOT NULL
  timestamp         timestamptz NOT NULL DEFAULT now()
```

---

## JSON del sensor (provisional, a confirmar con Olivia)

```json
{
  "dispositivo_id": "ESP32-001",
  "timestamp": "2026-06-01T10:00:00Z",
  "pastilla_dispensada": true,
  "pastilla_id": "uuid-de-la-pastilla",
  "bateria": 85
}
```

---

## Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | /api/sensor | Ninguna | ESP32 manda lectura, se guarda en lecturas_sensor |
| GET | /api/sensor | Ninguna | Frontend consulta lecturas. Filtro opcional: ?pastilla_id=x |

---

## Arquitectura — mismo patron MVC del Sprint 2

```
src/
├── schemas/sensor.schema.ts       ← Zod: validacion del JSON entrante
├── services/sensor.service.ts     ← queries Supabase
├── controllers/sensor.controller.ts ← valida + delega al service
├── routes/sensor.routes.ts        ← define endpoints (sin authMiddleware)
```

`app.ts` se actualiza agregando:
```typescript
app.use("/api/sensor", sensorRoutes);
```

---

## Manejo de errores

- **400** — JSON invalido (Zod)
- **500** — error de Supabase
- Respuestas con formato `{ success: boolean, data/error }` igual que Sprint 2

---

## Nota

El formato JSON es provisional. Cuando Olivia confirme los campos reales del firmware, se ajusta el schema Zod y la tabla sin cambiar la arquitectura.
