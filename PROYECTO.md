# HexaApp — memoria del proyecto

> Resumen de todo lo hablado y decidido, para no depender de que exista el chat
> donde se construyó. Si retomas el proyecto en una conversación nueva, empieza
> pasando este fichero: contiene el contexto, las decisiones y el porqué de cada
> una.
>
> **Este documento se actualiza con cada cambio.** Ver `CLAUDE.md`.

Última actualización: 10 de agosto de 2026 (menos consultas por página y
pantalla de diagnóstico).

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
| **Jornadas** | Emparejamientos; marcar ganador suma el punto automáticamente. Bajo cada combate, el equipo que sacó cada jugador. El MVP de la jornada se vota entre todos. |
| **Puntos** | Clasificación con desempates, el as de cada jugador, ajustes ±1, con motivo, masivos, e historial. |
| **Perfil de jugador** | Página propia de cada uno: sus cifras, su as, sus pokémon favoritos y su cementerio. Se llega tocando su foto en cualquier sitio. |
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

**Los sprites los descarga el servidor, no el navegador.** Cada pokémon que se
apunta necesita dos imágenes de GitHub: el render de Pokémon HOME y la
ilustración oficial, **unos 110 KB cada una**. Antes se las bajaba el navegador,
las redimensionaba con canvas y subía 57 KB de base64 al guardar; había que
esperar a todo eso *antes* de poder pulsar el botón, y apuntar un equipo de
jornada son seis seguidos. Ahora el navegador solo manda el número de la especie
y las descarga el servidor con `sharp` (ver `lib/sprites-servidor.ts`): de
centro de datos a centro de datos, unos 150 ms. Medido con un equipo de 6: de
7,7 s a 1,8 s, y de 288 KB subidos a 5 KB.

**El pokémon aparece antes de que el servidor conteste.** Aun con la descarga en
el servidor quedaban unos 600 ms por bicho, casi todos de volver a generar la
página de jornadas entera. Con `useOptimistic` la casilla sale al momento (con el
sprite pixelado de 900 bytes de relleno) y el formulario se vacía al instante,
así que se pueden encadenar los seis sin esperar; cuando el servidor contesta,
la lista de verdad sustituye a la provisional, y si algo falla el pokémon
desaparece solo y sale el aviso. El envío se hace a mano en vez de con
`action={...}` para poder **leer el formulario antes de vaciarlo**: dejándoselo
a React la limpieza caía a destiempo y se perdía el mote.

**Imágenes automáticas del cementerio.** Buscarlas a mano era lo más lento de
registrar una baja. Ahora se escribe la especie en español y se rellenan solas:
render de **Pokémon HOME** para la casilla e **ilustración oficial** para la
ficha, con desplegable de formas alternas y casilla de shiny. Se usan las
"variedades" de PokéAPI, que incluyen Alola, Galar, Hisui, Paldea, megas, Rotom o
Deoxys, pero dejan fuera las formas decorativas con cientos de variantes (los
patrones de Spinda, las letras de Unown, Vivillon), que solo ensuciarían el
desplegable. Las imágenes se descargan una vez y se guardan como copia propia.

**La ilustración grande se carga aparte.** Al ponerse imagen automáticamente en
todo, el listado del cementerio habría engordado sin control. Antes esto se
hacía con una acción que pedía la ilustración al abrir cada ficha; desde que las
imágenes se sirven por dirección ya no hace falta: la etiqueta `<img>` de la
ficha se baja sola su archivo cuando toca, y esas acciones se han borrado.

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

**Cada combate lleva el equipo de los dos jugadores**, debajo del
emparejamiento, con los **sprites de caja de Pokémon HOME** (la ilustración
oficial queda para la ficha del MVP, que es donde luce). Los apunta el
administrador, como el resultado, con tope de 6 por jugador y combate. De cada
pokémon se guardan **las dos imágenes**: el sprite para la lista y la
ilustración por si gana la votación, y con copia propia, así que el equipo de
una jornada no cambia aunque ese pokémon muera después.

**El MVP de la jornada sale de una votación**, no lo elige nadie a dedo. Los
candidatos son todos los pokémon que jugaron esa jornada, y vota cada jugador de
la competición (uno por jornada; volver a votar cambia el voto en vez de sumar
otro). Gana por **mayoría simple**: el más votado, aunque no pase de la mitad.
El ganador **no se guarda**, se recalcula del recuento, para que no pueda quedar
desincronizado si alguien cambia su voto o se borra un pokémon. Si hay empate
arriba no hay MVP: o alguien mueve su voto, o un administrador desempata, y ese
desempate solo vale **mientras el empate siga** — si los votos lo deshacen,
manda la votación. Lo único que sí escribe un administrador es el porqué.

**La votación se navega por entrenador, no como una lista de todo.** Seis
jugadores a seis pokémon son 36 filas seguidas, y encontrar el tuyo ahí era un
lío. Ahora hay una fila por jugador, que se despliega con sus pokémon de esa
jornada; se abre uno cada vez, y al entrar se abre solo el del voto propio. El
orden **no depende de los votos**: los jugadores van alfabéticos y sus pokémon
en el orden del equipo, el mismo que se ve en el combate, para que la lista no
se recoloque bajo el dedo cada vez que alguien vota. Los votos sí se ven sin
desplegar: cada jugador lleva al lado la suma de los suyos.

Que el equipo se vea en la jornada no choca con lo del pokémon as: los equipos
se apuntan cuando el combate ya se ha jugado, así que no adelantan nada.

**Las imágenes se guardan en la base de datos pero se sirven como archivos.**
Esta fue la causa de que la aplicación se arrastrara según se iba llenando. Las
fotos se guardan como data URL (base64) dentro de la base de datos, y al
pintarlas se incrustaban en el HTML: un cementerio con 72 bajas mandaba **4,2 MB
de HTML en cada visita**, sin poder guardarse en caché, y cada acción (votar,
cambiar de página) volvía a mandarlo entero. Ahora la página lleva solo una
dirección de unos 50 caracteres por imagen (`/api/imagen/...`) y el navegador se
baja cada archivo aparte y lo guarda. El HTML de esa página bajó a 152 KB, y de
9 KB una vez comprimido.

Tres piezas lo sostienen:

- **La firma en la dirección.** Cada dirección lleva `?v=` con un resumen del
  contenido, que calcula PostgreSQL con `md5()`: por el cable vuelven 10
  caracteres en vez de 44 KB. Como la dirección cambia si cambia la imagen, la
  caché puede ser de un año sin riesgo de enseñar la vieja.
- **Nada de imágenes por defecto.** El cliente de Prisma descarta las columnas
  de imagen en todas las consultas (`omit` en `lib/db.ts`). Quien las necesita
  las pide a mano. Así un descuido futuro sale como una imagen que no aparece,
  no como una página de 4 MB otra vez.
- **"No lo he tocado" es distinto de "quítalo".** Los formularios ya no llevan
  dentro la imagen actual, así que mandan la marca `__igual__` cuando no se ha
  cambiado nada; dejarlo vacío sigue significando borrarla. Sin esto, editar la
  causa de una baja le habría borrado la foto.

**Cada jugador tiene su página, y se llega tocando su foto.** En
`/jugador/[id]`: sus cifras (puntos, caídos, victorias-derrotas, gimnasios), su
pokémon as, sus favoritos y las últimas bajas de su cementerio, en blanco y
negro. La foto lleva al perfil desde la clasificación, los puntos, el
cementerio, las jornadas, el cuadro de la Final Four y el reparto de tickets.
**No** desde los sitios donde el avatar ya va dentro de un botón (los grupos de
la votación del MVP, el editor de equipos): un enlace dentro de un botón no es
HTML válido y el navegador hace cosas raras.

**Pokémon favoritos: seis, en 3x2, iguales en móvil y en PC.** Los que le han
hecho el locke a cada uno, vivos o muertos, con su sprite, su mote y su especie.
Se editan desde Mi perfil o desde tu propia página, y los ve todo el mundo. Los
seis huecos están siempre puestos, como en los equipos de jornada. Tres columnas
también en móvil: a 320 px salen casillas de 77 px, que dan de sobra para el
sprite y el mote.

**El selector de temas va plegado, y por grupos.** Con casi treinta temas la
rejilla entera se comía la pantalla del perfil. Ahora se ve solo el que llevas
puesto; al abrirlo salen los grupos (generaciones y ases), y cada uno se abre
por su cuenta. Arranca abierto el grupo del tema que tienes, para no perderte.

**Lo que hace lenta a la aplicación es el número de consultas, no su peso.**
Cada consulta es un viaje de ida y vuelta a la base de datos, y en Neon esa
base de datos está en internet. Medido con un proxy que añade retardo:

| Ida y vuelta | Portada | Jornadas |
| --- | --- | --- |
| ~0 ms (local) | 30 ms | 25 ms |
| 50 ms | 974 ms | 913 ms |
| 120 ms | **2,2 s** | 1,8 s |

Con 25-30 consultas por página, la distancia manda sobre todo lo demás. De ahí
dos reglas:

- **No usar `include` anidados para datos que ya se tienen.** Prisma resuelve
  cada nivel de relación con **una consulta aparte**: el muro de actividad,
  con seis fuentes que traían participante y usuario, hacía 18 consultas donde
  bastan 6. Ahora los nombres y colores salen de `getParticipants`, que está
  cacheada por petición.
- **Juntar las consultas de firmas de imagen** cuando son de la misma tabla
  (`firmasDeDosImagenes`).

La portada bajó de 39 a 28 consultas y el muro de 24 a 18.

**Hay una pantalla de diagnóstico** en `/diagnostico`, solo para
administradores: mide la ida y vuelta real a la base de datos desde donde esté
desplegada la aplicación, y avisa si el servidor y la base de datos están en
regiones distintas o si falta el *pooler*. Existe porque desde el código no se
puede saber, y es la diferencia entre 5 ms y 120 ms por consulta.

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
- `components/species-picker.tsx` — buscador de pokémon. Solo manda **qué**
  pokémon es; las imágenes las baja `lib/sprites-servidor.ts` al guardar. La
  vista previa usa el sprite pixelado, que pesa 900 bytes en vez de 110 KB. Lo
  comparten el cementerio, el as, el hall de la fama y los equipos de jornada.
- `lib/imagenes.ts` y `lib/imagen-url.ts` — las direcciones de las imágenes y
  sus firmas. `app/api/imagen/[...partes]/route.ts` es quien las sirve.
- `lib/mvp.ts` — el recuento de la votación al MVP: quién gana, si hay empate y
  cuándo vale el desempate manual. Es la única fuente de verdad del MVP.
- `components/mvp-badge.tsx` — la chapa del MVP, su ficha y la votación. Igual
  que la del as: la ilustración grande no viaja con la lista, se pide al abrir.
- `components/favorites-grid.tsx` — la caja de favoritos, con la misma idea que
  los equipos: aparece al momento y el servidor baja el sprite después.
- `components/match-team.tsx` — los equipos bajo cada combate y el editor del
  administrador. **Dos vistas del mismo dato**: en móvil una tira de sprites
  por jugador, que es lo que cabe, y desde `lg` dos cajas de 3x2 una al lado
  de la otra, con los seis huecos siempre puestos (los que faltan van de línea
  discontinua) para que las dos midan igual. Al guardar, el entrenador elegido
  se conserva (se apuntan seis seguidos del mismo) y el buscador y el mote se
  vacían remontándolos con `key`: los dos llevan estado propio y un `reset()`
  del formulario no los limpiaría.
- `components/roulette-wheel.tsx` — la rueda SVG; las etiquetas de la mitad
  izquierda se voltean para que se lean del derecho.
- `lib/activity.ts` — junta las cinco fuentes del muro en una cronología.
- `lib/themes.ts` — genera la paleta de cada tema a partir de un acento.
- `components/image-carousel.tsx` — el fundido entre imágenes, tanto en primer
  plano como de fondo. `level-caps/level-cap-art.tsx` mete los dos en el mismo
  componente para que cambien a la vez.
- `globals.css` — las clases propias son `@utility` (Tailwind 4 no deja
  componerlas con `@apply` de otro modo), y hay una regla `.grid > * {
  min-width: 0 }` que evita el scroll horizontal en móvil. También sube la
  base de `rem` a 17px desde 1024px y a 18px desde 1536px: en un monitor la
  interfaz se quedaba pequeña, y como las medidas de Tailwind van en rem, eso
  escala texto, espaciados y esquinas de golpe sin tocar ninguna clase. Los
  puntos de ruptura no se mueven, porque las media queries siempre miden con
  los 16px iniciales.

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
13. **Equipos por combate** y el MVP pasa a decidirse **por votación** entre
    todos los pokémon que jugaron la jornada.
14. **Las imágenes dejan de viajar dentro del HTML** y se sirven como archivos
    cacheables: era la razón de que todo fuera cada vez más lento.
15. **Apuntar un pokémon deja de esperar**: los sprites los descarga el
    servidor y la casilla aparece al momento.
16. **Página propia de cada jugador** (se llega tocando su foto), con sus
    **pokémon favoritos**, y el selector de temas plegable.
17. **Menos consultas por página** y pantalla de **diagnóstico** para medir la
    distancia real a la base de datos.
