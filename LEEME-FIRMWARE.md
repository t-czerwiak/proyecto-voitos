# Firmware de Voitos

Actualizado el 24/08/2026.

Acá vive un solo sketch: el que corre en la ESP32 del pastillero. Los de prueba
y el firmware viejo de push se sacaron para que no haya duda de cuál hay que
flashear. Siguen en la historia del repositorio si alguna vez hacen falta, en el
commit `ac56ae4`:

```bash
git show ac56ae4:pruebas/prueba-servo/prueba-servo.ino
git show ac56ae4:pruebas/prueba-boton/prueba-boton.ino
git show ac56ae4:firmware/voitos-push/voitos-push.ino
```

---

## Qué hay acá

```
firmware/
  voitos-polling/          ← el que va al pastillero
    prueba-display/        ← el mismo, en modo prueba (ver más abajo)
```

**No trae contraseñas, ni hace falta ponerlas.** El WiFi se le carga a la placa
desde el celular la primera vez que prende (ver [Conectarlo al WiFi](#conectarlo-al-wifi)).

---

## Cómo funciona

La placa le pregunta al backend cada 30 segundos si hay una dosis para ahora:

```
GET https://voitos-backend.onrender.com/api/sensor/pendiente
```

Solo necesita salida a internet, igual que un celular. **El pastillero puede
estar en cualquier casa**, sin importar dónde esté el backend ni en qué red esté
la computadora de nadie.

Antes no era así: el firmware viejo levantaba un servidor web en la placa y
esperaba que el backend le pegara. Eso obligaba a que la computadora y el
pastillero estuvieran en la misma red WiFi, y había que reflashear con la IP
nueva cada vez que se cambiaba de lugar.

El `BACKEND` ya está puesto y no se toca: apunta al servidor en internet.

### Conectarlo al WiFi

Sin cambiar el código y sin computadora:

1. Se enchufa el pastillero. Si no tiene una red guardada, la pantalla dice
   **SIN WIFI** y abre su propia red, **`VOITOS-XXXX`** (las 4 últimas son de
   la placa, para distinguir dos pastilleros).
2. El cuidador se conecta a esa red con el celular. No tiene clave. El celular
   abre solo una página (como en el WiFi de un bar); si no se abre, entrar a
   `http://192.168.4.1`.
3. Elige el WiFi de la casa de la lista, escribe la clave y toca **Conectar**.
   La placa la guarda en su memoria, se reinicia y se conecta.
4. De ahí en adelante se conecta sola, aunque se corte la luz.

Si la clave estaba mal, al minuto vuelve a aparecer `VOITOS-XXXX` con el aviso
de que no pudo conectarse. Si el router está apagado (un corte de luz), la red
propia queda abierta 5 minutos y la placa vuelve a probar con la red guardada,
así no queda trabada esperando a que alguien la configure.

**Para cambiarla de red:** mantener apretado el botón de dispensar mientras se
enchufa, 3 segundos. Borra la red guardada y abre `VOITOS-XXXX` de nuevo.

`credenciales.h` ya no hace falta. Si existe (en la placa de desarrollo), se
usa solo cuando no hay ninguna red guardada. Sigue en el `.gitignore`.

### Vincularlo a la cuenta del cuidador

Una vez conectado, mientras el pastillero no tiene dueño, **abajo de la hora
aparece un código de 8 números** (en lugar de "VOITOS"). El cuidador lo escribe
en la app, en *Mi pastillero*, **desde donde esté**: no hace falta estar en la
misma red, porque la placa y la app hablan las dos con el backend en internet.
A los 30 segundos el código desaparece de la pantalla: ya quedó vinculado.

Sin dueño el pastillero funciona como antes (cualquier cuenta lo usa, es el
modo de la exhibición). Vinculado, solo dispensa y muestra lo de esa cuenta.
El código cambia cada 30 minutos. Detalle en `docs/API.md`, sección
Pastilleros, en la rama `main`.

Cada placa inventa un secreto la primera vez que arranca y lo guarda en su
memoria. El backend solo le da el código a la placa con ese secreto: sin eso,
cualquiera que sepa el `DISPOSITIVO_ID` (está en este repositorio) podría
pedir el código y quedarse con el pastillero. Si se le borra la memoria a la
placa, hay que desvincularla desde la app (o poner `secreto_hash` en null en la
tabla `pastilleros`) para que pueda volver a presentarse.

Cada placa nueva se da de alta a mano en `pastilleros`, con el mismo
`DISPOSITIVO_ID` que tiene en el código.

**Requiere tres librerías**, que se instalan desde
*Herramientas → Administrar bibliotecas → buscar → Instalar*:

- **ArduinoJson**
- **Adafruit SSD1306** (al instalarla ofrece sumar **Adafruit GFX** y
  **Adafruit BusIO**: aceptar)

---

## Display OLED (recordatorios)

Pantalla de 0.96" SSD1306, 128x64, por I2C (cuatro pines: VCC, GND, SCL, SDA).

| Pantalla | ESP32 |
| --- | --- |
| VCC | 3V3 |
| GND | GND |
| SCL | GPIO 22 |
| SDA | GPIO **23** |

**SDA no va al 21** (el pin I2C por defecto) porque el 21 ya es el botón. Si se
cablea en otros pines, se cambian `OLED_SDA` y `OLED_SCL` arriba del sketch.

Qué muestra, siempre con **la letra más grande que entra** (pensado para
una persona mayor). Lo que no entra en el ancho corre de derecha a izquierda,
como una marquesina:

- **Nada pendiente:** la **hora actual** a todo el ancho y "VOITOS" abajo,
  corridos unos píxeles por minuto para que el OLED no se marque. La hora sale
  de internet (NTP) apenas hay WiFi; hasta que llega, se ve solo "VOITOS".
- **Recordatorios:** **de a uno y en loop**. Arriba la hora del evento, en el
  medio el texto grande corriendo, y abajo alterna "Faltan N min" con
  "Boton = ya lo vi". Si hay varios muestra "1/3" y van pasando solos.
  **Apretar el botón los marca como vistos** y la pantalla vuelve a la hora;
  no vuelven a aparecer. Si nadie aprieta, se van solos a la hora del evento.
- **Hay una dosis esperando el botón:** "TU DOSIS" y abajo, corriendo, "APRETA
  EL BOTON - SALEN 2 PASTILLAS". Tapa todo lo demás; después de dispensar
  vuelve a lo que estaba.
- **El sensor no vio caer todas:** "REVISAR" y "SALIERON X DE Y - MIRA LA
  BANDEJA", 6 segundos.

**Si la pantalla no está conectada el pastillero anda igual:** el monitor serie
dice "No se encontro la pantalla OLED" y sigue. Si está conectada y no prende,
probar `OLED_DIRECCION = 0x3D` (la mayoría viene en `0x3C`).

---

## Las tres cosas que costó descubrir

Ya están resueltas adentro del sketch. Se anotan porque encontrarlas llevó una
mañana entera y conviene no repetirla.

### 1. El botón va por interrupción, nunca leído en el `loop()`

Leerlo con `digitalRead()` adentro del `loop()` **no funciona**. Solo detecta la
apretada si el loop justo pasa por ahí mientras el botón está hundido, y
compitiendo con el WiFi una apretada corta se pierde entera.

```cpp
attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), alApretarBoton, FALLING);
```

El `IRAM_ATTR` en la rutina es obligatorio en ESP32, y el antirrebote va adentro
de la interrupción, o una sola apretada dispensa varias pastillas.

**Cómo se diagnosticó:** el botón funcionaba perfecto en un sketch aislado sin
WiFi (37 pulsaciones seguidas) y no funcionaba en el firmware completo. Esa
diferencia —anda sin WiFi, no anda con WiFi— es la que señala al sondeo y
descarta el hardware.

### 2. El servo necesita los timers asignados antes del `attach`

```cpp
ESP32PWM::allocateTimer(0);   // ... 1, 2, 3
servo.attach(SERVO_PIN, 500, 2400);
```

Sin eso, en algunos cores el servo **no se mueve y no avisa nada**: parece un
servo quemado cuando en realidad es software. El rango `500, 2400` es porque con
los valores por defecto muchos SG90 y MG90S no llegan a los extremos y parece
que estuvieran trabados.

### 3. `WiFi.setSleep(false)`

Con el ahorro de energía activado, la CPU se apaga entre balizas de WiFi y el
`loop()` deja de correr. El síntoma es raro y confunde mucho: **la placa
responde al ping pero no al HTTP**.

---

## Si algo no anda, probá la pieza sola

Los dos sketches de prueba ya no están en esta rama, pero la técnica sigue
valiendo y es la que resolvió el problema del botón: en vez de adivinar sobre
449 líneas con WiFi de por medio, se prueba el servo solo, o el botón solo, en
un sketch de veinte líneas.

Si hace falta, se recuperan con los comandos `git show` del principio. El de
botón vigilaba seis pines a la vez (21, 0, 4, 5, 22, 23) e imprimía solo cuando
alguno cambiaba, así se podía mover el cable de un pin a otro sin recompilar.

Los dos van a **115200 baudios** en el monitor serie.

---

## Cosas del entorno que hacen perder tiempo

**Cerrá el Serial Monitor antes de subir un sketch.** Retiene el puerto COM y el
upload falla con `No serial data received`.

**Si aun así falla, desconectá el servo.** Sus picos de corriente pueden impedir
que la placa entre en modo de programación. Es una de las causas más comunes de
ese error.

**Si no entra en modo de programación:** mantené `BOOT` apretado, tocá `EN` una
vez, y seguí con `BOOT` hasta que aparezca `Writing at 0x...`.

---

## Cómo probar que funciona

1. Flashear `voitos-polling` con la red completada
2. Abrir el monitor serie a 115200
3. Desde la app, agendar una dosis para dentro de 2 minutos
4. Esperar sin tocar nada

En el monitor tiene que aparecer:

```
Consultando cada 30 segundos.
=== HAY UNA DOSIS PENDIENTE ===
  horario: 97d2a151-...
  pastillas: 2
  quedan en el modulo: 26
Buzzer sonando...
Esperando que se presione el boton...
Boton presionado!
Dispensando 2 pastillas...
Confirmado! El backend lo registro.
```

**La prueba definitiva del modelo nuevo:** apagar la computadora. Con el backend
en internet, el pastillero tiene que seguir funcionando igual.

Una dosis queda disponible para la placa durante **15 minutos** después de su
horario. Pasado ese rato el backend la da por perdida y le manda el aviso al
cuidador, así que si el pastillero estuvo desconectado más de ese tiempo la
dosis no se va a dispensar sola cuando vuelva.

---

## Sensor de caída (el tercer chequeo)

Para estar seguros de que la pastilla salió de verdad se juntan tres cosas, y
**en este orden**:

1. **Hay una dosis programada y en su horario.** La da el backend en
   `/pendiente`, y al confirmar vuelve a revisar que exista, que no esté ya
   dispensada y que sea su hora (no se puede confirmar una de mañana ni una de
   hace dos horas).
2. **Alguien apretó el botón** mientras esa dosis esperaba. El botón no hace
   nada si no hay dosis.
3. **El sensor vio caer las pastillas**, y solo cuenta mientras el servo está
   dispensando (más un segundo para que terminen de caer).

Lo importante es que **el sensor nunca arranca nada**. Si alguien mete el dedo
y corta el haz cuando no se está dispensando, el monitor serie dice "Sensor
activado sin dispensacion en curso: se ignora" y no pasa nada más: no
dispensa, no confirma y no borra ni marca ninguna dosis.

Al confirmar, la placa manda las dos cuentas: `cantidad` (las vueltas del
servo) y `detectadas` (las que vio el sensor). El backend guarda las dos. Si
el sensor vio menos, la dosis igual queda registrada y la pantalla muestra
"REVISAR" para que se mire la bandeja.

**Conexión** (módulo infrarrojo de salida digital, de barrera o de obstáculo):

| Sensor | ESP32 |
| --- | --- |
| VCC | 3V3 |
| GND | GND |
| OUT | GPIO 27 |

Arriba del sketch:

- `HAY_SENSOR = false` viene así para poder probar el display sin el sensor.
  **Ponerlo en `true` cuando el sensor esté conectado.** Con `false`, la placa
  no manda `detectadas` y el backend guarda que no hubo sensor.
- `SENSOR_FLANCO = FALLING` sirve para los módulos que dan LOW al detectar
  (casi todos). Si el que usan da HIGH, cambiarlo a `RISING`.
- `MS_ANTIRREBOTE_SENSOR` (80 ms) y `MS_ESPERA_CAIDA` (1 s) son para calibrar
  con el hardware real: si cuenta una pastilla dos veces, subir el primero; si
  no llega a ver la última, subir el segundo.

---

## Prueba del display (`prueba-display/`)

Es el mismo firmware con el modo prueba prendido, para probar la pantalla
con la app de verdad sin tener el resto del hardware armado.

**Qué hace:**

1. Al arrancar recorre **todas las pantallas** y las anuncia en el monitor
   serie (115200): reposo con la hora → tres recordatorios de ejemplo rotando
   (20 s) → TU DOSIS → REVISAR.
2. Después queda **en vivo** contra el backend de producción: lo que se agende
   en https://voitos.vercel.app aparece en la pantalla.
3. El botón de dispensar es el **BOOT** de la placa, así que no hace falta el
   pulsador. Sin servo conectado no sale nada, pero la dosis se confirma igual
   y queda registrada en la app.

**Cómo usarlo:**

1. Instalar las librerías de arriba (ArduinoJson y Adafruit SSD1306).
2. Abrir `prueba-display.ino`, placa **DOIT ESP32 DEVKIT V1**, subir.
3. Si no tiene red guardada, conectarse con el celular a `VOITOS-XXXX` y elegir
   el WiFi (ver [Conectarlo al WiFi](#conectarlo-al-wifi)). Para borrarla,
   mantener el **BOOT** apretado justo después de enchufarla (no mientras se
   enchufa: con BOOT apretado al arrancar, la placa entra en modo de carga).
4. Abrir el monitor serie a 115200 y mirar la pantalla.

Cableado de la placa de prueba: VCC a 3V3, GND a GND, SCL a **D22** y SDA a
**D21** (acá el botón es el BOOT, así que el 21 está libre; en el pastillero
SDA va al 23). Si SDA y SCL quedaron cruzados lo detecta solo y lo avisa en el
monitor serie. También prueba las direcciones 0x3C y 0x3D.

**Nunca escribir la red ni la clave adentro del `.ino`**: el repositorio es
público y queda a la vista de cualquiera.

**Para ver cada fase con la app:**

| Fase | Qué hacer en la app |
| --- | --- |
| Recordatorio de actividad | Calendario → un día → agregar actividad, hora dentro de unos minutos, "Recordatorio en la pantalla del pastillero: Sí", 5 o 10 minutos antes |
| Recordatorio de dosis | Agendar una dosis para dentro de unos minutos con recordatorio |
| TU DOSIS | Esperar a la hora de esa dosis (la placa consulta cada 30 s) |
| Confirmar | Apretar BOOT: la dosis queda dispensada en la app |
| Ya lo vi | Con un recordatorio en pantalla, apretar BOOT: vuelve a la hora y ese recordatorio no aparece más |
| Vincular | Con la hora en pantalla y un código abajo: cargarlo en la app, en Mi pastillero. A los 30 s el código se va |
| Reposo | Sin nada agendado: la hora grande y VOITOS |

Si la pantalla queda negra: el monitor serie dice "No se encontro la pantalla
OLED". Revisar VCC/GND y que los dos cables estén en D22 y D23.

**Ojo:** es una copia del sketch principal. Si el principal cambia, se
regenera copiándolo, con `#define MODO_PRUEBA 1` y `OLED_SDA = 21`; no
editarla a mano.
