// Pruebas de seguridad: intentan explotar los agujeros que se taparon.
//
// A diferencia de integracion.mjs, que verifica que las cosas funcionen, estas
// verifican que ciertas cosas NO funcionen. Una prueba que "pasa" aca significa
// que el ataque fue rechazado.
//
// Se crean dos usuarios distintos y se intenta que uno lea los datos del otro.
// Esas dos cuentas se borran siempre al terminar, aunque la corrida se corte a
// la mitad: estas pruebas van contra la base de produccion, y una cuenta que
// sobrevive es basura que despues hay que limpiar a mano.
//
// Por eso necesita la SUPABASE_SERVICE_ROLE_KEY en el .env, igual que admin.mjs:
// borrar la fila de usuarios y la cuenta de auth.users no se puede desde la API,
// y no conviene que se pueda.
//
//   node tests/seguridad.mjs      (con el backend corriendo en localhost:3000)

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

// Por defecto corre contra el backend local. Para probar el desplegado:
//   API=https://voitos-backend.onrender.com node tests/seguridad.mjs
const API = process.env.API ?? "http://localhost:3000";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let ok = 0;
let fallos = 0;

const pedir = async (ruta, { metodo = "GET", cuerpo, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    // algunas respuestas no traen cuerpo
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

// Los ids de las cuentas descartables, para poder borrarlas despues.
const creados = [];

const registrar = async (etiqueta) => {
  const mail = `sec-${etiqueta}-${Date.now()}@voitos.test`;
  const password = "unaClaveLarga123";

  const alta = await pedir("/api/auth/registro", {
    metodo: "POST",
    cuerpo: { nombre: etiqueta, apellido: "Prueba", mail, password, edad: 30 },
  });
  esperar(alta.status === 201, `no se pudo registrar ${etiqueta}: ${alta.status}`);

  // Se anota apenas la cuenta existe, antes del login: si el login falla la
  // cuenta ya esta creada igual, y sin este id no habria como borrarla.
  creados.push(alta.json.data.usuario.id);

  const login = await pedir("/api/auth/login", {
    metodo: "POST",
    cuerpo: { mail, password },
  });
  esperar(login.status === 200, `no se pudo loguear ${etiqueta}`);

  return {
    mail,
    token: login.json.data.token,
    id: login.json.data.usuario.id,
    perfil: login.json.data.usuario,
  };
};

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
  console.log(`  ${creados.length} cuentas descartables borradas`);
};

const correr = async () => {
  console.log("\n=== PREPARACION ===");

  const a = await registrar("ana");
  const b = await registrar("beto");
  console.log(`  usuario A: ${a.id}`);
  console.log(`  usuario B: ${b.id}`);

  // A crea una pastilla y un contacto de emergencia
  const pastilla = await pedir("/api/pastillas", {
    metodo: "POST",
    token: a.token,
    // Sin cantidad_inicial a proposito: cargar stock crea un modulo, y la FK
    // modulos -> pastillas es SET NULL, asi que al borrar la pastilla el modulo
    // quedaria huerfano ensuciando la base en cada corrida.
    cuerpo: { usuario_id: a.id, nombre: "SecretoDeAna", tipo: "comprimido" },
  });
  esperar(pastilla.status === 201, "A no pudo crear su pastilla");
  const pastillaDeA = pastilla.json.data.id;

  const contacto = await pedir("/api/contactos", {
    metodo: "POST",
    token: a.token,
    cuerpo: { usuario_id: a.id, nombre: "Contacto", apellido: "DeAna", numero: "1122334455", dni: "30111222" },
  });
  esperar(contacto.status === 201, "A no pudo crear su contacto");
  const contactoDeA = contacto.json.data.id;

  console.log("\n=== EL usuario_id VIENE DEL TOKEN, NO DE LA URL ===");

  await prueba("B pidiendo la lista con ?usuario_id=<id de A> no ve nada de A", async () => {
    const r = await pedir(`/api/pastillas?usuario_id=${a.id}`, { token: b.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    const ajenas = (r.json.data ?? []).filter((p) => p.usuario_id === a.id);
    esperar(ajenas.length === 0, `se filtraron ${ajenas.length} pastillas de A`);
  });

  await prueba("B no ve los contactos de A aunque pase su usuario_id", async () => {
    const r = await pedir(`/api/contactos?usuario_id=${a.id}`, { token: b.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    const ajenos = (r.json.data ?? []).filter((c) => c.usuario_id === a.id);
    esperar(ajenos.length === 0, `se filtraron ${ajenos.length} contactos de A`);
  });

  await prueba("B no ve las dosis de A", async () => {
    const r = await pedir(`/api/horarios?usuario_id=${a.id}`, { token: b.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    const ajenas = (r.json.data ?? []).filter((h) => h.pastillas?.usuario_id === a.id);
    esperar(ajenas.length === 0, `se filtraron ${ajenas.length} horarios de A`);
  });

  console.log("\n=== NO SE PUEDE OPERAR SOBRE REGISTROS AJENOS POR ID ===");

  await prueba("B no puede leer la pastilla de A por su id", async () => {
    const r = await pedir(`/api/pastillas/${pastillaDeA}`, { token: b.token });
    esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);
  });

  await prueba("B no puede borrar la pastilla de A", async () => {
    const r = await pedir(`/api/pastillas/${pastillaDeA}`, { metodo: "DELETE", token: b.token });
    esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);

    // Y sigue existiendo para su dueño
    const sigue = await pedir(`/api/pastillas/${pastillaDeA}`, { token: a.token });
    esperar(sigue.status === 200, "la pastilla de A desaparecio");
  });

  await prueba("B no puede recargar el stock de la pastilla de A", async () => {
    const r = await pedir(`/api/pastillas/${pastillaDeA}/stock`, {
      metodo: "PATCH",
      token: b.token,
      cuerpo: { delta: 100 },
    });
    esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);
  });

  await prueba("B no puede leer el contacto de emergencia de A", async () => {
    const r = await pedir(`/api/contactos/${contactoDeA}`, { token: b.token });
    esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);
  });

  console.log("\n=== NO SE PUEDEN CREAR DATOS A NOMBRE DE OTRO ===");

  await prueba("B creando una pastilla con usuario_id de A queda a nombre de B", async () => {
    const r = await pedir("/api/pastillas", {
      metodo: "POST",
      token: b.token,
      cuerpo: { usuario_id: a.id, nombre: "Infiltrada", tipo: "comprimido" },
    });
    esperar(r.status === 201, `respondio ${r.status}`);
    esperar(
      r.json.data.usuario_id === b.id,
      `quedo a nombre de ${r.json.data.usuario_id}, deberia ser B (${b.id})`
    );
  });

  console.log("\n=== LA API NO DEVUELVE CAMPOS SENSIBLES ===");

  await prueba("el login no incluye el token de verificacion", async () => {
    const campos = Object.keys(a.perfil);
    esperar(
      !campos.includes("token_verificacion"),
      `el perfil trae token_verificacion: ${campos.join(", ")}`
    );
    esperar(
      !campos.includes("token_expira"),
      `el perfil trae token_expira: ${campos.join(", ")}`
    );
  });

  await prueba("la lista de usuarios tampoco lo incluye", async () => {
    const r = await pedir("/api/usuarios", { token: a.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    const conToken = (r.json.data ?? []).filter((u) => "token_verificacion" in u);
    esperar(conToken.length === 0, `${conToken.length} usuarios traen el token`);
  });

  await prueba("A no ve a los demas usuarios en la lista", async () => {
    const r = await pedir("/api/usuarios", { token: a.token });
    const ajenos = (r.json.data ?? []).filter((u) => u.id !== a.id);
    esperar(ajenos.length === 0, `se filtraron ${ajenos.length} usuarios ajenos`);
  });

  await prueba("A no puede leer el perfil de B por su id", async () => {
    const r = await pedir(`/api/usuarios/${b.id}`, { token: a.token });
    esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);
  });

  console.log("\n=== CABECERAS DE SEGURIDAD ===");

  await prueba("responde con las cabeceras de helmet", async () => {
    const r = await fetch(`${API}/api/nada`);
    const necesarias = ["x-content-type-options", "x-frame-options", "referrer-policy"];
    const faltan = necesarias.filter((h) => !r.headers.get(h));
    esperar(faltan.length === 0, `faltan: ${faltan.join(", ")}`);
  });

  console.log("\n=== SIN TOKEN NO SE ENTRA ===");

  await prueba("las rutas protegidas rechazan pedidos sin token", async () => {
    for (const ruta of ["/api/pastillas", "/api/horarios", "/api/contactos", "/api/usuarios"]) {
      const r = await pedir(ruta);
      esperar(r.status === 401, `${ruta} respondio ${r.status}`);
    }
  });

  console.log("\n=== LIMPIEZA ===");

  await prueba("borrar lo creado", async () => {
    await pedir(`/api/pastillas/${pastillaDeA}`, { metodo: "DELETE", token: a.token });
    await pedir(`/api/contactos/${contactoDeA}`, { metodo: "DELETE", token: a.token });
  });

  await limpiar();

  console.log("\n=====================================");
  console.log(`  OK: ${ok}   FALLOS: ${fallos}`);
  console.log("=====================================\n");

  process.exit(fallos > 0 ? 1 : 0);
};

// Tambien se limpia cuando la corrida se corta: si no, cada error dejaria dos
// cuentas vivas en la base de produccion.
correr().catch(async (e) => {
  console.error("La corrida se corto:", e.message);
  await limpiar();
  process.exit(1);
});
