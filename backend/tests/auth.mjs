// Pruebas de recuperacion de contrasena y del candado de Google.
//
// Mezcla las dos caras, como admin.mjs: que el flujo funcione para quien
// corresponde, y que NO funcione para quien no.
//
// Necesita la SUPABASE_SERVICE_ROLE_KEY porque hay dos cosas que solo se pueden
// hacer desde la base: marcar una cuenta como verificada (ningun endpoint lo
// otorga) y leer el token_reset, que a proposito nunca sale por la API.
//
//   node tests/auth.mjs
//   API=https://voitos-backend.onrender.com node tests/auth.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const API = process.env.API ?? "http://localhost:3000";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0;
let fallos = 0;

const pedir = async (ruta, { metodo = "POST", cuerpo } = {}) => {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    // puede no traer cuerpo
  }
  return { status: r.status, json };
};

const prueba = async (nombre, fn) => {
  try {
    await fn();
    console.log(`  OK      ${nombre}`);
    ok++;
  } catch (e) {
    console.log(`  FALLO   ${nombre}`);
    console.log(`          ${e.message}`);
    fallos++;
  }
};

const esperar = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const creados = [];

const registrar = async (etiqueta, verificado) => {
  const mail = `auth-test-${etiqueta}-${Date.now()}@voitos.test`;
  const alta = await pedir("/api/auth/registro", {
    cuerpo: { nombre: etiqueta, apellido: "Prueba", mail, password: "claveVieja123" },
  });
  esperar(alta.status === 201, `no se pudo registrar ${etiqueta}: ${alta.status}`);

  const id = alta.json.data.usuario.id;
  creados.push(id);

  // El estado de verificacion solo se puede tocar desde la base: es justamente
  // la propiedad que hace confiable al candado de Google.
  await supabase.from("usuarios").update({ verificado }).eq("id", id);

  return { mail, id };
};

// ID token de Google armado a mano, con la firma rota a proposito.
//
// Sirve para probar el candado sin una cuenta de Google real: lo que se
// verifica es que el backend decida a quien rechazar ANTES de mirar la firma, y
// que a quien deja pasar lo termine rechazando Google por la firma invalida.
const tokenFalsoDeGoogle = (mail) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return [
    b64({ alg: "RS256", typ: "JWT" }),
    b64({ email: mail, given_name: "Prueba", family_name: "Falsa" }),
    "firma-invalida",
  ].join(".");
};

const correr = async () => {
  console.log(`\n=== RECUPERACION DE CONTRASENA (contra ${API}) ===`);

  const u = await registrar("normal", true);

  const inexistente = await pedir("/api/auth/recuperar", {
    cuerpo: { mail: `no-existe-${Date.now()}@voitos.test` },
  });
  const existente = await pedir("/api/auth/recuperar", { cuerpo: { mail: u.mail } });

  await prueba("un mail que no existe igual responde 200", () => {
    esperar(inexistente.status === 200, `dio ${inexistente.status}`);
  });

  await prueba("la respuesta no permite distinguir un mail registrado de uno que no", () => {
    esperar(
      JSON.stringify(inexistente.json) === JSON.stringify(existente.json),
      `respuestas distintas:\n          ${JSON.stringify(inexistente.json)}\n          ${JSON.stringify(existente.json)}`
    );
  });

  const { data: fila } = await supabase
    .from("usuarios")
    .select("token_reset, token_reset_expira")
    .eq("id", u.id)
    .single();

  const token = fila?.token_reset;

  await prueba("se guardo un token de recuperacion", () => {
    esperar(Boolean(token), "no quedo ningun token en la fila");
  });

  await prueba("el token vence en una hora", () => {
    const minutos = Math.round((new Date(fila.token_reset_expira) - Date.now()) / 60000);
    esperar(minutos > 50 && minutos <= 60, `vence en ${minutos} minutos`);
  });

  await prueba("pedirlo de nuevo enseguida no emite otro (freno anti inundacion)", async () => {
    const otra = await pedir("/api/auth/recuperar", { cuerpo: { mail: u.mail } });
    const { data } = await supabase
      .from("usuarios")
      .select("token_reset")
      .eq("id", u.id)
      .single();

    esperar(data.token_reset === token, "el token cambio, se mando un mail de mas");
    esperar(
      JSON.stringify(otra.json) === JSON.stringify(existente.json),
      "la respuesta delata que hubo freno"
    );
  });

  await prueba("no acepta una contrasena de menos de 6 caracteres", async () => {
    const r = await pedir("/api/auth/recuperar/confirmar", { cuerpo: { token, password: "123" } });
    esperar(r.status === 400, `dio ${r.status}`);
  });

  await prueba("un token inventado da 404", async () => {
    const r = await pedir("/api/auth/recuperar/confirmar", {
      cuerpo: { token: "a".repeat(64), password: "claveNueva123" },
    });
    esperar(r.status === 404, `dio ${r.status}`);
  });

  await prueba("cambia la contrasena y devuelve la sesion ya iniciada", async () => {
    const r = await pedir("/api/auth/recuperar/confirmar", {
      cuerpo: { token, password: "claveNueva123" },
    });
    esperar(r.status === 200, `dio ${r.status}: ${JSON.stringify(r.json)}`);
    esperar(Boolean(r.json?.data?.token), "no vino el token de sesion");
  });

  await prueba("el mismo enlace no sirve dos veces", async () => {
    const r = await pedir("/api/auth/recuperar/confirmar", {
      cuerpo: { token, password: "otraDistinta123" },
    });
    esperar(r.status === 404, `dio ${r.status}`);
  });

  await prueba("la contrasena vieja ya no entra", async () => {
    const r = await pedir("/api/auth/login", { cuerpo: { mail: u.mail, password: "claveVieja123" } });
    esperar(r.status === 401, `dio ${r.status}`);
  });

  await prueba("la contrasena nueva si entra", async () => {
    const r = await pedir("/api/auth/login", { cuerpo: { mail: u.mail, password: "claveNueva123" } });
    esperar(r.status === 200, `dio ${r.status}`);
  });

  await prueba("usar el enlace deja la cuenta verificada", async () => {
    const { data } = await supabase.from("usuarios").select("verificado").eq("id", u.id).single();
    esperar(data.verificado === true, "la cuenta quedo sin verificar");
  });

  console.log(`\n=== CANDADO DE GOOGLE ===`);

  const sinVerificar = await registrar("sinverificar", false);
  const verificado = await registrar("verificado", true);

  await prueba("no deja entrar con Google a un mail con cuenta sin confirmar", async () => {
    const r = await pedir("/api/auth/google", {
      cuerpo: { id_token: tokenFalsoDeGoogle(sinVerificar.mail) },
    });
    esperar(r.status === 409, `dio ${r.status}: ${JSON.stringify(r.json)}`);
  });

  await prueba("con la cuenta confirmada pasa el candado y decide Google", async () => {
    const r = await pedir("/api/auth/google", {
      cuerpo: { id_token: tokenFalsoDeGoogle(verificado.mail) },
    });
    // 401 y no 200: el candado dejo pasar, y despues Supabase rechazo la firma
    // falsa. Eso prueba que la validacion de verdad sigue estando.
    esperar(r.status === 401, `dio ${r.status}: ${JSON.stringify(r.json)}`);
  });

  await prueba("un token que no es un JWT da 400", async () => {
    const r = await pedir("/api/auth/google", { cuerpo: { id_token: "no.es.un.jwt" } });
    esperar(r.status === 400, `dio ${r.status}`);
  });

  await prueba("sin id_token da 400", async () => {
    const r = await pedir("/api/auth/google", { cuerpo: {} });
    esperar(r.status === 400, `dio ${r.status}`);
  });

  console.log(`\n=== LIMPIEZA ===`);
  for (const id of creados) {
    await supabase.from("usuarios").delete().eq("id", id);
    await supabase.auth.admin.deleteUser(id);
  }
  console.log(`  ${creados.length} cuentas descartables borradas`);

  console.log(`\n${ok} OK, ${fallos} fallos\n`);
  process.exit(fallos > 0 ? 1 : 0);
};

correr().catch(async (e) => {
  console.error("\nLa prueba se rompio:", e.message);
  for (const id of creados) {
    await supabase.from("usuarios").delete().eq("id", id);
    await supabase.auth.admin.deleteUser(id);
  }
  process.exit(1);
});
