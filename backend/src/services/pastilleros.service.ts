import { createHash, randomInt, timingSafeEqual } from "crypto";
import { supabase } from "../config/supabase";
import { ErrorHttp } from "../utils/errores";

// VINCULAR UN PASTILLERO A LA CUENTA DEL CUIDADOR
//
// Un pastillero es una placa ESP32 (dispositivo_id "ESP32-001"), con uno o
// varios modulos. Igual que los modulos, las filas se dan de alta a mano cuando
// se arma el hardware.
//
// Sin duenio (usuario_id null) el pastillero funciona como hasta ahora:
// cualquier cuenta agenda en el y dispensa todo. Es a proposito, es el modo de
// la exposicion, donde cada visitante se hace una cuenta y prueba la misma
// maquina.
//
// Con duenio, la placa solo ve las dosis y recordatorios de esa cuenta, y sus
// modulos solo los ve y los carga esa cuenta. Y al reves: las dosis de alguien
// que ya tiene su pastillero no salen por uno sin duenio.
//
// Como se vincula: la placa ya habla con el backend cada 30 s por internet, asi
// que no hace falta que el celular este en la misma red. Mientras no tiene
// duenio, el backend le da un codigo de 8 digitos en esa misma consulta, la
// placa lo muestra en el display, y el cuidador lo escribe en la app desde
// donde este. La red local solo se usa una vez, para cargarle el WiFi a la
// placa (eso es todo del firmware, ver LEEME-FIRMWARE.md).

// Cuanto dura un codigo. Despues la placa recibe otro.
const MINUTOS_CODIGO = 30;

const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

const iguales = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

const codigoNuevo = () => String(randomInt(0, 100_000_000)).padStart(8, "0");

// A quien le pertenecen las dosis que ve una placa.
//
// dueno: la cuenta del pastillero, si tiene. ajenos: si NO tiene, las cuentas
// que ya tienen su propio pastillero, que se excluyen. Una placa vieja que no
// manda dispositivo_id cae en el segundo caso.
export interface Alcance {
  dueno: string | null;
  ajenos: string[];
}

export const alcanceDe = async (dispositivo_id?: string): Promise<Alcance> => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id, usuario_id")
    .not("usuario_id", "is", null);

  if (error) throw new Error(error.message);

  const dueno = data.find((p) => p.dispositivo_id === dispositivo_id)?.usuario_id ?? null;
  return { dueno, ajenos: dueno ? [] : [...new Set(data.map((p) => p.usuario_id as string))] };
};

// Filtra una consulta por el alcance. columna es donde esta el usuario: en
// horarios es "pastillas.usuario_id" (con pastillas!inner en el select).
export const filtrarPorAlcance = (consulta: any, a: Alcance, columna: string) => {
  if (a.dueno) return consulta.eq(columna, a.dueno);
  if (a.ajenos.length) return consulta.not(columna, "in", `(${a.ajenos.join(",")})`);
  return consulta;
};

// Las placas que tienen otro duenio. Sus modulos no se ven ni se cargan.
export const dispositivosAjenos = async (usuario_id: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id")
    .not("usuario_id", "is", null)
    .neq("usuario_id", usuario_id);

  if (error) throw new Error(error.message);
  return data.map((p) => p.dispositivo_id);
};

// Lo que la placa recibe en cada consulta sobre su vinculo.
//
// El codigo solo se le da a la placa que manda el secreto correcto. Sin eso,
// cualquiera que conozca el dispositivo_id (esta en el repositorio) podria
// pedir el codigo y quedarse con el pastillero de otro. El secreto lo inventa
// la placa la primera vez que arranca y lo guarda en su memoria; el backend
// guarda el hash del primero que llega (confianza en el primer uso).
export const vinculoParaPlaca = async (dispositivo_id: string, secreto?: string) => {
  const { data: p, error } = await supabase
    .from("pastilleros")
    .select("usuario_id, secreto_hash, codigo, codigo_vence")
    .eq("dispositivo_id", dispositivo_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!p) return null; // placa que no esta dada de alta
  if (p.usuario_id) return { vinculado: true };
  if (!secreto) return { vinculado: false };

  const hash = sha256(secreto);

  if (!p.secreto_hash) {
    // .is(null) para que si dos llegan juntas, gane una sola.
    const { data: tomado } = await supabase
      .from("pastilleros")
      .update({ secreto_hash: hash })
      .eq("dispositivo_id", dispositivo_id)
      .is("secreto_hash", null)
      .select("dispositivo_id");
    if (!tomado?.length) return { vinculado: false };
  } else if (!iguales(p.secreto_hash, hash)) {
    return { vinculado: false };
  }

  if (p.codigo && p.codigo_vence && Date.parse(p.codigo_vence) > Date.now()) {
    return { vinculado: false, codigo: p.codigo };
  }

  // codigo es unique: si justo choca con el de otra placa, se prueba otro.
  for (let intento = 0; intento < 3; intento++) {
    const codigo = codigoNuevo();
    const { error: e } = await supabase
      .from("pastilleros")
      .update({
        codigo,
        codigo_vence: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
      })
      .eq("dispositivo_id", dispositivo_id);
    if (!e) return { vinculado: false, codigo };
    if (e.code !== "23505") throw new Error(e.message);
  }
  return { vinculado: false };
};

export const vincular = async (usuario_id: string, codigo: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .update({ usuario_id, codigo: null, codigo_vence: null, vinculado_at: new Date().toISOString() })
    .eq("codigo", codigo)
    .is("usuario_id", null)
    .gt("codigo_vence", new Date().toISOString())
    .select("dispositivo_id, vinculado_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "El codigo no existe o ya vencio. Mira el que muestra el pastillero ahora.");
  return data;
};

export const getMisPastilleros = async (usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .select("dispositivo_id, vinculado_at")
    .eq("usuario_id", usuario_id)
    .order("vinculado_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

// Deja la placa sin duenio, y tambien olvida su secreto: si se la regalan a
// otro o le borran la memoria, la placa nueva puede volver a presentarse.
export const desvincular = async (usuario_id: string, dispositivo_id: string) => {
  const { data, error } = await supabase
    .from("pastilleros")
    .update({ usuario_id: null, secreto_hash: null, vinculado_at: null })
    .eq("dispositivo_id", dispositivo_id)
    .eq("usuario_id", usuario_id)
    .select("dispositivo_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new ErrorHttp(404, "Pastillero no encontrado");
};
