// Recorre el mismo camino que hace la app: registro, login, pastillas,
// agendar y actividades. Cada paso valida la respuesta del backend.
//
// La cuenta descartable que se crea se borra siempre al terminar, aunque la
// corrida se corte a la mitad: esto va contra la base de produccion, y una
// cuenta que sobrevive es basura que despues hay que limpiar a mano.
//
// Por eso necesita la SUPABASE_SERVICE_ROLE_KEY en el .env, igual que admin.mjs:
// borrar la fila de usuarios y la cuenta de auth.users no se puede desde la API,
// y no conviene que se pueda.
//
//   node tests/integracion.mjs    (con el backend corriendo en localhost:3000)

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const API = "http://localhost:3000";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let token = null;
let usuario = null;
let ok = 0;
let fallos = 0;

const pedir = async (ruta, { metodo = "GET", cuerpo, conToken = true } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (conToken && token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const json = await r.json();
  return { status: r.status, json };
};

const prueba = async (nombre, fn) => {
  try {
    await fn();
    console.log(`  OK   ${nombre}`);
    ok++;
  } catch (e) {
    console.log(`  FALLO ${nombre}`);
    console.log(`        ${e.message}`);
    fallos++;
  }
};

const esperar = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// Los ids de las cuentas descartables, para poder borrarlas despues.
const creados = [];

// Borra las cuentas descartables de las dos tablas: la fila de public.usuarios y
// la cuenta de auth.users. Si alguna no se pudo borrar lo dice, para que no se
// acumule basura en silencio.
const limpiar = async () => {
  for (const id of creados) {
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (error) console.log(`  quedo la fila ${id} en usuarios: ${error.message}`);

    const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
    if (errorAuth) console.log(`  quedo la cuenta ${id} en auth.users: ${errorAuth.message}`);
  }
  console.log(`\n  ${creados.length} cuentas descartables borradas`);
};

const correr = async () => {
  const mail = `demo-test-${Date.now()}@voitos.test`;

  console.log("\n=== AUTH ===");

  await prueba("registro sin edad (el form no la pide)", async () => {
    const { status, json } = await pedir("/api/auth/registro", {
      metodo: "POST",
      conToken: false,
      cuerpo: { nombre: "Demo", apellido: "Prueba", mail, password: "demo1234" },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);

    // Se anota apenas la cuenta existe: si algo de abajo falla, la cuenta esta
    // creada igual, y sin este id no habria como borrarla.
    creados.push(json.data.usuario.id);

    esperar(json.data.token, "no vino token");
    esperar(json.data.usuario.id, "no vino usuario");
    token = json.data.token;
    usuario = json.data.usuario;
  });

  await prueba("el id del usuario coincide con el sub del JWT (clave para RLS)", async () => {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    esperar(payload.sub === usuario.id, `sub=${payload.sub} != id=${usuario.id}`);
  });

  await prueba("login con las mismas credenciales", async () => {
    const { status, json } = await pedir("/api/auth/login", {
      metodo: "POST",
      conToken: false,
      cuerpo: { mail, password: "demo1234" },
    });
    esperar(status === 200, `esperaba 200, vino ${status}`);
    esperar(json.data.token, "no vino token");
    token = json.data.token;
  });

  await prueba("login con password incorrecta da 401", async () => {
    const { status } = await pedir("/api/auth/login", {
      metodo: "POST",
      conToken: false,
      cuerpo: { mail, password: "incorrecta" },
    });
    esperar(status === 401, `esperaba 401, vino ${status}`);
  });

  await prueba("ruta protegida sin token da 401", async () => {
    const guardado = token;
    token = null;
    const { status } = await pedir("/api/pastillas");
    token = guardado;
    esperar(status === 401, `esperaba 401, vino ${status}`);
  });

  console.log("\n=== PASTILLAS ===");

  let pastillaId = null;

  await prueba("crear pastilla", async () => {
    const { status, json } = await pedir("/api/pastillas", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: "Ibuprofeno", tipo: "chico" },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    pastillaId = json.data.id;
  });

  await prueba("listar pastillas del usuario", async () => {
    const { status, json } = await pedir(`/api/pastillas?usuario_id=${usuario.id}`);
    esperar(status === 200, `esperaba 200, vino ${status}`);
    esperar(json.data.some((p) => p.id === pastillaId), "no aparece la pastilla creada");
  });

  console.log("\n=== HORARIOS (agendar) ===");

  const hoy = new Date().toISOString().split("T")[0];
  let horarioId = null;

  await prueba("crear horario con cantidad", async () => {
    const { status, json } = await pedir("/api/horarios", {
      metodo: "POST",
      cuerpo: { pastilla_id: pastillaId, dia: hoy, hora: 9, minuto: 30, cantidad: 2 },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    esperar(json.data.cantidad === 2, `cantidad quedo en ${json.data.cantidad}`);
    horarioId = json.data.id;
  });

  await prueba("rutina del dia trae el nombre de la pastilla", async () => {
    const { status, json } = await pedir(`/api/horarios/dia/${hoy}`);
    esperar(status === 200, `esperaba 200, vino ${status}`);
    const mio = json.data.find((h) => h.id === horarioId);
    esperar(mio, "no aparece el horario creado");
    esperar(mio.pastillas?.nombre === "Ibuprofeno", "no vino el nombre de la pastilla");
  });

  console.log("\n=== ACTIVIDADES (tabla nueva) ===");

  let actividadId = null;

  await prueba("crear actividad de una vez", async () => {
    const { status, json } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: "Turno medico", fecha: hoy, hora: "14:30", tipo: "una-vez" },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    actividadId = json.data.id;
  });

  await prueba("crear actividad de rutina con dias", async () => {
    const { status, json } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: "Gimnasia", fecha: "", hora: "08:00", tipo: "rutina", dias: ["L", "X", "V"] },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    esperar(Array.isArray(json.data.dias) && json.data.dias.length === 3, "los dias no se guardaron");
  });

  await prueba("listar actividades del usuario", async () => {
    const { status, json } = await pedir(`/api/actividades?usuario_id=${usuario.id}`);
    esperar(status === 200, `esperaba 200, vino ${status}`);
    esperar(json.data.length === 2, `esperaba 2 actividades, vinieron ${json.data.length}`);
  });

  await prueba("hora con formato invalido da 400", async () => {
    const { status } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: "Mal", fecha: hoy, hora: "8am", tipo: "una-vez" },
    });
    esperar(status === 400, `esperaba 400, vino ${status}`);
  });

  await prueba("tipo invalido da 400", async () => {
    const { status } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: "Mal", fecha: hoy, hora: "08:00", tipo: "loquesea" },
    });
    esperar(status === 400, `esperaba 400, vino ${status}`);
  });

  console.log("\n=== MODULOS ===");

  await prueba("listar modulos con su stock", async () => {
    const { status, json } = await pedir("/api/modulos");
    esperar(status === 200, `esperaba 200, vino ${status}`);
    esperar(Array.isArray(json.data), "no vino una lista");
    esperar(typeof json.data[0]?.cantidad_actual === "number", "falta cantidad_actual");
  });

  console.log("\n=== LIMPIEZA ===");

  await prueba("borrar lo creado", async () => {
    await pedir(`/api/actividades/${actividadId}`, { metodo: "DELETE" });
    const { json } = await pedir(`/api/actividades?usuario_id=${usuario.id}`);
    for (const a of json.data) await pedir(`/api/actividades/${a.id}`, { metodo: "DELETE" });
    await pedir(`/api/horarios/${horarioId}`, { metodo: "DELETE" });
    await pedir(`/api/pastillas/${pastillaId}`, { metodo: "DELETE" });
  });
};

// La limpieza va afuera del try a proposito. Si la corrida se corta a la mitad
// -el backend caido, una respuesta inesperada- la cuenta descartable ya quedo
// creada igual, y sin esto sobreviviria en la base de produccion.
try {
  await correr();
} catch (e) {
  console.log("\n  FALLO la corrida se corto");
  console.log(`        ${e.message}`);
  fallos++;
}

await limpiar();

console.log(`\n=====================================`);
console.log(`  OK: ${ok}   FALLOS: ${fallos}`);
console.log(`=====================================\n`);

process.exit(fallos ? 1 : 0);
