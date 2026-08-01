#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

const char* ssid = "colchones 303";
const char* password = "carro303";

WebServer server(80);

Servo servo;

const int SERVO_PIN = 18;
const int BUZZER_PIN = 19;
const int BUTTON_PIN = 21;

// Indica si hay una pastilla esperando ser dispensada
bool esperandoBoton = false;


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
// Mueve el servo
//-----------------------------

void moverServo() {

  Serial.println("Dispensando...");

  servo.write(180);
  delay(1000);

  servo.write(0);
  delay(1000);

  Serial.println("Listo.");
}


//-----------------------------
// Recibe la orden de dispensar
//-----------------------------

void handleDispense() {

  // Si ya hay una pastilla esperando
  if (esperandoBoton) {

    server.send(200, "text/plain", "Ya hay una pastilla esperando el boton.");
    return;
  }

  Serial.println("Comando recibido.");

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


  // Ahorro de energía del WiFi
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

        moverServo();

        // Ya terminó la dispensación
        esperandoBoton = false;

        Serial.println("Listo para la proxima dispensacion.");
      }
    }
  }
}