# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

<!-- deploy -->
## Deploy: la app vive en voitos.vercel.app

**La aplicacion esta publicada en https://voitos.vercel.app y esa es la unica
direccion que se le pasa a alguien.** No inventar ni ofrecer otra.

El proyecto de Vercel se llama `app`, esta enganchado a este repositorio y
compila con cada push. De ahi salen dos clases de direccion:

| Rama | Que sale |
| --- | --- |
| `main` | Produccion: **voitos.vercel.app** |
| Cualquier otra | Una preview en `app-git-<rama>-timos-projects-4d5dd138.vercel.app` |

### Reglas

1. **Nunca presentar una preview como si fuera la app.** No pasarla como
   resultado, no ponerla en un README, no darla a la catedra. Se pisa con el
   push siguiente y queda basura en el panel de Vercel que hay que borrar a
   mano.
2. **Un cambio no esta publicado hasta que llego a `main`.** El camino es rama
   de area -> `develop` -> `main`, con pull request en cada paso. Al mergear a
   `main` sale solo el deploy de produccion.
3. **No hacer deploys manuales** (`vercel deploy`, `deploy_to_vercel` del MCP,
   crear un proyecto nuevo). Eso genera justo las URLs temporales que no
   queremos. El deploy lo dispara el push a `main` y nada mas.
4. Si hace falta mirar algo compilado antes de mergear, se compila local:
   `cd app && npm run build:web` y se sirve `app/dist`.

Detalle completo en `docs/ESTADO-Y-PROXIMOS-PASOS.md`, seccion 7, y en
`docs/FRONTEND.md`, seccion 5.

### Nada de alert, confirm ni prompt

**Nunca usar `window.alert`, `window.confirm`, `window.prompt` ni `Alert.alert`.**
Ni en una pantalla, ni "provisorio", ni para depurar.

El dialogo del navegador no es parte de la aplicacion: lo dibuja el sistema con
un titulo que dice "voitos.vercel.app dice", que es exactamente la forma que
tienen los avisos falsos del navegador. Arriba de un texto sobre medicacion,
eso es lo peor que puede aparecer. Ademas no respeta ningun color ni tamano del
diseno, y bloquea el hilo mientras esta abierto.

Para preguntar algo: `confirmar()` de `app/src/lib/avisos.ts`, que devuelve una
promesa de true/false y lo dibuja `app/src/ui/Dialogo.tsx`, adentro de la
pagina y con la paleta de la aplicacion.

Para avisar algo sin preguntar: los componentes `Aviso` o `Estado` de
`app/src/ui/`, dentro de la pantalla que corresponda.
