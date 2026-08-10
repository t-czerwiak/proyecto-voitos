// Crea una dosis programada para este mismo momento, asi se puede probar el
// flujo completo sin tener que esperar a que llegue la hora de una dosis real.
//
// Uso:
//   npm run dosis          -> 1 pastilla
//   npm run dosis -- 5     -> 5 pastillas
//   npm run dosis -- 5 <pastilla_id>
//
// Sin esto, POST /api/sensor/dispensar manda la senal pero no encuentra dosis
// pendiente, asi que va sin horario_id y la dispensacion no queda registrada.

import { supabase } from "../config/supabase";
import { getHoraArgentina } from "../utils/tiempo";

const main = async () => {
  const cantidad = Number(process.argv[2] ?? 1);
  let pastillaId = process.argv[3];

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
    console.error("La cantidad tiene que ser un entero entre 1 y 20.");
    process.exit(1);
  }

  // Si no aclaran cual, se usa la primera pastilla que haya cargada
  if (!pastillaId) {
    const { data, error } = await supabase
      .from("pastillas")
      .select("id, nombre")
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      console.error("No hay ninguna pastilla cargada en la base.");
      process.exit(1);
    }

    pastillaId = data.id;
    console.log(`Pastilla: ${data.nombre} (${data.id})`);
  }

  const { hoy, hora, minuto } = getHoraArgentina();

  const { data, error } = await supabase
    .from("horarios")
    .insert({
      pastilla_id: pastillaId,
      dia: hoy,
      hora,
      minuto,
      cantidad,
      dispensado: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const hhmm = `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

  console.log("");
  console.log(`Dosis creada para hoy ${hoy} a las ${hhmm} (hora Argentina)`);
  console.log(`  id:       ${data.id}`);
  console.log(`  cantidad: ${cantidad}`);
  console.log("");
  console.log("La ventana de busqueda dura 5 minutos, asi que mandala ya:");
  console.log("");
  console.log(
    `  Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/sensor/dispensar -ContentType "application/json" -Body '{"destino":"10.8.17.79"}'`
  );
  console.log("");
};

main().catch((e) => {
  console.error("Fallo:", e.message);
  process.exit(1);
});
