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
// REQUIERE la libreria ArduinoJson. Se instala del Library Manager del IDE:
// Herramientas > Administrar bibliotecas > buscar "ArduinoJson" > Instalar.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

const char* ssid = "PONER_LA_RED";
const char* password = "PONER_LA_CLAVE";

// El backend ahora vive en internet, asi que esto ya NO cambia con la red.
// Se configura una sola vez y sirve en cualquier lado.
const char* BACKEND = "https://voitos-backend.onrender.com";

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
const int BUTTON_PIN = 21;

// Tiene que coincidir con el dispositivo_id de la tabla modulos
const char* DISPOSITIVO_ID = "ESP32-001";

// Tope de seguridad: por mas que el backend pida mas, no dispensa de mas.
const int MAX_PASTILLAS = 20;

// Cuanto espera entre pastilla y pastilla
const int PAUSA_ENTRE_PASTILLAS = 500;

// Cada cuanto le pregunta al backend si hay algo que dispensar.
//
// El backend busca dosis en una ventana de 5 minutos alrededor de la hora, asi
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

  for (int i = 1; i <= cantidad; i++) {
    Serial.print("  pastilla ");
    Serial.print(i);
    Serial.print(" de ");
    Serial.println(cantidad);

    moverServo();

    if (i < cantidad) delay(PAUSA_ENTRE_PASTILLAS);
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
              + ",\"cantidad\":" + String(cantidadDispensada) + "}";

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

  Serial.print("Consultando cada ");
  Serial.print(MS_ENTRE_CONSULTAS / 1000);
  Serial.println(" segundos.");
  Serial.println();

  // La primera consulta sale enseguida, sin esperar el intervalo completo.
  ultimaConsulta = millis() - MS_ENTRE_CONSULTAS;
}


//-----------------------------
// LOOP
//-----------------------------

void loop() {
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

    esperandoBoton = false;
    horarioPendiente = "";
    cantidadPendiente = 1;

    // Dispensar tarda varios segundos. Si el boton reboto o alguien lo volvio a
    // tocar en el medio, esa bandera quedaria levantada y dispararia una
    // dispensacion fantasma en la proxima dosis.
    botonApretado = false;

    Serial.println("Listo para la proxima dosis.");
    Serial.println();
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
