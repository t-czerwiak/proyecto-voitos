# API Voitos — Backend

Referencia completa del backend de Voitos: cada endpoint, qué recibe, qué
devuelve, y las piezas que corren solas (schedulers y mails). Pensada para que
el frontend (la página web de `app/`) y el hardware (ESP32) sepan qué consumir,
y para que cualquiera del equipo entienda qué hace el servidor sin leer el
código.

## Arquitectura

```
ESP32 (WiFi)  ──HTTPS──▶  Backend Express   ──service_role──▶  Supabase
App web       ──fetch──▶  (Render)                             (PostgreSQL + Auth)
```

Ni la ESP32 ni la app se conectan directo a Supabase. Todo pasa por el backend,
que es el único que habla con la base usando la **service_role key**.

- **Stack:** Node.js + TypeScript + Express + Supabase, validación con Zod.
- **Patrón:** `route → controller → service → Supabase`, una carpeta por capa
  en `backend/src/` (`routes`, `controllers`, `services`, `schemas`,
  `middlewares`, `schedulers`, `utils`).
- **Producción:** `https://voitos-backend.onrender.com` (Render, plan free).
- **Desarrollo:** `http://localhost:3000`.
- **App:** `https://voitos.vercel.app`, que apunta sola a Render.

## Formato de respuesta

Todos los endpoints JSON devuelven el mismo formato:

```json
{ "success": true, "data": { } }
{ "success": false, "error": "mensaje" }
```

Las dos excepciones son `GET /api/auth/verificar/:token`, que devuelve una
página HTML porque la abre una persona desde el mail, y `GET /api/logo.png`,
que devuelve la imagen.

### Códigos de error

| Código | Cuándo | Campo `error` |
| ------ | ------ | ------------- |
| 400 | El body no pasa la validación de Zod | Detalle por campo (`fieldErrors`) |
| 400 | El body trae JSON mal formado | `"JSON invalido en el body"` |
| 401 | Falta el JWT o es inválido en una ruta protegida | `"Token requerido"` |
| 404 | El recurso no existe **o no es tuyo** | `"<Recurso> no encontrado"` |
| 404 | La ruta no existe, o es de admin y no lo sos | `"Ruta no encontrada..."` |
| 409 | Conflicto con el estado actual (mail repetido, sin stock, etc.) | Mensaje legible |
| 410 | Un enlace del mail (verificación o contraseña) ya venció | Mensaje legible |
| 429 | Se pasó el límite de intentos de las rutas de auth | `"Demasiados intentos..."` |
| 500 | Cualquier fallo inesperado (ej: la base caída) | `"Error interno del servidor"` |

Los errores 500 nunca exponen el detalle interno al cliente: el mensaje real
queda en el log del servidor y el cliente siempre recibe el mismo texto
genérico. Los controllers no arman la respuesta de error, la delegan al
middleware central con `next(error)`. Los errores pensados para mostrarse
(409, 410, etc.) se lanzan como `ErrorHttp` (`src/utils/errores.ts`).

**Por qué 404 y no 403** cuando algo es de otra persona: un 403 confirmaría que
ese id existe. Con 404, desde afuera no se distingue "no existe" de "no es
tuyo".

## Autenticación

Las rutas protegidas requieren el JWT de Supabase en el header:

```
Authorization: Bearer <token>
```

El token se consigue con `POST /api/auth/registro`, `/login`, `/google` o
`/recuperar/confirmar`. **La app no habla con Supabase Auth directo**: no
necesita ninguna key de Supabase, solo la URL del backend.

**La identidad sale siempre del token, nunca de la query ni del body**
(`src/utils/sesion.ts`, `idDelUsuario`). Los listados devuelven solo lo del
dueño del token, los `POST` fuerzan el `usuario_id` del token aunque el body
diga otro, y las operaciones por id verifican que el registro sea tuyo antes de
tocarlo. Un admin puede operar sobre registros ajenos (ver
[Administración](#administración)).

Las rutas del sensor (`/api/sensor/*`) son **públicas**, porque la ESP32 no
maneja tokens JWT.

### Límite de intentos

Hay dos limitadores por IP, ventana de 15 minutos, y los dos cuentan **solo los
intentos fallidos** (quien entra bien no se queda afuera):

| Rutas | Límite | Por qué ese número |
| ----- | ------ | ------------------ |
| `/login`, `/registro` | 10 | Lo único que protege la cuenta es una contraseña elegida por una persona |
| `/recuperar`, `/recuperar/confirmar`, `/google` | 30 | Lo que protege es un token de 32 bytes al azar; el límite solo evita abuso de tráfico |

Pasado el límite responden **429**.

---

## Endpoints

### Auth

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/registro` | No | Crea la cuenta y devuelve el token ya iniciado |
| POST | `/api/auth/login` | No | Devuelve el token |
| GET | `/api/auth/yo` | Sí | Perfil del dueño del token |
| GET | `/api/auth/verificar/:token` | No | Confirma la casilla. Devuelve **HTML** |
| POST | `/api/auth/reenviar-verificacion` | Sí | Vuelve a mandar el mail de verificación |

**Body de `POST /api/auth/registro`:**
```json
{
  "nombre": "Ana",
  "apellido": "Gomez",
  "mail": "ana@ejemplo.com",
  "fecha_nacimiento": "1952-04-17",
  "password": "minimo6"
}
```

`fecha_nacimiento` es opcional (`YYYY-MM-DD`, no futura, no de hace más de 120
años, y tiene que existir: el 30 de febrero se rechaza). **Si no viene se guarda
la fecha de hoy**: es una decisión del equipo, y significa que esa cuenta queda
con 0 años, no con "dato desconocido".

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
    "usuario": {
      "id": "uuid", "nombre": "Ana", "apellido": "Gomez", "mail": "ana@ejemplo.com",
      "fecha_nacimiento": "1952-04-17", "verificado": false, "created_at": "..."
    }
  }
}
```

El perfil se devuelve siempre con una lista cerrada de campos
(`CAMPOS_PUBLICOS`), nunca con la fila entera: la fila tiene
`token_verificacion` y `token_reset`, y devolverlos permitiría verificar una
cuenta o cambiarle la contraseña sin abrir el mail.

El registro crea la cuenta en Supabase Auth y la fila en `usuarios` **con el
mismo id**. Si falla la creación del perfil se borra la cuenta de Auth, para no
dejar cuentas huérfanas.

| Código | Cuándo |
| ------ | ------ |
| 409 | El mail ya tiene una cuenta |
| 401 | Mail o password incorrectos |

#### Verificación de la casilla

Al registrarse sale un mail con un enlace a
`API_URL/api/auth/verificar/<token>`, que **vence a las 24 horas**. Abrirlo pone
`usuarios.verificado = true` y muestra una página de confirmación con un botón
a la app.

**Una cuenta sin verificar funciona igual**: la app solo muestra un aviso. Lo
único que bloquea es el login con Google (ver abajo).

`POST /api/auth/reenviar-verificacion` genera un enlace nuevo para la propia
cuenta. Responde 409 si la cuenta ya está verificada.

| Código (página HTML) | Cuándo |
| ------ | ------ |
| 404 | El enlace no existe o ya se usó |
| 410 | El enlace venció |

### Entrar con Google

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/google` | No | Entra o crea la cuenta con un ID token de Google |

**Body:**
```json
{ "id_token": "eyJhbGciOiJSUzI1NiIsIm..." }
```

Devuelve exactamente lo mismo que `/api/auth/login`. Si la cuenta no existía se
crea: `nombre` y `apellido` salen del token y `verificado` nace en `true`,
porque Google ya probó que la casilla es de esa persona.

El `id_token` lo consigue el navegador con el botón de Google. El backend no
confía en él: se lo pasa a Supabase, que verifica la firma contra Google.

**Responde 409 si ese mail ya tiene una cuenta con contraseña que nunca
confirmó su casilla.** Supabase vincula sola una identidad nueva de Google a la
cuenta que ya tenga ese mail, y su única protección es exigir que el mail esté
confirmado; pero acá todas las cuentas se crean con `email_confirm: true`, así
que para Supabase todas lo están. Sin este corte, cualquiera podría registrar la
casilla de otro con una contraseña propia y esperar a que esa persona entre con
Google para quedar adentro de una cuenta ajena. La salida para quien quede
trabado es confirmar la casilla, o usar "olvidé mi contraseña", que también deja
la cuenta verificada.

| Código | Cuándo |
| ------ | ------ |
| 409 | Cuenta con contraseña sin verificar (el candado de arriba) |
| 401 | Google no validó el token |
| 400 | El token no trae casilla de correo |

### Recuperar la contraseña

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| POST | `/api/auth/recuperar` | No | Manda el mail con el enlace |
| POST | `/api/auth/recuperar/confirmar` | No | Cambia la contraseña con el token del mail |

**Body de `POST /api/auth/recuperar`:**
```json
{ "mail": "ana@ejemplo.com" }
```

**Responde siempre 200 y siempre lo mismo**, exista o no la cuenta:
```json
{ "success": true, "data": { "mensaje": "Si esa casilla tiene una cuenta, te mandamos el enlace para cambiar la contraseña." } }
```

Es a propósito: si la respuesta cambiara, este endpoint sería un buscador de
casillas registradas. Por el mismo motivo tampoco delata cuándo actuó el freno
que evita mandar más de un mail cada 5 minutos a la misma dirección.

El enlace apunta a `APP_URL/recuperar?token=...`, **vence en una hora** y sirve
una sola vez.

**Body de `POST /api/auth/recuperar/confirmar`:**
```json
{ "token": "el del enlace", "password": "minimo6" }
```

Devuelve la sesión ya iniciada, igual que el login. Al usarlo, la cuenta queda
**verificada**: abrir ese mail prueba lo mismo que el enlace de verificación.

Las cuentas creadas con Google no tienen contraseña, y aun así pueden usar este
flujo para ponerse una. El mail lo dice con otras palabras en ese caso.

| Código | Cuándo |
| ------ | ------ |
| 404 | El token no existe, o ya se usó |
| 410 | El token venció |
| 400 | La contraseña tiene menos de 6 caracteres |


### Sensor / ESP32 (público)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/sensor/pendiente` | La ESP32 consulta cada 30 s si hay una dosis para dispensar |
| POST | `/api/sensor/dispensar` | El backend le manda la orden al dispositivo por la red local |
| POST | `/api/sensor/confirmacion` | La ESP32 confirma que dispensó tras apretar el botón físico |

Hay **dos formas** de que el dispositivo se entere de que tiene que dispensar.
Son excluyentes y las elige la variable `ESP32_URL`:

- **Polling (el de producción):** la placa pregunta con
  `GET /api/sensor/pendiente` cada 30 segundos. Solo necesita salida a
  internet, así que el pastillero funciona en cualquier casa sin depender de
  una computadora. Es el modo cuando **no** hay `ESP32_URL`.
- **Push (el de la demo en red local):** el backend le pega a la placa con
  `GET {ESP32_URL}/dispense`. Necesita que backend y placa estén en la misma
  red, porque la IP de la placa es privada. Con `ESP32_URL` cargada arranca el
  scheduler que lo hace solo a la hora de cada dosis (ver
  [Schedulers](#schedulers)).

En los dos casos la dispensación se registra igual: por
`POST /api/sensor/confirmacion`, que manda el dispositivo después del botón.

**Respuesta de `GET /api/sensor/pendiente`:**
```json
{
  "success": true,
  "data": {
    "pendiente": true,
    "horario": { "id": "uuid", "pastilla_id": "uuid", "hora": 15, "minuto": 31, "cantidad": 2 },
    "modulo": 1,
    "disponibles": 27
  }
}
```

- `modulo`: el número de módulo que la ESP32 tiene que activar (el que tiene
  esa pastilla cargada). El Arduino mapea el número a su servo.
- `disponibles`: cuántas pastillas quedan en ese módulo, para que el firmware
  no intente dispensar más de las que hay.
- Si no hay nada pendiente, `pendiente` es `false` y el resto `null`.

Una dosis aparece como pendiente desde su hora hasta **15 minutos después**.
Ese número coincide a propósito con los otros dos plazos del sistema (la
ventana del scheduler de push y el aviso de dosis no tomada) y con el ciclo de
alarmas del firmware (suena a los 0, 5, 10 y 15). Cuando era de 5 había una
zona muerta: la dosis desaparecía del pastillero y diez minutos después llegaba
un mail de "no se tomó" sobre algo que el aparato nunca ofreció.

**Body de `POST /api/sensor/dispensar`** (todo opcional):
```json
{
  "destino": "192.168.1.50",
  "horario_id": "uuid-del-horario",
  "cantidad": 5
}
```

- `destino`: IP o `host:puerto` del dispositivo, con o sin `http://`. Si no
  viene se usa `ESP32_URL`.
- `horario_id`: si no viene, el backend busca la dosis pendiente en ese
  momento. Si no hay ninguna, la señal se manda igual pero no se va a registrar
  nada (sirve para probar el hardware).
- `cantidad` (1 a 20): pisa la del horario. Si no viene se usa la del horario,
  y si tampoco hay, 1.

El backend termina llamando a
`GET {destino}/dispense?cantidad=N&horario_id=<uuid>`, con 6 segundos de
timeout.

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
solo hace sonar el buzzer y queda esperando el botón.

| Código | Cuándo |
| ------ | ------ |
| 400 | No hay `destino` ni `ESP32_URL` configurado |
| 409 | El módulo no tiene stock suficiente para esa dosis (no se manda la señal) |
| 502 | El dispositivo no responde (apagado, otra red, IP incorrecta) o devolvió error |

**Body de `POST /api/sensor/confirmacion`:**
```json
{
  "dispositivo_id": "ESP32-001",
  "horario_id": "uuid-del-horario",
  "bateria": 85,
  "cantidad": 2
}
```

Al confirmar, el backend:

1. marca el horario como `dispensado = true`;
2. guarda una fila en `dispensaciones` (con el `usuario_id` del dueño de la
   pastilla);
3. descuenta `cantidad` del stock del módulo (nunca baja de 0);
4. manda el mail de dispensación al cuidador, y el de pastillero vacío si quedó
   en 0. **Los mails salen sin `await`**: la respuesta a la placa no espera al
   proveedor de mail.

`cantidad` es cuántas pastillas liberó realmente el dispositivo. Es opcional
(firmwares viejos no la mandan): si no viene se usa la del horario. Se guarda
aparte de `horarios.cantidad` a propósito: una es lo que se **pidió** y la otra
lo que **pasó**.

### Usuarios (protegido)

Cada usuario ve y edita **solo su propio perfil**. Cualquier id que no sea el
del token responde 404.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/usuarios` | El perfil propio (no lista a nadie más) |
| GET | `/api/usuarios/:id` | El perfil propio, por id |
| POST | `/api/usuarios` | Crea un perfil suelto. **Redundante**: el alta real es `/api/auth/registro` |
| PUT | `/api/usuarios/:id` | Edita `nombre`, `apellido`, `mail`, `fecha_nacimiento` |
| DELETE | `/api/usuarios/:id` | Borra la cuenta entera (pantalla `/perfil`) |

`DELETE` borra el perfil **y** la cuenta de Supabase Auth: si quedara solo la
de Auth, esa persona podría loguearse y la app no encontraría su perfil. Por las
FK en cascada se lleva pastillas, horarios, dispensaciones, contactos y
actividades. Los módulos quedan, vacíos (ver [Base de datos](#base-de-datos)).

### Pastillas (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/pastillas` | Las pastillas propias, cada una con su módulo y stock |
| GET | `/api/pastillas/:id` | Una por id |
| GET | `/api/pastillas/:id/horarios` | Todos los horarios de esa pastilla |
| POST | `/api/pastillas` | Crear (y cargarla en un módulo) |
| PUT | `/api/pastillas/:id` | Editar |
| PATCH | `/api/pastillas/:id/stock` | Sumar o restar stock del módulo donde está cargada |
| DELETE | `/api/pastillas/:id/horarios` | Cancelar una rutina: borra las dosis pendientes |
| DELETE | `/api/pastillas/:id` | Borrar la pastilla entera |

**Body de `POST /api/pastillas`:**
```json
{
  "nombre": "Aspirina",
  "tipo": "comprimido",
  "cantidad_inicial": 30,
  "modulo_numero": 1
}
```

- `cantidad_inicial` (0 a 500, opcional): con cuántas pastillas se carga el
  módulo. No es una columna de `pastillas`: va a `modulos.cantidad_actual`.
- `modulo_numero` (opcional): en qué módulo se carga. Si no viene, se usa el
  primero libre.
- **El backend nunca crea módulos.** Si el número pedido no existe responde
  409; si no hay ninguno libre, la pastilla se crea igual pero queda **sin
  cargar** (no se puede dispensar hasta asignarle un módulo). Los módulos son
  hardware y se dan de alta a mano.

**Body de `PATCH /api/pastillas/:id/stock`:**
```json
{ "delta": 10 }
```

Entero con signo, distinto de 0: `+10` es una recarga, `-3` corrige un conteo
mal anotado. El stock nunca baja de 0. Devuelve el módulo actualizado
(`id`, `numero`, `nombre`, `cantidad_actual`). Responde 409 si la pastilla no
está cargada en ningún módulo.

**`DELETE /api/pastillas/:id/horarios`** borra las dosis **todavía no
dispensadas** de esa pastilla. Acepta filtros opcionales por query, porque una
pastilla puede tener varias rutinas a la vez (la misma aspirina a las 8 y a las
20):

```
DELETE /api/pastillas/<id>/horarios?hora=8&minuto=0&desde=2026-10-01&hasta=2026-10-31
```

Sin filtros borra todas las pendientes. Las ya dispensadas no se tocan: son el
historial, y borrarlas se llevaría sus filas de `dispensaciones`. Responde
`{ "canceladas": 12 }`.

**`DELETE /api/pastillas/:id`** se lleva por cascada sus horarios y
dispensaciones; el módulo queda libre (`pastilla_id = null`).

### Horarios (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/horarios` | Los horarios propios. Filtro opcional `?pastilla_id=uuid` |
| GET | `/api/horarios/dia/:fecha` | Rutina de un día (`/dia/2026-07-13`), con nombre de pastilla |
| GET | `/api/horarios/:id` | Uno por id |
| POST | `/api/horarios` | Crear una dosis |
| PUT | `/api/horarios/:id` | Editar |
| DELETE | `/api/horarios/:id` | Eliminar |

**Body de `POST /api/horarios`:**
```json
{ "pastilla_id": "uuid", "dia": "2026-10-20", "hora": 8, "minuto": 30, "cantidad": 2 }
```

Cada fila es **una dosis puntual**: `dia` es una fecha (`YYYY-MM-DD`), no un día
de la semana. Una rutina de 4 semanas son 28 filas, que la app crea de una.
`hora` (0-23) y `minuto` (0-59) van en hora local de Argentina. `cantidad`
(1 a 20) es cuántas pastillas dispensar en esa dosis; si no viene, la base
pone 1, y el dispositivo las dispensa todas con una sola apretada del botón.

Tres marcas que conviene no confundir:

| Columna | Significa |
| ------- | --------- |
| `senal_enviada` | El backend ya le avisó al pastillero (solo en modo push) |
| `dispensado` | La persona apretó el botón y la pastilla salió |
| `notificado` | Ya salió el mail de "no se tomó" (se marca aunque el mail falle, para no reintentar en loop) |

### Contactos de emergencia (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/contactos` | Los contactos propios |
| GET | `/api/contactos/:id` | Uno por id |
| POST | `/api/contactos` | Crear |
| PUT | `/api/contactos/:id` | Editar |
| DELETE | `/api/contactos/:id` | Eliminar |

**Body:** `{ "nombre": "Maria", "apellido": "Lopez", "numero": "1144445555", "dni": "30111222" }`.
Todos obligatorios. Se mandan en el mail de dosis no tomada.

### Actividades (protegido)

Recordatorios del calendario del cuidador (gimnasia, turnos médicos). No tienen
relación con el pastillero ni con la ESP32.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/actividades` | Las actividades propias. Filtro opcional `?fecha=YYYY-MM-DD` |
| GET | `/api/actividades/:id` | Una por id |
| POST | `/api/actividades` | Crear |
| PUT | `/api/actividades/:id` | Editar |
| DELETE | `/api/actividades/:id` | Eliminar |

**Body de `POST /api/actividades`:**
```json
{ "nombre": "Kinesiología", "fecha": "2026-10-22", "hora": "10:30", "tipo": "una-vez" }
{ "nombre": "Caminata", "fecha": "", "hora": "08:00", "tipo": "rutina", "dias": ["L", "X", "V"] }
```

- `tipo`: `"una-vez"` (default) o `"rutina"`.
- Una de **una vez** necesita `fecha`. Una **rutina** se repite por día de la
  semana, así que manda `fecha: ""` y al menos un día en `dias`
  (`L M X J V S D`).
- `hora` es texto `"HH:MM"`, no dos números como en horarios.

### Dispensaciones (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/dispensaciones` | Historial propio de lo que salió del pastillero, con info de la pastilla |

### Módulos (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/modulos` | Lista los módulos con la pastilla cargada. Filtro opcional `?dispositivo_id=` |
| GET | `/api/modulos/:id` | Uno por id |
| PUT | `/api/modulos/:id` | Cambiar la pastilla cargada o registrar cuántas hay |

Un módulo es una pieza de hardware (servo + tolva + filtro). **No hay `POST`:
el backend nunca crea módulos**, se dan de alta a mano en la base cuando se arma
el hardware. Una ESP32 maneja varios módulos; hoy hay uno solo, `voitos_1`
(número 1, placa `ESP32-001`).

**Body de `PUT /api/modulos/:id`** (al menos uno de los dos):
```json
{ "pastilla_id": "uuid-o-null", "cantidad_actual": 30 }
```

`pastilla_id: null` vacía el módulo. `cantidad_actual` lo registra el cuidador
al recargar, y el backend lo descuenta solo en cada dispensación confirmada. El
`numero` y el `dispositivo_id` no se editan: describen hardware.

Los módulos **no se filtran por dueño, a propósito**: cualquier sesión ve y
puede editar todos. En el MVP hay un solo pastillero, y en la exhibición cada
visitante se hace su propia cuenta y programa una dispensación en ese mismo
aparato. Atar el módulo a una cuenta rompería justamente esa demo.

**Idea para después (no implementada):** vincular cada pastillero a la cuenta
del cuidador o familiar que lo usa, para que nadie más pueda cambiarle la
pastilla, el stock ni dispensar en él. Formas posibles de hacer el vínculo:

- un código de 8 dígitos que aparece en el display del pastillero y se ingresa
  en la app;
- un código QR pegado en el aparato o mostrado en el display;
- un mail especial de activación que llega con el pastillero.

Cualquiera de las tres termina en lo mismo en el backend: una columna de dueño
en `modulos` (o en una tabla de dispositivos) y el mismo chequeo de propiedad
que ya tienen pastillas y contactos (`puedeOperar`).

### Alertas (protegido)

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/alertas` | Dosis propias vencidas sin dispensar, con los contactos de emergencia a quienes avisar |

Una dosis se considera "no tomada" cuando su horario ya pasó (fecha anterior a
hoy, o es hoy pero la hora ya quedó atrás) y sigue con `dispensado = false`.

### Administración

Todas exigen sesión, y además **rol admin**: a quien no lo tiene le responden
**404**, así un usuario normal ni se entera de que existen. El rol se lee de la
base (`usuarios.rol`) y no del token, y **ningún endpoint lo otorga**: se pone a
mano en la base. Si la API pudiera darlo, un agujero ahí haría admin a
cualquiera. Lo que ignora la propiedad de los datos vive todo en
`admin.service.ts`, un solo archivo auditable.

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/admin/soy-admin` | `{ admin: bool, id }`. La única que responde a cualquiera con sesión |
| GET | `/api/admin/usuarios` | Todas las cuentas |
| GET | `/api/admin/usuarios/:id/pastillas` | Las pastillas de una cuenta |
| GET | `/api/admin/usuarios/:id/horarios` | Los horarios de una cuenta |
| GET | `/api/admin/calendario` | Todas las dosis de todos. Acepta `?desde=` y `?hasta=` (`YYYY-MM-DD`) |
| POST | `/api/admin/usuarios/:id/verificar` | Verifica una cuenta a mano (el mail no llegó, el enlace venció) |
| POST | `/api/admin/usuarios/:id/desverificar` | La vuelve a dejar sin verificar (útil para probar el aviso) |
| DELETE | `/api/admin/usuarios/:id/calendario` | Borra las dosis **pendientes** de una cuenta; las dispensadas quedan |
| DELETE | `/api/admin/usuarios/:id` | Borra la cuenta entera, perfil + Auth |
| POST | `/api/admin/probar-mail` | Manda un mail de prueba a la casilla del propio admin |

`soy-admin` es solo para que la app decida si muestra el acceso al panel; la
seguridad no depende de esa respuesta, cada ruta lo verifica sola.

`DELETE /api/admin/usuarios/:id` responde **409** si el id es el del propio
admin: se quedaría sin cuenta y sin panel, y no hay forma de deshacerlo.

`probar-mail` existe porque los mails salen sin `await` y sus errores no vuelven
a nadie. Devuelve textual lo que contestó el proveedor:
```json
{ "success": true, "data": { "enviado": false, "destino": "admin@...", "error": "401 unauthorized: unrecognised IP address ..." } }
```

Además, un admin pasa la verificación de propiedad en las rutas normales
(`puedeOperar`): puede leer, editar y borrar pastillas, contactos y actividades
de otros.

### Otras

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/logo.png` | Logo de Voitos para los mails. Público, cache de 1 día |

Cuando el mail sale por API (Brevo, Resend) el logo no puede ir adjunto con
`cid:` como en SMTP, así que la plantilla apunta acá. Es pública porque la abre
el cliente de correo de quien recibe el mail.

---

## Schedulers

Dos procesos que corren solos dentro del servidor, cada 60 segundos. Arrancan en
`src/index.ts`.

| Archivo | Qué hace | Cuándo corre |
| ------- | -------- | ------------ |
| `src/schedulers/dosis-a-dispensar.ts` | A la hora de cada dosis le manda la señal al pastillero (modo push). Ventana de 15 min | **Solo si hay `ESP32_URL`**. Sin ella se asume polling y no arranca |
| `src/schedulers/dosis-no-tomadas.ts` | A los 15 min de una dosis sin dispensar, manda el mail al cuidador y marca `notificado` | Siempre |

Detalles del de push:

- Si el pastillero no contesta (**502**) **no** marca `senal_enviada`: al
  minuto siguiente reintenta, y si vuelve dentro de la ventana la dosis todavía
  suena.
- Si no hay stock (**409**) sí la marca: reintentar no cambia nada hasta que
  alguien recargue.

**El re-sonado de la alarma no lo maneja el backend sino el firmware**: la ESP32
vuelve a sonar a los 5, 10 y 15 minutos del horario. Se hace ahí porque la placa
ya sabe que está esperando el botón y sigue funcionando sin WiFi.

## Mails

| Mail | Cuándo sale | A quién |
| ---- | ----------- | ------- |
| Verificación | Al registrarse, o al pedir el reenvío | La casilla registrada |
| Bienvenida | Al confirmar la casilla, o al crear la cuenta con Google | La casilla de la cuenta |
| Recuperar contraseña | `POST /api/auth/recuperar` | La casilla pedida, si tiene cuenta |
| Dispensación OK | Al confirmar una dispensación: medicamento, cantidad, horario y stock restante | El cuidador (`usuarios.mail`) |
| Pastillero vacío | Cuando una dispensación deja el módulo en 0 | El cuidador |
| Dosis no tomada | A los 15 min sin dispensar, con los contactos de emergencia | El cuidador |

Las plantillas están en `src/services/plantillas-mail.ts` (el diseño lo maneja
el front). El envío, en `src/services/email.service.ts`.

**Cadena de transportes**, el código elige el primero que tenga configurado:

1. **Brevo** (`BREVO_API_KEY`): API HTTPS, el de producción. Es el único que
   entrega a cualquier destinatario sin dominio propio; alcanza con verificar
   la casilla remitente.
2. **Resend** (`RESEND_API_KEY`): alternativa. Sin dominio propio solo entrega
   a la casilla del titular.
3. **SMTP** (`MAIL_USER` / `MAIL_PASS`): para desarrollo local.
4. **Consola**: si no hay nada configurado, el backend **no falla**: escribe
   los mails en el log.

Dos cosas que ya costaron horas:

- **Los hosting bloquean el SMTP saliente, y no falla: cuelga.** Por eso en
  Render se usa una API HTTPS, y por eso **ningún aviso se espera con `await`**
  cuando lo importante (la dispensación, la cuenta) ya se guardó.
- **Brevo tiene lista blanca de IPs.** Tiene que incluir los dos rangos
  salientes de Render (`74.220.48.0/24` y `74.220.56.0/24`). Con uno solo los
  mails fallan de a ratos con un 401. Para diagnosticar:
  `POST /api/admin/probar-mail`.

## Base de datos

Supabase (PostgreSQL), proyecto `pshejdspqqhuhyjbzslx`.

| Tabla | Columnas principales |
| ----- | -------------------- |
| `usuarios` | `id` (= id de Supabase Auth), `nombre`, `apellido`, `mail`, `fecha_nacimiento`, `rol` (`cuidador`/`admin`), `verificado`, `token_verificacion` + `token_expira`, `token_reset` + `token_reset_expira` |
| `pastillas` | `id`, `usuario_id`, `nombre`, `tipo` |
| `horarios` | `id`, `pastilla_id`, `dia`, `hora`, `minuto`, `cantidad` (1-20), `dispensado`, `senal_enviada`, `notificado` |
| `dispensaciones` | `id`, `horario_id`, `usuario_id`, `dispositivo_id`, `bateria`, `cantidad` (1-20), `timestamp` |
| `modulos` | `id`, `numero`, `nombre`, `dispositivo_id`, `pastilla_id` (null = vacío), `cantidad_actual`. Único por (`dispositivo_id`, `numero`) |
| `contactos_emergencia` | `id`, `usuario_id`, `nombre`, `apellido`, `numero`, `dni` |
| `actividades` | `id`, `usuario_id`, `nombre`, `fecha`, `hora`, `tipo`, `dias` |

**Qué pasa al borrar** (FK verificadas):

- Borrar un usuario se lleva en cascada `pastillas`, `actividades` y
  `contactos_emergencia`; las pastillas se llevan sus `horarios`, y los
  horarios sus `dispensaciones`.
- `modulos.pastilla_id` es **SET NULL**: el módulo es una pieza física que
  sigue existiendo, queda vacío.
- `dispensaciones.usuario_id` es SET NULL, pero nunca deja huérfanas porque la
  fila igual se va por la cadena de `horario_id`.

**RLS (Row Level Security):** activado en **todas** las tablas. El backend usa
la service_role key, que saltea RLS por diseño (es la clave de servidor de
confianza). Como ningún cliente accede directo a Supabase, no hay tablas
expuestas a la anon key pública. `dispensaciones` y `modulos` tienen RLS sin
políticas, o sea denegar todo a cualquier otro rol.

**Plan free:** Supabase pausa el proyecto por inactividad. Se reactiva desde el
panel o con el MCP (`restore_project`) y tarda unos 2 minutos.

## Correr el proyecto

```bash
cd backend
npm install
npm run dev      # servidor en http://localhost:3000, se reinicia solo
```

Otros comandos:

| Comando | Qué hace |
| ------- | -------- |
| `npm run build` / `npm start` | Compila a `dist/` y lo corre (lo que hace Render) |
| `npm run lint` | `tsc --noEmit`, chequeo de tipos |
| `npm run dosis` | Crea una dosis para **ahora mismo**, para probar el circuito sin esperar. `npm run dosis -- 5 <pastilla_id>` |
| `npm run simulador` | Simula el firmware de polling en Node: consulta, "suena", "dispensa" y confirma |
| `npm run docs:check` | Falla si alguna ruta del código no está en este documento. Correrlo antes de commitear cambios de endpoints |

### Variables de entorno (`backend/.env`)

Ver `backend/.env.example`, que explica cada una.

| Variable | Obligatoria | Para qué |
| -------- | ----------- | -------- |
| `SUPABASE_URL` | Sí | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servidor. Nunca va a la app |
| `PORT` | No | Default 3000 |
| `APP_URL` | Sí en prod | Dónde apuntan los enlaces de los mails (`https://voitos.vercel.app`) |
| `API_URL` | Sí en prod | Base del enlace de verificación (este backend) |
| `ESP32_URL` | No | Si está, modo **push** (y arranca su scheduler). Si no, modo **polling** |
| `BREVO_API_KEY`, `BREVO_FROM_EMAIL` | No | Mails por Brevo (producción) |
| `BREVO_FROM_NOMBRE` | No | Nombre del remitente en Brevo (default `Voitos`) |
| `RESEND_API_KEY`, `RESEND_FROM` | No | Mails por Resend |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | No | Mails por SMTP (local) |

### Tests

Corren contra un backend **levantado**, local o el de producción con
`API=<url>`. Las cuatro suites crean sus cuentas de prueba y las borran al
terminar, también si se cortan a la mitad.

| Comando | Archivo | Qué prueba |
| ------- | ------- | ---------- |
| `npm test` | `tests/integracion.mjs` | El flujo completo: cuenta, pastilla, horario, dispensación |
| `npm run test:seguridad` | `tests/seguridad.mjs` | Que nadie pueda leer ni tocar datos ajenos |
| `npm run test:auth` | `tests/auth.mjs` | Registro, verificación, Google, recuperar contraseña, fugas de tokens |
| `node tests/admin.mjs` | `tests/admin.mjs` | Panel de admin y su 404 para no-admins |

`auth.mjs` y `admin.mjs` necesitan la service_role en el `.env` (marcan
`verificado` y `rol` directo en la base).
