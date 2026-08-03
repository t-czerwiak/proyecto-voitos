import { supabase } from "../config/supabase";
import { Confirmacion } from "../schemas/sensor.schema";
import { getHoraArgentina, getTramosVentana } from "../utils/tiempo";

// Cada cuantos minutos consulta la ESP32. Define el tamano de la ventana de
// busqueda: si buscaramos la hora exacta, una dosis se perderia para siempre
// cuando cae entre dos consultas.
const MINUTOS_VENTANA = 5;

export const getPendiente = async () => {
  const { hoy, hora, minuto } = getHoraArgentina();

  // La ventana puede cruzar el cambio de hora, y a las 00:0X hasta el cambio
  // de dia, asi que el dia va dentro del filtro y no como un .eq() aparte.
  const filtro = getTramosVentana(hoy, hora, minuto, MINUTOS_VENTANA)
    .map(
      (t) =>
        `and(dia.eq.${t.dia},hora.eq.${t.hora},minuto.gte.${t.desde},minuto.lte.${t.hasta})`
    )
    .join(",");

  const { data, error } = await supabase
    .from("horarios")
    .select("id, pastilla_id, hora, minuto")
    .eq("dispensado", false)
    .or(filtro)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) return { pendiente: false, horario: null, modulo: null };

  // Buscar que modulo tiene cargada esa pastilla, que es el que la ESP32 tiene
  // que activar. Si ningun modulo la tiene cargada, modulo queda null.
  const { data: modulo, error: errorModulo } = await supabase
    .from("modulos")
    .select("numero")
    .eq("pastilla_id", data.pastilla_id)
    .limit(1)
    .maybeSingle();

  if (errorModulo) throw new Error(errorModulo.message);

  return { pendiente: true, horario: data, modulo: modulo?.numero ?? null };
};

export const createConfirmacion = async (body: Confirmacion) => {
  // Marcar horario como dispensado
  const { error: updateError } = await supabase
    .from("horarios")
    .update({ dispensado: true })
    .eq("id", body.horario_id);

  if (updateError) throw new Error(updateError.message);

  // Registrar la dispensacion
  const { data, error: insertError } = await supabase
    .from("dispensaciones")
    .insert({
      horario_id: body.horario_id,
      dispositivo_id: body.dispositivo_id,
      bateria: body.bateria,
    })
    .select()
    .single();

  // Las dos escrituras no son una transaccion (el cliente de Supabase no
  // expone transacciones). Si falla la segunda, el horario quedaria marcado
  // como dispensado pero sin registro en el historial, y esa dosis
  // desapareceria de las alertas sin haberse tomado. Por eso se deshace el
  // update a mano antes de propagar el error.
  if (insertError) {
    await supabase
      .from("horarios")
      .update({ dispensado: false })
      .eq("id", body.horario_id);
    throw new Error(insertError.message);
  }

  return data;
};
