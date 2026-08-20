import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { logger } from "./middlewares/logger.middleware";
import { notFound, errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import usuariosRoutes from "./routes/usuarios.routes";
import pastillasRoutes from "./routes/pastillas.routes";
import horariosRoutes from "./routes/horarios.routes";
import contactosRoutes from "./routes/contactos.routes";
import dispensacionesRoutes from "./routes/dispensaciones.routes";
import modulosRoutes from "./routes/modulos.routes";
import actividadesRoutes from "./routes/actividades.routes";
import alertasRoutes from "./routes/alertas.routes";
import sensorRoutes from "./routes/sensor.routes";

dotenv.config();

const app = express();

// Middlewares

// Cabeceras de seguridad (X-Content-Type-Options, Referrer-Policy, HSTS y
// demas). Va primero para que aplique tambien a las respuestas de error.
//
// Sin CSP: la API solo devuelve JSON, y la politica por defecto de helmet es
// para paginas HTML. La unica excepcion es la pagina de verificacion de cuenta,
// que se sirve desde aca y usa estilos en linea.
app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors());

// Limite de tamaño del cuerpo. Por defecto express acepta 100kb, que para esta
// API es mucho: el objeto mas grande que recibe es una pastilla con sus datos.
app.use(express.json({ limit: "16kb" }));

app.use(logger);

// Auth: /registro y /login son publicas (son las que emiten el token),
// /yo esta protegida. Ver src/routes/auth.routes.ts.
// Limite de intentos contra las rutas que emiten credenciales.
//
// Sin esto, nada impide probar contraseñas en bucle contra /login. El limite es
// por IP y solo cuenta los intentos fallidos: alguien que se loguea bien varias
// veces seguidas no se queda afuera.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos. Espera 15 minutos y volve a probar.",
  },
});

app.use("/api/auth/login", limiteAuth);
app.use("/api/auth/registro", limiteAuth);

app.use("/api/auth", authRoutes);

// Rutas protegidas (requieren JWT de Supabase)
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pastillas", pastillasRoutes);
app.use("/api/horarios", horariosRoutes);
app.use("/api/contactos", contactosRoutes);
app.use("/api/dispensaciones", dispensacionesRoutes);
app.use("/api/modulos", modulosRoutes);
app.use("/api/actividades", actividadesRoutes);
app.use("/api/alertas", alertasRoutes);

// Rutas publicas (la ESP32 no maneja JWT)
app.use("/api/sensor", sensorRoutes);

// Manejo de errores (siempre al final, despues de las rutas)
app.use(notFound);
app.use(errorHandler);

export default app;
