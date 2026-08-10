<div align="center">

# 💊 Voitos

### El pastillero que avisa cuando la pastilla no se tomó

Un dispensador inteligente para adultos mayores, y una app para quien los cuida.

`Node.js` · `TypeScript` · `Express` · `Supabase` · `React Native` · `Expo` · `ESP32`

</div>

---

## El problema

Un adulto mayor con tratamiento crónico toma varias pastillas por día, a horarios
distintos. Se saltea una y nadie se entera hasta la próxima visita.

El problema no es el olvido: es que **nadie más se entera del olvido**.

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

Nada de esto depende de que el adulto mayor tenga un celular, ni de que sepa
usar una app. Solo tiene que apretar un botón.

---

## Estado: demo integrada

Esta es la etapa donde **las tres partes del proyecto se juntan por primera
vez**. Hasta ahora cada uno venía por su lado: el backend con su API, el
frontend con sus pantallas, el hardware con su firmware.

| Parte | Estado |
| --- | --- |
| 🔌 **Backend** | Funcionando. API REST completa, mails, scheduler |
| 📱 **App** | Pantallas de la demo conectadas al backend de verdad |
| 🤖 **Hardware** | Probado con la ESP32 real: dispensó 8 pastillas de una |
| 📧 **Mails** | Enviando desde la cuenta del proyecto vía Gmail |

**Lo que ya se probó punta a punta:** el backend manda la señal por WiFi, la
ESP32 suena, alguien aprieta el botón, el servo libera las pastillas, la ESP32
le avisa al backend, y queda registrado en Supabase con la cantidad exacta.

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

- Verificación de mail al registrarse
- El disparo automático de la dosis (hoy se dispara a mano)
- Pantallas de configuración, emergencia y detalle del día
- Sensor que confirme cuántas pastillas salieron de verdad

---

<div align="center">

**Timoteo Czerwiak** · Backend  
**Matías Ojman** · Frontend / UX-UI  
**Olivia Naiderman** · Hardware

</div>
