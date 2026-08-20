// Simulador del pastillero: hace lo mismo que el firmware de polling, pero en
// Node, para poder probar todo el circuito sin la placa.
//
// Replica la logica de docs/interno/sketch-polling/sketch-polling.ino:
//   1. consulta GET /api/sensor/pendiente cada 30 segundos
//   2. si hay una dosis, verifica que el modulo tenga stock
//   3. "suena el buzzer" y espera el boton
//   4. "mueve el servo" una vez por pastilla
//   5. confirma con POST /api/sensor/confirmacion
//
// Imprime lo mismo que el monitor serie, asi lo que se ve aca es lo que se
// deberia ver en el Arduino IDE con la placa de verdad.
//
//   node tests/simulador-esp32.mjs
//   API=https://voitos-backend.onrender.com node tests/simulador-esp32.mjs
//   SEGUNDOS_BOTON=3 node tests/simulador-esp32.mjs   (cuanto tarda en apretar)
//   BOTON=manual node tests/simulador-esp32.mjs       (apretar con Enter)

const API = process.env.API ?? "http://localhost:3000";
const DISPOSITIVO_ID = process.env.DISPOSITIVO_ID ?? "ESP32-001";

// Mismos valores que el firmware
const MS_ENTRE_CONSULTAS = Number(process.env.SEGUNDOS_CONSULTA ?? 30) * 1000;
const MS_ESPERANDO_BOTON = 15 * 60 * 1000;
const MAX_PASTILLAS = 20;

// Cuanto tarda la "persona" en apretar el boton. En manual se espera un Enter.
const MODO_BOTON = process.env.BOTON ?? "auto";
const MS_HASTA_APRETAR = Number(process.env.SEGUNDOS_BOTON ?? 4) * 1000;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const hora = () => new Date().toLocaleTimeString("es-AR", { hour12: false });
const log = (linea = "") => console.log(linea === "" ? "" : `[${hora()}] ${linea}`);

// El estado del firmware, con los mismos nombres
let esperandoBoton = false;
let horarioPendiente = "";
let cantidadPendiente = 1;

const pedir = async (ruta, opciones = {}) => {
  const r = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers ?? {}) },
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    // puede no traer cuerpo
  }
  return { status: r.status, json };
};

// Equivale a moverServo() repetido: un ciclo por pastilla, con sus tiempos.
const dispensar = async (cantidad) => {
  if (cantidad < 1) cantidad = 1;
  if (cantidad > MAX_PASTILLAS) cantidad = MAX_PASTILLAS;

  log(`Dispensando ${cantidad} ${cantidad === 1 ? "pastilla" : "pastillas"}...`);

  for (let i = 1; i <= cantidad; i++) {
    log(`  pastilla ${i} de ${cantidad}`);
    // El servo tarda 2 segundos por ciclo (180 grados y vuelta)
    await esperar(2000);
  }

  log("Listo.");
  return cantidad;
};

const confirmarDispensacion = async (cantidadDispensada) => {
  if (horarioPendiente === "") {
    log("Sin horario_id: fue una senal de prueba, no se registra.");
    return false;
  }

  const { status, json } = await pedir("/api/sensor/confirmacion", {
    method: "POST",
    body: JSON.stringify({
      dispositivo_id: DISPOSITIVO_ID,
      horario_id: horarioPendiente,
      bateria: 100,
      cantidad: cantidadDispensada,
    }),
  });

  if (status === 201) {
    log("Confirmado! El backend lo registro.");
    if (json?.data?.quedan_en_modulo !== undefined) {
      log(`  quedan en el modulo: ${json.data.quedan_en_modulo}`);
    }
    return true;
  }

  log(`Fallo la confirmacion. HTTP ${status}`);
  log(`  ${JSON.stringify(json)}`);
  return false;
};

const apretarBoton = async () => {
  if (MODO_BOTON === "manual") {
    log("(apreta Enter para simular el boton)");
    await new Promise((r) => process.stdin.once("data", r));
    return true;
  }

  log(`(el boton se va a apretar solo en ${MS_HASTA_APRETAR / 1000}s)`);
  await esperar(MS_HASTA_APRETAR);
  return true;
};

const consultarPendiente = async () => {
  const { status, json } = await pedir("/api/sensor/pendiente");

  if (status !== 200) {
    log(`GET /api/sensor/pendiente respondio ${status}`);
    return;
  }

  const data = json?.data;
  if (!data?.pendiente) return;

  const id = data.horario?.id;
  const cantidad = data.horario?.cantidad ?? 1;
  const modulo = data.modulo ?? 0;
  const disponibles = data.disponibles ?? -1;

  if (!id) {
    log("Dosis pendiente sin id, se ignora.");
    return;
  }

  log("");
  log("=== HAY UNA DOSIS PENDIENTE ===");
  log(`  horario: ${id}`);
  log(`  pastillas: ${cantidad}`);
  log(`  modulo: ${modulo}`);
  log(`  quedan en el modulo: ${disponibles}`);

  // Mismo corte que el firmware: no suena si el modulo no puede cumplir.
  if (disponibles >= 0 && disponibles < cantidad) {
    log("  Stock insuficiente, no se dispensa. Hay que recargar.");
    return;
  }

  horarioPendiente = id;
  cantidadPendiente = cantidad;

  log("Buzzer sonando...");
  await esperar(1000);

  esperandoBoton = true;
  log("Esperando que se presione el boton...");

  const empezo = Date.now();
  const apretado = await Promise.race([
    apretarBoton(),
    esperar(MS_ESPERANDO_BOTON).then(() => false),
  ]);

  if (!apretado) {
    log("Pasaron 15 minutos sin que se apriete el boton.");
    log("La dosis queda sin dispensar. El backend ya aviso por mail.");
    esperandoBoton = false;
    horarioPendiente = "";
    return;
  }

  log(`Boton presionado! (a los ${Math.round((Date.now() - empezo) / 1000)}s)`);

  const dispensadas = await dispensar(cantidadPendiente);
  await confirmarDispensacion(dispensadas);

  esperandoBoton = false;
  horarioPendiente = "";
  cantidadPendiente = 1;

  log("Listo para la proxima dosis.");
  log("");
};

const correr = async () => {
  console.log();
  console.log("=================================");
  console.log("  SIMULADOR DEL PASTILLERO");
  console.log("=================================");
  console.log(`Backend: ${API}`);
  console.log(`Dispositivo: ${DISPOSITIVO_ID}`);
  console.log(`Consultando cada ${MS_ENTRE_CONSULTAS / 1000} segundos.`);
  console.log(`Boton: ${MODO_BOTON === "manual" ? "manual (Enter)" : `automatico a los ${MS_HASTA_APRETAR / 1000}s`}`);
  console.log();

  // Esperar a que el backend responda antes de entrar al ciclo.
  //
  // En el plan free de Render el servicio se duerme a los 15 minutos sin
  // trafico y devuelve 503 mientras despierta, lo que puede tardar cerca de un
  // minuto. El firmware real tolera esto sin hacer nada especial: si la
  // consulta falla, simplemente reintenta en el proximo ciclo.
  let intentos = 0;
  for (;;) {
    const { status } = await pedir("/api/sensor/pendiente");
    if (status === 200) break;

    intentos++;
    if (intentos === 1) log(`El backend respondio ${status}. Puede estar dormido, esperando...`);
    if (intentos > 20) {
      console.error(`No se pudo contactar al backend despues de ${intentos} intentos.`);
      process.exit(1);
    }
    await esperar(5000);
  }

  log("Conectado. Esperando dosis...");
  log("");

  for (;;) {
    if (!esperandoBoton) await consultarPendiente();
    await esperar(MS_ENTRE_CONSULTAS);
  }
};

process.on("SIGINT", () => {
  console.log("\nSimulador detenido.\n");
  process.exit(0);
});

correr().catch((e) => {
  console.error("El simulador se corto:", e.message);
  process.exit(1);
});
