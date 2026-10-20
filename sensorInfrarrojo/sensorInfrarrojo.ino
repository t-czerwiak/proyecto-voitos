
#include <ESP32Servo.h>

#define SENSOR_PIN 27
#define SERVO_PIN 5

Servo servo;

volatile bool pastillaDetectada = false;

void IRAM_ATTR detectarPastilla() {
  pastillaDetectada = true;
}

void setup() {
  Serial.begin(115200);

  pinMode(SENSOR_PIN, INPUT);

  servo.attach(SERVO_PIN);
  servo.write(0);

  attachInterrupt(
    digitalPinToInterrupt(SENSOR_PIN),
    detectarPastilla,
    FALLING
  );

  delay(1000);
  Serial.println("Dispensador listo");
}

void loop() {
  // Reiniciar la deteccion para este ciclo
  noInterrupts();
  pastillaDetectada = false;
  interrupts();

  Serial.println("Girando hacia la izquierda...");

  // AVANCE: de 0 a 180 grados
  for (int angulo = 0; angulo <= 180; angulo++) {

    // Comprobar si paso una pastilla
    noInterrupts();
    bool detectada = pastillaDetectada;
    interrupts();

    if (detectada) {
      Serial.println("Pastilla detectada durante el giro");
      break;
    }

    servo.write(angulo);
    delay(20);
  }

  // Si no detecto nada durante la ida,
  // espera en 180 hasta detectar una pastilla
  while (true) {
    noInterrupts();
    bool detectada = pastillaDetectada;
    interrupts();

    if (detectada) {
      Serial.println("Pastilla detectada");
      break;
    }

    delay(5);
  }

  Serial.println("Volviendo hacia la derecha...");

  // REGRESO: desde la posicion actual hasta 0 grados
  // Si detecto la pastilla antes de 180, vuelve desde ahi
  // Si llego a 180, vuelve desde 180
  int posicionActual = servo.read();

  for (int angulo = posicionActual; angulo >= 0; angulo--) {
    servo.write(angulo);
    delay(20);
  }

  Serial.println("Servo en posicion inicial");
  Serial.println("-------------------------");

  delay(5000);
}
