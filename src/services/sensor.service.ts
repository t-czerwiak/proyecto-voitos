import { supabase } from "../config/supabase";
import { Confirmacion } from "../schemas/sensor.schema";
import { getHoraArgentina } from "../utils/tiempo";

export const getPendiente = async () => {
  const { hoy, hora, minuto } = getHoraArgentina();

  const minutoDesde = minuto - 5;
  const horaDesde = hora - 1;
  const minutoDesdeReal = minutoDesde < 0 ? 60 + minutoDesde : minutoDesde;

  const filtro =
    minutoDesde < 0
      ? `and(hora.eq.${hora},minuto.gte.0,minuto.lte.${minuto}),and(hora.eq.${horaDesde},minuto.gte.${minutoDesdeReal},minuto.lte.59)`
      : `and(hora.eq.${hora},minuto.gte.${minutoDesdeReal},minuto.lte.${minuto})`;

  const { data, error } = await supabase
    .from("horarios")
    .select("id, pastilla_id, hora, minuto")
    .eq("dia", hoy)
    .eq("dispensado", false)
    .or(filtro)
    .limit(1)
    .maybeSingle();

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
