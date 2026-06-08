import { supabase } from "../config/supabase";
import { Confirmacion } from "../schemas/sensor.schema";

export const getPendiente = async () => {
  const ahora = new Date();
  const hoy = ahora.toISOString().split("T")[0]; // "2026-06-08"
  const horaActual = ahora.getUTCHours();
  const minutoActual = ahora.getUTCMinutes();

  // Ventana de los ultimos 5 minutos
  const minutoDesde = minutoActual - 5;
  const horaDesde = minutoDesde < 0 ? horaActual - 1 : horaActual;
  const minutoDesdeReal = minutoDesde < 0 ? 60 + minutoDesde : minutoDesde;

  let query;

  // Si la ventana cruza el cambio de hora (ej: 10:02 buscando desde 09:57)
  if (minutoDesde < 0) {
    query = supabase
      .from("horarios")
      .select("id, pastilla_id, hora, minuto")
      .eq("dia", hoy)
      .eq("dispensado", false)
      .or(
        `and(hora.eq.${horaActual},minuto.gte.0,minuto.lte.${minutoActual}),and(hora.eq.${horaDesde},minuto.gte.${minutoDesdeReal},minuto.lte.59)`
      );
  } else {
    query = supabase
      .from("horarios")
      .select("id, pastilla_id, hora, minuto")
      .eq("dia", hoy)
      .eq("dispensado", false)
      .eq("hora", horaActual)
      .gte("minuto", minutoDesdeReal)
      .lte("minuto", minutoActual);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(error.message);

  return data
    ? { pendiente: true, horario: data }
    : { pendiente: false, horario: null };
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

  if (insertError) throw new Error(insertError.message);
  return data;
};
