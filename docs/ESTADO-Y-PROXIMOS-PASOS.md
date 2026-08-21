# Estado del proyecto y próximos pasos

Última actualización: **21 de agosto de 2026**

Este documento existe para que cualquiera —incluido el equipo dentro de un mes—
pueda retomar el proyecto sin reconstruir el contexto desde cero.

---

## 1. Dónde estamos

**El sistema funciona entero, y ya no depende de ninguna computadora.**

El 19 de agosto se probó el circuito completo con el modelo push. El 21 se
completó el cambio a polling y se desplegó todo: ahora el pastillero le pregunta
al backend en internet, así que puede estar en cualquier casa.

| Componente | Estado | Dónde vive |
| --- | --- | --- |
| Backend | Desplegado y verificado | Render, `voitos-backend.onrender.com` |
| App | Desplegada y apuntando sola a Render | `voitos.vercel.app` |
| Base de datos | En uso | Supabase |
| Firmware polling | **Probado en hardware** | rama `naiderman/hardware` |
| Mails | Funcionando por API HTTPS | Resend |

**Probado el 21/08 de punta a punta:** se agendó una dosis desde el celular, la
placa la detectó consultando sola, sonó, se apretó el botón, dispensó 3
pastillas, confirmó al backend y quedó todo registrado. El mail al cuidador
llega.

**Punto de retorno:** el tag `demo-push-funcionando` tiene el estado del 19 con
el modelo push, por si hiciera falta volver.

---

## 2. La decisión de arquitectura más importante

El backend y el pastillero pueden comunicarse de dos formas, y son excluyentes.

### Push (lo que se probó)

El backend le pega a `GET {ESP32_URL}/dispense`. La placa levanta un servidor
web y espera.

**Problema:** la ESP32 tiene una IP privada. Desde internet no se la alcanza,
así que el backend tiene que estar en la misma red WiFi. En la práctica eso
significa una computadora encendida en la misma casa que el pastillero, lo cual
no es un producto.

### Polling (hacia dónde vamos)

La placa pregunta cada 30 segundos:

```
GET /api/sensor/pendiente
→ { "pendiente": true,
    "horario": { "id": "...", "cantidad": 2 },
    "modulo": 1, "disponibles": 26 }
```

Solo necesita salida a internet, igual que un celular. El backend vive en Render
y el pastillero puede estar en cualquier casa, sin abrir puertos ni tocar el
router.

**El backend ya soporta los dos y elige solo:** si existe `ESP32_URL` usa push,
y si no, asume polling y no arranca ese scheduler. `render.yaml` no define esa
variable, así que el servicio desplegado ya está en modo polling.

### El cambio ya está completo

Se hizo el 21 de agosto. El firmware está en la rama `naiderman/hardware`, en
`firmware/voitos-polling/`, y requiere la librería **ArduinoJson**.

Lo único que hay que completar al flashear son `ssid` y `password`. El `BACKEND`
apunta a Render y **no cambia nunca más**, que era justamente el punto: antes
había que actualizar la IP de la computadora y reflashear con cada red nueva.

---

## 3. Las tres claves del firmware

Costaron una mañana entera de descarte. No las pierdan.

**1. El botón va por interrupción, nunca leído dentro del `loop()`.**

Con `digitalRead()` en el loop, la lectura solo detecta la apretada si el loop
justo pasa por ahí mientras el botón está hundido. Compitiendo con el servidor
web o con peticiones HTTP, una apretada corta se pierde entera.

```cpp
attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), alApretarBoton, FALLING);
```

El `IRAM_ATTR` en la rutina es obligatorio en ESP32, y el antirrebote va adentro
de la interrupción o una sola apretada dispensa varias pastillas.

*Cómo se diagnosticó:* el botón funcionaba perfecto en un sketch aislado sin
WiFi (37 pulsaciones seguidas) y no funcionaba en el firmware completo. Esa
diferencia es la que apunta al sondeo y no al hardware.

**2. El servo necesita los timers asignados antes del `attach`.**

```cpp
ESP32PWM::allocateTimer(0);  // ... 1, 2, 3
servo.attach(SERVO_PIN, 500, 2400);
```

Sin eso, en algunos cores el servo no se mueve y no avisa nada: parece un servo
muerto siendo un problema de software. El rango de pulsos explícito es porque
con los valores por defecto muchos SG90 y MG90S no llegan a los extremos.

**3. `WiFi.setSleep(false)` siempre.**

Con el ahorro activado la CPU se apaga entre balizas de WiFi y el `loop()` deja
de correr. Síntoma típico: la placa responde al ping pero no al HTTP.

---

## 4. Trampas del entorno que ya nos mordieron

**Metro cachea el `.env`.** `npx expo export` reusa la caché y se queda con el
valor viejo de `EXPO_PUBLIC_API_URL` aunque borres `dist/` y cambies el archivo.
El síntoma es la app pegándole a la IP de una red anterior, con errores de
conexión imposibles de explicar.

```bash
npx expo export --platform web --clear    # el --clear no es opcional
```

Y verificar grepeando el bundle servido, no mirando la pantalla:

```bash
curl <host>/_expo/static/js/web/entry-*.js | grep -oE 'http://[0-9.]+:3000'
```

**El dev server de Expo se cuelga.** Queda clavado en "Starting Metro Bundler"
y el puerto 8081 nunca abre. Pasó en tres redes distintas. Lo que funciona
siempre para servir en la red local:

```bash
npx expo export --platform web --clear
npx serve dist -l tcp://0.0.0.0:8081
```

**PowerShell escribe BOM.** `Set-Content -Encoding utf8` en PS 5.1 mete un
carácter invisible al principio del archivo, y eso convierte el nombre de la
variable en `﻿EXPO_PUBLIC_API_URL`, que Expo ignora en silencio. Usar
`-Encoding ascii`.

**El Serial Monitor retiene el puerto COM.** Hay que cerrarlo antes de subir un
sketch, o el upload falla con `No serial data received`. Si aun así falla,
desconectar el servo: sus picos de corriente pueden impedir que la placa entre
en modo de programación.

**Los hosting bloquean el SMTP saliente.** Render en plan free es uno. La
conexión no se rechaza: queda colgada hasta el timeout. El síntoma es peor que
un error, porque todo *parece* funcionar y los mails simplemente nunca llegan.

Eso rompía dos cosas a la vez. El registro se colgaba dos minutos, y la
confirmación del pastillero devolvía `HTTP -11` a la ESP32 sobre dispensaciones
que en realidad se habían guardado bien: el endpoint esperaba dos mails de 8
segundos cada uno, contra el timeout de 10 de la placa.

La solución es mandar por **API HTTPS** en vez de SMTP. Está resuelto con Resend.
Y como regla: **los avisos nunca se esperan con `await`** cuando lo que importa
ya se guardó. Un mail lento no puede hacerle creer al pastillero que falló algo
que funcionó.

**Un error que nadie puede ver es un error que no se arregla.** Los mails salen
sin `await`, así que cuando fallaban el error quedaba en un log del servidor
inaccesible. Desde afuera, "no me llegó el mail" era indistinguible de "salió y
se perdió". Por eso existe `POST /api/admin/probar-mail`, que manda uno de
prueba y devuelve textual lo que contestó el proveedor. El diagnóstico pasó de
horas a un solo pedido.

**Resend sin dominio propio solo entrega a la casilla del titular.** Y el
remitente no puede ser un Gmail: solo un dominio verificado, o
`onboarding@resend.dev`. Las dos cosas devuelven 403 con mensajes claros, pero
solo si alguien los está mirando.

**Cloudflare Tunnel está bloqueado en algunas redes.** `trycloudflare.com` no
resuelve ni por DNS en la conexión que usamos. Alternativas que sí funcionan:
`localtunnel` (`loca.lt`), `serveo.net`, `localhost.run`.

---

## 5. Auditoría de seguridad

Se revisó el proyecto contra una lista de 20 prácticas habituales. El detalle
está más abajo; el resumen es que **hay tres cosas que conviene arreglar antes
de que esto toque datos reales de alguien**, y el resto está razonablemente bien
o no aplica.

### Lo que está bien

| # | Práctica | Cómo está resuelto |
| --- | --- | --- |
| 1 | Ocultar claves de API | `.env` en `.gitignore`, la `service_role key` solo vive en el servidor |
| 2 | Limpiar secretos del historial | Verificado: ningún `.env` fue commiteado nunca |
| 4 | Row Level Security | Activado en las 7 tablas |
| 6 | Autenticación del lado del servidor | Todas las rutas con `authMiddleware`, salvo `/api/sensor` que es para la placa |
| 10 | Hashear contraseñas | Las maneja Supabase Auth; el proyecto nunca las almacena |
| 13 | Consultas parametrizadas | Todo pasa por el cliente de Supabase, no hay SQL armado con strings |
| 14 | Validar toda la entrada | Zod en los 8 esquemas, en cada endpoint |
| 19 | Forzar HTTPS | Render y Vercel lo hacen por defecto |
| 20 | Escanear dependencias | `npm audit`: 0 vulnerabilidades |

### Lo que se arregló (19/08, después de la auditoría)

**El `usuario_id` ahora sale del token.** Era el agujero grave: los
controladores lo leían de `req.query.usuario_id`, un valor que elige el cliente.
El token se validaba pero después no se usaba, así que cualquier usuario con
sesión podía pedir `?usuario_id=<ajeno>` y leer los datos de otra persona.

Ahora hay un solo lugar de donde sale la identidad, `utils/sesion.ts`. Los
listados filtran por ahí, los `create` fuerzan el dueño aunque el body diga otra
cosa, y las operaciones por id verifican propiedad antes de tocar nada. Se
responde 404 y no 403, para no confirmar que ese id existe.

**La API dejó de filtrar el token de verificación.** `getPerfil` usaba
`select("*")`, y como es lo que devuelve el login y la app guarda ese objeto en
`localStorage`, el `token_verificacion` quedaba escrito en el navegador de cada
usuario. Ahora las columnas van listadas.

**`GET /api/usuarios` devolvía todos los usuarios** del sistema a cualquiera con
sesión. La app nunca lo usó, así que ahora devuelve solo el propio perfil.

**Se agregaron:** `helmet` (con CSP apagada, porque la API devuelve JSON),
límite de 10 intentos cada 15 minutos en login y registro contando solo los
fallidos, límite de 16kb en el cuerpo de los pedidos, y escape de HTML en los
mails.

Lo del escape importa por `dispositivo_id`: llega por
`POST /api/sensor/confirmacion`, que es público, así que sin escapar cualquiera
podía inyectar marcado en el mail de otra persona.

### Cómo se verificó

Se escribió `backend/tests/seguridad.mjs`, que a diferencia de las pruebas de
integración **intenta explotar cada agujero**. Una prueba que pasa ahí significa
que el ataque fue rechazado.

```bash
npm run test:seguridad     # con el backend levantado
```

Crea dos usuarios reales y prueba, entre otras cosas, que B no pueda listar las
pastillas de A pasando su `usuario_id`, que no pueda leer ni borrar un registro
ajeno por id, que no pueda recargarle el stock, que crear con el `usuario_id` de
otro quede a nombre propio, y que el login no devuelva el token de verificación.

**15 pruebas de seguridad y 16 de integración, todas pasando.**

### Lo que queda pendiente

| # | Práctica | Estado |
| --- | --- | --- |
| 5 | Cifrar datos sensibles | No se hizo, y no se recomienda: Supabase ya cifra en reposo, y cifrar por campo rompería las búsquedas |
| 12 | Protección anti-bots | No se hizo. Un captcha tiene sentido si el sistema es público y alguien tiene motivo para abusarlo |

**Una cuenta huérfana en Auth:** existe `test@voitos.com` en `auth.users` sin
perfil en `usuarios`. Puede iniciar sesión pero no tiene datos. Es de alguna
prueba vieja y conviene borrarla.

### Lo que no aplica

| # | Práctica | Por qué no aplica |
| --- | --- | --- |
| 3 | Usar la clave pública de la base | El proyecto usa `service_role` **a propósito**: solo el backend habla con Supabase, nunca el cliente. La clave pública sería para que la app consultara directo, y esa no es la arquitectura |
| 9 | Cookies de sesión seguras | No se usan cookies. El token va en el header `Authorization` |
| 16 | Restringir subida de archivos | No hay subida de archivos en ningún lado |

### Lo discutible

**5. Cifrar datos sensibles.** Supabase ya cifra en reposo. Cifrar además a
nivel de campo los nombres de medicamentos sería defendible en un producto de
salud real, pero rompe las búsquedas y agrega mucha complejidad. Para el alcance
de este proyecto, no.

**12. Protección anti-bots.** Un captcha en el registro tiene sentido si el
sistema es público y alguien tiene motivos para abusarlo. En un proyecto escolar
con usuarios conocidos, es infraestructura sin propósito.

**Sobre RLS (4):** está activado, pero el backend usa la `service_role key`, que
lo **saltea por completo**. Hoy es decorativo. Eso no es un error: la protección
real tiene que estar en el backend, que es quien decide. Pero conviene no
confundirse creyendo que RLS está protegiendo algo que en realidad no protege.

---

## 6. Qué hacer en la próxima sesión

Lo grande ya está hecho. Lo que queda:

1. **Verificar un dominio en Resend** si se quiere que los mails lleguen a
   alguien que no sea el titular de la cuenta. Hoy solo entrega a
   `timoczerwiak@gmail.com`.
2. **Pantalla de historial**: las dispensaciones se registran desde el primer
   día y ninguna vista las muestra.
3. Pantallas de configuración, emergencia y detalle del día, que siguen vacías.
4. Sensor que confirme cuántas pastillas salieron de verdad. Hoy se asume que
   salieron las que se pidieron.
5. Un segundo módulo físico. La base ya lo soporta.

---

## 7. Datos útiles

**Repositorio:** `github.com/t-czerwiak/proyecto-voitos`
Ramas: `main` (producción) ← `develop` ← `czerwiak/backend`, `ojman/frontend`

**Servicios:**
- Backend: `https://voitos-backend.onrender.com` (Render, plan free)
- App: `https://voitos.vercel.app` (Vercel, deploy automático desde `main`)
- Base: Supabase, proyecto `pshejdspqqhuhyjbzslx`

**Sobre el plan free de Render:** el servicio se duerme a los 15 minutos sin
tráfico. Con la ESP32 consultando cada 30 segundos nunca se duerme, lo cual es
un efecto lateral bienvenido: mantiene vivo también el scheduler de dosis no
tomadas. El plan free da 750 horas de instancia al mes y un servicio despierto
las 24 horas consume unas 720, así que entra justo.

**Documentos internos** (en `docs/interno/`, fuera del control de versiones):
- `sketch-final/` — firmware push, el que funcionó
- `sketch-polling/` — firmware polling, sin probar
- `prueba-servo/` y `prueba-boton/` — sketches de descarte de hardware
- `backup-demo-push/` — punto de retorno completo
- `preparar-prueba.ps1` — configura las IPs para una prueba local
