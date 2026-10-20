// =====================================================================
// PRUEBA DEL DISPLAY: es el firmware de voitos-polling con MODO_PRUEBA en 1.
//
//   - Al arrancar recorre todas las pantallas del display (reposo con la hora,
//     recordatorios de ejemplo, TU DOSIS, REVISAR) y las anuncia por el
//     monitor serie a 115200.
//   - Despues funciona EN VIVO contra el backend de produccion: lo que se
//     agende en voitos.vercel.app aparece en la pantalla.
//   - El boton de dispensar es el BOOT de la placa (GPIO 0), asi no hace falta
//     tener el pulsador cableado.
//   - Detecta solo si SDA/SCL estan cruzados (D22/D23) y la direccion 0x3C/0x3D.
//
// Antes de compilar: copiar credenciales.h.ejemplo como credenciales.h, en
// ESTA carpeta, y completar la red WiFi.
//
// ponytail: es una copia del sketch principal. Si el principal cambia, esta
// se regenera copiandolo y poniendo MODO_PRUEBA en 1; no editarla a mano.
// =====================================================================

// Voitos - firmware de POLLING
//
// Diferencia con la version anterior: la placa ya no espera que le hablen,
// pregunta ella.
//
//   antes (push)     la ESP32 levantaba un WebServer y el backend le pegaba a
//                    GET /dispense. Eso obliga a que los dos esten en la MISMA
//                    red, porque la IP de la placa es privada y no se alcanza
//                    desde internet.
//
//   ahora (polling)  la ESP32 consulta cada 30 segundos
//                    GET /api/sensor/pendiente. Solo necesita salida a
//                    internet, asi que el backend puede estar en Render y el
//                    pastillero en cualquier red con WiFi.
//
// Lo que NO cambia, porque costo encontrarlo y funciona:
//   - el boton va por interrupcion, nunca leido dentro del loop
//   - ESP32PWM::allocateTimer(0..3) antes del attach del servo
//   - WiFi.setSleep(false)
//
// REQUIERE las librerias ArduinoJson, Adafruit SSD1306 y Adafruit GFX. Se
// instalan del Library Manager del IDE: Herramientas > Administrar bibliotecas
// > buscar cada una > Instalar (Adafruit SSD1306 ofrece instalar GFX sola).

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

// La red WiFi va en credenciales.h, al lado de este archivo, que NO se sube
// (el repositorio es publico). Copiar credenciales.h.ejemplo como
// credenciales.h y completar la red y la clave.
#include "credenciales.h"

// Modo prueba: en el arranque muestra todas las pantallas del display una por
// una, y usa el boton BOOT de la placa como boton de dispensar (asi se prueba
// sin tener el pulsador cableado). No se toca aca: se prende al compilar con
//   --build-property compiler.cpp.extra_flags=-DMODO_PRUEBA=1
#define MODO_PRUEBA 1

// El backend ahora vive en internet, asi que esto ya NO cambia con la red.
// Se configura una sola vez y sirve en cualquier lado.
const char* BACKEND = "https://voitos-backend.onrender.com";

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
// En modo prueba, el BOOT de la DevKit (GPIO 0).
const int BUTTON_PIN = MODO_PRUEBA ? 0 : 21;

// Display OLED 0.96" (SSD1306, 128x64, I2C).
//
// Los pines I2C por defecto de la ESP32 son SDA=21 y SCL=22, pero el 21 ya es
// el boton. Por eso SDA va al 23. Si se cablea en otros pines, se cambia aca.
const int OLED_SDA = 23;
const int OLED_SCL = 22;

// La mayoria de estos modulos vienen en 0x3C. Si la pantalla no prende y el
// monitor serie dice "No se encontro la pantalla", probar con 0x3D.
const uint8_t OLED_DIRECCION = 0x3C;

Adafruit_SSD1306 pantalla(128, 64, &Wire, -1);

// Si la pantalla no esta conectada el pastillero tiene que seguir andando
// igual: dispensar es lo importante, el display es un extra.
bool hayPantalla = false;

// Sensor de caida de pastillas (el "tercer chequeo").
//
// Pensado para un modulo infrarrojo de salida digital (barrera o de
// obstaculo), que pone la salida en LOW mientras algo corta el haz. Si el que
// se use da HIGH al detectar, cambiar SENSOR_FLANCO a RISING.
//
// HAY_SENSOR arranca en false para poder probar el display sin el sensor
// conectado: si estuviera en true sin sensor, cada dosis se reportaria con 0
// pastillas detectadas. Ponerlo en true cuando el sensor este cableado.
const bool HAY_SENSOR = false;
const int SENSOR_PIN = 27;
const int SENSOR_FLANCO = FALLING;

// Despues del ultimo movimiento del servo, cuanto se sigue escuchando al
// sensor: la pastilla tarda un poco en caer.
const unsigned long MS_ESPERA_CAIDA = 1000;

// Una pastilla corta el haz una sola vez, pero el borde puede generar varios
// pulsos seguidos. Lo que llegue antes de esto se toma como la misma pastilla.
const unsigned long MS_ANTIRREBOTE_SENSOR = 80;

// Tiene que coincidir con el dispositivo_id de la tabla modulos
const char* DISPOSITIVO_ID = "ESP32-001";

// Tope de seguridad: por mas que el backend pida mas, no dispensa de mas.
const int MAX_PASTILLAS = 20;

// Cuanto espera entre pastilla y pastilla
const int PAUSA_ENTRE_PASTILLAS = 500;

// Cada cuanto le pregunta al backend si hay algo que dispensar.
//
// El backend busca dosis en una ventana de 15 minutos desde la hora, asi
// que 30 segundos deja margen de sobra para no perderse ninguna. Bajarlo mucho
// solo gasta datos y bateria sin ganar nada.
const unsigned long MS_ENTRE_CONSULTAS = 30000;

// Cuanto espera el boton antes de rendirse.
//
// Coincide a proposito con los 15 minutos que usa el backend para dar una
// dosis por perdida y mandar el mail de "no se tomo". Pasado ese rato la placa
// vuelve a consultar en vez de quedarse trabada para siempre.
const unsigned long MS_ESPERANDO_BOTON = 15UL * 60UL * 1000UL;

unsigned long ultimaConsulta = 0;
unsigned long empezoAEsperar = 0;

// Hay una dosis esperando que aprieten el boton
bool esperandoBoton = false;

// UUID del horario que mando el backend, para poder confirmarlo despues
String horarioPendiente = "";

// Cuantas pastillas hay que dispensar en esta dosis
int cantidadPendiente = 1;


//-----------------------------
// Boton por interrupcion
//
// Leerlo con digitalRead() adentro del loop no sirve: solo detecta la apretada
// si el loop justo pasa por ahi mientras el boton esta hundido. Con las
// consultas HTTP de por medio, que tardan cientos de milisegundos, una apretada
// corta se pierde entera.
//
// La rutina solo levanta una bandera. Mover el servo y hablar con el backend se
// hace despues en el loop, que es donde se puede tardar.
//-----------------------------

volatile bool botonApretado = false;
volatile unsigned long ultimoRebote = 0;

// Los contactos mecanicos rebotan al cerrar. Sin esto una sola apretada dispara
// varias veces y dispensaria pastillas de mas.
const unsigned long MS_ANTIRREBOTE = 250;

// IRAM_ATTR es obligatorio en ESP32: la rutina tiene que vivir en RAM porque
// puede dispararse mientras la memoria flash esta ocupada.
void IRAM_ATTR alApretarBoton() {
  unsigned long ahora = millis();
  if (ahora - ultimoRebote < MS_ANTIRREBOTE) return;
  ultimoRebote = ahora;
  botonApretado = true;
}


//-----------------------------
// Hace sonar el buzzer
//-----------------------------

void sonarBuzzer() {
  Serial.println("Buzzer sonando...");

  // Buzzer activo: alcanza con ponerlo en alto, trae el oscilador adentro.
  digitalWrite(BUZZER_PIN, HIGH);
  delay(1000);
  digitalWrite(BUZZER_PIN, LOW);
}


//-----------------------------
// Sensor por interrupcion
//
// El ORDEN es lo que lo hace confiable: el sensor solo cuenta mientras el
// servo esta dispensando una dosis que el backend ofrecio y que alguien
// confirmo con el boton. Fuera de esa ventana, un dedo o una sacudida que
// corte el haz se ignora: no dispensa, no confirma y no borra nada.
//-----------------------------

volatile bool sensorArmado = false;
volatile int pastillasDetectadas = 0;
volatile unsigned long ultimoPulsoSensor = 0;
volatile bool sensorTocadoSinDosis = false;

void IRAM_ATTR alDetectarPastilla() {
  if (!sensorArmado) {
    sensorTocadoSinDosis = true;
    return;
  }
  unsigned long ahora = millis();
  if (ahora - ultimoPulsoSensor < MS_ANTIRREBOTE_SENSOR) return;
  ultimoPulsoSensor = ahora;
  pastillasDetectadas++;
}


//-----------------------------
// Reloj
//
// La hora sale de internet (NTP) apenas hay WiFi; la placa no tiene reloj
// propio con pila. Hasta que llega, la pantalla muestra solo VOITOS.
//-----------------------------

// "HH:MM" si ya se sabe la hora, "" si todavia no.
String horaActual() {
  struct tm t;
  if (!getLocalTime(&t, 0)) return "";
  char texto[6];
  snprintf(texto, sizeof(texto), "%02d:%02d", t.tm_hour, t.tm_min);
  return String(texto);
}


//-----------------------------
// Display: recordatorios y aviso de dosis
//
// El backend manda en cada consulta los recordatorios que tocan AHORA (cada uno
// aparece los minutos antes que eligio el usuario y se va a la hora). La placa
// solo los dibuja: no calcula nada de horarios.
//-----------------------------

const int MAX_RECORDATORIOS = 3;

struct Recordatorio {
  String hora;    // "08:30"
  String texto;   // "Aspirina x2", ya sin acentos (la fuente es ASCII)
  int faltan;     // minutos que faltaban en la ultima consulta
};

Recordatorio recordatorios[MAX_RECORDATORIOS];
int cantRecordatorios = 0;

// Un mensaje suelto, para el arranque.
void mostrarMensaje(const char* texto) {
  if (!hayPantalla) return;
  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);
  pantalla.setTextSize(1);
  pantalla.setCursor(0, 28);
  pantalla.println(texto);
  pantalla.display();
}

void dibujarPantalla() {
  if (!hayPantalla) return;

  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);

  // 1. Hay una dosis esperando el boton: eso tapa todo lo demas.
  if (esperandoBoton) {
    pantalla.setTextSize(2);
    pantalla.setCursor(0, 0);
    pantalla.println("TU DOSIS");

    pantalla.setTextSize(1);
    pantalla.setCursor(0, 26);
    pantalla.print("Sale ");
    pantalla.print(cantidadPendiente);
    pantalla.println(cantidadPendiente == 1 ? " pastilla" : " pastillas");
    pantalla.setCursor(0, 44);
    pantalla.println("Apreta el boton");

  // 2. Recordatorios: hasta 3, dos lineas cada uno.
  } else if (cantRecordatorios > 0) {
    pantalla.setTextSize(1);
    pantalla.setCursor(0, 0);
    pantalla.println("PROXIMO");

    // La hora actual arriba a la derecha (5 caracteres de 6 px).
    String hora = horaActual();
    if (hora != "") {
      pantalla.setCursor(128 - 30, 0);
      pantalla.print(hora);
    }
    pantalla.drawFastHLine(0, 9, 128, SSD1306_WHITE);

    for (int i = 0; i < cantRecordatorios; i++) {
      int y = 12 + i * 17;
      pantalla.setCursor(0, y);
      pantalla.print(recordatorios[i].hora);
      pantalla.print("  en ");
      pantalla.print(recordatorios[i].faltan);
      pantalla.print(" min");

      // 21 caracteres es lo que entra en 128 px con la fuente de 6 px.
      pantalla.setCursor(0, y + 8);
      pantalla.print(recordatorios[i].texto.substring(0, 21));
    }

  // 3. Nada para mostrar: la hora grande y VOITOS abajo.
  } else {
    // Un OLED con la misma imagen fija durante dias se marca (burn-in). Correr
    // el contenido unos pixeles por minuto alcanza para repartir el desgaste.
    int corrimiento = (millis() / 60000) % 6;
    String hora = horaActual();

    if (hora != "") {
      // Tamano 3: 18 px por caracter, "HH:MM" ocupa 90 de los 128.
      pantalla.setTextSize(3);
      pantalla.setCursor(16 + corrimiento, 8 + corrimiento);
      pantalla.print(hora);
      pantalla.setTextSize(1);
      pantalla.setCursor(46 + corrimiento, 44 + corrimiento);
      pantalla.print("VOITOS");
    } else {
      pantalla.setTextSize(2);
      pantalla.setCursor(28 + corrimiento, 20 + corrimiento);
      pantalla.print("VOITOS");
    }
  }

  pantalla.display();
}

// Unos segundos de aviso cuando el sensor no vio caer todas las pastillas.
// La dosis igual se confirma (el servo se movio y el backend guarda las dos
// cuentas); esto es para que la persona mire la bandeja.
void avisarFaltantes(int detectadas, int pedidas) {
  if (!hayPantalla) return;
  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);
  pantalla.setTextSize(2);
  pantalla.setCursor(0, 0);
  pantalla.println("REVISAR");
  pantalla.setTextSize(1);
  pantalla.setCursor(0, 26);
  pantalla.print("Salieron ");
  pantalla.print(detectadas);
  pantalla.print(" de ");
  pantalla.println(pedidas);
  pantalla.setCursor(0, 44);
  pantalla.println("Mira la bandeja");
  pantalla.display();
  delay(5000);
}

// Lee la lista "recordatorios" de la respuesta del backend.
//
// ponytail: si una consulta falla (WiFi caido), queda la lista anterior y su
// "en N min" se congela hasta la proxima consulta buena. Si molesta, descontar
// los minutos con millis() entre consultas.
void leerRecordatorios(JsonArray lista) {
  cantRecordatorios = 0;

  for (JsonObject r : lista) {
    if (cantRecordatorios >= MAX_RECORDATORIOS) break;
    recordatorios[cantRecordatorios].hora = String(r["hora"] | "");
    recordatorios[cantRecordatorios].texto = String(r["texto"] | "");
    recordatorios[cantRecordatorios].faltan = r["faltan_min"] | 0;
    cantRecordatorios++;
  }
}


//-----------------------------
// Mueve el servo una vez (una pastilla)
//-----------------------------

void moverServo() {
  servo.write(180);
  delay(1000);

  servo.write(0);
  delay(1000);
}


//-----------------------------
// Dispensa varias pastillas de una, repitiendo el ciclo del servo
//-----------------------------

int dispensar(int cantidad) {
  if (cantidad < 1) cantidad = 1;
  if (cantidad > MAX_PASTILLAS) cantidad = MAX_PASTILLAS;

  Serial.print("Dispensando ");
  Serial.print(cantidad);
  Serial.println(cantidad == 1 ? " pastilla..." : " pastillas...");

  // Se arma el sensor solo para esta dispensacion. Desde aca hasta
  // MS_ESPERA_CAIDA despues del ultimo servo, cada corte del haz es una
  // pastilla que cayo.
  pastillasDetectadas = 0;
  sensorArmado = HAY_SENSOR;

  for (int i = 1; i <= cantidad; i++) {
    Serial.print("  pastilla ");
    Serial.print(i);
    Serial.print(" de ");
    Serial.println(cantidad);

    moverServo();

    if (i < cantidad) delay(PAUSA_ENTRE_PASTILLAS);
  }

  if (HAY_SENSOR) {
    delay(MS_ESPERA_CAIDA);
    sensorArmado = false;
    Serial.print("El sensor vio caer ");
    Serial.print(pastillasDetectadas);
    Serial.print(" de ");
    Serial.println(cantidad);
  }

  Serial.println("Listo.");
  return cantidad;
}


//-----------------------------
// Cliente HTTPS
//
// setInsecure() no valida el certificado del servidor. Lo correcto seria
// clavar el certificado raiz, pero esos vencen y habria que reflashear la placa
// cada vez que Render rote el suyo. Para este proyecto el riesgo es aceptable:
// lo que viaja no es sensible y la placa solo habla con un backend conocido.
//-----------------------------

bool pedirGet(const String& ruta, String& respuesta) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi.");
    return false;
  }

  WiFiClientSecure cliente;
  cliente.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);

  if (!http.begin(cliente, String(BACKEND) + ruta)) {
    Serial.println("No se pudo iniciar la conexion.");
    return false;
  }

  int codigo = http.GET();

  if (codigo != 200) {
    Serial.print("GET ");
    Serial.print(ruta);
    Serial.print(" respondio ");
    Serial.println(codigo);
    http.end();
    return false;
  }

  respuesta = http.getString();
  http.end();
  return true;
}


//-----------------------------
// Le pregunta al backend si hay una dosis para ahora
//
// Respuesta esperada:
//   { "success": true,
//     "data": { "pendiente": true,
//               "horario": { "id": "...", "cantidad": 2 },
//               "modulo": 1, "disponibles": 26 } }
//-----------------------------

void consultarPendiente() {
  String cuerpo;
  if (!pedirGet("/api/sensor/pendiente", cuerpo)) return;

  // El filtro deja pasar solo lo que se usa, asi el documento ocupa poco.
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, cuerpo);

  if (error) {
    Serial.print("JSON invalido: ");
    Serial.println(error.c_str());
    return;
  }

  JsonObject data = doc["data"];

  // Los recordatorios llegan siempre, haya dosis o no.
  leerRecordatorios(data["recordatorios"]);
  dibujarPantalla();

  if (!data["pendiente"].as<bool>()) return;

  const char* id = data["horario"]["id"];
  int cantidad = data["horario"]["cantidad"] | 1;
  int modulo = data["modulo"] | 0;
  int disponibles = data["disponibles"] | -1;

  if (id == nullptr) {
    Serial.println("Dosis pendiente sin id, se ignora.");
    return;
  }

  Serial.println();
  Serial.println("=== HAY UNA DOSIS PENDIENTE ===");
  Serial.print("  horario: ");
  Serial.println(id);
  Serial.print("  pastillas: ");
  Serial.println(cantidad);
  Serial.print("  modulo: ");
  Serial.println(modulo);
  Serial.print("  quedan en el modulo: ");
  Serial.println(disponibles);

  // No tiene sentido hacer sonar la alarma si el modulo no tiene con que
  // cumplir la dosis: la persona iria hasta el pastillero al pedo.
  if (disponibles >= 0 && disponibles < cantidad) {
    Serial.println("  Stock insuficiente, no se dispensa. Hay que recargar.");
    return;
  }

  horarioPendiente = String(id);
  cantidadPendiente = cantidad;

  sonarBuzzer();

  // Se descarta cualquier apretada previa: si alguien toco el boton cuando no
  // habia nada pendiente, esa bandera no tiene que dispensar esta dosis.
  botonApretado = false;

  esperandoBoton = true;
  empezoAEsperar = millis();
  dibujarPantalla();

  Serial.println("Esperando que se presione el boton...");
}


//-----------------------------
// Le avisa al backend que la pastilla salio
//-----------------------------

bool confirmarDispensacion(int cantidadDispensada) {
  if (horarioPendiente == "") {
    Serial.println("Sin horario_id, no hay nada que confirmar.");
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi, no se puede confirmar.");
    return false;
  }

  WiFiClientSecure cliente;
  cliente.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  http.begin(cliente, String(BACKEND) + "/api/sensor/confirmacion");
  http.addHeader("Content-Type", "application/json");

  // cantidad es lo que REALMENTE se dispenso, que es lo que queda guardado en
  // la tabla dispensaciones.
  String json = String("{\"dispositivo_id\":\"") + DISPOSITIVO_ID
              + "\",\"horario_id\":\"" + horarioPendiente
              + "\",\"bateria\":100"
              + ",\"cantidad\":" + String(cantidadDispensada)
              // Solo con sensor: sin el, el backend guarda null y no 0.
              + (HAY_SENSOR ? ",\"detectadas\":" + String(pastillasDetectadas) : String(""))
              + "}";

  int codigo = http.POST(json);
  String respuesta = http.getString();
  http.end();

  if (codigo == 201) {
    Serial.println("Confirmado! El backend lo registro.");
    return true;
  }

  Serial.print("Fallo la confirmacion. HTTP ");
  Serial.println(codigo);
  Serial.println(respuesta);
  return false;
}


//-----------------------------
// Arranque del display
//
// Prueba primero los pines configurados y despues invertidos: SDA y SCL
// cruzados es el error de cableado mas comun y asi no hace falta recablear.
// En cada orden prueba las dos direcciones en que vienen estos modulos.
//-----------------------------

bool hayDispositivoI2C(uint8_t direccion) {
  Wire.beginTransmission(direccion);
  return Wire.endTransmission() == 0;
}

bool iniciarPantalla() {
  const int pines[2][2] = { { OLED_SDA, OLED_SCL }, { OLED_SCL, OLED_SDA } };
  const uint8_t direcciones[2] = { OLED_DIRECCION, OLED_DIRECCION == 0x3C ? 0x3D : 0x3C };

  for (int i = 0; i < 2; i++) {
    Wire.end();
    Wire.begin(pines[i][0], pines[i][1]);

    for (int j = 0; j < 2; j++) {
      if (!hayDispositivoI2C(direcciones[j])) continue;
      if (!pantalla.begin(SSD1306_SWITCHCAPVCC, direcciones[j])) continue;

      Serial.print("Pantalla encontrada: SDA=");
      Serial.print(pines[i][0]);
      Serial.print(" SCL=");
      Serial.print(pines[i][1]);
      Serial.print(" direccion=0x");
      Serial.println(direcciones[j], HEX);
      if (i == 1) Serial.println("  (los pines estan cruzados respecto de OLED_SDA/OLED_SCL, anda igual)");
      return true;
    }
  }
  return false;
}


//-----------------------------
// Modo prueba: todas las pantallas del display, una por una
//-----------------------------

void mostrarFase(const char* nombre, unsigned long ms) {
  Serial.print("[prueba] ");
  Serial.println(nombre);
  dibujarPantalla();
  delay(ms);
}

void probarPantallas() {
  Serial.println();
  Serial.println("=== MODO PRUEBA: recorriendo las pantallas ===");

  // Esperar unos segundos la hora de internet, para que se vea el reloj.
  for (int i = 0; i < 10 && horaActual() == ""; i++) delay(500);

  mostrarFase("1. reposo: hora y VOITOS", 4000);

  cantRecordatorios = 3;
  recordatorios[0] = { "16:00", "Kinesiologia", 12 };
  recordatorios[1] = { "16:30", "Aspirina x2", 42 };
  recordatorios[2] = { "17:15", "Turno con la doctora", 57 };
  mostrarFase("2. recordatorios (de ejemplo)", 5000);

  cantRecordatorios = 0;
  esperandoBoton = true;
  cantidadPendiente = 2;
  mostrarFase("3. dosis esperando el boton", 4000);
  esperandoBoton = false;
  cantidadPendiente = 1;

  Serial.println("[prueba] 4. el sensor vio menos de las pedidas");
  avisarFaltantes(1, 2);

  Serial.println("=== FIN DE LA PRUEBA: ahora funciona en vivo con la app ===");
  Serial.println("Agenda una dosis o una actividad con recordatorio y espera.");
  Serial.println("Cuando aparezca TU DOSIS, apreta el boton BOOT de la placa.");
  Serial.println();
  dibujarPantalla();
}


//-----------------------------
// SETUP
//-----------------------------

void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println();
  Serial.println("=================================");
  Serial.println("  VOITOS - modo polling");
  Serial.println("=================================");

  // Servo
  //
  // Los cuatro timers se asignan antes del attach. En algunos cores de ESP32,
  // sin esto el servo no se mueve y no avisa nada: parece un servo muerto
  // cuando en realidad es software.
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servo.setPeriodHertz(50);

  // Rango de pulsos explicito: con los valores por defecto muchos SG90 y MG90S
  // no llegan a los extremos y parece que estuvieran trabados.
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(0);

  // Display. Si no aparece, se sigue sin pantalla.
  hayPantalla = iniciarPantalla();
  if (hayPantalla) {
    mostrarMensaje("Conectando WiFi...");
  } else {
    Serial.println("No se encontro la pantalla OLED. Sigue sin display.");
  }

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Boton. INPUT_PULLUP: el pin queda en alto y baja a LOW cuando el pulsador
  // lo conecta a GND, por eso la interrupcion escucha el flanco de bajada.
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), alApretarBoton, FALLING);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Backend: ");
  Serial.println(BACKEND);

  // Sin ahorro de energia: con el activado la CPU se apaga entre balizas, el
  // loop deja de correr y se pierden las apretadas del boton.
  WiFi.setSleep(false);

  // Hora argentina (UTC-3, sin horario de verano) desde internet. Llega en
  // unos segundos y se mantiene sola.
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");

  // Sensor
  if (HAY_SENSOR) {
    pinMode(SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), alDetectarPastilla, SENSOR_FLANCO);
  }

  Serial.print("Consultando cada ");
  Serial.print(MS_ENTRE_CONSULTAS / 1000);
  Serial.println(" segundos.");
  Serial.println();

  if (MODO_PRUEBA) probarPantallas();

  // La primera consulta sale enseguida, sin esperar el intervalo completo.
  ultimaConsulta = millis() - MS_ENTRE_CONSULTAS;
}


//-----------------------------
// LOOP
//-----------------------------

// Para redibujar el reloj cuando cambia el minuto.
String ultimaHoraDibujada = "";

void loop() {
  // Un corte del sensor sin dosis en curso: se deja constancia y nada mas.
  if (sensorTocadoSinDosis) {
    sensorTocadoSinDosis = false;
    Serial.println("Sensor activado sin dispensacion en curso: se ignora.");
  }

  // El reloj de la pantalla avanza aunque no haya consultas nuevas.
  String hora = horaActual();
  if (hora != ultimaHoraDibujada) {
    ultimaHoraDibujada = hora;
    dibujarPantalla();
  }

  // Si se cayo el WiFi, reconectar. La placa puede quedar dias encendida.
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi caido, reconectando...");
    WiFi.reconnect();
    delay(3000);
    return;
  }

  // 1. La apretada del boton tiene prioridad sobre todo lo demas
  if (esperandoBoton && botonApretado) {
    botonApretado = false;

    Serial.println("Boton presionado!");

    int dispensadas = dispensar(cantidadPendiente);
    confirmarDispensacion(dispensadas);

    if (HAY_SENSOR && pastillasDetectadas < dispensadas) {
      avisarFaltantes(pastillasDetectadas, dispensadas);
    }

    esperandoBoton = false;
    horarioPendiente = "";
    cantidadPendiente = 1;

    // Dispensar tarda varios segundos. Si el boton reboto o alguien lo volvio a
    // tocar en el medio, esa bandera quedaria levantada y dispararia una
    // dispensacion fantasma en la proxima dosis.
    botonApretado = false;

    Serial.println("Listo para la proxima dosis.");
    Serial.println();
    dibujarPantalla();
    return;
  }

  // 2. Si nadie aprieta, no esperar para siempre
  if (esperandoBoton && millis() - empezoAEsperar > MS_ESPERANDO_BOTON) {
    Serial.println("Pasaron 15 minutos sin que se apriete el boton.");
    Serial.println("La dosis queda sin dispensar. El backend ya aviso por mail.");
    Serial.println();

    esperandoBoton = false;
    horarioPendiente = "";
    cantidadPendiente = 1;
    botonApretado = false;
    dibujarPantalla();
    return;
  }

  // 3. Mientras hay una dosis esperando no se consulta: ya sabemos que hacer,
  //    y volver a preguntar solo repetiria la misma respuesta.
  if (esperandoBoton) return;

  if (millis() - ultimaConsulta >= MS_ENTRE_CONSULTAS) {
    ultimaConsulta = millis();
    consultarPendiente();
  }
}
