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

const pedir = async (ruta, { metodo = "GET", cuerpo, conToken = true, extra = {} } = {}) => {
  const headers = { "Content-Type": "application/json", ...extra };
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
// Una placa de mentira para probar el vinculo, sin tocar la ESP32-001 real.
const PLACA = `TEST-${Date.now()}`;

const limpiar = async () => {
  await supabase.from("pastilleros").delete().eq("dispositivo_id", PLACA);
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

  console.log("\n=== CONFIRMACION DEL PASTILLERO ===");

  // La hora argentina dentro de N minutos, como la guarda la base.
  const enArgentina = (minutos) => {
    const d = new Date(Date.now() - 3 * 3600_000 + minutos * 60_000);
    return {
      dia: d.toISOString().split("T")[0],
      hora: d.getUTCHours(),
      minuto: d.getUTCMinutes(),
      hhmm: d.toISOString().slice(11, 16),
      letra: ["D", "L", "M", "X", "J", "V", "S"][d.getUTCDay()],
    };
  };
  // Crea una dosis a N minutos de ahora (negativo = ya paso). La confirmacion
  // solo se acepta en el horario de la dosis, asi que cada prueba arma la suya.
  const dosisA = async (minutos) => {
    const t = enArgentina(minutos);
    const { json } = await pedir("/api/horarios", {
      metodo: "POST",
      cuerpo: { pastilla_id: pastillaId, dia: t.dia, hora: t.hora, minuto: t.minuto },
    });
    return json.data.id;
  };

  // La pastilla de esta suite no tiene modulo cargado, asi que confirmar no
  // le toca el stock al pastillero de verdad.
  const confirmar = (horario_id, extra = {}) =>
    pedir("/api/sensor/confirmacion", {
      metodo: "POST",
      conToken: false,
      cuerpo: { dispositivo_id: "ESP32-TEST", horario_id, bateria: 100, cantidad: 2, ...extra },
    });

  let confirmada = null;

  await prueba("confirmar una dosis la registra, con lo que vio el sensor", async () => {
    confirmada = await dosisA(-2);
    const { status, json } = await confirmar(confirmada, { detectadas: 1 });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    esperar(json.data.detectadas === 1, `detectadas quedo en ${json.data.detectadas}`);
  });

  await prueba("confirmar dos veces la misma dosis da 409", async () => {
    const { status } = await confirmar(confirmada);
    esperar(status === 409, `esperaba 409, vino ${status}`);
  });

  await prueba("dos confirmaciones simultaneas registran una sola", async () => {
    const otro = await dosisA(-1);
    const resultados = await Promise.all([confirmar(otro), confirmar(otro)]);
    const estados = resultados.map((r) => r.status).sort();
    esperar(estados.join() === "201,409", `esperaba 201 y 409, vinieron ${estados.join(" y ")}`);

    const { data } = await supabase.from("dispensaciones").select("id").eq("horario_id", otro);
    esperar(data.length === 1, `quedaron ${data.length} dispensaciones para un solo horario`);
  });

  await prueba("una dosis que todavia no es no se puede confirmar", async () => {
    const futura = await dosisA(30);
    const { status } = await confirmar(futura);
    esperar(status === 409, `esperaba 409, vino ${status}`);
    const { data } = await supabase.from("horarios").select("dispensado").eq("id", futura).single();
    esperar(data.dispensado === false, "la dosis futura quedo marcada como dispensada");
  });

  await prueba("una dosis de hace dos horas no se puede confirmar", async () => {
    const vieja = await dosisA(-120);
    const { status } = await confirmar(vieja);
    esperar(status === 409, `esperaba 409, vino ${status}`);
  });

  await prueba("confirmar un horario que no existe da 404", async () => {
    const { status } = await confirmar("00000000-0000-4000-8000-000000000000");
    esperar(status === 404, `esperaba 404, vino ${status}`);
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

  console.log("\n=== RECORDATORIOS EN EL DISPLAY ===");

  const marca = `Test${Date.now() % 100000}`;
  const recordatoriosAhora = async () => (await pedir("/api/sensor/pendiente", { conToken: false })).json.data.recordatorios;

  await prueba("una dosis con recordatorio aparece en el display", async () => {
    const t = enArgentina(10);
    const { status, json } = await pedir("/api/horarios", {
      metodo: "POST",
      cuerpo: { pastilla_id: pastillaId, dia: t.dia, hora: t.hora, minuto: t.minuto, cantidad: 3, recordatorio_min: 15 },
    });
    esperar(status === 201, `esperaba 201, vino ${status}: ${JSON.stringify(json.error)}`);
    const r = (await recordatoriosAhora()).find((x) => x.texto === "Ibuprofeno x3");
    esperar(r, "no aparece la dosis en los recordatorios");
    esperar(r.hora === t.hhmm && r.tipo === "dosis", `vino ${JSON.stringify(r)}`);
    esperar(r.id === json.data.id, "el recordatorio de una dosis tiene que traer el id del horario");
  });

  await prueba("un recordatorio todavia no aparece si falta mas que su anticipacion", async () => {
    const t = enArgentina(40);
    const { status } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: `${marca} tarde`, fecha: t.dia, hora: t.hhmm, tipo: "una-vez", recordatorio_min: 30 },
    });
    esperar(status === 201, `esperaba 201, vino ${status}`);
    esperar(!(await recordatoriosAhora()).some((x) => x.texto === `${marca} tarde`), "aparecio antes de tiempo");
  });

  await prueba("una actividad de rutina con recordatorio aparece hoy", async () => {
    const t = enArgentina(5);
    const { status } = await pedir("/api/actividades", {
      metodo: "POST",
      cuerpo: { usuario_id: usuario.id, nombre: `${marca} kinesiología`, fecha: "", hora: t.hhmm, tipo: "rutina", dias: [t.letra], recordatorio_min: 10 },
    });
    esperar(status === 201, `esperaba 201, vino ${status}`);
    esperar((await recordatoriosAhora()).some((x) => x.texto === `${marca} kinesiologia` && x.tipo === "actividad"), "no aparece la rutina, o vino con acento (el display no los dibuja)");
  });

  await prueba("recordatorio con minutos que no estan en la lista da 400", async () => {
    const { status } = await pedir("/api/horarios", {
      metodo: "POST",
      cuerpo: { pastilla_id: pastillaId, dia: hoy, hora: 9, minuto: 0, recordatorio_min: 7 },
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

  console.log("\n=== VINCULAR PASTILLERO ===");

  await supabase.from("pastilleros").insert({ dispositivo_id: PLACA });
  const SECRETO = "secreto-de-prueba-1234";
  const consultaPlaca = (secreto) =>
    pedir(`/api/sensor/pendiente?dispositivo_id=${PLACA}`, {
      conToken: false,
      extra: secreto ? { "X-Pastillero-Secreto": secreto } : {},
    });
  let codigo = null;

  await prueba("una placa sin duenio recibe un codigo de 8 digitos", async () => {
    const { json } = await consultaPlaca(SECRETO);
    codigo = json.data.vinculo?.codigo;
    esperar(json.data.vinculo?.vinculado === false, `vino ${JSON.stringify(json.data.vinculo)}`);
    esperar(/^[0-9]{8}$/.test(codigo ?? ""), `codigo invalido: ${codigo}`);
    esperar((await consultaPlaca(SECRETO)).json.data.vinculo.codigo === codigo, "la segunda consulta cambio el codigo");
  });

  await prueba("sin el secreto, o con otro, no se entrega el codigo", async () => {
    esperar(!(await consultaPlaca()).json.data.vinculo.codigo, "sin secreto vino el codigo");
    esperar(!(await consultaPlaca("otro-secreto")).json.data.vinculo.codigo, "con otro secreto vino el codigo");
  });

  await prueba("un codigo mal escrito da 400 y uno que no existe 404", async () => {
    const mal = await pedir("/api/pastilleros/vincular", { metodo: "POST", cuerpo: { codigo: "12ab" } });
    esperar(mal.status === 400, `esperaba 400, vino ${mal.status}`);
    const otro = String((Number(codigo) + 1) % 100000000).padStart(8, "0");
    const no = await pedir("/api/pastilleros/vincular", { metodo: "POST", cuerpo: { codigo: otro } });
    esperar(no.status === 404, `esperaba 404, vino ${no.status}`);
  });

  await prueba("vincular con el codigo (aunque venga con espacio) la deja en la cuenta", async () => {
    const { status } = await pedir("/api/pastilleros/vincular", {
      metodo: "POST",
      cuerpo: { codigo: `${codigo.slice(0, 4)} ${codigo.slice(4)}` },
    });
    esperar(status === 201, `esperaba 201, vino ${status}`);
    const { json } = await pedir("/api/pastilleros");
    esperar(json.data.some((p) => p.dispositivo_id === PLACA), "no aparece en mis pastilleros");
    esperar((await consultaPlaca(SECRETO)).json.data.vinculo.vinculado === true, "la placa no se entero");
  });

  await prueba("vinculada, la placa ve las dosis de su duenio y las otras ya no", async () => {
    const enLaPlaca = (await consultaPlaca(SECRETO)).json.data.recordatorios;
    esperar(enLaPlaca.some((x) => x.texto === "Ibuprofeno x3"), "la placa vinculada no ve la dosis de su duenio");
    esperar(!(await recordatoriosAhora()).some((x) => x.texto === "Ibuprofeno x3"), "un pastillero sin duenio sigue viendo la dosis");
  });

  await prueba("desvincular la deja sin duenio, y otra vez da 404", async () => {
    const { status } = await pedir(`/api/pastilleros/${PLACA}`, { metodo: "DELETE" });
    esperar(status === 200, `esperaba 200, vino ${status}`);
    const otra = await pedir(`/api/pastilleros/${PLACA}`, { metodo: "DELETE" });
    esperar(otra.status === 404, `esperaba 404, vino ${otra.status}`);
    esperar((await recordatoriosAhora()).some((x) => x.texto === "Ibuprofeno x3"), "la dosis no volvio al pastillero sin duenio");
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
