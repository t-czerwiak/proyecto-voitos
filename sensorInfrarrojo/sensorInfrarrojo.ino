
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
  servo.write(180);

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

  Serial.println("Girando hacia el lado contrario...");

  // AVANCE: de 180 a 0 grados
  for (int angulo = 180; angulo >= 0; angulo--) {

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

  // Si no detecto nada, espera en 0 grados
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

  Serial.println("Volviendo a la posicion inicial...");

  // REGRESO: desde la posicion actual hasta 180 grados
  int posicionActual = servo.read();

  for (int angulo = posicionActual; angulo <= 180; angulo++) {
    servo.write(angulo);
    delay(20);
  }

  Serial.println("Servo en posicion inicial");
  Serial.println("-------------------------");

  delay(5000);
}
