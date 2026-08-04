#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>

const char* ssid = "Proyecto L5";
const char* password = "preguntaleamaxi";

WebServer server(80);

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
const int BUTTON_PIN = 21;

// IP de la computadora donde corre el backend, en la misma red WiFi.
// OJO: cambia cada vez que la compu se conecta a otra red.
// Se mira con ipconfig y hay que volver a subir el sketch.
const char* BACKEND_IP = "10.8.17.114";
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
// Hace sonar el buzzer
//-----------------------------

void sonarBuzzer() {

  Serial.println("Buzzer sonando...");

  // Si es un buzzer activo:
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
// El backend llama a GET /dispense?horario_id=<uuid>
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

  // Esperar a que se presione el botón
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
  servo.setPeriodHertz(50);
  servo.attach(SERVO_PIN);
  servo.write(0);

  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Botón
  pinMode(BUTTON_PIN, INPUT_PULLUP);


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


  // Ahorro de energía del WiFi
  // Si el backend a veces no logra contactar la placa, probar con false
  WiFi.setSleep(true);


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


  // Si hay una pastilla esperando
  if (esperandoBoton) {

    // INPUT_PULLUP:
    // HIGH = botón no presionado
    // LOW  = botón presionado

    if (digitalRead(BUTTON_PIN) == LOW) {

      Serial.println("Boton presionado!");

      // Pequeña espera para evitar rebotes
      delay(50);

      // Confirmamos que sigue presionado
      if (digitalRead(BUTTON_PIN) == LOW) {

        // Una sola apretada dispensa toda la dosis
        int dispensadas = dispensar(cantidadPendiente);

        // Avisarle al backend para que quede registrado, con cuantas salieron
        confirmarDispensacion(dispensadas);

        // Ya terminó la dispensación
        esperandoBoton = false;
        horarioPendiente = "";
        cantidadPendiente = 1;

        Serial.println("Listo para la proxima dispensacion.");

        // Esperar a que se suelte el boton, para no disparar dos veces
        while (digitalRead(BUTTON_PIN) == LOW) {
          delay(10);
        }
      }
    }
  }
}