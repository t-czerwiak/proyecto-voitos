import app from "./app";
import dotenv from "dotenv";
import { iniciarSchedulerDosisNoTomadas } from "./schedulers/dosis-no-tomadas";
import { iniciarSchedulerDosisADispensar } from "./schedulers/dosis-a-dispensar";
import { smtpConfigurado } from "./services/email.service";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Voitos backend corriendo en http://localhost:${PORT}`);

  if (!smtpConfigurado()) {
    console.log("⚠️  SMTP sin configurar: los mails se van a escribir por consola en vez de enviarse");
  }

  iniciarSchedulerDosisADispensar();
  iniciarSchedulerDosisNoTomadas();
});
