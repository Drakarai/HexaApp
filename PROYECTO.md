# HexaApp — memoria del proyecto

> Resumen de todo lo hablado y decidido, para no depender de que exista el chat
> donde se construyó. Si retomas el proyecto en una conversación nueva, empieza
> pasando este fichero: contiene el contexto, las decisiones y el porqué de cada
> una.
>
> **Este documento se actualiza con cada cambio.** Ver `CLAUDE.md`.

Última actualización: 24 de agosto de 2026 (mapa de capturas privado, con los
mapas de las regiones editables).

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
| **Level caps** | Nivel máximo por gimnasio, con una o varias imágenes que se alternan; cada jugador marca cuándo lo supera y puede enlazar el vídeo de su combate. |
| **Cementerio** | Caja estilo PC de Pokémon; cada casilla abre una ficha con imagen grande. |
| **Jornadas** | Emparejamientos; marcar ganador suma el punto automáticamente. Bajo cada combate, el equipo que sacó cada jugador, y un botón a su repetición si el admin pegó el enlace. El MVP de la jornada se vota entre todos. |
| **Retos** | Piques sueltos entre dos, con premio, castigo y enlace a la repetición. Cuentan para victorias y derrotas, pero no dan puntos. |
| **Puntos** | Clasificación con desempates, el gráfico de cómo ha ido jornada a jornada, el as de cada jugador, ajustes ±1, con motivo, masivos, e historial. |
| **Perfil de jugador** | Página propia de cada uno: su título, sus cifras, su as, sus pokémon favoritos, su cara a cara con cada rival y su cementerio. Se llega tocando su foto en cualquier sitio. |
| **Mapa de capturas** | El mapa de la región del juego que se esté jugando, con sus rutas y sitios. Cada uno apunta lo que capturó en cada zona, con el buscador de especie de siempre, y tiene aparte las capturas extra. **Privado como las notas**: no lo ven ni los administradores. |
| **Bolsa** | Lo que lleva encima cada jugador. La llenan los administradores; cada uno solo ve la suya y gasta lo suyo con un botón. Hay **objetos**, que se gastan directamente ("Captura extra"), y **grupos**, que llevan varios dentro ("Objeto competitivo" → Globo Helio, Casco Dentado…) y al usarlos te hacen elegir uno. |
| **Mis notas** | Cuaderno privado con un sub-apartado por jugador. Solo lo ve su autor. |
| **Competiciones** | Crear ediciones copiando configuración, archivar, gestionar jugadores. El juego se elige de una lista (1ª a 7ª generación, remakes aparte) y de ahí sale la región del mapa. |
| **Administración** | Alta de usuarios, roles y contraseñas, los ajustes de la edición, los títulos, los mapas de las regiones y las copias de seguridad. |
| **Final Four** | Cuadro de 5 combates que se abre al terminar todas las jornadas, con campeón al final. |
| **Hall de la fama** | Equipo de 6 pokémon por jugador, disponible cuando la Final Four ya tiene campeón. |
| **Ruleta** | Sorteos personalizables; girar gasta un ticket de esa ruleta, salvo los administradores. |
| **Actividad** | Cronología con muertes, puntos, gimnasios superados, giros de ruleta, resultados de jornada y objetos gastados. |
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

**El gráfico de la clasificación dibuja puestos, no puntos.** Con seis
jugadores y un punto por victoria, todo el mundo va siempre metido en un margen
de dos o tres puntos: pintando los puntos en el eje vertical, las seis líneas
salen amontonadas en un dedo de alto y no se distingue nada. Por **puestos**,
cada uno tiene su carril y lo que se ve son los adelantamientos, que es lo que
apetece mirar. La cifra de puntos va escrita dentro de cada bola para no
perderla.

- **Los empatados comparten bola, y esa bola va en el centro de los puestos
  que ocupan.** Por eso en "Inicio", con los seis a cinco puntos, sale una sola
  bola a media altura y las líneas se abren en abanico desde ahí. El orden es el
  mismo de la clasificación (puntos → menos muertos → mejor diferencia) pero
  **sin desempatar por nombre**: inventarse un orden alfabético para pintarlo
  sería mentir.
- **Los puestos salen con los mismos desempates que la tabla**: puntos, luego
  menos caídos, luego mejor diferencia de pokémon. Al tocar una bola se ven las
  tres cifras, porque si no, dos con los mismos puntos aparecen uno encima del
  otro sin que se entienda por qué.
- **El eje horizontal son las jornadas, no las fechas**: seis marcas legibles en
  vez de cuarenta fechas irregulares. Lo que no está enlazado a un combate —las
  muertes y los ajustes de puntos a mano— se reparte por fecha, usando como
  corte de cada jornada la última de sus fechas conocidas, que nunca puede ir
  hacia atrás respecto a la anterior.
- **El último corte es "ahora", no la fecha de la última jornada.** Esto fue un
  fallo de verdad: todo lo que pasaba después de la última jornada —un ajuste de
  puntos a mano, una baja apuntada más tarde— tenía fecha posterior al corte y
  se quedaba fuera del gráfico **entero**, así que la última columna decía una
  cosa y la tabla de al lado otra. La última foto es la de ahora mismo y tiene
  que cuadrar con la clasificación; hay una prueba que compara las dos.
- **Dibujado a mano en SVG, sin librerías.** Son seis polilíneas de seis puntos;
  una librería de gráficos serían cientos de kilobytes para esto. Hay precedente:
  la ruleta también es SVG a pelo.
- **Las fotos van al final de cada línea**, haciendo de leyenda: no hay que
  mirar arriba y abajo para saber cuál es la tuya, y de paso resuelve que
  alguien no distinga bien dos colores. Al tocar una línea (o una foto) se
  resalta y las demás se apagan.
- En el móvil **se desliza en horizontal** dentro de su tarjeta en vez de
  encogerse, porque con las letras a la mitad no se leería. El aviso de que hay
  más a la derecha solo sale si de verdad se sale, medido con un
  `ResizeObserver`, no supuesto por el ancho de la pantalla.

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

**Los títulos son adorno, y solo adorno.** Un administrador se inventa
distinciones —"Rey del cementerio", "El que nunca falla"— con su emoji, su color
y una explicación, y se las reparte a quien quiera, cada una con el porqué
escrito a mano. No dan puntos, ni ventajas, ni cuentan para nada de la
clasificación: son una chapita debajo del nombre.

- **Van en el usuario, no en el participante.** Un título es de la persona y la
  sigue de una edición a la siguiente, como el mote con el que se la conoce. El
  as, en cambio, va en el participante, porque ese sí es de una edición
  concreta.
- **Cuál se lleva puesto se guarda en la concesión** (`TitleAward.equipped`) y
  no como una columna de `User`. Con la columna en `User` haría falta un
  `@unique` sobre una clave foránea nueva, y `prisma db push` avisa de posible
  pérdida de datos al añadirla: eso **para el despliegue en seco**, que es justo
  la protección que se montó a propósito. Que solo haya uno encendido lo
  garantiza la acción de equipar, que apaga los demás en la misma transacción.
- **Lo elige el dueño o un administrador**, los dos. Cada uno se pone el que le
  guste, y el admin también puede ponerle uno a alguien desde su perfil.
- El mismo título no se da dos veces a la misma persona (`@@unique`), y quien ya
  lo tiene desaparece de la lista de candidatos.

**La clasificación son fichas en el móvil y tabla desde `sm`.** Y el motivo fue
querer enseñar los títulos: en la tabla, la columna del nombre en un móvil son
unos 130 px, así que cualquier título salía cortado a la mitad — y un título a
medias queda peor que no ponerlo. Al pasar a fichas, **el título tiene una línea
para él solo con el ancho entero de la pantalla**, y de paso desapareció el
arrastre horizontal que hacía falta para ver las últimas columnas.

- **El emoji va encima de la foto**, en una chapita pegada a la esquina, en las
  dos formas. Ahí no le quita ni un píxel al nombre. Si el título no tiene
  emoji sale una estrella.
- **El nombre del título cabe en tres líneas** antes de cortarse
  (`line-clamp-3`), y con más de una la chapa pasa de óvalo a esquina
  redondeada: un óvalo de tres líneas parece una pastilla rota. Con el tope de
  **60 caracteres** por título, tres líneas llegan hasta a 320 px.
- **Las cifras van en una rejilla de columnas iguales**, con su rótulo debajo
  (Pts, 💀, V-D, Dif.). Todas las fichas usan la misma rejilla, así que **quedan
  alineadas de una a otra** igual que en la tabla. El primer intento las puso
  seguidas en una línea corrida —"12 💀 · 5-0 · +10"— y así se leían como una
  nota al pie: perdían el rango que tienen, que es el motivo de que la
  clasificación exista.
- En la ficha **no va la versión del juego**: a 320 px salía cortada a "Hea…", y
  está en el perfil de cada uno.
- El precio de las fichas es el alto: la clasificación del resumen pasa de unos
  400 px a unos 1.000 en un móvil. Si algún día molesta, ahí se puede usar el
  modo `compact` o enseñar solo el podio.
- Los títulos de la clasificación se traen **en una sola consulta con `join`** en
  vez de con `include`, que serían dos: la portada cuenta cada viaje a la base
  de datos.

**Las copias de seguridad se hacen solas, se bajan y se restauran.** Todo vive
en la cuenta gratis de Neon, así que hacía falta una red debajo. Un volcado es
**todas las tablas menos la de las propias copias** —meterlas dentro haría que
cada copia contuviera a las anteriores y el tamaño se multiplicara sola—, en
JSON, comprimido con gzip. Con las fotos dentro son unos 5,5 MB por copia; se
guardan las 5 últimas.

- **Se hace sola sin tareas programadas.** Al cargar el resumen se mira si la
  última tiene más de un día y, si toca, se hace otra con `after()`, o sea
  **después de mandar la página**: nadie espera por ello. Se descartó una tarea
  programada de Vercel porque obliga a configurar a mano una variable de entorno
  (`CRON_SECRET`) para que el enlace no quede abierto a cualquiera, y este
  proyecto va de no depender de la terminal. Si nadie abre la aplicación en una
  semana tampoco hay nada nuevo que copiar.
- **Se pide turno antes de copiar.** Si dos personas entran a la vez y a las dos
  les toca, las dos miraban "¿hace más de un día?" antes de que ninguna hubiera
  guardado nada y salían dos copias idénticas. Ahora se reserva una fila vacía
  dentro de una transacción con `pg_try_advisory_xact_lock` —que dura lo que
  tarda un `insert`— y el volcado, que es lo lento, va ya fuera. Una fila con
  `rawSize` 0 es una reserva a medias: no se lista, y se limpia sola pasada una
  hora.
- **El orden para restaurar sale de la propia base de datos**, no de una lista
  escrita a mano que se quedaría vieja al añadir un modelo. Se leen las claves
  foráneas de `information_schema` y se ordenan las tablas por las que son
  obligatorias. El truco para las dependencias circulares —una jornada apunta al
  pokémon MVP, que apunta a su combate, que apunta a la jornada— es meter
  **todas las columnas que admiten nulo vacías** y rellenarlas en una segunda
  pasada. Así solo hay que ordenar por las obligatorias, que nunca pueden formar
  un círculo: si lo formaran, esos datos no habrían podido existir.
- **`json_populate_recordset` hace la conversión.** Postgres pasa el JSON al
  tipo exacto de cada tabla —fechas, listas de texto, nulos— sin escribir el
  mapeo a mano ni tabla por tabla.
- **Todo el restaurado va en una transacción**: o entra entero o no se toca
  nada. Y antes de empezar se guarda una copia "previa" de cómo estaba, por si
  la restaurada era la equivocada.
- **Hay que escribir RESTAURAR** en una casilla. Un botón que borra la
  aplicación entera no puede dispararse con un clic despistado.
- **La tabla `Backup` no tiene ninguna relación con el resto, a propósito.** Al
  restaurar se vacían todas las tablas; si colgara de `User`, el vaciado se
  llevaría por delante las copias justo cuando hacen falta. Por eso el autor se
  guarda como nombre suelto.
- **Lo que de verdad salva es el fichero descargado.** Las copias de dentro
  viven en la misma base de datos que la aplicación: si se cae Neon, se van con
  ella. Por eso se puede bajar cada copia como `.json` y **volver a subirla**
  sobre una base de datos nueva y vacía.

**Los vídeos de los gimnasios viven en YouTube, no aquí.** Cada jugador puede
enlazar el vídeo de cómo se pasó cada gimnasio, y se reproduce dentro de la
aplicación. Se guarda **solo la dirección**, y no había alternativa: un combate
son unos 115 MB, seis jugadores por once gimnasios son **7,6 GB por edición**, y
la base de datos gratis entera son 0,5 GB. Aunque cupieran, Vercel corta
cualquier subida a la aplicación en 4,5 MB, así que el fichero nunca podría
pasar por aquí. Con enlaces, además, las copias de seguridad siguen pesando
cinco megas en vez de gigas.

- **Solo se admite YouTube.** Es lo único que se puede incrustar y reproducir
  dentro, y de paso deja fuera cualquier `javascript:` disfrazado.
  `lib/youtube.ts` entiende las siete formas en que se pega un enlace —el de la
  barra, el de compartir con su `?si=`, el de la aplicación del móvil, `youtu.be`,
  `/shorts/`, `/live/`, con o sin `https://`— y **guarda la dirección ya
  limpia**, sin listas de reproducción ni parámetros de seguimiento, pero
  conservando el minuto de inicio si lo traía. Hay 26 casos de prueba.
- **El reproductor usa `youtube-nocookie.com`**, el modo de privacidad mejorada:
  no deja cookies de seguimiento hasta que se le da al play. Cuesta lo mismo.
- **El enlace va en su propia tabla (`GymVideo`), no dentro de `GymClear`.** Si
  colgara de la marca de "superado", desmarcar la casilla por un descuido se
  llevaría por delante el enlace. Así el vídeo sobrevive a que alguien la toque.
- Lo pone **su dueño o un administrador**, la misma regla que la casilla de
  superado, comprobada en el servidor.

**Cada combate puede llevar su repetición.** En las jornadas y en los retos, el
administrador tiene un campo donde pegar el enlace —la repetición de Showdown,
un vídeo, lo que sea— y entonces sale un botón **"Ver combate"** que lo ve todo
el mundo. Sin enlace no hay botón: nada de un botón muerto que no lleva a
ninguna parte.

Ese enlace lo escribe una persona y acaba dentro de un `href` en la pantalla de
los demás, así que pasa por `enlaceSeguro()` (en `lib/utils.ts`) antes de
guardarse: **solo `http` y `https`**, porque un `javascript:...` ahí metido se
ejecutaría en el navegador de todos. Y si viene sin `https://` delante —que es
como se pega media internet— se le pone, en vez de darlo por malo.

**Los retos son combates que no puntúan.** Un pique suelto entre dos jugadores,
fuera del calendario: se apunta el ganador, la diferencia de pokémon, lo que se
lleva el que gana (**premio**) y lo que se traga el que pierde (**castigo**), y
los dos equipos igual que en una jornada. **No dan puntos nunca**: la
clasificación es de las jornadas, y si un reto sumara, dos amigos podrían
subirse el uno al otro sin jugar la liga. Lo que sí hacen es contar como
victoria o derrota en el historial de cada uno.

Lo único negociable es la **diferencia de pokémon**, que es el tercer criterio
de desempate. Hay una casilla en Administración (`challengeDiffCounts`, por
edición) que decide si la de los retos entra en ese desempate o no; viene
apagada. Se guarda en la competición y no en cada reto para que la regla sea la
misma para todos y se pueda cambiar de opinión a mitad de edición sin repasar
combate por combate.

Los equipos de un reto se guardan en la **misma tabla** que los de jornada
(`MatchPokemon`, con `matchId` **o** `challengeMatchId`, uno de los dos). Son el
mismo dato y así el editor, la descarga de sprites y las direcciones de imagen
se comparten tal cual; duplicar la tabla habría obligado a duplicar las cuatro
piezas.

**La navegación va por grupos, y es la misma en el móvil y en el PC.** Antes
eran dos cosas distintas y las dos se estaban desbordando: en el móvil, las
secciones que no caben abajo se amontonaban detrás de un botón "Más", en una
cuadrícula de doce iconos todos iguales; en el PC, una columna de catorce
enlaces seguidos. En los dos casos había que leérselos todos para encontrar uno,
y con cada sección nueva iba a peor.

Ahora hay **tres grupos** —**Combates**, **La edición** y **Lo mío**— y **cada
grupo es una pestaña**, no un cajón detrás de un botón "Más". El reparto es el
mismo en los dos sitios; lo único que cambia es la forma: en el móvil, cada
pestaña abre su hoja con filas completas; en el PC, son grupos desplegables en
la barra lateral. Primero eliges de qué va lo que buscas y solo miras tres o
cinco cosas.

Suelto queda solo el **Resumen**. Lo de gestionar —Ediciones y Administración—
va al final de "La edición": se toca de uvas a peras y no merecía pestaña
propia. Y la Ruleta vive dentro de Combates, que es donde el usuario la quiso.

Detalles que costaron su rato:

- **Todo sale de las mismas constantes** (el objeto `S` y `GRUPOS`, en
  `layout.tsx`), así que no se puede añadir una sección en un sitio y olvidarla
  en el otro.
- **Los grupos del PC se abren solos donde estás**, aunque hayas llegado por un
  enlace de dentro de la página y no por el menú. El estado es "como toque"
  (`null`) hasta que lo tocas; al cambiar de página vuelve al automático. Con
  solo recordar tu clic, llegar a una página desde fuera del menú te dejaba el
  grupo cerrado y sin saber dónde estabas.
- **Un punto en el grupo cerrado** cuando estás dentro de él: si lo cierras a
  mano, es lo único que dice dónde estás sin volver a abrirlos.
- En el móvil, la hoja **deja hueco abajo** para la barra de pestañas, que se
  queda encima: sin ese hueco, "Cerrar sesión" quedaba tapado por la barra.
- La hoja de **"Lo mío" es la única que lleva tu foto y el "cerrar sesión"**
  (marca `personal` del grupo); las otras llevan su nombre en la cabecera, para
  saber cuál has abierto.

**El diagnóstico vive dentro de Mi perfil.** Ocupaba una entrada fija del menú
para algo que se mira cuando algo va lento, no todos los días. Ahora es un
botón en Mi perfil, solo visible para administradores; la página sigue siendo
la misma y sigue comprobando el permiso por su cuenta.

**El balance del perfil se abre y enseña el cara a cara.** En la página de cada
jugador, la casilla de victorias-derrotas ya no es solo la cifra: debajo lleva
su **presa favorita** (a quien más veces ha ganado) y su **bestia negra** (quien
más veces le ha ganado), y al pincharla se despliega la lista de todos los
rivales con el marcador contra él y su foto al lado. Si hay empate arriba pone
**Varios**, con el número de veces, en vez de elegir uno por orden alfabético.
Cuentan jornadas y retos juntos, porque los dos son combates. La etiqueta va
encima del nombre y no al lado: en una casilla de un cuarto de ancho, "Presa
favorita: Fulanito" salía cortado a la mitad.

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
  caché puede ser de un año sin riesgo de enseñar la vieja, y por eso las
  imágenes se sirven como **`public`**: las guarda también la red de Vercel, así
  que el segundo que abra el cementerio se las baja del servidor que tenga más
  cerca en vez de cruzar hasta Fráncfort. El precio es que quien tenga la
  dirección exacta puede abrirla sin sesión, porque la red contesta antes de
  llegar al código; se asumió a sabiendas, porque la dirección lleva un
  identificador aleatorio, no está enlazada en ningún sitio público y lo que hay
  dentro son sprites de pokémon y las fotos del grupo. Lo que **no** es una
  imagen (un 401, un 404) va con `no-store`: si un 401 se quedara guardado en la
  red, se lo comería después alguien que sí tiene sesión.
- **Nada de imágenes por defecto.** El cliente de Prisma descarta las columnas
  de imagen en todas las consultas (`omit` en `lib/db.ts`). Quien las necesita
  las pide a mano. Así un descuido futuro sale como una imagen que no aparece,
  no como una página de 4 MB otra vez.
- **"No lo he tocado" es distinto de "quítalo".** Los formularios ya no llevan
  dentro la imagen actual, así que mandan la marca `__igual__` cuando no se ha
  cambiado nada; dejarlo vacío sigue significando borrarla. Sin esto, editar la
  causa de una baja le habría borrado la foto.

**Cuando algo falla, lo dice la aplicación, no Next.** No había pantallas
propias de error, así que cualquier fallo sacaba la pantalla gris de Next: en
inglés, sin la barra de navegación y sin forma de volver que no fuera darle a
atrás. Ahora hay cuatro, por capas:

- `(app)/error.tsx` — un fallo dentro de la aplicación. Sale **dentro de la
  barra**, con "Reintentar" y "Volver al resumen". Enseña el `digest`, que es el
  código con el que Next apunta el fallo: en producción el mensaje de verdad no
  llega al navegador, así que ese código es lo único con lo que buscarlo luego.
- `(app)/not-found.tsx` — los `notFound()` de dentro: el perfil de un jugador
  borrado, una edición que ya no está. También con la barra puesta.
- `not-found.tsx` — direcciones que no son de ninguna sección. Va suelta,
  porque aquí se llega **sin haber iniciado sesión** y la barra necesita saber
  quién eres.
- `global-error.tsx` — si lo que falla es la propia plantilla, no hay ni hojas
  de estilo: esa pantalla se pinta con los colores a mano.

**A las páginas de solo administradores se entra o se sale, no se revienta.**
`requireAdmin()` lanza un error, que en una acción está bien —el formulario
enseña el mensaje— pero en una página se convertía en pantalla de fallo: un
jugador que abriera `/admin` veía un error 500. Ahora las páginas usan
`requireAdminPage()`, que devuelve al resumen. Son dos funciones y no una porque
lo que hay que hacer es distinto según desde dónde se llame.

**El cementerio se trae de 60 en 60.** Cada baja arrastra su ficha entera hasta
el navegador (mote, causa, notas, nivel, dos direcciones de imagen), así que la
página crecía sola con cada muerte y sin tope. Se piden **las últimas** 60, no
las primeras —lo que acaba de pasar es lo que se quiere ver al entrar— y se les
da la vuelta al pintarlas, para que la caja se siga leyendo de la más antigua a
la más nueva. Se trae una de más para saber si queda alguna fuera y enseñar el
botón solo cuando hace falta. El `?ver=` de la dirección tiene tope, para que
nadie se cargue la página poniendo un número enorme a mano.

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

**Dos direcciones de base de datos.** `DATABASE_URL` es la del *pooler* (el
portero que reparte conexiones ya abiertas, para atender páginas) y
`DIRECT_URL` la directa, que solo se usa al publicar porque **crear tablas no
funciona a través del pooler**. Si `DIRECT_URL` no está configurada,
`scripts/preparar-build.mjs` la iguala a la principal antes de compilar: así
quien no use pooler no tiene que enterarse de nada y el despliegue no puede
romperse por olvidarla.

**El servidor se fija en Fráncfort** (`vercel.json`, región `fra1`), que es
donde está la base de datos. Lo que hay que acercar es el servidor a la base de
datos, no la base de datos al usuario: el móvil habla con el servidor **una vez**
por página, y el servidor habla con la base de datos **treinta**. Si se cambia
la región de Neon, hay que cambiar también esa línea.

**Hay una pantalla de diagnóstico** en `/diagnostico`, solo para
administradores y a la que se llega desde Mi perfil: mide la ida y vuelta real a
la base de datos desde donde esté desplegada la aplicación, y avisa si el
servidor y la base de datos están en regiones distintas o si falta el *pooler*.
Existe porque desde el código no se puede saber, y es la diferencia entre 5 ms y
120 ms por consulta.

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

**Los mapas de las regiones son datos, no código.** Viven en la base de datos y
se editan desde Administración: renombrar una zona, moverla arrastrando,
añadirla o quitarla. De `lib/mapas-de-fabrica.ts` solo se **copian la primera
vez**, con un botón, y nunca vuelven a tocar nada; si borras una zona a
conciencia no reaparece sola. Es lo que hace que un nombre mal traducido se
arregle en cinco segundos en vez de esperar a que alguien toque el programa.

**Y son globales, no de cada edición.** El mapa de Johto vale igual para un
locke en Oro que en HeartGold, así que se prepara una vez y sirve siempre; por
eso se pueden editar los siete desde cualquier locke, y preparar Kanto mientras
se juega en Johto.

**Los nombres de las zonas están escritos a mano porque PokéAPI no los tiene.**
Se comprobó: de Johto, Kanto, Sinnoh y Teselia no hay **ni un solo** nombre en
español (Hoenn 85 %, Kalos 98 %, Alola 88 %). Las rutas se traducen solas
("Route 29" → "Ruta 29") y los sitios con nombre propio los escribí yo. Como el
mapa es editable, un fallo se corrige sin tocar código.

**El mapa se dibuja a mano, no es la imagen oficial.** El arte de las regiones
es de Nintendo y no está en PokéAPI como los sprites, así que la aplicación no
lo trae. Lo que sí puede es **ponerlo de fondo**: si un administrador sube la
imagen, las chinchetas se pintan encima y se recolocan arrastrando. Sin imagen,
el esquema funciona igual.

**En el mapa, las posiciones escalan con el acercamiento pero los nombres no.**
Si escalara todo junto, en un móvil las letras quedarían de tres píxeles. Así se
puede alejar para ver la región entera con los nombres legibles, y por debajo
del 50 % se convierten en puntos y el nombre sale al tocarlos. Cada etiqueta
tiene además un ancho máximo por debajo de la separación entre columnas: un
nombre larguísimo se corta con puntos suspensivos en vez de pisar al vecino.

**El mapa de capturas es privado de verdad, y se nota en el código.** Todas las
consultas de `lib/mapas.ts` piden el participante y filtran por él, y **no
existe** una función que devuelva las capturas de varios: si la consulta no
existe, no hay pantalla que pueda equivocarse. Las acciones sacan el
participante de la sesión y nunca del formulario, así que tampoco se puede
escribir en el mapa de otro. La contrapartida es la de siempre: una copia de
seguridad lleva la base de datos entera, notas y capturas incluidas.

**El juego de la edición se elige de una lista, pero el texto libre se queda.**
`Competition.gameId` guarda cuál es de `lib/juegos.ts` y de ahí sale la región;
`game` sigue siendo el texto de siempre y no se ha tocado, porque el Hexalocke 1
y el 2 ya tenían el suyo escrito a mano. Los remakes van en su propio grupo del
desplegable pero apuntan a la región del original: HeartGold usa el mapa de
Johto.

**La bolsa es privada, pero gastar algo se anuncia.** Lo que llevas encima solo
lo ves tú y los administradores; en cuanto lo usas sale en el muro, porque en
una competición el resto tiene que enterarse de que alguien ha tirado de su
captura extra. Por eso hay una tabla `BagUse` aparte de `BagEntry`: una es el
saldo y la otra el historial.

**Añadir es de administradores; gastar, del dueño.** Son dos permisos distintos
y en el código van por separado: `darObjetoAction` y `quitarObjetoAction` exigen
administrador, y `usarObjetoAction` acepta al dueño (o a un administrador que lo
gasta por alguien que no está delante del móvil). Quitar un objeto desde el
panel **no** cuenta como usarlo: es corregir un apunte, no anunciar nada.

**Un grupo lo es aunque esté vacío.** `Item.isGroup` se guarda aparte de tener
o no `options`, y no sobra: un grupo recién creado todavía no tiene nada dentro,
y si "es grupo" se dedujera de tener opciones, ese grupo se gastaría sin
preguntar y su dueño lo perdería por la cara. Con la marca, la bolsa enseña
"todavía vacío" y no deja usarlo, y el catálogo avisa al administrador de que le
falta llenarlo. Al revés también vale: meterle algo dentro a un objeto suelto lo
convierte en grupo, que es lo que uno espera al ponerle cosas.

**El contenido de un grupo no se esconde detrás de "Editar".** Es lo que le da
sentido, así que va siempre a la vista en su ficha del catálogo; detrás del
botón queda solo cambiar el nombre, la imagen y borrarlo. Y un grupo vacío trae
el buscador **ya abierto**: no sirve de nada hasta que se llene.

**El catálogo de objetos es global, como los títulos.** "Captura extra"
significa lo mismo en el Hexalocke 3 que en el 2, así que no cuelga de la
competición y no hay que volver a crearlo cada edición. Las bolsas sí son de
cada participante, porque son de la partida.

**Los objetos de los juegos salen de los CSV de PokéAPI, igual que la pokédex.**
`scripts/generate-items.ts` los baja, se queda con los que tienen nombre en
español **y dibujo propio** (comprueba uno a uno que el sprite exista: PokéAPI
lista un montón de objetos de las últimas generaciones y de Pokémon GO que no
tienen ninguno), deja un solo objeto por nombre (los cristales Z están dos veces
y "Bici" tres, una por color) y escribe `src/lib/objetos.json`: 795 objetos y 53
KB, que se suben al repositorio. Buscar un objeto no depende de que nadie de
fuera conteste. El dibujo sí se baja de internet, pero **una sola vez**, cuando
un administrador crea el objeto, y se guarda como copia propia: unos 750 bytes
en webp.

**El menú de "¿con cuál te quedas?" se ata al formulario con `form=`.** Como el
resto de diálogos va en un portal sobre el `body`, y eso saca sus botones de
dentro del `<form>`: sin el atributo el menú se ve pero no envía nada (pasó, y
así se descubrió). Con él, cada opción es un botón de enviar de verdad con su
propio `optionId` y no hace falta guardar en ningún sitio cuál se ha pulsado.

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
  diferencia de pokémon en combates de jornada (y en los retos, si el ajuste de
  la edición lo permite). Los dos primeros se marcan como clasificados directos
  a la Final Four.
- **Jornadas**: emparejamientos por pareja, 1 punto por victoria, configurable.
- **Retos**: combates sueltos con premio y castigo. Cuentan como victoria o
  derrota, nunca como puntos.
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
  generate-items.ts    regenera src/lib/objetos.json (los objetos de la bolsa)
  export-sqlite.ts / import-json.ts   migración desde la versión antigua
public/
  sw.js, icons/     piezas de la PWA
```

Piezas con truco:

- `lib/competition.ts` — `getStandings()` calcula la clasificación con sus
  desempates; `assertCanActForParticipant()` centraliza los permisos. Jornadas y
  retos se apuntan con la **misma función** (`apuntar`), que recibe si esa
  diferencia de pokémon cuenta o no; los puntos van por otro lado y los retos no
  los tocan.
- `lib/grafico-clasificacion.ts` — rehace la clasificación al final de cada
  jornada y la convierte en carriles, con los empates compartiendo carril.
  `components/points-chart.tsx` es el dibujo.
- `lib/cara-a-cara.ts` — el marcador de un jugador contra cada rival, juntando
  jornadas y retos, y de ahí salen la presa favorita y la bestia negra.
  `components/head-to-head.tsx` es la casilla desplegable del perfil.
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
  administrador, tanto en jornadas como en retos (la marca `esReto` decide a qué
  columna va el pokémon). **Dos vistas del mismo dato**: en móvil una tira de sprites
  por jugador, que es lo que cabe, y desde `lg` dos cajas de 3x2 una al lado
  de la otra, con los seis huecos siempre puestos (los que faltan van de línea
  discontinua) para que las dos midan igual. Al guardar, el entrenador elegido
  se conserva (se apuntan seis seguidos del mismo) y el buscador y el mote se
  vacían remontándolos con `key`: los dos llevan estado propio y un `reset()`
  del formulario no los limpiaría.
- `lib/titulos.ts` — los títulos de alguien y el que lleva puesto.
  `components/title-badge.tsx` es la chapa; `components/titles-section.tsx`, la
  lista del perfil, compartida por el perfil público y por Mi perfil.
- `lib/mapas.ts` — los mapas y las capturas. `lib/mapas-de-fabrica.ts` es la
  semilla (las 51 zonas de Johto con su sitio), `lib/juegos.ts` la lista de
  juegos y su región, y `lib/zonas.ts` los tipos de zona y sus colores —**este
  último existe porque un módulo con `"use client"` no puede exportar datos a un
  componente de servidor**: Next devuelve una referencia al cliente en vez del
  array y revienta la página entera (pasó). `components/mapa.tsx` es el mapa,
  `mapa/mapa-client.tsx` la vista del jugador y `admin/mapas/` el editor.
- `lib/bolsa.ts` — el catálogo y las bolsas. El catálogo se lee entero de una
  vez y las bolsas se juntan con él **en memoria**: son cuatro filas y así no se
  repiten por cada jugador las consultas de las firmas de las imágenes.
  `components/objeto-picker.tsx` es de dónde sale cada objeto —de los juegos,
  propio o un grupo—, `bolsa/bolsa-client.tsx` la bolsa con el botón de gastar
  y el menú de elegir, y `bolsa/todas/` el panel del administrador.
- `lib/objetos.ts` — la lista de objetos de los juegos y su buscador, hermana de
  `lib/pokedex.ts`.
- `lib/copias.ts` — el volcado, el restaurado y la poda. `lib/copia-automatica.ts`
  es el disparador del resumen; `admin/backups.tsx`, la pantalla.
- `lib/youtube.ts` — reconoce enlaces de YouTube y saca el identificador para
  incrustar el reproductor. `level-caps/gym-videos.tsx` es la tira de botones y
  el reproductor de los vídeos de gimnasio.
- `components/replay-link.tsx` — el botón "Ver combate", compartido por las
  jornadas y los retos. Solo se pinta si hay enlace.
- `components/mobile-nav.tsx` y `components/nav.tsx` — las dos formas de la
  misma navegación: la hoja del móvil y la barra lateral del PC.
  `app/(app)/layout.tsx` es quien reparte, a partir del objeto `S` (la lista
  única de secciones) y de `GRUPOS`.
- `components/roulette-wheel.tsx` — la rueda SVG; las etiquetas de la mitad
  izquierda se voltean para que se lean del derecho.
- `lib/activity.ts` — junta las siete fuentes del muro en una cronología.
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
- **Exportar una edición archivada** a PDF o imagen como recuerdo, ahora que
  el hall de la fama da un buen cierre. (Distinto de las copias de seguridad,
  que son para restaurar y no para enseñar.)

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
18. **Combates de reto**, con premio y castigo, y el **cara a cara** de cada
    jugador contra los demás en su perfil.
19. **La navegación por grupos**, la misma en el móvil y en el PC, en vez de una
    rejilla con todo dentro y una columna de catorce enlaces.
20. **Pantallas de error propias**, imágenes que guarda también la red de Vercel
    y el cementerio por tandas.
21. **Gráfico de la clasificación** jornada a jornada, y la navegación repartida
    en tres pestañas por tema.
22. **Enlace a la repetición** de cada combate, con su botón "Ver combate".
23. **Copias de seguridad**: automáticas, descargables y restaurables, también
    desde un fichero sobre una base de datos vacía.
24. **Títulos** para los jugadores, repartidos por la organización.
25. **Vídeos de los gimnasios**, enlazados desde YouTube y vistos dentro.
26. **La bolsa**: el inventario de cada jugador, con objetos de los juegos o
    propios, y **grupos de objetos** que al gastarlos te hacen elegir uno.
27. **Mapa de capturas**: el juego se elige de una lista, cada región tiene su
    mapa editable desde Administración, y cada uno apunta en el suyo —privado—
    lo que va pillando.
