# Firmware de Voitos

Actualizado el 20/08/2026, después de la prueba end-to-end del 19.

Los sketches de esta carpeta son los que corren en la ESP32. Tus pruebas
originales (`ServoPruebaWifi1`, `ServoPruebaWifi2`, `pruebaServo`) quedaron
donde estaban, no las toqué.

---

## Qué hay acá

```
firmware/
  voitos-polling/     ← el que hay que usar
  voitos-push/        ← el respaldo, por si falla el de arriba
pruebas/
  prueba-servo/       ← solo el servo, para descartar hardware
  prueba-boton/       ← solo el botón, vigila 6 pines a la vez
```

**Ninguno trae contraseñas.** Donde dice `PONER_LA_RED` o `PONER_LA_CLAVE` hay
que completar con los datos de la red del momento. El repositorio es público,
así que las credenciales nunca se suben.

---

## Los dos firmwares, y por qué hay dos

### `voitos-polling` — el que hay que usar

La placa le pregunta al backend cada 30 segundos si hay una dosis para ahora:

```
GET https://voitos-backend.onrender.com/api/sensor/pendiente
```

Solo necesita salida a internet, igual que un celular. **El pastillero puede
estar en cualquier casa**, sin importar dónde esté el backend.

Para usarlo, completar arriba del archivo:

```cpp
const char* ssid = "PONER_LA_RED";
const char* password = "PONER_LA_CLAVE";
```

El `BACKEND` ya está puesto y no se toca: apunta al servidor en internet.

**Requiere la librería ArduinoJson**, que se instala desde
*Herramientas → Administrar bibliotecas → buscar "ArduinoJson" → Instalar*.

### `voitos-push` — el respaldo

Es el que funcionó el 19 de agosto. La placa levanta un servidor web y espera
que el backend le pegue a `GET /dispense`.

Funciona bien, pero **obliga a que la computadora y la placa estén en la misma
red WiFi**, porque el backend contacta a la placa por IP privada. Además hay
que actualizar `BACKEND_IP` con la IP de la computadora cada vez que se cambia
de red, y volver a flashear.

Está acá por si el de polling falla en la demo. Para usarlo hay que completar
también `BACKEND_IP`, que se mira con `ipconfig` en la computadora.

---

## Las tres cosas que costó descubrir

Estas tres ya están resueltas en los dos firmwares. Las anoto porque el proceso
para encontrarlas fue largo y conviene no repetirlo.

### 1. El botón va por interrupción, nunca leído en el `loop()`

Leerlo con `digitalRead()` adentro del `loop()` **no funciona**. Solo detecta la
apretada si el loop justo pasa por ahí mientras el botón está hundido, y
compitiendo con el WiFi una apretada corta se pierde entera.

```cpp
attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), alApretarBoton, FALLING);
```

El `IRAM_ATTR` en la rutina es obligatorio en ESP32, y el antirrebote va adentro
de la interrupción, o una sola apretada dispensa varias pastillas.

**Cómo se diagnosticó:** el botón funcionaba perfecto en `prueba-boton` (37
pulsaciones seguidas) y no funcionaba en el firmware completo. Esa diferencia
—anda sin WiFi, no anda con WiFi— es la que señala al sondeo y descarta el
hardware.

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

## Los sketches de prueba

Sirven para descartar. Si algo no anda, en vez de adivinar sobre el firmware
completo, se prueba la pieza sola.

**`prueba-servo`** — sin WiFi, sin botón. Hace tres ciclos completos al arrancar
y después acepta ángulos por el monitor serie: escribís `90` y lo manda ahí.
Sirve para encontrar los topes reales del mecanismo.

**`prueba-boton`** — vigila seis pines a la vez (21, 0, 4, 5, 22, 23) e imprime
solo cuando alguno cambia. Así se puede mover el cable de un pin a otro sin
recompilar. Si ninguno reacciona, el problema es el pulsador o su cableado.

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
