# HexaApp — memoria del proyecto

> Resumen de todo lo hablado y decidido, para no depender de que exista el chat
> donde se construyó. Si retomas el proyecto en una conversación nueva, empieza
> pasando este fichero: contiene el contexto, las decisiones y el porqué de cada
> una.
>
> **Este documento se actualiza con cada cambio.** Ver `CLAUDE.md`.

Última actualización: 10 de agosto de 2026 (MVP de cada jornada).

---

## 1. Qué es esto

Una aplicación para gestionar competiciones tipo **Hexalocke**: un nuzlocke por
puntos entre seis jugadores, con reglas propias, level caps, jornadas y
clasificación.

Nació de un PDF, *"Hexalocke 2"* (16/06/2026), con las reglas de una edición en
curso: seis jugadores en HeartGold/SoulSilver en modalidad random, level caps
por gimnasio, jornadas cada dos medallas, sistema de puntos empezando en 5 y una
Final Four. La aplicación **no es solo para esa edición**: es una base genérica,
y los datos de ese PDF están cargados como ejemplo editable.

Repositorio: `github.com/PepeLePew016/HexaApp`
Rama de trabajo: `claude/competition-management-app-k9ua86` (es la principal).

---

## 2. Qué hay hecho

| Sección | Qué hace |
| --- | --- |
| **Resumen** | Level cap actual, clasificación, próxima jornada, actividad reciente y últimos giros. |
| **Reglas** | Secciones por categorías, editables y reordenables por administradores. |
| **Level caps** | Nivel máximo por gimnasio, con una o varias imágenes que se alternan; cada jugador marca cuándo lo supera. |
| **Cementerio** | Caja estilo PC de Pokémon; cada casilla abre una ficha con imagen grande. |
| **Jornadas** | Emparejamientos; marcar ganador suma el punto automáticamente. Cada jornada tiene su MVP, con ficha propia. |
| **Puntos** | Clasificación con desempates, el as de cada jugador, ajustes ±1, con motivo, masivos, e historial. |
| **Mis notas** | Cuaderno privado con un sub-apartado por jugador. Solo lo ve su autor. |
| **Competiciones** | Crear ediciones copiando configuración, archivar, gestionar jugadores. |
| **Administración** | Alta de usuarios, roles y contraseñas. |
| **Final Four** | Cuadro de 5 combates que se abre al terminar todas las jornadas, con campeón al final. |
| **Hall de la fama** | Equipo de 6 pokémon por jugador, disponible cuando la Final Four ya tiene campeón. |
| **Ruleta** | Sorteos personalizables; girar gasta un ticket de esa ruleta, salvo los administradores. |
| **Actividad** | Cronología con muertes, puntos, gimnasios superados, giros de ruleta y resultados de jornada. |
| **Instalación** | Pantalla de primer arranque que crea el administrador. |

Roles: **administrador global** (crea competiciones y usuarios),
**administrador de competición** (participante con permisos en esa edición) y
**jugador** (registra sus muertes, marca sus gimnasios, escribe sus notas).

---

## 3. Decisiones y por qué

Esto es lo importante si hay que retomar el proyecto.

**Next.js + Prisma + PostgreSQL.** Empezó en SQLite (un fichero local, cero
configuración) y se migró a PostgreSQL cuando se quiso publicar en internet: los
alojamientos gratuitos no conservan ficheros entre despliegues. Existen
`scripts/export-sqlite.ts` e `import-json.ts` para no perder los datos de
entonces.

**Vercel + Neon, los dos gratis.** Vercel ejecuta la aplicación y Neon guarda los
datos. Ninguno pide tarjeta. Guía completa en `DEPLOY.md`.

**PWA en vez de app de tienda.** El usuario pidió app de móvil priorizándola
sobre la web si había que elegir. No hizo falta elegir: una PWA se instala desde
el navegador, queda con su icono, se abre a pantalla completa y **es la misma
web** que se ve en PC. Estar en Google Play (25 € una vez) o App Store (99 €/año)
costaba dinero y no aportaba nada para seis amigos.

**Autenticación propia**, cookie firmada (JWT con `jose`) + bcrypt. No se metió
un proveedor externo porque son seis usuarios creados a mano y no hacía falta.

**Las notas privadas son privadas de verdad.** Todas las consultas filtran por
`authorId`, y los borrados usan `deleteMany` con ese filtro, de modo que ni un
administrador puede leer o tocar notas ajenas aunque manipule un id. Se eligió
esta opción frente a "autor + admins" a petición del usuario.

**La ruleta se sortea en el servidor.** El resultado se decide en
`spinRouletteAction` y la animación del navegador solo aterriza donde ya se
decidió; así nadie puede manipular el sorteo desde las herramientas del
navegador. Los pesos hacen que unas opciones salgan más que otras.

**Girar cuesta un ticket, y cada ticket es de su ruleta.** El de una no sirve
para otra: el saldo se lleva por pareja jugador-ruleta. Los reparten los
administradores, que son los únicos que giran gratis. Los tickets son un
historial como los puntos (`+n` al concederlos, `-1` al gastarlos) en vez de un
contador, así queda constancia de quién dio qué y por qué, y el muro de
actividad puede contarlo. El gasto y el giro van en una misma transacción
**serializable** que vuelve a sumar el saldo por dentro: si se colara una
tirada de más, la transacción entera se deshace y no se puede quedar en
negativo. El saldo también se comprueba antes, para dar un mensaje claro sin
llegar a la transacción. En la base de datos `rouletteId` quedó opcional para
no romper las filas de la primera versión, en la que los tickets valían para
cualquier ruleta; el código lo exige siempre y esas filas antiguas no cuentan.

**Los puntos son un historial, no un contador.** Cada movimiento guarda motivo,
autor y fecha, y el total se calcula sumando. Permite deshacer y auditar. Los
puntos de victoria en jornada se enlazan al combate (`sourceMatchId`), así que
corregir un resultado no duplica puntos.

**Las imágenes se guardan dentro de la base de datos** como data URL, ya
reducidas en el navegador. Ventaja: copiar la base de datos es copiar la
aplicación entera con sus fotos, sin ficheros sueltos ni servicios de terceros.
Se usan en cuatro sitios: sprite y ficha de cada baja, foto de perfil, y
medallas o líderes de cada level cap. En este último, la imagen se ve en grande
con el nivel como chapita encima, y de fondo difuminado en la tarjeta; sin
imagen se mantiene el cuadrado con el número.

**Un level cap admite varias imágenes**, que se van alternando con un fundido
cada 4 segundos: nació para el Alto Mando, que son cuatro personas y no hay
ilustración conjunta. Con una sola imagen no se mueve nada. La rotación se
detiene cuando la pestaña no está a la vista y respeta la opción del sistema de
reducir animaciones. Guardar la lista en una columna `String[]` de Postgres, en
vez de en una tabla aparte, mantiene el orden sin joins; la columna antigua
`image` se conserva como respaldo de lectura para no forzar una migración
destructiva, y se vacía sola al guardar desde el formulario.

**Imágenes automáticas del cementerio.** Buscarlas a mano era lo más lento de
registrar una baja. Ahora se escribe la especie en español y se rellenan solas:
render de **Pokémon HOME** para la casilla e **ilustración oficial** para la
ficha, con desplegable de formas alternas y casilla de shiny. Se usan las
"variedades" de PokéAPI, que incluyen Alola, Galar, Hisui, Paldea, megas, Rotom o
Deoxys, pero dejan fuera las formas decorativas con cientos de variantes (los
patrones de Spinda, las letras de Unown, Vivillon), que solo ensuciarían el
desplegable. Las imágenes se descargan una vez y se guardan como copia propia.

**La ilustración grande se carga aparte.** Al ponerse imagen automáticamente en
todo, el listado del cementerio habría engordado sin control. La caja solo manda
los sprites pequeños; cada ficha pide su ilustración al abrirse.

**Instalación sin terminal.** El despliegue exigía preparar la base de datos por
línea de comandos, que es donde más se atascaba el usuario. Ahora el build
ejecuta `prisma db push` (las tablas se crean solas) y, con la base de datos
vacía, la aplicación lleva a una pantalla que crea la cuenta de administrador.

**Cada jugador tiene un pokémon as**, su representante. Se guarda en el
participante y no en el usuario, para que cada edición conserve el suyo al
archivarse. Se elige desde Mi perfil con el mismo buscador del cementerio, y se
enseña en la clasificación y en la cabecera de su caja del cementerio; al
pincharlo se abre su ficha con la ilustración grande, el mote y el motivo por el
que es su as. **A propósito no aparece en las jornadas**: el usuario prefiere no
perder el factor sorpresa antes de un combate.

**Cada jornada tiene un MVP**, al lado de su nombre: sprite, mote y dueño, y al
pincharlo su ficha con la ilustración grande y el porqué (opcional). Lo nombran
los **administradores**, no cada jugador, porque es un premio de la organización
como el resultado de un combate. Se guarda en la jornada, no en un combate
concreto, porque premia la jornada entera, y con **copia propia de las
imágenes**: así queda congelado aunque ese pokémon cambie de mote o muera
después. Es la única cosa del as que sí aparece en jornadas, y no rompe la
sorpresa porque se pone cuando la jornada ya está jugada.

**Los diálogos se pintan con `createPortal` sobre el `body`.** Las tarjetas
llevan `backdrop-blur`, y un elemento con `backdrop-filter` hace que sus hijos
`position: fixed` se posicionen respecto a la tarjeta en vez de a la pantalla:
el diálogo salía incrustado en mitad de la página. Vale tanto para la ficha del
as como para la del cementerio.

**La Final Four se abre sola, pero se siembra a mano.** Mientras quede un
combate de jornada sin resultado, la pantalla está bloqueada con una barra de
progreso: hasta entonces no se sabe cómo queda la tabla. Cuando están todos,
un administrador genera el cuadro y ahí se **congela la clasificación** en
`FinalFour.seeds`; si después se corrige un punto, el cuadro no se recoloca a
mitad del torneo. Los emparejamientos no se guardan, se deducen de la siembra y
de quién va ganando (3º-6º y 4º-5º en cruces, los ganadores contra 1º y 2º en
semifinales, y la final entre esos dos), así que el cuadro no puede quedar
incoherente. Cambiar un resultado limpia los de las rondas siguientes.

**El hall de la fama se abre al haber campeón.** Cada jugador registra el
equipo de 6 con el que terminó, con el mismo buscador de especie, y se ordena
como una clasificación final: campeón, subcampeón y el resto por puntos. Se
comprueba en el servidor que la Final Four esté decidida antes de admitir nada.

**El muro de actividad no guarda eventos propios.** Consulta cada fuente
(muertes, puntos, gimnasios superados, giros, combates) y las mezcla por fecha.
Así no hay una tabla de eventos que pueda desincronizarse de los datos reales,
y borrar algo lo quita también del muro. Los puntos que vienen de ganar un
combate se omiten para no contar la misma cosa dos veces.

**Temas: uno por juego principal de Pokémon.** El criterio es un tema por cada
juego con nombre propio; quedan fuera las variantes del mismo nombre (Rubí
Omega, Ultrasol, Blanco 2, HeartGold) porque compartirían color, y sí entran las
terceras ediciones, que tienen nombre y color propios. Todos son oscuros: lo que
cambia es el acento y el tinte de los fondos. Se guardan como variables CSS
aplicadas al `<html>` desde el servidor, así que no hay parpadeo de color al
cargar, y la paleta de cada uno se calcula a partir de un color de acento y un
tono en `src/lib/themes.ts` en vez de escribir a mano cientos de valores. El
tema es **de cada usuario**, no de la competición.

**Los temas admiten dos colores.** Los de los juegos usan uno solo, pero los de
los **ases del Hexalocke 1** (Kojima/Emboar, Josuke/Scrafty,
Eramosdos/Ninjask, David Evil/Drapion, Dinotren/Haxorus) llevan el color del
cuerpo del pokémon en los botones y un segundo color suyo en los detalles:
enlaces, rótulos de sección, la pestaña activa y el segundo halo del fondo. Por
eso `ThemeSeed` tiene un campo `detail` opcional, y la muestra del selector se
pinta como degradado entre los dos.

---

## 4. Reglas del locke que están implementadas

- **Clasificación y desempates**: puntos → menos pokémon muertos → mejor
  diferencia de pokémon en combates de jornada. Los dos primeros se marcan como
  clasificados directos a la Final Four.
- **Jornadas**: emparejamientos por pareja, 1 punto por victoria, configurable.
- **Level caps**: cada jugador marca su gimnasio superado, para ver quién frena
  al grupo (nadie sigue hasta que todos pasen).
- **Puntos iniciales**: 5 por defecto, configurable por competición.

---

## 5. Mapa del código

```
src/
  app/
    (app)/          páginas con sesión iniciada, una carpeta por sección
    actions/        server actions agrupadas por dominio
    instalacion/    pantalla de primer arranque
    login/          acceso
  components/       UI compartida: ruleta, caja del cementerio, buscador de
                    especie, navegación, formularios base
  lib/              db, auth, sesión, permisos, clasificación, pokédex, imágenes
prisma/
  schema.prisma     modelo de datos
  seed.ts           datos de ejemplo completos (6 jugadores y jornadas)
scripts/
  users.ts          listar usuarios y cambiar contraseñas
  generate-pokedex.ts  regenera src/lib/pokedex.json desde PokéAPI
  export-sqlite.ts / import-json.ts   migración desde la versión antigua
public/
  sw.js, icons/     piezas de la PWA
```

Piezas con truco:

- `lib/competition.ts` — `getStandings()` calcula la clasificación con sus
  desempates; `assertCanActForParticipant()` centraliza los permisos.
- `components/species-picker.tsx` — buscador de pokémon y descarga de imágenes.
  Lo comparten el cementerio, el as, el hall de la fama y el MVP de jornada.
- `components/mvp-badge.tsx` — la chapa del MVP y su ficha. Igual que la del as:
  la ilustración grande no viaja con la lista, se pide al abrir la ficha.
- `components/roulette-wheel.tsx` — la rueda SVG; las etiquetas de la mitad
  izquierda se voltean para que se lean del derecho.
- `lib/activity.ts` — junta las cinco fuentes del muro en una cronología.
- `lib/themes.ts` — genera la paleta de cada tema a partir de un acento.
- `components/image-carousel.tsx` — el fundido entre imágenes, tanto en primer
  plano como de fondo. `level-caps/level-cap-art.tsx` mete los dos en el mismo
  componente para que cambien a la vez.
- `globals.css` — las clases propias son `@utility` (Tailwind 4 no deja
  componerlas con `@apply` de otro modo), y hay una regla `.grid > * {
  min-width: 0 }` que evita el scroll horizontal en móvil.

---

## 6. Estado y pendientes

**Pendiente ahora mismo**: el usuario todavía no ha desplegado. El siguiente
paso es seguir `DEPLOY.md` (crear Neon, crear Vercel, dos variables de entorno).
Hasta entonces la aplicación solo corre en su ordenador.

Ideas comentadas y no hechas:

- **Equipos vivos**: fichar los 6 pokémon en juego, no solo los muertos. Sería
  la siguiente en valor: permitiría el botón "ha caído" que rellena la ficha
  sola y avisar de quién se pasa del level cap.
- **Encuentros por ruta**: qué salió en cada zona y si se capturó.
- **Apuestas entre jornadas**: proponer y votar, como dicen las reglas.
- **Enlaces a las grabaciones** de cada combate de gimnasio.
- **Exportar una edición archivada** a PDF o imagen como recuerdo, ahora que
  el hall de la fama da un buen cierre.

---

## 7. Cómo trabajar con este proyecto

El proyecto lo dirige el organizador del locke, que decide qué se hace y
prueba cada cambio en el móvil; el código se escribe con un asistente de IA.
Conviene:

- Escribir en español, tanto la interfaz como los comentarios del código.
- Explicar los pasos con detalle, sin jerga, diciendo qué verá en pantalla.
- Evitar que dependa de la terminal cuando haya alternativa por navegador.

Una vez montado Vercel, **cada push a la rama principal se publica solo**. Los
datos viven en Neon y no se tocan al desplegar. Si un cambio necesita campos
nuevos, el build los crea; si implicara borrar algo, el despliegue se detiene en
lugar de destruir datos, y hay que avisar antes.

---

## 8. Cronología

1. **Aplicación base** a partir del PDF: reglas, level caps, muertes, notas
   privadas, ruleta, puntos, jornadas y competiciones independientes.
2. **Cementerio como caja de pokémon**: formulario reducido, cuadrícula de
   casillas, ficha con imagen grande, y foto de perfil para los jugadores.
3. **A internet**: migración a PostgreSQL, PWA instalable, navegación móvil con
   barra inferior, y guía de despliegue.
4. **Instalación desde el navegador**: sin terminal, con pantalla de bienvenida.
5. **Imágenes automáticas** del cementerio desde PokéAPI, con formas y shiny.
6. **Medallas o líderes** en cada level cap, una o varias alternándose con un
   fundido, también en la tarjeta de resumen del inicio.
7. **Muro de actividad** y **temas por juego** elegibles desde el perfil.
8. **Pokémon as** de cada jugador, con su ficha, su mote y su porqué.
9. **Temas de los ases del Hexalocke 1**, a dos colores cada uno.
10. **Final Four** y **hall de la fama**, el cierre del locke.
11. **Tickets de ruleta**, uno por ruleta: girar deja de ser cosa solo de
    administradores.
12. **MVP de cada jornada**, con su pokémon, su dueño y su porqué.
