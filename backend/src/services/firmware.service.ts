import { supabase } from "../config/supabase";

// Actualizacion del firmware desde la nube. El .bin esta en el bucket
// privado "firmware" y la placa recibe una URL firmada que vence enseguida:
// el archivo lleva la clave del OTA local, no puede quedar publico.
const BUCKET = "firmware";
const SEGUNDOS_URL = 600;

export const getActualizacion = async (versionPlaca: number) => {
  const { data, error } = await supabase
    .from("firmware")
    .select("version, archivo")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.version <= versionPlaca) return null;

  const { data: firmada, error: errorUrl } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(data.archivo, SEGUNDOS_URL);
  if (errorUrl) throw new Error(errorUrl.message);

  return { version: data.version, url: firmada.signedUrl };
};
