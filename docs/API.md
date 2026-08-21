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

El token se consigue con `POST /api/auth/registro` o `POST /api/auth/login`.
**La app no habla con Supabase Auth directo**: no necesita ninguna key de
Supabase, solo la URL del backend.

Las rutas del sensor (`/api/sensor/*`) son **públicas**, porque la ESP32 no
maneja tokens JWT.

---

## Endpoints

### Auth

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/registro` | No | Crea la cuenta y devuelve el token ya iniciado |
| POST | `/api/auth/login` | No | Devuelve el token |
| GET | `/api/auth/yo` | Sí | Perfil del dueño del token |

**Body de `POST /api/auth/registro`:**
```json
{
  "nombre": "Ana",
  "apellido": "Gomez",
  "mail": "ana@ejemplo.com",
  "edad": 72,
  "password": "minimo6"
}
```

**Body de `POST /api/auth/login`:**
```json
{ "mail": "ana@ejemplo.com", "password": "minimo6" }
```

**Respuesta de ambos** (registro devuelve 201, login 200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "expira_en": 1785780441,
    "usuario": { "id": "uuid", "nombre": "Ana", "apellido": "Gomez", "mail": "ana@ejemplo.com", "edad": 72 }
  }
}
```

El registro crea la cuenta en Supabase Auth y la fila en `usuarios` **con el
mismo id**. Eso es lo que hace que `auth.uid()` coincida con `usuarios.id`, que
es la condición que usan las policies de RLS. Si falla la creación del perfil se
borra la cuenta de Auth, para no dejar cuentas huérfanas.

Errores propios de estos endpoints:

| Código | Cuándo |
| ------ | ------ |
| 409 | El mail ya tiene una cuenta |
| 401 | Mail o password incorrectos |

Todavía **no hay verificación por mail**: las cuentas se crean confirmadas
(`email_confirm: true`).

### Sensor / ESP32 (público)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/sensor/pendiente` | La ESP32 consulta cada 5 min si hay un horario para dispensar ahora |
| POST | `/api/sensor/dispensar` | El backend le manda la orden al dispositivo por WiFi |
| POST | `/api/sensor/confirmacion` | La ESP32 confirma que dispensó tras apretar el botón físico |

Hay **dos formas** de que el dispositivo se entere de que tiene que dispensar,
según cómo esté hecho el firmware:

- **Pull:** el dispositivo pregunta con `GET /api/sensor/pendiente`. El backend
  no necesita saber su IP.
- **Push:** el backend le manda la orden con `POST /api/sensor/dispensar`. Para
  esto el dispositivo tiene que exponer `GET /dispense` y el backend tiene que
  conocer su IP en la red local.

En los dos casos la dispensación se registra igual: por
`POST /api/sensor/confirmacion`, que manda el dispositivo después del botón.

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

**Body de `POST /api/sensor/dispensar`** (todo opcional):
```json
{
  "destino": "192.168.1.50",
  "horario_id": "uuid-del-horario",
  "cantidad": 5
}
```

`destino` es la IP o `host:puerto` del dispositivo. Si no viene, se usa
`ESP32_URL` del `.env`. Se acepta con o sin `http://`.

`horario_id`: si no viene, el backend busca la dosis pendiente en ese momento.
Se le manda al dispositivo para que pueda confirmarla después. Si no hay
ninguna pendiente, la señal se manda igual pero no se va a registrar nada.

`cantidad`: cuántas pastillas dispensar de una. Si no viene se usa la del
horario, y si tampoco hay, 1. Sirve para probar el hardware sin depender de que
haya una dosis cargada.

El backend termina llamando a
`GET {destino}/dispense?cantidad=N&horario_id=<uuid>`.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "enviado": true,
    "destino": "http://192.168.1.50/dispense",
    "respuesta_dispositivo": "Alerta activada. Presione el boton para dispensar.",
    "horario_id": "uuid-o-null",
    "cantidad": 5
  }
}
```

Que la señal llegue **no** significa que la pastilla se dispensó: el dispositivo
solo hace sonar el buzzer y queda esperando el botón. La dispensación real se
registra cuando llega `POST /api/sensor/confirmacion`.

| Código | Cuándo |
| ------ | ------ |
| 400 | No hay `destino` ni `ESP32_URL` configurado |
| 502 | El dispositivo no responde (apagado, otra red, IP incorrecta) o devolvió error |

**Body de `POST /api/sensor/confirmacion`:**
```json
{
  "dispositivo_id": "ESP32-001",
  "horario_id": "uuid-del-horario",
  "bateria": 85,
  "cantidad": 8
}
```

Al confirmar, el backend marca el horario como `dispensado = true` y guarda un
registro en `dispensaciones`.

`cantidad` es cuántas pastillas liberó realmente el dispositivo, y es lo que
queda guardado en `dispensaciones.cantidad`. Es **opcional**: si no viene, se
usa la `cantidad` del horario.

Se guarda aparte de `horarios.cantidad` a propósito, porque son cosas
distintas: una es lo que se **pidió** y la otra lo que **pasó**. Si el
dispositivo llegara a liberar menos de las pedidas, el historial refleja la
realidad.

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

`cantidad` (1 a 20) es cuántas pastillas dispensar en esa dosis. Es opcional al
crear: si no se manda, la base pone 1. El dispositivo las dispensa todas con una
sola apretada del botón.

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

### Módulos (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/modulos` | Lista todos, con la pastilla cargada. Filtro opcional `?dispositivo_id=` |
| GET | `/api/modulos/:id` | Uno por id |
| PUT | `/api/modulos/:id` | Cambiar la pastilla cargada o registrar cuántas hay |

**Body de `PUT /api/modulos/:id`** (al menos uno de los dos):
```json
{ "pastilla_id": "uuid-o-null", "cantidad_actual": 30 }
```

`cantidad_actual` es el stock de pastillas que hay en el módulo. **Lo registra
el cuidador** cuando lo recarga, y el backend lo va descontando solo en cada
dispensación confirmada.

Si al pedir una dispensación el módulo no tiene suficientes,
`POST /api/sensor/dispensar` responde **409** y no se manda la señal, para que
la persona no vaya hasta el pastillero al pedo:

```json
{ "success": false, "error": "Cantidad insuficiente: el modulo 1 tiene 2 pastilla(s) y la dosis necesita 5. Hay que recargarlo." }
```

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
| `horarios` | Cuándo tomar cada pastilla y cuántas (`cantidad`). `dispensado` marca si ya se cumplió; `notificado`, si ya se avisó por mail |
| `contactos_emergencia` | A quién avisar por usuario |
| `dispensaciones` | Registro de cada dispensación confirmada por la ESP32, con la `cantidad` que salió realmente |
| `modulos` | Módulo físico (tolva + filtro + servo). `numero` identifica el módulo, `pastilla_id` es la pastilla cargada y `cantidad_actual` cuántas quedan |

**RLS (Row Level Security):** activado en **todas** las tablas. El backend usa
la service_role key, que saltea RLS por diseño (es la clave de servidor de
confianza). Como ningún cliente accede directo a Supabase, no hay tablas
expuestas a la anon key pública.

## Mails al cuidador

El backend le manda un mail a `usuarios.mail` (la cuenta que se loguea en la
web) en dos situaciones:

| Cuándo | Qué dice |
| ------ | -------- |
| Se confirmó una dispensación | Medicamento, cantidad, horario, dispositivo y cuánto queda en el módulo. Avisa si quedó vacío o con menos de 4 |
| Pasaron 15 min del horario y la dosis sigue sin dispensarse | Qué dosis se perdió, hace cuánto, y los contactos de emergencia cargados |

El aviso de dosis no tomada lo dispara un scheduler que corre cada minuto
(`src/schedulers/dosis-no-tomadas.ts`). Cuando manda el mail marca
`horarios.notificado = true`, para no repetirlo en cada revisión.

**El re-sonado de la alarma no lo maneja el backend sino el firmware.** La ESP32
vuelve a sonar cada 5 minutos hasta 3 veces (a los 5, 10 y 15 del horario) y
después deja de insistir. Se hace ahí porque la placa ya sabe que está esperando
el botón y sigue funcionando aunque se corte el WiFi.

**Si no hay SMTP configurado en el `.env`, no falla**: escribe los mails por
consola en vez de enviarlos. Así se puede probar toda la lógica sin mandar
correos, y una dispensación válida nunca se cae porque el mail no salió. Ver
`.env.example` para las variables y cómo generar la contraseña de aplicación de
Gmail.

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
