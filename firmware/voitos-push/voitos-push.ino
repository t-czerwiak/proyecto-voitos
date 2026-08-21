#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

const char* ssid = "PONER_LA_RED";
const char* password = "PONER_LA_CLAVE";

WebServer server(80);

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
const int BUTTON_PIN = 21;

// IP de la computadora donde corre el backend, en la misma red WiFi.
// OJO: cambia cada vez que la compu se conecta a otra red.
// Se mira con ipconfig y hay que volver a subir el sketch.
const char* BACKEND_IP = "PONER_LA_IP_DE_LA_COMPU";
const int BACKEND_PORT = 3000;

// Tiene que coincidir con el dispositivo_id de la tabla modulos
const char* DISPOSITIVO_ID = "ESP32-001";

// Tope de seguridad: por mas que el backend pida mas, no dispensa de mas.
const int MAX_PASTILLAS = 20;

// Cuanto espera entre pastilla y pastilla
const int PAUSA_ENTRE_PASTILLAS = 500;

// Indica si hay una pastilla esperando ser dispensada
bool esperandoBoton = false;

// UUID del horario que mando el backend, para poder confirmarlo despues
String horarioPendiente = "";

// Cuantas pastillas hay que dispensar en esta dosis
int cantidadPendiente = 1;


//-----------------------------
// Boton por interrupcion
//
// Antes se leia con digitalRead() adentro del loop. Eso es una espera activa:
// solo detecta la apretada si el loop justo pasa por ahi mientras el boton
// esta hundido. Compitiendo con el servidor WiFi en el mismo loop, una
// apretada corta se perdia entera y el servo no arrancaba nunca.
//
// Con interrupcion el pulso lo captura el hardware, aunque el loop este
// ocupado. La rutina solo levanta una bandera; el trabajo pesado (mover el
// servo, hablar con el backend) se hace despues en el loop, que es donde se
// puede tardar.
//-----------------------------

volatile bool botonApretado = false;
volatile unsigned long ultimoRebote = 0;

// Cuanto se ignoran las repeticiones. Los contactos mecanicos rebotan al
// cerrar y sin esto una sola apretada dispara varias veces, lo que dispensaria
// pastillas de mas.
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
//
// Con una sola apretada del boton salen todas las de la dosis.
// Devuelve cuantas dispenso, que es lo que se le reporta al backend.
//-----------------------------

int dispensar(int cantidad) {

  // Por las dudas: nunca menos de 1 ni mas del tope
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

    // Pausa entre una y otra, menos despues de la ultima
    if (i < cantidad) {
      delay(PAUSA_ENTRE_PASTILLAS);
    }
  }

  Serial.println("Listo.");

  return cantidad;
}


//-----------------------------
// Le avisa al backend que la pastilla se dispenso
//
// Sin esto la dispensacion no queda registrada: el horario nunca se marca
// como dispensado y no entra ninguna fila en la tabla dispensaciones.
//-----------------------------

bool confirmarDispensacion(int cantidadDispensada) {

  if (horarioPendiente == "") {
    Serial.println("Sin horario_id: fue una senal de prueba, no se registra.");
    return false;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi, no se puede confirmar.");
    return false;
  }

  String url = "http://" + String(BACKEND_IP) + ":" + String(BACKEND_PORT)
             + "/api/sensor/confirmacion";

  // El backend valida: dispositivo_id no vacio, horario_id UUID valido,
  // bateria entero de 0 a 100 y cantidad de 1 a 20. Si algo no cumple
  // responde 400.
  //
  // cantidad es lo que REALMENTE se dispenso, que es lo que queda guardado en
  // la tabla dispensaciones.
  String cuerpo = String("{\"dispositivo_id\":\"") + DISPOSITIVO_ID
                + "\",\"horario_id\":\"" + horarioPendiente
                + "\",\"bateria\":100"
                + ",\"cantidad\":" + String(cantidadDispensada) + "}";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int codigo = http.POST(cuerpo);
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
// Recibe la orden de dispensar
//
// El backend llama a GET /dispense?horario_id=<uuid>&cantidad=<n>
//-----------------------------

void handleDispense() {

  // Si ya hay una pastilla esperando
  if (esperandoBoton) {

    server.send(200, "text/plain", "Ya hay una pastilla esperando el boton.");
    return;
  }

  // Guardamos el horario que mando el backend para confirmarlo despues.
  // Si viene vacio es una prueba suelta y no se va a registrar nada.
  horarioPendiente = server.arg("horario_id");

  // Cuantas pastillas pidio el backend. Si no viene, una sola.
  String cantidadTexto = server.arg("cantidad");
  cantidadPendiente = cantidadTexto == "" ? 1 : cantidadTexto.toInt();
  if (cantidadPendiente < 1) cantidadPendiente = 1;

  Serial.print("Comando recibido. Horario: ");
  Serial.println(horarioPendiente == "" ? "(ninguno, prueba suelta)" : horarioPendiente);

  Serial.print("Pastillas a dispensar: ");
  Serial.println(cantidadPendiente);

  // Hacer sonar el buzzer
  sonarBuzzer();

  // Se descarta cualquier apretada previa: si alguien toco el boton mientras
  // no habia nada pendiente, esa bandera no tiene que dispensar esta dosis.
  botonApretado = false;

  esperandoBoton = true;

  Serial.println("Esperando que se presione el boton...");

  server.send(200, "text/plain", "Alerta activada. Presione el boton para dispensar.");
}


//-----------------------------
// SETUP
//-----------------------------

void setup() {

  Serial.begin(115200);

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

  // El rango de pulsos va explicito: con los valores por defecto muchos SG90 y
  // MG90S no llegan a los extremos y parece que estuvieran trabados.
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(0);

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Boton
  //
  // INPUT_PULLUP: el pin queda en alto y baja a LOW cuando el pulsador lo
  // conecta a GND. Por eso la interrupcion escucha el flanco de bajada.
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

  Serial.print("Backend: http://");
  Serial.print(BACKEND_IP);
  Serial.print(":");
  Serial.println(BACKEND_PORT);


  // Sin ahorro de energia del WiFi.
  //
  // Con el ahorro activado la CPU se apaga entre balizas, y mientras duerme el
  // loop no corre: se pierden apretadas del boton y el servidor tarda en
  // contestar. La placa va enchufada, no hay nada que ahorrar.
  WiFi.setSleep(false);


  // Servidor
  server.on("/dispense", HTTP_GET, handleDispense);

  server.begin();

  Serial.println("Servidor listo.");
}


//-----------------------------
// LOOP
//-----------------------------

void loop() {

  // Atender solicitudes WiFi
  server.handleClient();

  // La interrupcion ya capturo la apretada y dejo la bandera levantada.
  // Aca solo se actua sobre ella, que es donde se puede tardar.
  if (esperandoBoton && botonApretado) {

    botonApretado = false;

    Serial.println("Boton presionado!");

    // Una sola apretada dispensa toda la dosis
    int dispensadas = dispensar(cantidadPendiente);

    // Avisarle al backend para que quede registrado, con cuantas salieron
    confirmarDispensacion(dispensadas);

    esperandoBoton = false;
    horarioPendiente = "";
    cantidadPendiente = 1;

    // Dispensar tarda varios segundos. Si el boton reboto o alguien lo volvio
    // a tocar en el medio, esa bandera quedaria levantada y dispararia una
    // dispensacion fantasma apenas llegue la proxima dosis.
    botonApretado = false;

    Serial.println("Listo para la proxima dispensacion.");
  }
}
