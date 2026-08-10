# Voitos

Pastillero inteligente para adultos mayores y sus cuidadores.

## Estructura del repo

```
backend/   API REST en Express + TypeScript. Habla con Supabase y con la ESP32.
app/       Aplicacion Expo (React Native + web) para el cuidador.
docs/      Documentacion de la API.
```

Cada carpeta tiene su propio `package.json` y su `tsconfig.json`, porque son dos
proyectos distintos: Expo necesita `main: expo-router/entry` y el backend
`main: dist/index.js`. Tenerlos en un solo `package.json` no funciona.

## Backend

```bash
cd backend
npm install
cp .env.example .env    # completar con las claves reales
npm run dev             # http://localhost:3000
```

Documentacion completa de la API en [docs/API.md](docs/API.md).

## App

```bash
cd app
npm install
npm run web             # navegador
npm start               # Expo Go en el celular
```

La app necesita saber donde esta el backend. Se configura con la variable
`EXPO_PUBLIC_API_URL` (por defecto `http://localhost:3000`).

## Tecnologías

- Node.js + TypeScript + Express
- Supabase (PostgreSQL)
- Expo + React Native + expo-router
- ESP32 (firmware en la rama `naiderman/hardware`)

## Integrantes

- Timoteo Czerwiak — Backend
- Matias Ojman — Frontend / UX-UI
- Olivia Naiderman — Hardware
