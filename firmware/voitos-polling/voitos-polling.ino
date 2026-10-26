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


#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

// EL WIFI YA NO VA EN EL CODIGO
//
// La primera vez que prende (o si no puede conectarse) la placa abre su propia
// red, "VOITOS-XXXX". El cuidador se conecta desde el celular, se le abre una
// pagina, elige el WiFi de la casa y pone la clave. La placa lo guarda en su
// memoria y de ahi en adelante se conecta sola, aunque se corte la luz.
//
// Para cambiar de red: mantener apretado el boton de dispensar mientras se
// enchufa (3 segundos). Borra la red guardada y vuelve a abrir VOITOS-XXXX.
//
// credenciales.h ya no hace falta. Si esta (placa de desarrollo), se usa solo
// cuando no hay ninguna red guardada.
#if __has_include("credenciales.h")
#include "credenciales.h"
#define HAY_CREDENCIALES_H 1
#else
#define HAY_CREDENCIALES_H 0
#endif

// La memoria que sobrevive a los reinicios: la red, su clave y el secreto.
Preferences memoria;

// Lo inventa la placa la primera vez que arranca y lo manda en cada consulta.
// El backend solo le da el codigo para vincularla a quien manda este secreto:
// sin eso, cualquiera que sepa el DISPOSITIVO_ID (esta en el repositorio)
// podria pedir el codigo y quedarse con el pastillero.
String secreto;

// Mientras el pastillero no tiene duenio, el backend manda un codigo de 8
// digitos. Se muestra abajo de la hora para que el cuidador lo cargue en la
// app, desde donde este. Vacio = ya esta vinculado.
String codigoVinculo = "";

// Modo prueba: en el arranque muestra todas las pantallas del display una por
// una, y usa el boton BOOT de la placa como boton de dispensar (asi se prueba
// sin tener el pulsador cableado). No se toca aca: se prende al compilar con
//   --build-property compiler.cpp.extra_flags=-DMODO_PRUEBA=1
#ifndef MODO_PRUEBA
#define MODO_PRUEBA 0
#endif

// El backend ahora vive en internet, asi que esto ya NO cambia con la red.
// Se configura una sola vez y sirve en cualquier lado.
const char* BACKEND = "https://voitos-backend.onrender.com";

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
// En modo prueba, el BOOT de la DevKit (GPIO 0).
const int BUTTON_PIN = MODO_PRUEBA ? 0 : 32;


const int OLED_SDA = 21;
const int OLED_SCL = 22;
const uint8_t OLED_DIRECCION = 0x3C;

Adafruit_SSD1306 pantalla(128, 64, &Wire, -1);

// Si la pantalla no esta conectada el pastillero tiene que seguir andando
// igual: dispensar es lo importante, el display es un extra.
bool hayPantalla = false;

// Sensor 
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

// Tope de seguridad
const int MAX_PASTILLAS = 20;
const int PAUSA_ENTRE_PASTILLAS = 500;

// Cada cuanto le pregunta al backend si hay algo que dispensar = 30 segundos
const unsigned long MS_ENTRE_CONSULTAS = 30000;

// Cuanto espera el boton antes de rendirse.
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
void IRAM_ATTR alApretarBoton() {
  unsigned long ahora = millis();
  if (ahora - ultimoRebote < MS_ANTIRREBOTE) return;
  ultimoRebote = ahora;
  botonApretado = true;
}


// Hace sonar el buzzer

void sonarBuzzer() {
  Serial.println("Buzzer sonando...");

  digitalWrite(BUZZER_PIN, HIGH);
  delay(1000);
  digitalWrite(BUZZER_PIN, LOW);
}

// Sensor por interrupcion

// El ORDEN es lo que lo hace confiable: el sensor solo cuenta mientras el
// servo esta dispensando una dosis que el backend ofrecio y que alguien
// confirmo con el boton. Fuera de esa ventana, un dedo o una sacudida que
// corte el haz se ignora: no dispensa, no confirma y no borra nada.
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


// Reloj
// La hora sale de internet (NTP)
String horaActual() {
  struct tm t;
  if (!getLocalTime(&t, 0)) return "";
  char texto[6];
  snprintf(texto, sizeof(texto), "%02d:%02d", t.tm_hour, t.tm_min);
  return String(texto);
}



// Display:
// El backend manda en cada consulta los recordatorios que tocan AHORA (cada uno
// aparece los minutos antes que eligio el usuario y se va a la hora). La placa
// solo los dibuja: no calcula nada de horarios.
const int MAX_RECORDATORIOS = 3;

struct Recordatorio {
  String id;      // para recordar si ya se marco como visto
  String hora;    // "08:30"
  String texto;   // "Aspirina x2", ya sin acentos (la fuente es ASCII)
  int faltan;     // minutos que faltaban en la ultima consulta
};

Recordatorio recordatorios[MAX_RECORDATORIOS];
int cantRecordatorios = 0;

// Los que la persona ya marco como vistos con el boton, por id, para que la
// proxima consulta no los vuelva a mostrar. Circular: cuando se llena pisa el
// mas viejo, que para entonces ya paso.
const int MAX_VISTOS = 10;
String vistos[MAX_VISTOS];
int proximoVisto = 0;

bool fueVisto(const String& id) {
  for (int i = 0; i < MAX_VISTOS; i++) {
    if (vistos[i] == id) return true;
  }
  return false;
}

void marcarVisto(const String& id) {
  vistos[proximoVisto] = id;
  proximoVisto = (proximoVisto + 1) % MAX_VISTOS;
}

// Rotacion: se muestran de a uno, con letra grande, y van pasando en loop.
int indiceRecordatorio = 0;
unsigned long inicioRecordatorio = 0;

// Texto grande que corre como una marquesina cuando no entra.
const int ANCHO = 128;
const int PX_POR_SEGUNDO = 45;
const unsigned long MS_POR_CUADRO = 50;

int anchoTexto(const String& t, int tam) {
  return t.length() * 6 * tam;
}

// Antes de empezar a correr, el texto se queda quieto este rato con el
// principio a la vista, para que se alcance a leer la primera palabra.
const unsigned long MS_PAUSA_MARQUESINA = 1200;
void textoGrande(const String& t, int tam, int y, unsigned long desde) {
  pantalla.setTextSize(tam);
  int ancho = anchoTexto(t, tam);

  if (ancho <= ANCHO) {
    pantalla.setCursor((ANCHO - ancho) / 2, y);
    pantalla.print(t);
    return;
  }

  unsigned long pasado = millis() - desde;
  unsigned long avance = pasado > MS_PAUSA_MARQUESINA
      ? (pasado - MS_PAUSA_MARQUESINA) * PX_POR_SEGUNDO / 1000
      : 0;
  unsigned long recorrido = ancho + ANCHO;
  pantalla.setCursor(ANCHO - (int)((avance + ANCHO) % recorrido), y);
  pantalla.print(t);
}

unsigned long duracionDe(const String& t, int tam) {
  int ancho = anchoTexto(t, tam);
  if (ancho <= ANCHO) return 4000;
  // La pausa inicial y hasta que la ultima letra sale por la izquierda.
  return MS_PAUSA_MARQUESINA + (unsigned long)ancho * 1000 / PX_POR_SEGUNDO;
}

void avanzarRotacion() {
  if (cantRecordatorios == 0) return;
  if (indiceRecordatorio >= cantRecordatorios) {
    indiceRecordatorio = 0;
    inicioRecordatorio = millis();
  }
  if (millis() - inicioRecordatorio >= duracionDe(recordatorios[indiceRecordatorio].texto, 3)) {
    indiceRecordatorio = (indiceRecordatorio + 1) % cantRecordatorios;
    inicioRecordatorio = millis();
  }
}

// Un mensaje suelto, para el arranque.
void mostrarMensaje(const char* texto) {
  if (!hayPantalla) return;
  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);
  pantalla.setTextWrap(false);
  textoGrande(String(texto), 2, 24, millis());
  pantalla.display();
}

void dibujarPantalla() {
  if (!hayPantalla) return;

  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);
  pantalla.setTextWrap(false);

  if (esperandoBoton) {
    textoGrande("TU DOSIS", 2, 4, 0);
    String pedido = String("APRETA EL BOTON - SALE") + (cantidadPendiente == 1 ? " " : "N ")
                  + cantidadPendiente + (cantidadPendiente == 1 ? " PASTILLA" : " PASTILLAS");
    textoGrande(pedido, 3, 32, empezoAEsperar);

  } else if (cantRecordatorios > 0) {
    Recordatorio& r = recordatorios[indiceRecordatorio < cantRecordatorios ? indiceRecordatorio : 0];

    pantalla.setTextSize(2);
    pantalla.setCursor(0, 0);
    pantalla.print(r.hora);
    if (cantRecordatorios > 1) {
      pantalla.setTextSize(1);
      pantalla.setCursor(ANCHO - 18, 4);
      pantalla.print(indiceRecordatorio + 1);
      pantalla.print("/");
      pantalla.print(cantRecordatorios);
    }
    textoGrande(r.texto, 3, 20, inicioRecordatorio);
    pantalla.setTextSize(1);
    pantalla.setCursor(0, 54);
    if ((millis() / 3000) % 2 == 0) {
      pantalla.print("Faltan ");
      pantalla.print(r.faltan);
      pantalla.print(" min");
    } else {
      pantalla.print("Boton = ya lo vi");
    }
  } else {
    int corrimiento = (millis() / 60000) % 5;
    String hora = horaActual();

    if (hora != "") {
      pantalla.setTextSize(4);
      pantalla.setCursor(2 + corrimiento, 4 + corrimiento);
      pantalla.print(hora);
      if (codigoVinculo != "") {
        // "1234 5678" a tamano 2 ocupa 108 de los 128 px.
        pantalla.setTextSize(2);
        pantalla.setCursor(8 + corrimiento, 44 + corrimiento);
        pantalla.print(codigoVinculo.substring(0, 4) + " " + codigoVinculo.substring(4));
      } else {
        pantalla.setTextSize(1);
        pantalla.setCursor(46 + corrimiento, 46 + corrimiento);
        pantalla.print("VOITOS");
      }
    } else if (codigoVinculo != "") {
      pantalla.setTextSize(2);
      pantalla.setCursor(28 + corrimiento, 8 + corrimiento);
      pantalla.print("CODIGO");
      pantalla.setCursor(8 + corrimiento, 36 + corrimiento);
      pantalla.print(codigoVinculo.substring(0, 4) + " " + codigoVinculo.substring(4));
    } else {
      pantalla.setTextSize(3);
      pantalla.setCursor(10 + corrimiento, 20 + corrimiento);
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
  unsigned long desde = millis();
  String detalle = String("SALIERON ") + detectadas + " DE " + pedidas + " - MIRA LA BANDEJA";

  while (millis() - desde < 6000) {
    pantalla.clearDisplay();
    pantalla.setTextColor(SSD1306_WHITE);
    pantalla.setTextWrap(false);
    textoGrande("REVISAR", 3, 2, desde);
    textoGrande(detalle, 2, 40, desde);
    pantalla.display();
    delay(MS_POR_CUADRO);
  }
}

// Lee la lista "recordatorios" de la respuesta del backend, salteando los que
// ya se marcaron como vistos.
//
// ponytail: si una consulta falla (WiFi caido), queda la lista anterior y su
// "faltan N min" se congela hasta la proxima consulta buena. Si molesta,
// descontar los minutos con millis() entre consultas.
void leerRecordatorios(JsonArray lista) {
  cantRecordatorios = 0;

  for (JsonObject r : lista) {
    if (cantRecordatorios >= MAX_RECORDATORIOS) break;
    String id = String(r["id"] | "");
    if (id != "" && fueVisto(id)) continue;
    recordatorios[cantRecordatorios].id = id;
    recordatorios[cantRecordatorios].hora = String(r["hora"] | "");
    recordatorios[cantRecordatorios].texto = String(r["texto"] | "");
    recordatorios[cantRecordatorios].faltan = r["faltan_min"] | 0;
    cantRecordatorios++;
  }
}


// Mueve el servo una vez (una pastilla)
void moverServo() {
  servo.write(180);
  delay(1000);

  servo.write(0);
  delay(1000);
}


// Dispensa varias pastillas de a una, repitiendo el ciclo del servo

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


// Cliente HTTPS
//
// setInsecure() no valida el certificado del servidor. Lo correcto seria
// clavar el certificado raiz, pero esos vencen y habria que reflashear la placa
// cada vez que Render rote el suyo. Para este proyecto el riesgo es aceptable:
// lo que viaja no es sensible y la placa solo habla con un backend conocido.

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

  // En un header y no en la URL, para que no quede en los logs del servidor.
  http.addHeader("X-Pastillero-Secreto", secreto);

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



// Le pregunta al backend si hay una dosis para ahora
//
// Respuesta esperada:
//   { "success": true,
//     "data": { "pendiente": true,
//               "horario": { "id": "...", "cantidad": 2 },
//               "modulo": 1, "disponibles": 26 } }

void consultarPendiente() {
  String cuerpo;
  // dispositivo_id: el backend manda solo lo del duenio de ESTE pastillero.
  if (!pedirGet(String("/api/sensor/pendiente?dispositivo_id=") + DISPOSITIVO_ID, cuerpo)) return;

  // El filtro deja pasar solo lo que se usa, asi el documento ocupa poco.
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, cuerpo);

  if (error) {
    Serial.print("JSON invalido: ");
    Serial.println(error.c_str());
    return;
  }

  JsonObject data = doc["data"];

  // Sin duenio llega el codigo para vincularlo; ya vinculado, no viene nada.
  String codigo = data["vinculo"]["codigo"] | "";
  if (codigo != codigoVinculo) {
    codigoVinculo = codigo;
    Serial.println(codigo != "" ? "Codigo para vincular en la app: " + codigo
                                : String("Pastillero vinculado a una cuenta."));
  }

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



// Le avisa al backend que la pastilla salio

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



// Arranque del display
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

      // 400 kHz: a 100 kHz cada cuadro tarda unos 100 ms y el texto que corre
      // se ve a los saltos.
      Wire.setClock(400000);

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


// Modo prueba: todas las pantallas del display, una por una
void mostrarFase(const char* nombre, unsigned long ms) {
  Serial.print("[prueba] ");
  Serial.println(nombre);
  unsigned long desde = millis();
  while (millis() - desde < ms) {
    avanzarRotacion();
    dibujarPantalla();
    delay(MS_POR_CUADRO);
  }
}

void probarPantallas() {
  Serial.println();
  Serial.println("=== MODO PRUEBA: recorriendo las pantallas ===");

  // Esperar unos segundos la hora de internet, para que se vea el reloj.
  for (int i = 0; i < 10 && horaActual() == ""; i++) delay(500);

  mostrarFase("1. reposo: hora y VOITOS", 4000);

  cantRecordatorios = 3;
  recordatorios[0] = { "demo-1", "16:00", "Kinesiologia", 12 };
  recordatorios[1] = { "demo-2", "16:30", "Aspirina x2", 42 };
  recordatorios[2] = { "demo-3", "17:15", "Turno con la doctora", 57 };
  indiceRecordatorio = 0;
  inicioRecordatorio = millis();
  mostrarFase("2. recordatorios de ejemplo, de a uno y en loop", 20000);

  cantRecordatorios = 0;
  esperandoBoton = true;
  empezoAEsperar = millis();
  cantidadPendiente = 2;
  mostrarFase("3. dosis esperando el boton", 9000);
  esperandoBoton = false;
  cantidadPendiente = 1;

  Serial.println("[prueba] 4. el sensor vio menos de las pedidas");
  avisarFaltantes(1, 2);

  Serial.println("=== FIN DE LA PRUEBA: ahora funciona en vivo con la app ===");
  Serial.println("Agenda una dosis o una actividad con recordatorio y espera.");
  Serial.println("Con un recordatorio en pantalla, BOOT lo marca como visto.");
  Serial.println("Cuando aparezca TU DOSIS, apreta el boton BOOT de la placa.");
  Serial.println();
  dibujarPantalla();
}


// WiFi: la red propia para configurarlo y la conexion con la red guardada

// Cuanto espera a que conecte la red guardada antes de abrir VOITOS-XXXX.
const unsigned long MS_INTENTO_WIFI = 30000;

// Si HAY una red guardada y no conecta (se corto la luz y el router tarda en
// volver, por ejemplo), la red propia queda abierta este rato y despues la
// placa se reinicia y vuelve a probar. Sin esto, un corte del router dejaria
// el pastillero esperando una configuracion que nadie va a hacer.
const unsigned long MS_PORTAL_CON_RED_GUARDADA = 5UL * 60UL * 1000UL;

// "VOITOS-" y los ultimos 4 hex de la MAC, para distinguir dos pastilleros.
String nombreRedPropia() {
  char n[16];
  snprintf(n, sizeof n, "VOITOS-%04X", (uint16_t)(ESP.getEfuseMac() >> 32));
  return String(n);
}

// Los nombres de las redes los elige cualquier vecino: no pueden meter HTML.
String escaparHtml(const String& t) {
  String r;
  for (char c : t) {
    if (c == '<') r += "&lt;";
    else if (c == '>') r += "&gt;";
    else if (c == '&') r += "&amp;";
    else if (c == '"') r += "&quot;";
    else r += c;
  }
  return r;
}

String paginaPortal(const String& cuerpo) {
  return String("<!doctype html><meta charset=utf-8>"
                "<meta name=viewport content='width=device-width,initial-scale=1'>"
                "<title>Voitos</title><style>"
                "body{font-family:sans-serif;max-width:420px;margin:24px auto;padding:0 16px;font-size:18px;color:#111}"
                "input,button{display:block;width:100%;font-size:18px;padding:12px;margin:6px 0 18px;box-sizing:border-box}"
                "button{background:#005829;color:#fff;border:0;border-radius:8px}"
                ".aviso{background:#fde8e8;padding:12px;border-radius:8px}"
                "</style><h1>Voitos</h1>") + cuerpo;
}

// Abre VOITOS-XXXX con una pagina para elegir el WiFi. No vuelve: cuando se
// guarda una red (o se acaba el tiempo) reinicia la placa.
void abrirPortal(const String& aviso) {
  String red = nombreRedPropia();
  Serial.print("Abriendo la red propia ");
  Serial.println(red);

  // Primero se buscan las redes de alrededor, para ofrecerlas en la lista.
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP_STA);
  int encontradas = WiFi.scanNetworks();
  String opciones;
  for (int i = 0; i < encontradas; i++) {
    opciones += "<option value=\"" + escaparHtml(WiFi.SSID(i)) + "\">";
  }

  // Abierta, sin clave: la usa una sola vez alguien que esta al lado del
  // aparato, y una clave mas para tipear es justo lo que traba a quien lo
  // configura. Lo que viaja (la clave de la casa) va solo del celular a la placa.
  WiFi.softAP(red.c_str());
  IPAddress ip = WiFi.softAPIP();

  // Todo nombre de dominio apunta a la placa: asi el celular detecta que la
  // red "pide iniciar sesion" y abre la pagina solo, sin tipear ninguna IP.
  DNSServer dns;
  dns.start(53, "*", ip);

  WebServer web(80);
  bool guardado = false;
  bool habiaRed = memoria.isKey("red");

  web.on("/", HTTP_GET, [&]() {
    String avisoHtml = aviso != "" ? "<p class=aviso>" + escaparHtml(aviso) + "</p>" : "";
    web.send(200, "text/html", paginaPortal(
      avisoHtml +
      "<p>Elegí el WiFi de la casa para que el pastillero se conecte solo.</p>"
      "<form method=post action=/guardar>"
      "<label>Red WiFi<input name=red list=redes required maxlength=32 autocomplete=off></label>"
      "<datalist id=redes>" + opciones + "</datalist>"
      "<label>Clave<input name=clave type=password maxlength=64></label>"
      "<button>Conectar</button></form>"));
  });

  web.on("/guardar", HTTP_POST, [&]() {
    String nueva = web.arg("red");
    String clave = web.arg("clave");
    nueva.trim();
    if (nueva.length() == 0 || nueva.length() > 32 || clave.length() > 64) {
      web.send(400, "text/html", paginaPortal("<p class=aviso>Falta el nombre de la red.</p><p><a href=/>Volver</a></p>"));
      return;
    }
    memoria.putString("red", nueva);
    memoria.putString("clave", clave);
    web.send(200, "text/html", paginaPortal(
      "<p>Listo. El pastillero se reinicia y se conecta a <b>" + escaparHtml(nueva) + "</b>.</p>"
      "<p>Cuando se conecte, la pantalla muestra un <b>código de 8 números</b> abajo de la hora. "
      "Cargalo en la app, en <b>Mi pastillero</b>, desde donde estés.</p>"
      "<p>Si en un minuto vuelve a aparecer la red " + red + ", la clave estaba mal: "
      "conectate de nuevo y probá otra vez.</p>"));
    guardado = true;
  });

  // Cualquier otra direccion (las que usan los celulares para detectar el
  // portal) se manda a la pagina.
  web.onNotFound([&]() {
    web.sendHeader("Location", "http://" + ip.toString() + "/", true);
    web.send(302, "text/plain", "");
  });

  web.begin();

  unsigned long desde = millis();
  unsigned long ultimoCuadroPortal = 0;
  String instruccion = String(aviso != "" ? "NO SE PUDO CONECTAR - " : "")
                     + "CONECTATE CON EL CELULAR A LA RED " + red;

  while (!guardado && (!habiaRed || millis() - desde < MS_PORTAL_CON_RED_GUARDADA)) {
    dns.processNextRequest();
    web.handleClient();

    if (hayPantalla && millis() - ultimoCuadroPortal >= MS_POR_CUADRO) {
      ultimoCuadroPortal = millis();
      pantalla.clearDisplay();
      pantalla.setTextColor(SSD1306_WHITE);
      pantalla.setTextWrap(false);
      textoGrande("SIN WIFI", 2, 4, 0);
      textoGrande(instruccion, 3, 32, desde);
      pantalla.display();
    }
    delay(2);
  }

  // Un momento para que la pagina de "listo" llegue al celular.
  delay(1500);
  ESP.restart();
}

// "CONECTANDO", el nombre de la red (corre si es largo) y una barra que se
// llena hasta que se cumplen los MS_INTENTO_WIFI.
void dibujarConectando(const String& red, unsigned long desde) {
  if (!hayPantalla) return;
  pantalla.clearDisplay();
  pantalla.setTextColor(SSD1306_WHITE);
  pantalla.setTextWrap(false);
  textoGrande("CONECTANDO", 2, 2, 0);
  textoGrande(red, 3, 24, desde);
  unsigned long pasado = millis() - desde;
  int lleno = pasado >= MS_INTENTO_WIFI ? ANCHO : (int)(pasado * ANCHO / MS_INTENTO_WIFI);
  pantalla.drawRect(0, 56, ANCHO, 8, SSD1306_WHITE);
  pantalla.fillRect(0, 56, lleno, 8, SSD1306_WHITE);
  pantalla.display();
}

// Se conecta a la red guardada. Si no hay ninguna, o no conecta, abre la red
// propia (y esa no vuelve: reinicia la placa).
// Por que se corto el ultimo intento. Lo llena el evento de desconexion del
// WiFi; WiFi.status() solo dice "desconectado" y no alcanza para saber si fue
// la clave o que la red no esta.
volatile uint8_t motivoDesconexion = 0;

String explicarFalla(const String& red) {
  switch (motivoDesconexion) {
    case 201:  // NO_AP_FOUND
      return "No se encuentra la red " + red + ". Si es de 5 GHz el pastillero no la ve: elegí una de 2.4 GHz, o acercalo al router.";
    case 2: case 15: case 202: case 204:  // AUTH_EXPIRE, 4WAY_HANDSHAKE_TIMEOUT, AUTH_FAIL, HANDSHAKE_TIMEOUT
      return "La red " + red + " rechazó la clave. Revisala (mayúsculas y minúsculas cuentan).";
    case 0:
      return "La red " + red + " no respondió a tiempo. Probá de nuevo.";
    default:
      return "No se pudo conectar a " + red + " (motivo " + String(motivoDesconexion) + "). Revisá la clave, o elegí otra red.";
  }
}

void conectarWifi() {
  String red = memoria.getString("red", "");
  String clave = memoria.getString("clave", "");

#if HAY_CREDENCIALES_H
  if (red == "") {
    red = ssid;
    clave = password;
  }
#endif

  if (red == "") abrirPortal("");

  WiFi.onEvent([](WiFiEvent_t, WiFiEventInfo_t info) {
    motivoDesconexion = info.wifi_sta_disconnected.reason;
  }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);

  WiFi.mode(WIFI_STA);
  WiFi.begin(red.c_str(), clave.c_str());
  Serial.print("Conectando a ");
  Serial.print(red);

  // Mientras intenta, la pantalla dice a que red y cuanto falta para
  // rendirse, en vez de quedar quieta: un aparato que no cambia parece colgado.
  unsigned long desde = millis();
  unsigned long ultimoPunto = 0;
  while (WiFi.status() != WL_CONNECTED && millis() - desde < MS_INTENTO_WIFI) {
    dibujarConectando(red, desde);
    if (millis() - ultimoPunto >= 500) {
      ultimoPunto = millis();
      Serial.print(".");
    }
    delay(MS_POR_CUADRO);
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    String motivo = explicarFalla(red);
    Serial.println(motivo);
    abrirPortal(motivo);
  }
}

// Mantener apretado el boton al prender: 3 segundos borran la red guardada.
bool botonSostenidoAlPrender() {
  unsigned long desde = millis();
  while (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - desde > 3000) return true;
    delay(10);
  }
  return false;
}


// SETUP
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

  // Boton. Queda en alto y baja a LOW cuando el pulsador lo conecta a GND,
  // por eso la interrupcion escucha el flanco de bajada.
  //
  // Va en el 32 y no en el 35: el 35 no tiene pull-up interno, y sin una
  // resistencia externa flotaba, leia apretadas fantasma y al arrancar
  // "sostenia" el boton y borraba el WiFi recien guardado.
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  memoria.begin("voitos", false);

  // El secreto de la placa, una sola vez en su vida (ver arriba).
  secreto = memoria.getString("secreto", "");
  if (secreto == "") {
    char hex[33];
    snprintf(hex, sizeof hex, "%08lx%08lx%08lx%08lx",
             (unsigned long)esp_random(), (unsigned long)esp_random(),
             (unsigned long)esp_random(), (unsigned long)esp_random());
    secreto = hex;
    memoria.putString("secreto", secreto);
  }

  // WiFi
  if (botonSostenidoAlPrender()) {
    memoria.remove("red");
    memoria.remove("clave");
    Serial.println("Boton sostenido al prender: se borro la red guardada.");
    abrirPortal("");
  }
  conectarWifi();

  // Recien ahora: si la interrupcion estuviera antes, sostener el boton para
  // borrar la red dejaria una apretada guardada.
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), alApretarBoton, FALLING);

  Serial.println("Conectado!");
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


// LOOP

// Para redibujar el reloj cuando cambia el minuto.
String ultimaHoraDibujada = "";
unsigned long ultimoCuadro = 0;

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

  // El texto que corre y la rotacion de recordatorios necesitan redibujar
  // seguido. En reposo (solo la hora) no hace falta.
  if ((esperandoBoton || cantRecordatorios > 0) && millis() - ultimoCuadro >= MS_POR_CUADRO) {
    ultimoCuadro = millis();
    avanzarRotacion();
    dibujarPantalla();
  }

  // Boton sin dosis esperando: "ya lo vi". Marca como vistos los
  // recordatorios de la pantalla y vuelve a la hora. Si no habia ninguno, la
  // apretada se descarta (no puede quedar guardada para una dosis futura).
  if (!esperandoBoton && botonApretado) {
    botonApretado = false;
    if (cantRecordatorios > 0) {
      for (int i = 0; i < cantRecordatorios; i++) marcarVisto(recordatorios[i].id);
      cantRecordatorios = 0;
      Serial.println("Recordatorios marcados como vistos.");
      dibujarPantalla();
    }
  }

  // Si se cayo el WiFi, reconectar. La placa puede quedar dias encendida.
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi caido, reconectando...");
    if (!esperandoBoton && hayPantalla) {
      pantalla.clearDisplay();
      pantalla.setTextColor(SSD1306_WHITE);
      pantalla.setTextWrap(false);
      textoGrande("SIN WIFI", 2, 8, 0);
      // "RECONECTANDO" no entra quieto a tamano 2 y esto se dibuja una sola vez.
      textoGrande("ESPERANDO", 2, 36, 0);
      pantalla.display();
    }
    WiFi.reconnect();
    delay(3000);
    if (WiFi.status() == WL_CONNECTED) dibujarPantalla();
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
