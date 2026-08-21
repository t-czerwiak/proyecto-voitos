// Prueba aislada del boton del pastillero.
//
// No hay WiFi, ni servo, ni buzzer. Solo lectura de pines, para saber si el
// pulsador cierra el circuito o no.
//
// Vigila VARIOS pines a la vez a proposito: asi podes mover el cable de un pin
// a otro y ver cual responde, sin tener que recompilar cada vez. Si ninguno
// reacciona, el problema es el pulsador o su cableado, no el pin.
//
// Todos los pines van con INPUT_PULLUP: quedan en HIGH y pasan a LOW cuando se
// los conecta a GND. Eso es exactamente lo que hace un pulsador bien cableado,
// con una pata al pin y la otra a GND. No lleva resistencia externa.
//
// Monitor serie a 115200 baudios.

// GPIO21 es el que usa el firmware hoy. Los demas son alternativas sanas: no
// se usan para flash ni para el arranque, y tienen pull-up interno.
//
// OJO con GPIO0: es el boton BOOT que la placa ya trae soldado. Sirve como
// pulsador, pero si esta apretado durante el reset la placa entra en modo de
// programacion en vez de arrancar el sketch.
//
// NO se incluyen GPIO34 a 39: son solo entrada y NO tienen pull-up interno,
// asi que con INPUT_PULLUP quedan flotando y leen cualquier cosa.
const int PINES[] = { 21, 0, 4, 5, 22, 23 };
const int CANTIDAD = sizeof(PINES) / sizeof(PINES[0]);

// Estado anterior de cada pin, para imprimir solo cuando cambia y no inundar
// el monitor con miles de lineas iguales.
int anterior[CANTIDAD];

// Cuantas veces se apreto cada uno desde que arranco
int pulsaciones[CANTIDAD];

unsigned long ultimoResumen = 0;

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=================================");
  Serial.println("  PRUEBA AISLADA DEL BOTON");
  Serial.println("=================================");
  Serial.print("Vigilando ");
  Serial.print(CANTIDAD);
  Serial.print(" pines: ");

  for (int i = 0; i < CANTIDAD; i++) {
    pinMode(PINES[i], INPUT_PULLUP);
    anterior[i] = digitalRead(PINES[i]);
    pulsaciones[i] = 0;

    Serial.print("GPIO");
    Serial.print(PINES[i]);
    if (i < CANTIDAD - 1) Serial.print(", ");
  }

  Serial.println();
  Serial.println();
  Serial.println("Con INPUT_PULLUP el pin esta en HIGH y baja a LOW al tocar GND.");
  Serial.println();
  Serial.println("Que probar:");
  Serial.println("  1. Apreta el pulsador. Deberia aparecer una linea APRETADO.");
  Serial.println("  2. Si no aparece, toca un cable entre el pin y GND directo,");
  Serial.println("     salteando el pulsador.");
  Serial.println("  3. Si con el cable si aparece, el pulsador o su cableado");
  Serial.println("     estan mal. Si tampoco, probar otro pin de la lista.");
  Serial.println();
  Serial.println("Estado inicial (todos deberian estar en HIGH):");

  for (int i = 0; i < CANTIDAD; i++) {
    Serial.print("  GPIO");
    Serial.print(PINES[i]);
    Serial.print(" = ");
    Serial.println(anterior[i] == LOW ? "LOW  <- ojo, ya arranca en bajo" : "HIGH");
  }

  Serial.println();
  Serial.println("---------------------------------");
  ultimoResumen = millis();
}

void loop() {
  for (int i = 0; i < CANTIDAD; i++) {
    int ahora = digitalRead(PINES[i]);

    if (ahora == anterior[i]) continue;

    // Antirrebote: los contactos mecanicos hacen ruido al abrir y cerrar, y
    // sin esto una sola apretada sale como varias.
    delay(30);
    ahora = digitalRead(PINES[i]);
    if (ahora == anterior[i]) continue;

    anterior[i] = ahora;

    Serial.print("[");
    Serial.print(millis() / 1000);
    Serial.print("s] GPIO");
    Serial.print(PINES[i]);

    if (ahora == LOW) {
      pulsaciones[i]++;
      Serial.print(" -> APRETADO   (pulsacion numero ");
      Serial.print(pulsaciones[i]);
      Serial.println(")");
    } else {
      Serial.println(" -> soltado");
    }
  }

  // Resumen cada 5 segundos, para saber que el sketch sigue vivo aunque no
  // pase nada.
  if (millis() - ultimoResumen > 5000) {
    ultimoResumen = millis();

    Serial.print("... esperando  |");
    for (int i = 0; i < CANTIDAD; i++) {
      Serial.print(" GPIO");
      Serial.print(PINES[i]);
      Serial.print("=");
      Serial.print(digitalRead(PINES[i]) == LOW ? "LOW" : "HIGH");
    }
    Serial.println();
  }
}
