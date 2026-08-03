# API Voitos — Backend

Referencia de la API REST del backend de Voitos. Pensada para que el frontend
(React Native + axios) y el hardware (ESP32) sepan qué endpoints consumir.

## Arquitectura

```
ESP32 (WiFi)      ──HTTP──▶  Backend Express  ──service_role──▶  Supabase
App React Native  ──axios─▶  (localhost:3000)                    (PostgreSQL)
```

Ni la ESP32 ni la app se conectan directo a Supabase. Todo pasa por el backend,
que es el único que habla con la base usando la **service_role key**.

- **Stack:** Node.js + TypeScript + Express + Supabase
- **Patrón:** `route → controller → service → Supabase`
- **Base URL en desarrollo:** `http://localhost:3000`

## Formato de respuesta

Todos los endpoints devuelven el mismo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensaje" }
```

### Códigos de error

| Código | Cuándo | Campo `error` |
| ------ | ------ | ------------- |
| 400 | El body no pasa la validación de Zod | Detalle por campo (`fieldErrors`) |
| 400 | El body trae JSON mal formado | `"JSON invalido en el body"` |
| 401 | Falta el JWT o es inválido en una ruta protegida | `"Token requerido"` |
| 404 | El recurso pedido no existe | `"<Recurso> no encontrado"` |
| 404 | La ruta no existe | `"Ruta no encontrada: GET /api/loquesea"` |
| 500 | Cualquier fallo inesperado (ej: la base caída) | `"Error interno del servidor"` |

Los errores 500 nunca exponen el detalle interno al cliente: el mensaje real
queda en el log del servidor (`Error no manejado: ...`) y el cliente siempre
recibe el mismo texto genérico. Los controllers no arman la respuesta de error,
la delegan al middleware central con `next(error)`.

## Autenticación

Las rutas protegidas requieren el JWT de Supabase en el header:

```
Authorization: Bearer <token>
```

Las rutas del sensor (`/api/sensor/*`) son **públicas**, porque la ESP32 no
maneja tokens JWT.

---

## Endpoints

### Health (público)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | Verifica que el servidor esté corriendo |

### Sensor / ESP32 (público)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/sensor/pendiente` | La ESP32 consulta cada 5 min si hay un horario para dispensar ahora |
| POST | `/api/sensor/confirmacion` | La ESP32 confirma que dispensó tras apretar el botón físico |

**Respuesta de `GET /api/sensor/pendiente`:**
```json
{
  "success": true,
  "data": {
    "pendiente": true,
    "horario": { "id": "uuid", "pastilla_id": "uuid", "hora": 15, "minuto": 31 },
    "modulo": 1
  }
}
```
`modulo` es el número de módulo que la ESP32 tiene que activar (el que tiene esa
pastilla cargada). El Arduino mapea el número de módulo a su servo. Si no hay
nada pendiente, `pendiente` es `false` y `modulo` es `null`.

**Body de `POST /api/sensor/confirmacion`:**
```json
{
  "dispositivo_id": "ESP32-001",
  "horario_id": "uuid-del-horario",
  "bateria": 85
}
```

Al confirmar, el backend marca el horario como `dispensado = true` y guarda un
registro en `dispensaciones`.

### Usuarios (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/usuarios` | Lista todos |
| GET | `/api/usuarios/:id` | Uno por id |
| POST | `/api/usuarios` | Crear |
| PUT | `/api/usuarios/:id` | Editar |
| DELETE | `/api/usuarios/:id` | Eliminar |

### Pastillas (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/pastillas` | Lista todas. Filtro opcional `?usuario_id=uuid` |
| GET | `/api/pastillas/:id` | Una por id |
| GET | `/api/pastillas/:id/horarios` | Todos los horarios de esa pastilla |
| POST | `/api/pastillas` | Crear |
| PUT | `/api/pastillas/:id` | Editar |
| DELETE | `/api/pastillas/:id` | Eliminar |

### Horarios (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/horarios` | Lista todos. Filtro opcional `?pastilla_id=uuid` |
| GET | `/api/horarios/dia/:fecha` | Rutina de un día (`/dia/2026-07-13`), con nombre de pastilla |
| GET | `/api/horarios/:id` | Uno por id |
| POST | `/api/horarios` | Crear |
| PUT | `/api/horarios/:id` | Editar |
| DELETE | `/api/horarios/:id` | Eliminar |

El campo `dia` es una fecha específica (`YYYY-MM-DD`). `hora` (0-23) y `minuto`
(0-59) se guardan en hora local de Argentina.

### Contactos de emergencia (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/contactos` | Lista todos. Filtro opcional `?usuario_id=uuid` |
| GET | `/api/contactos/:id` | Uno por id |
| POST | `/api/contactos` | Crear |
| PUT | `/api/contactos/:id` | Editar |
| DELETE | `/api/contactos/:id` | Eliminar |

### Dispensaciones (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/dispensaciones` | Historial de dispensaciones con info de pastilla. Filtro opcional `?usuario_id=uuid` |

### Alertas (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/alertas` | Dosis vencidas sin dispensar, con el usuario y sus contactos de emergencia a quienes avisar. Filtro opcional `?usuario_id=uuid` |

Una dosis se considera "no tomada" cuando su horario ya pasó (fecha anterior a
hoy, o es hoy pero la hora ya quedó atrás) y sigue con `dispensado = false`.

---

## Base de datos

| Tabla | Descripción |
| ----- | ----------- |
| `usuarios` | Adultos mayores que usan el pastillero |
| `pastillas` | Medicamentos de cada usuario |
| `horarios` | Cuándo tomar cada pastilla (`dispensado` marca si ya se cumplió) |
| `contactos_emergencia` | A quién avisar por usuario |
| `dispensaciones` | Registro de cada dispensación confirmada por la ESP32 |
| `modulos` | Módulo físico (tolva + filtro + servo). `numero` identifica el módulo; `pastilla_id` es la pastilla que tiene cargada |

**RLS (Row Level Security):** activado en **todas** las tablas. El backend usa
la service_role key, que saltea RLS por diseño (es la clave de servidor de
confianza). Como ningún cliente accede directo a Supabase, no hay tablas
expuestas a la anon key pública.

## Correr el proyecto

```bash
npm install
npm run dev      # servidor en http://localhost:3000
```

Requiere un archivo `.env` con:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=3000
```
