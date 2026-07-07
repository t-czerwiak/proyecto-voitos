#include <ESP32Servo.h>

// Crear el objeto para controlar el servo
Servo miServo;

// Definir el pin de señal conectado al ESP32
const int pinServo = 13; 

void setup() {
  // Asignar el pin al objeto servo
  miServo.attach(pinServo);
}

void loop() {
  // Mover a 0 grados
  miServo.write(0);
  delay(1000); // Esperar 1 segundo


  // Mover a 180 grados
  miServo.write(180);
  delay(1000);
}
