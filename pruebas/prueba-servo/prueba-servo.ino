// Prueba aislada del servo del pastillero.
//
// No hay WiFi, ni buzzer, ni boton, ni backend. Solo el servo, para poder
// decir con certeza si el problema esta en el o en el resto del sistema.
//
// Hace dos cosas:
//   1. Al arrancar repite tres veces el mismo ciclo que usa el firmware real
//      (0 -> 180 -> 0), que es lo que deberia hacer caer una pastilla.
//   2. Despues queda escuchando el monitor serie: le escribis un angulo
//      (0 a 180) y lo manda ahi. Sirve para buscar los topes reales del
//      mecanismo, que no siempre son 0 y 180.
//
// Monitor serie a 115200 baudios.

#include <ESP32Servo.h>

Servo servo;

// Mismo pin que el firmware real
const int SERVO_PIN = 18;

// Mismos angulos y tiempos que moverServo() del firmware
const int ANGULO_ABIERTO = 180;
const int ANGULO_CERRADO = 0;
const int ESPERA_MS = 1000;

void unCiclo(int numero) {
  Serial.print("Ciclo ");
  Serial.print(numero);
  Serial.print(": ");

  Serial.print(ANGULO_ABIERTO);
  Serial.print(" ... ");
  servo.write(ANGULO_ABIERTO);
  delay(ESPERA_MS);

  Serial.print(ANGULO_CERRADO);
  Serial.println(" ... listo");
  servo.write(ANGULO_CERRADO);
  delay(ESPERA_MS);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=================================");
  Serial.println("  PRUEBA AISLADA DEL SERVO");
  Serial.println("=================================");
  Serial.print("Pin del servo: ");
  Serial.println(SERVO_PIN);
  Serial.println();

  // La ESP32 necesita que se le asignen los timers antes de attach.
  // Sin esto, en algunos cores el servo no se mueve y no avisa nada.
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servo.setPeriodHertz(50);

  // El rango de pulsos importa: con los valores por defecto, algunos servos
  // no llegan a los extremos y parece que estuvieran trabados. 500-2400 us
  // cubre a la mayoria de los SG90 y MG90S.
  servo.attach(SERVO_PIN, 500, 2400);

  Serial.println("Servo conectado. Posicion inicial 0.");
  servo.write(ANGULO_CERRADO);
  delay(1000);

  Serial.println();
  Serial.println("Tres ciclos completos, igual que al dispensar:");
  Serial.println();

  for (int i = 1; i <= 3; i++) {
    unCiclo(i);
    delay(500);
  }

  Serial.println();
  Serial.println("---------------------------------");
  Serial.println("Listo. Ahora escribi un angulo (0 a 180) y Enter");
  Serial.println("para mandarlo a esa posicion.");
  Serial.println("Escribi 'c' para repetir un ciclo completo.");
  Serial.println("---------------------------------");
}

void loop() {
  if (!Serial.available()) return;

  String entrada = Serial.readStringUntil('\n');
  entrada.trim();

  if (entrada.length() == 0) return;

  if (entrada == "c" || entrada == "C") {
    unCiclo(0);
    return;
  }

  int angulo = entrada.toInt();

  if (angulo < 0 || angulo > 180) {
    Serial.println("Angulo fuera de rango. Tiene que ser de 0 a 180.");
    return;
  }

  Serial.print("Moviendo a ");
  Serial.print(angulo);
  Serial.println(" grados...");

  servo.write(angulo);
}
