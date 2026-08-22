import express from "express";
import path from "path";
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
import adminRoutes from "./routes/admin.routes";

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

// Las rutas de recuperacion y de Google tambien son publicas, pero se les pone
// un limite propio y mas holgado, porque lo que las protege es otra cosa.
//
// En /login lo unico que separa a un atacante de la cuenta es la contrasena,
// que una persona elige y suele ser adivinable: ahi 10 intentos es lo correcto.
//
// En /recuperar/confirmar lo que hay que adivinar es un token de 32 bytes al
// azar. Con 10 intentos o con 30 da exactamente lo mismo: lo que lo hace
// inviable es la entropia, no el limite. Y /recuperar ya tiene su propio freno
// de 5 minutos POR CUENTA, que es el que evita inundar una casilla ajena; este
// otro es por IP y solo evita que alguien use el endpoint de generador de
// trafico. Frenan cosas distintas y hacen falta los dos.
//
// El numero sale de un caso concreto: tests/auth.mjs provoca unos ocho fallos a
// proposito por corrida. Con el limite de 10 la suite se volvia inestable al
// correrla dos veces en la misma ventana, que es justo lo que se hace mientras
// se desarrolla.
const limiteRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Demasiados intentos. Espera 15 minutos y volve a probar.",
  },
});

// El prefijo /api/auth/recuperar cubre tambien /recuperar/confirmar, porque
// app.use hace match por prefijo.
app.use("/api/auth/recuperar", limiteRecuperacion);
app.use("/api/auth/google", limiteRecuperacion);

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

// Panel de administracion. Cada handler exige rol admin y responde 404 si no.
app.use("/api/admin", adminRoutes);

// El logo de los mails, servido por HTTPS.
//
// Cuando el mail sale por una API (Brevo, Resend) el logo no puede viajar
// adjunto y referenciado con cid: como en SMTP, asi que la plantilla apunta
// aca. Es publica porque la abre el cliente de correo de quien recibe el mail,
// que obviamente no tiene sesion.
//
// maxAge de un dia: es una imagen que no cambia, y sin cache cada apertura de
// cada mail seria un pedido mas al servidor.
app.get("/api/logo.png", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "assets", "voitos-logo.png"), {
    maxAge: "1d",
  });
});

// Rutas publicas (la ESP32 no maneja JWT)
app.use("/api/sensor", sensorRoutes);

// Manejo de errores (siempre al final, despues de las rutas)
app.use(notFound);
app.use(errorHandler);

export default app;
