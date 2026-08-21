<div align="center">

# 💊 Voitos

### Un dispensador inteligente para adultos mayores, y una app para quien los cuida

`Node.js` · `TypeScript` · `Express` · `Supabase` · `React Native` · `Expo` · `ESP32`

</div>

---

## El problema

Un adulto mayor con tratamiento crónico toma varias pastillas por día, a horarios
distintos, y en cantidades distintas. Sostener eso todos los días es difícil: hay
que acordarse del horario, saber cuántas van, y no repetir una dosis ya tomada.

Del otro lado está quien lo cuida, que muchas veces no vive en la misma casa y no
tiene forma de saber cómo viene el tratamiento.

Voitos se ocupa de las dos puntas: **automatiza la entrega de la medicación** y le
**da visibilidad al cuidador** sobre lo que pasa.

## Qué hace Voitos

```
        ⏰ 10:00, toca la Aspirina
                 │
    El backend le manda la orden al pastillero
                 │
        🔊 Suena la alarma
                 │
        ┌────────┴────────┐
        │                 │
  Aprieta el botón    Nadie responde
        │                 │
  🟢 Dispensa 2      🔊 Vuelve a sonar a los 5, 10 y 15 min
     pastillas            │
        │            📧 Mail al cuidador:
  📧 Mail: "se           "NO se tomó la dosis"
     tomó la dosis"       + contactos de emergencia
        │                 │
  Queda registrado   Queda registrado como no tomada
```

El cuidador carga los medicamentos, los horarios y cuántas pastillas van en cada
dosis desde la app. El pastillero se encarga del resto.

Nada de esto depende de que el adulto mayor tenga un celular, ni de que sepa usar
una app. Solo tiene que apretar un botón.

Los avisos por mail son una consecuencia del diseño, no el objetivo: como todo
queda registrado, el cuidador se entera tanto de lo que se tomó como de lo que no.

---

## Estado: probado de punta a punta

El 19 de agosto de 2026 el sistema completo funcionó por primera vez sin
intervención manual en ningún paso.

| Parte | Estado |
| --- | --- |
| 🔌 **Backend** | Desplegado en Render. API REST, mails y schedulers |
| 📱 **App** | Todas las pantallas de la demo conectadas |
| 🤖 **Hardware** | Dispensó tres dosis agendadas seguidas |
| 📧 **Mails** | Enviando desde la cuenta del proyecto |
| 🗄️ **Base** | Supabase, con el registro completo de cada dispensación |

**El recorrido que se probó:** se agenda una dosis desde el celular, llega la
hora, el pastillero suena **solo**, alguien aprieta el botón, el servo libera
las pastillas, la placa le avisa al backend, y queda todo registrado: la dosis
marcada, la fila en `dispensaciones`, el stock del módulo descontado y el mail
al cuidador.

Quedó guardado en el tag `demo-push-funcionando` por si hay que volver.

---

## Cómo se comunican el backend y el pastillero

Este es el punto donde el proyecto tomó su decisión de diseño más importante, y
conviene entender por qué.

### El primer modelo: push

El backend le pegaba a `GET /dispense` en la ESP32, que levantaba un servidor
web y esperaba. Funcionó, pero **obliga a que los dos estén en la misma red
WiFi**: la placa tiene una IP privada y desde internet no se la alcanza.

Eso significa que el backend nunca podría vivir en un servidor: tendría que
correr en una computadora encendida en la misma casa que el pastillero.

### El modelo actual: polling

Se invirtió la dirección. Ahora **la placa pregunta**:

```
cada 30 segundos:  GET /api/sensor/pendiente
                   ¿hay una dosis para ahora?
```

Con eso la ESP32 solo necesita salida a internet, igual que un celular. No hace
falta abrir puertos, ni configurar el router, ni que nadie esté en la misma red.
El backend vive en Render y el pastillero puede estar en cualquier casa.

El backend soporta los dos modelos y elige solo: si existe la variable
`ESP32_URL` usa push, y si no, asume polling y no arranca ese scheduler.

---

## Cómo está armado

```
proyecto-voitos/
├── backend/          API Express. Habla con Supabase y con la ESP32
│   ├── src/
│   │   ├── routes/       → controllers/ → services/ → Supabase
│   │   ├── schedulers/   vigila las dosis no tomadas
│   │   └── scripts/      utilidades (npm run dosis)
│   └── tests/        integración contra la API real
├── app/              Expo Router (React Native + web)
│   └── src/
│       ├── app/          pantallas
│       └── lib/          cliente de API y funciones de dominio
└── docs/API.md       referencia completa de la API
```

Son **dos proyectos separados a propósito**, cada uno con su `package.json`:
Expo necesita `main: expo-router/entry` y el backend `main: dist/index.js`. En
un solo archivo no entran.

### Las tres reglas del diseño

1. **Nadie habla con Supabase directo.** Ni la app ni la ESP32. Todo pasa por
   el backend, que es el único que tiene la `service_role key`.
2. **El backend es stateless.** Toda la memoria del sistema está en la tabla
   `horarios`.
3. **La alarma insiste sola.** El re-sonado vive en el firmware, no en el
   backend: la ESP32 sigue avisando aunque se corte el WiFi.

---

## Arrancarlo

**Backend:**
```bash
cd backend
npm install
cp .env.example .env    # completar con las claves
npm run dev             # http://localhost:3000
```

**App:**
```bash
cd app
npm install
cp .env.example .env    # apuntar EXPO_PUBLIC_API_URL al backend
npm run web
```

**Probar sin esperar a que llegue una dosis:**
```bash
cd backend
npm run dosis -- 5      # crea una dosis de 5 pastillas para ahora mismo
npm test                # 16 casos de integración contra la API
```

---

## La base

| Tabla | Qué guarda |
| --- | --- |
| `usuarios` | El cuidador, que es quien se loguea |
| `pastillas` | Los medicamentos |
| `horarios` | Cuándo y **cuántas**. `dispensado` y `notificado` |
| `modulos` | El dispensador físico y **cuántas pastillas le quedan** |
| `dispensaciones` | Historial de lo que realmente salió |
| `contactos_emergencia` | A quién llamar |
| `actividades` | Recordatorios del calendario del cuidador |

**RLS activo en las 7 tablas.** El backend entra con la `service_role key`, que
lo saltea por diseño. Las policies cubren el acceso directo por la API pública
de Supabase, que es la puerta que decidimos no usar.

Dato que suele sorprender: `dispensaciones` y `modulos` tienen RLS **sin
policies**. En PostgreSQL eso significa denegar todo, así que son las tablas
más cerradas de la base, no las menos.

---

## Lo que falta

**Antes de que esto salga de una demo**, hay tres deudas de seguridad que
conviene saldar. Están documentadas con detalle en
[`docs/ESTADO-Y-PROXIMOS-PASOS.md`](docs/ESTADO-Y-PROXIMOS-PASOS.md):

- El `usuario_id` viaja como parámetro de la URL en vez de salir del token, así
  que un usuario autenticado puede pedir los datos de otro
- `GET /api/usuarios` devuelve todas las columnas, incluido el token de
  verificación de cuenta
- No hay límite de intentos en el login

**Funcionalidad pendiente:**

- Pantalla de historial: las dispensaciones se registran pero no se ven
- Pantallas de configuración, emergencia y detalle del día
- Sensor que confirme cuántas pastillas salieron de verdad (hoy se asume que
  salieron las que se pidieron)
- Un segundo módulo físico: la base ya lo soporta, el hardware todavía no

---

<div align="center">

**Timoteo Czerwiak** · Backend  
**Matías Ojman** · Frontend / UX-UI  
**Olivia Naiderman** · Hardware

</div>
