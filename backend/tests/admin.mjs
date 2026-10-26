import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

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

const registrar = async (etiqueta) => {
  const mail = `admin-test-${etiqueta}-${Date.now()}@voitos.test`;
  const password = "unaClaveLarga123";

  const alta = await pedir("/api/auth/registro", {
    metodo: "POST",
    cuerpo: { nombre: etiqueta, apellido: "Prueba", mail, password, edad: 30 },
  });
  esperar(alta.status === 201, `no se pudo registrar ${etiqueta}: ${alta.status}`);

  const id = alta.json.data.usuario.id;
  creados.push(id);

  const login = await pedir("/api/auth/login", { metodo: "POST", cuerpo: { mail, password } });
  esperar(login.status === 200, `no se pudo loguear ${etiqueta}`);

  return { mail, token: login.json.data.token, id };
};

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
  console.log(`\n=== PREPARACION (contra ${API}) ===`);

  const admin = await registrar("jefe");
  const normal = await registrar("comun");

  await supabase.from("usuarios").update({ rol: "admin" }).eq("id", admin.id);
  console.log(`  admin:  ${admin.id}`);
  console.log(`  normal: ${normal.id}`);

  const pastilla = await pedir("/api/pastillas", {
    metodo: "POST",
    token: normal.token,
    cuerpo: { usuario_id: normal.id, nombre: "DelUsuarioComun", tipo: "comprimido" },
  });
  esperar(pastilla.status === 201, "el usuario normal no pudo crear su pastilla");
  const pastillaAjena = pastilla.json.data.id;

  console.log("\n=== UN USUARIO NORMAL NO VE NI EXISTIR EL PANEL ===");

  for (const [ruta, metodo] of [
    ["/api/admin/usuarios", "GET"],
    [`/api/admin/usuarios/${normal.id}/pastillas`, "GET"],
    [`/api/admin/usuarios/${normal.id}/verificar`, "POST"],
    [`/api/admin/usuarios/${normal.id}/calendario`, "DELETE"],
  ]) {
    await prueba(`${metodo} ${ruta.replace(normal.id, "<id>")} da 404`, async () => {
      const r = await pedir(ruta, { metodo, token: normal.token });
      esperar(r.status === 404, `respondio ${r.status}, deberia ser 404`);
    });
  }

  await prueba("soy-admin le dice que no lo es", async () => {
    const r = await pedir("/api/admin/soy-admin", { token: normal.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    esperar(r.json.data.admin === false, "dice que es admin y no lo es");
  });

  console.log("\n=== EL ADMIN SI PUEDE ===");

  await prueba("soy-admin lo reconoce", async () => {
    const r = await pedir("/api/admin/soy-admin", { token: admin.token });
    esperar(r.json.data.admin === true, "no lo reconoce como admin");
  });

  await prueba("ve la lista de usuarios con su resumen", async () => {
    const r = await pedir("/api/admin/usuarios", { token: admin.token });
    esperar(r.status === 200, `respondio ${r.status}`);

    const elOtro = (r.json.data ?? []).find((u) => u.id === normal.id);
    esperar(elOtro, "no aparece el usuario normal en la lista");
    esperar(elOtro.pastillas === 1, `dice ${elOtro.pastillas} pastillas, deberia ser 1`);
    esperar(!("token_verificacion" in elOtro), "la lista filtra el token de verificacion");
  });

  await prueba("ve las pastillas de otro usuario", async () => {
    const r = await pedir(`/api/admin/usuarios/${normal.id}/pastillas`, { token: admin.token });
    esperar(r.status === 200, `respondio ${r.status}`);
    esperar(r.json.data.length === 1, `vio ${r.json.data.length} pastillas`);
    esperar(r.json.data[0].nombre === "DelUsuarioComun", "no es la pastilla esperada");
  });

  await prueba("verifica una cuenta a mano", async () => {
    const r = await pedir(`/api/admin/usuarios/${normal.id}/verificar`, {
      metodo: "POST",
      token: admin.token,
    });
    esperar(r.status === 200, `respondio ${r.status}`);
    esperar(r.json.data.verificado === true, "no quedo verificada");
  });

  await prueba("y la puede desverificar", async () => {
    const r = await pedir(`/api/admin/usuarios/${normal.id}/desverificar`, {
      metodo: "POST",
      token: admin.token,
    });
    esperar(r.json.data.verificado === false, "sigue verificada");
  });

  await prueba("borra una pastilla ajena por id", async () => {
    const r = await pedir(`/api/pastillas/${pastillaAjena}`, {
      metodo: "DELETE",
      token: admin.token,
    });
    esperar(r.status === 200, `respondio ${r.status}, deberia poder borrarla`);

    const quedan = await pedir("/api/pastillas", { token: normal.token });
    esperar(quedan.json.data.length === 0, "la pastilla sigue ahi");
  });

  console.log("\n=== EL ROL NO SE PUEDE AUTOASIGNAR ===");

  await prueba("no hay endpoint que otorgue el rol admin", async () => {
    const r = await pedir(`/api/usuarios/${normal.id}`, {
      metodo: "PUT",
      token: normal.token,
      cuerpo: { rol: "admin" },
    });

    const { data } = await supabase.from("usuarios").select("rol").eq("id", normal.id).single();
    esperar(data.rol === "cuidador", `el rol quedo en ${data.rol} despues de un PUT (status ${r.status})`);
  });

  console.log("\n=== LIMPIEZA ===");

  await limpiar();

  console.log("\n=====================================");
  console.log(`  OK: ${ok}   FALLOS: ${fallos}`);
  console.log("=====================================\n");

  process.exit(fallos > 0 ? 1 : 0);
};

correr().catch(async (e) => {
  console.error("La corrida se corto:", e.message);
  await limpiar();
  process.exit(1);
});
