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
  voitos-polling/     ← este, y no hay otro
```

**No trae contraseñas.** Donde dice `PONER_LA_RED` y `PONER_LA_CLAVE` hay que
completar con los datos de la red del momento. El repositorio es público, así
que las credenciales nunca se suben.

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

Para usarlo, completar arriba del archivo:

```cpp
const char* ssid = "PONER_LA_RED";
const char* password = "PONER_LA_CLAVE";
```

El `BACKEND` ya está puesto y no se toca: apunta al servidor en internet.

**Requiere la librería ArduinoJson**, que se instala desde
*Herramientas → Administrar bibliotecas → buscar "ArduinoJson" → Instalar*.

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
