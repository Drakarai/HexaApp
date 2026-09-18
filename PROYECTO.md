# HexaApp — memoria del proyecto

> Resumen de todo lo hablado y decidido, para no depender de que exista el chat
> donde se construyó. Si retomas el proyecto en una conversación nueva, empieza
> pasando este fichero: contiene el contexto, las decisiones y el porqué de cada
> una.
>
> **Este documento se actualiza con cada cambio.** Ver `CLAUDE.md`.

Última actualización: 17 de septiembre de 2026 (Alola repartida en sus cuatro
islas, zonas que se giran, círculo redondo aparte del óvalo, relleno regulable
por mapa, la guía de uso rehecha —ya con 22 páginas— y accesible desde la
propia aplicación, el modo sin conexión con su cola de apuntes, los tipos de
combate por jornada con su Battle Royale, el sorteo de pokémon de préstamo, la
medida de lo que ocupa la base de datos, **el almacén que guarda cada imagen
una sola vez**, las copias de seguridad que ya no repiten las imágenes, y el
permiso de **organizador** para que alguien lleve sus propios lockes, y el
reparto de papeles en **Creador / administrador de locke / jugador**, y los
wipeos con su estado de locke perdido, la lista de participantes arreglada
para el móvil, los **combates con permiso** para quien está fuera del locke, y
el **hall de la fama** con su podio y las cifras del locke, y **todo el cuadro
final al mejor de tres** con repetición en cada combate, el **palmarés** entre
ediciones con los lockes de antes de la app, el **repaso de las 24 pantallas**
del que salieron las jornadas plegables y los level caps de dos en dos, y **la
ruleta repartiendo objetos de la bolsa y tickets**).

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
| **Level caps** | Nivel máximo por gimnasio, con una o varias imágenes que se alternan; cada jugador marca cuándo lo supera y puede enlazar el vídeo de su combate. En los lockes **en solitario**, debajo de cada hito se apunta el equipo con el que lo pasaste, como los equipos de un combate. Se pueden **traer de un tirón** los del juego con un botón, y luego cambiarlos solo para ese locke. |
| **Cementerio** | Caja estilo PC de Pokémon; cada casilla abre una ficha con imagen grande. El sitio donde cayó cada uno **se elige de las zonas del mapa** de la región, y de ahí sale el ranking de dónde cae más gente. |
| **Jornadas** | Cada jornada puede ser **de un tipo de combate**: Singles, Dobles, Monotipo, VGC, Pokémon de Préstamo o Battle Royale, con su chapa, su color y sus condiciones escritas a mano ("monotipo agua", "nivel 50"). Emparejamientos, que la aplicación **propone sola** siguiendo la liguilla (nadie repite rival hasta jugar contra todos; si sois impares, descansa uno distinto cada vez). Marcar ganador suma el punto automáticamente. Si alguien **no se presenta**, un botón da el combate por retirada: se elige quién faltó y con qué fecha, y el otro gana con diferencia de 3. Bajo cada combate, el equipo que sacó cada jugador, y un botón a su repetición si el admin pegó el enlace. El MVP de la jornada se vota entre todos. Una jornada **con todos sus combates jugados se pliega**: deja a la vista su cabecera y un renglón con quién ganó, y se abre de un toque. |
| **Retos** | Piques sueltos entre dos, con premio, castigo y enlace a la repetición. Cuentan para victorias y derrotas, pero no dan puntos. El premio puede ser **texto libre** ("eliges su starter") y/o **objetos del catálogo**, que caen solos en la bolsa del que gane. El **castigo del que pierde se anuncia en la portada** hasta que un administrador lo da por cumplido. |
| **Battle Royale** | Una jornada de royale no tiene parejas: nace con **un combate de todos contra todos** y todos los jugadores dentro. Al terminar se apunta el **orden de llegada** tocándolos en orden, el primero se lleva los puntos de la jornada, y queda la **crónica** de lo que pasó más la línea que escribe cada uno de lo suyo ("me tumbó Draka en el turno 3", cuántos le quedaban vivos). Los equipos se apuntan igual que en un combate normal. |
| **Sorteo de préstamos** | Un bote de pokémon que se reparte al azar. Cualquiera que juegue **echa los suyos** al bote y queda apuntado quién puso cada uno; la organización elige **quién entra** (de 2 a 6) y reparte. Se baraja y se da uno a cada uno por turnos hasta seis por cabeza; **lo que sobra se queda en el bote**, a la vista, sin tirarlo. Repartir otra vez baraja desde cero. Nació para las jornadas de *Pokémon de Préstamo*, pero no cuelga de ninguna jornada: vale para lo que se quiera. |
| **Wipeos** | Las veces que a alguien le han barrido el equipo entero en un combate. Se apuntan **sin límite** desde su perfil —con contra qué, cuándo y qué pasó— y se quitan de una en una si se apuntó mal. Las pone el propio jugador o quien administre el locke. Salen en su perfil y como 💥N en la clasificación. |
| **Locke perdido** | Un estado aparte de la retirada. Deja a esa persona fuera igual —no entra en emparejamientos, no cuenta para el MVP ni para el formato del final, y sus combates pendientes los gana el rival— pero se enseña como **locke perdido** y en rojo, no como retirada. Lo decide quien administra el locke y se puede deshacer. |
| **Copiar de otra edición** | Al montar el locke siguiente, traerse de otro las **reglas**, los **level caps** y los **ajustes** (puntos de inicio, jornadas previstas, si los retos cuentan para la diferencia) en vez de reescribirlos. **Vale entre juegos distintos**, avisando de que unos level caps de otra región tienen los líderes que no son. No se copian jugadores, jornadas, puntos ni bajas. |
| **Lockes de antes** | Los que se jugaron **antes de que existiera la aplicación** se apuntan a mano en el palmarés: nombre, juego, cuándo fue, campeón, subcampeón y quiénes jugaron. Solo queda la línea —de aquello no hay bajas ni combates— y **solo lo ven los que lo jugaron**. Lo apunta quien puede montar lockes, y cada uno quita lo suyo. |
| **Palmarés** | El histórico de **todas las ediciones juntas**, que hasta ahora vivían cada una en su burbuja. Arriba, la cuenta de cada persona sumando todos sus lockes: cuántos ha jugado, cuántos ha ganado, victorias-derrotas y pokémon enterrados. Abajo, cada edición con su campeón y a quién ganó la final; tocando una se abre. **Solo salen los lockes que esa persona puede abrir.** |
| **Combates con permiso** | La excepción a lo de arriba. Quien administra el locke puede dejar que alguien que está fuera —retirado o con el locke perdido— juegue **un combate concreto** de jornada o un reto. Se da y se quita desde el propio combate, sale marcado con un 🤝 **Con permiso**, y ese combate ya no se da por retirada: se juega y cuenta como cualquier otro. El emparejador automático sigue sin contar con quien está fuera; esto es siempre a mano. |
| **Puntos** / **Marcador** | Clasificación con desempates, el gráfico de cómo ha ido jornada a jornada, el as de cada jugador, ajustes ±1, con motivo, masivos, e historial. En un locke de **dos** no hay tabla: sale el **marcador de jornadas ganadas**, con cuántas le faltan a cada uno. Y en todos, quién se ha **pasado la Liga Pokémon**, que es ganar el locke del juego. |
| **Perfil de jugador** | Página propia de cada uno: su título, sus cifras, su as, sus pokémon favoritos, su cara a cara con cada rival y su cementerio. Se llega tocando su foto en cualquier sitio. |
| **Mapa de capturas** | El mapa de la región, con sus zonas **dibujadas encima y transparentes**: se rellenan de color cuando apuntas algo dentro, salen en rojo con una ✕ si ahí solo se te escapó lo que hubiera, y llevan una chapa roja con cuántos pokémon **tuyos** han caído allí. El primer toque dice qué zona es y el segundo la abre; si lleva otras dentro, sale la lista para elegir. Tiene también vista de lista con buscador, y las capturas extra aparte. Si el juego tiene **más de un mapa** —la 2ª generación y sus remakes abren Kanto, y la 7ª reparte Alola en sus **cuatro islas**—, arriba salen sus pestañas y cada mapa lleva sus propias cuentas. **Privado como las notas**: no lo ven ni los administradores. |
| **Bolsa** | Lo que lleva encima cada jugador. La llenan los administradores; cada uno solo ve la suya y gasta lo suyo con un botón. Hay **objetos**, que se gastan directamente ("Captura extra"), y **grupos**, que llevan varios dentro ("Objeto competitivo" → Globo Helio, Casco Dentado…) y al usarlos te hacen elegir uno. |
| **Mis notas** | Cuaderno privado con un sub-apartado por jugador. Solo lo ve su autor. Arriba, plegada, la **cobertura de tipos**: metes un equipo de hasta seis y sale una tabla de cuánto le entra a cada uno un ataque de cada tipo, con la cuenta de débiles y resistencias por tipo. Usa la tabla **de la generación del locke**, con una casilla para contar con la de ahora si jugáis los combates con las reglas modernas. El equipo se guarda y es igual de privado. |
| **Sin conexión** | Las pantallas por las que ya se ha pasado **se siguen viendo** sin internet, con un aviso de que son de la última vez. Y lo que se apunta —capturas, bajas, gimnasios y notas— se guarda en el móvil y **se sube solo** al volver la línea, sin duplicarse aunque se reintente. Mientras tanto sale en su pantalla como "sin subir todavía". |
| **Guía de uso** | El manual de la aplicación en PDF, dentro de la propia aplicación: 20 páginas con fotos de cada pantalla. Se abre, se descarga para leerla sin conexión y, en pantalla grande, se lee ahí mismo en un visor. Está en "Lo mío" y **no se le quita a nadie**, juegue o no juegue. |
| **Locke en solitario** | Una partida para una persona: sin jornadas, sin clasificación y sin final, pero con su caja, su mapa, sus level caps, su bolsa y sus notas. Se gana **pasándose la Liga**. Un administrador se lo crea al momento; cualquiera lo **pide** y le llega un aviso a la organización, que acepta o rechaza. |
| **Competiciones** | Crear ediciones copiando configuración, archivar, gestionar jugadores y **retirar** al que se va a mitad del locke. El juego se elige de una lista (1ª a 7ª generación, remakes aparte) y de ahí sale la región del mapa. Aquí se reparte también el acceso de **espectador**: quien no juega un locke no lo ve, salvo que un administrador se lo enseñe. |
| **Administración** | Alta de usuarios, roles y contraseñas, los ajustes de la edición, los títulos, el **editor de mapas** (dibujar zonas sobre la imagen —rectángulo, círculo, óvalo o a medida—, moverlas, estirarlas, **girarlas**, colorearlas, agruparlas y regular cuánto se rellenan), las **plantillas de level caps** de cada juego y las copias de seguridad. |
| **Final Four** / **Jornada Final** | El final del locke, que se abre al terminar todas las jornadas y acaba con un campeón. **El cuadro depende de cuántos sigan jugando**: seis (dos cruces, dos semifinales y final), cinco (dos cruces, una semifinal y el 1º esperando en la final), cuatro (torneo normal: 1º-4º, 2º-3º y final), tres (el 1º espera y se juegan el 2º y el 3º) o dos (una sola llave). De cuatro para arriba se llama **Final Four**; de tres para abajo, **Jornada Final**. **Todas las llaves se juegan al mejor de tres**, y cada combate lleva su ganador, su diferencia, su fecha, sus notas y **su enlace a la repetición**. |
| **Hall de la fama** | El cierre del locke, disponible cuando el final ya tiene campeón. **Podio** con el campeón, el subcampeón y cómo se ganó la final; **cómo fue el locke** en cifras —cuánto duró, jornadas, combates, caídos con su ruta más mortífera, wipeos, quién más MVPs, quién perdió más y quién menos—; y el **equipo de 6** con el que terminó cada uno, el del campeón en dorado. Cada pokémon se abre en grande con su ilustración, y el equipo **se puede traer del último combate de jornada** en vez de teclearlo. |
| **Ruleta** | Sorteos personalizables; girar gasta un ticket de esa ruleta, salvo los administradores. Una casilla puede ser texto suelto ("monotipo la próxima ruta") o **un premio de verdad**: un objeto del catálogo de la bolsa o tickets de una ruleta, que salen solos de la rueda a la bolsa o al saldo. |
| **Actividad** | Cronología con muertes, puntos, gimnasios superados, giros de ruleta, resultados de jornada y objetos gastados. |
| **Instalación** | Pantalla de primer arranque que crea el administrador. |
| **Guía de uso** | El manual en PDF, con fotos de cada pantalla, y una **segunda guía para quien lleva un locke** en su propia pestaña. La del administrador solo se le enseña a quien administra alguna edición o al Creador. |
| **Diagnóstico** | Pantalla del Creador. Mide lo que tarda la base de datos en contestar y **cuánto ocupa**: el total, en qué se va (columna a columna de imágenes), lo que pesa cada locke y **cuántos cabrían** en el plan gratis. Desde aquí se lanza también el mantenimiento del almacén de imágenes. |
| **Organizador** | Un permiso que da el Creador (botón 🎪 en la lista de usuarios) y que deja a alguien **montar sus propios lockes y dar de alta a su gente**, sin ver los de los demás ni tocar los mapas, el catálogo, las plantillas ni las copias. Al crear un locke entra en él como administrador de esa edición. |
| **Botón de apuntar** | Un "＋" fijo, en todas las pantallas menos Administración, con tres atajos: registrar una baja, apuntar una captura y marcar un gimnasio. Cada uno lleva a su página **con el formulario ya abierto**. |
| **Aviso de novedades** | Un punto ámbar en las pestañas cuando hay algo que no has visto: jornada o reto nuevos, un combate resuelto o un MVP por votar en *Combates*; bajas, puntos o gimnasios **de otros** en *La edición*; objetos nuevos en tu bolsa en *Lo mío*. |

Papeles: **Creador** (quien lleva la aplicación: lo ve y lo toca todo),
**administrador de locke** (participante con mando en *esa* edición y en nada
más), **organizador** (puede montar sus propios lockes y dar de alta a su
gente), **jugador** (registra sus muertes, marca sus gimnasios, escribe sus
notas) y **espectador** (mira una edición entera y no toca nada). Solo Creador
y jugador son el papel de la cuenta; administrador y espectador son **por
locke**, y organizador es un permiso suelto que da el Creador.

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
otro) **incluidos los que perdieron el locke**; los que se retiraron, no. Gana por **mayoría simple**: el más votado, aunque no pase de la mitad.
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

Y ahí mismo cuelga el tercero: el equipo con el que alguien se pasó un
**gimnasio** (`levelCapId`), que es lo que se apunta en los lockes en solitario.
Por eso `MatchTeams` admite **uno o dos lados**: con dos es un combate y con uno
es "el equipo que sacaste". Cuelga del level cap y no de `GymClear` por lo mismo
que el vídeo del gimnasio tiene su propia tabla: desmarcar la casilla de
superado por un descuido se llevaría el equipo por delante.

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

**El cementerio se trae de 60 en 60, y el corte es por jugador.** Cada baja
arrastra su ficha entera hasta el navegador (mote, causa, notas, nivel, dos
direcciones de imagen), así que la página crecía sola con cada muerte y sin
tope. Se piden **las últimas**, no las primeras —lo que acaba de pasar es lo que
se quiere ver al entrar— y se les da la vuelta al pintarlas, para que la caja se
siga leyendo de la más antigua a la más nueva. El `?ver=` de la dirección tiene
tope, para que nadie se cargue la página poniendo un número enorme a mano.

Que sea **por jugador** viene de un fallo. Con el tope global, las 60 más
recientes del locke se repartían como cayera: en un locke de 66 bajas, las seis
más viejas se quedaban fuera y al que le tocaba le faltaban casillas al final
de su caja. Encima la chapa de su caja contaba las **pintadas**, así que decía
10 donde la clasificación decía 12, y no había manera de saber que era un corte
y no unas bajas perdidas. Ahora la caja de cada uno se llena hasta el tope con
las suyas, la chapa lleva el número de verdad y, si de verdad se ha quedado
corta, lo dice: "60 de 70".

Cuesta una consulta más —primero los identificadores, que no pesan nada, para
saber cuáles entran; luego las fichas de esos— y compensa: el corte tenía que
hacerse en la base de datos por jugador y en Prisma eso es una ventana de SQL
a mano.

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

**Los level caps de cada juego se preparan una vez y se traen con un botón.**
Montar un locke nuevo empezaba escribiendo a mano los ocho gimnasios, el Alto
Mando y la Liga, con sus nombres y sus niveles; copiar de una edición anterior
solo servía si era el mismo juego, así que cambiar de juego era volver a
escribirlo todo. Ahora cada juego tiene su **plantilla**, que se administra
igual que los mapas.

- **Es global, como los mapas, y por el mismo motivo**: los gimnasios de Johto
  son los mismos en Oro que en HeartGold, así que se prepara una vez y sirve
  siempre. Se puede dejar listo Rubí mientras se juega en HeartGold.
- **Va por pareja de juegos**, no por juego suelto ni por región. Rojo y Azul
  son el mismo juego con distintos bichos, así que preparar dos listas idénticas
  no aportaba nada; pero las **terceras versiones** (Amarillo, Cristal,
  Esmeralda, Platino) y los **remakes** van aparte, porque ahí sí suele haber
  cambios: Platino recoloca gimnasios, Esmeralda cambia el último y los remakes
  tocan niveles. Los grupos están en `GRUPOS_DE_PLANTILLA` (`lib/juegos.ts`).
- **La columna de la base de datos se sigue llamando `gameId`** aunque el campo
  del código sea `grupoId`, con un `@map`. Renombrarla haría que
  `prisma db push` la viera como borrar una columna y crear otra, y eso avisa de
  posible pérdida de datos y **para el despliegue en seco**, que es justo la
  protección que se montó a propósito.
- **De fábrica solo se copia con un botón**, y solo lo que falte comparando por
  nombre. Si has renombrado o ajustado un hito no se toca, y si borraste uno a
  conciencia vuelve a salir y lo borras otra vez. Es exactamente la regla de los
  mapas.
- **Dentro del locke los level caps son suyos.** Traerlos es una copia: a partir
  de ahí se cambian, se borran y se añaden en la edición sin tocar la plantilla,
  y cambiar la plantilla no toca a los lockes que ya la trajeron.
- **La plantilla también guarda las medallas**, que era de lo que iba tener
  plantilla: una edición nueva sale con sus imágenes puestas en vez de tener que
  subir las once otra vez. Se suben en Administración igual que en el locke y se
  copian con el hito.
- **Las medallas de la plantilla tampoco viajan dentro del HTML.** Se sirven por
  dirección firmada (`/api/imagen/medalla-plantilla/…`) como todas las demás, y
  la columna entra en el `omit` global de `lib/db.ts`. Quien necesita los bytes
  —copiar una plantilla en otra, traerla a un locke, guardar el formulario— los
  pide a mano con `getPlantillaConImagenes`. Sin eso, el panel con las siete
  regiones preparadas habría vuelto a ser una página de megas, que es el fallo
  que costó arreglar en su día.
- **Alola no tiene gimnasios, tiene pruebas.** Su plantilla lleva las pruebas
  con su **pokémon dominante** además de las grandes pruebas de los kahunas:
  poner solo a los kahunas dejaba fuera media partida. Y **Ultrasol/Ultraluna
  son un grupo aparte con su propia lista de partida**, no la de Sol/Luna: cambian tres
  dominantes (Araquanid, Marowak de Alola y Togedemaru donde Sol/Luna llevan
  Wishiwashi, Salazzle y Vikavolt) y añaden la prueba de Mina. Es la única
  excepción de momento a que la semilla vaya por región, y para eso está
  `POR_GRUPO` en `lib/level-caps-de-fabrica.ts`: caben más el día que hagan
  falta.
- **Lo de fábrica es la lista de la región, sin las diferencias de cada
  versión, y la pantalla lo dice.** Amarillo, Cristal, Esmeralda, Platino y los
  remakes cambian nombres, niveles y hasta el orden de los gimnasios, y **esos
  datos no están en ninguna parte a la que la aplicación pueda mirar**: PokéAPI
  no tiene entrenadores, así que escribirlos sería tirar de memoria. Ya pasó una
  vez —a Sol/Luna se le pusieron los dominantes de Ultrasol/Ultraluna— y por eso
  no se hace: la plantilla trae la base y las diferencias las pone quien tiene
  el juego delante.
- **Para eso está "copiar de otra plantilla".** Una tercera versión se parece
  muchísimo a su pareja, así que se traen los diez hitos de Oro y Plata a
  Cristal con un desplegable y se cambian los dos o tres que sean distintos.
  Sale mucho más barato que escribirlo otra vez, y no obliga a la aplicación a
  fingir que se sabe de memoria las diferencias de cada versión.

**Un reto puede repartir objetos, y el castigo se anuncia.** Las dos cosas
venían de lo mismo: un reto se apuntaba y luego había que acordarse de darle el
premio por Administración y de recordarle a alguien su castigo, y ninguna de las
dos se hacía.

- **El premio tiene dos formas y no se pisan.** El texto libre de siempre es
  cualquier cosa que no cabe en una bolsa ("eliges su starter", "te debe una"), y
  sigue igual. Los **objetos del catálogo** (`ChallengePrize`) caen solos en la
  bolsa del ganador al apuntar el resultado. Se puede poner uno, el otro o los
  dos.
- **Cada objeto del premio recuerda a quién se le dio** (`entregadoA`), fila por
  fila y no un "ya entregado" global. Es lo que hace que los tres casos de
  verdad salgan bien: apuntar el ganador entrega, corregirlo se lo quita al
  primero y se lo da al segundo, y añadir un objeto con el reto ya jugado
  entrega **solo ese** y deja los demás quietos. Borrar el reto o quitar el
  objeto lo devuelve.
- **Devolver nunca deja la bolsa en negativo.** Si mientras tanto se lo ha
  gastado, la cuenta se queda en cero y la fila desaparece: perseguir un objeto
  ya usado no tendría sentido.
- **El castigo sale en la portada, no dentro de su reto.** Metido entre el
  premio, la diferencia y los equipos se perdía, y de un castigo tiene que
  enterarse todo el grupo. Sale hasta que un administrador le da a "Cumplido",
  que **no lo borra**: `castigoVisible` solo deja de anunciarlo, y se puede
  volver a encender. Empieza puesto y se apaga a mano, no al revés: si hubiera
  que acordarse de encenderlo, no se encendería nunca.

**Un locke puede ser de una sola persona, y entonces no es una competición.**
Con uno no hay contra quién: ni jornadas, ni retos, ni clasificación, ni final.
Lo que queda —la caja, el mapa de capturas, los level caps, la bolsa y las
notas— es justo la mitad de la aplicación que nunca fue de competir, y funciona
igual siendo uno.

- **`MINIMO_DE_JUGADORES` pasa a ser 1.** Un nuzlocke en solitario es un locke
  perfectamente válido; lo que no puede haber es uno de cero. Ojo con el otro
  mínimo: `lib/formatos-finales.ts` tiene el suyo en 2, y ese sí se queda,
  porque una final de uno no existe.
- **El locke se gana pasándose la Liga.** Es la victoria que ya existía en
  paralelo en todos los lockes (`lib/liga.ts`, deducida del hito de tipo
  `CHAMPION`); aquí es la única que hay, y es la que **abre el hall de la fama**,
  que en un locke de grupo exige campeón de la final y por tanto no se abriría
  nunca en una partida de una persona.
- **La portada cambia de contenido, no de sitio.** Donde va la clasificación va
  el progreso de la run: hitos hechos y cuál toca, caídos y zonas del mapa con
  captura. Todo sale de lo que ya se apunta, así que no hay ningún dato nuevo
  que mantener (`lib/solitario.ts`).
- **Se apunta el equipo con el que pasaste cada gimnasio**, igual que los
  equipos que se ven debajo de cada combate de jornada. Es **solo de los lockes
  en solitario** a propósito: en uno de seis serían seis equipos por gimnasio y
  no lo apuntaría nadie. Se comprueba en el servidor, no solo escondiendo el
  botón.
- **El menú se queda en lo que tiene sentido.** El grupo de Combates
  desaparece entero, y con él Jornadas, Retos, la final y también la **Ruleta**;
  fuera va además **Puntos** y, de "Lo mío", la **Bolsa**. La ruleta y la bolsa
  se cayeron por lo mismo: la bolsa la llenan los administradores con premios de
  combates, y sortearse cosas a uno mismo no aporta. Lo único que se salva de
  Combates es el hall de la fama, que se muda a "La edición" para no dejar un
  grupo con un enlace suelto.
- **Los rótulos de los grupos no se tocan** aunque cambien de contenido: el
  aviso de novedades va por el nombre del grupo (`TabSeen.tab`), así que
  renombrar "La edición" apagaría su punto para siempre.

**Crear ediciones sigue siendo de administradores; pedir la tuya, no.** Si
cualquiera pudiera crear competiciones, el selector acabaría lleno de pruebas a
medias. Pero un locke de una persona no le quita el sitio a nadie, así que se
pide desde la aplicación (`LockeRequest`) y el administrador lo acepta o lo
rechaza con un botón, en vez de que haya que ir a buscarle por WhatsApp.

- **El aviso reutiliza el punto de novedades.** Al administrador le sale el
  punto ámbar en "La edición", que es donde vive Administración. **No se apaga
  por mirar la pestaña**, igual que el del MVP por votar: no es algo que ver,
  es algo que hacer, y se va cuando la petición queda resuelta.
- **Una petición a la vez por persona.** Un despiste con el botón dejaba al
  administrador con cinco peticiones iguales que resolver una a una.
- **Al aceptarla, quien la pidió entra como jugador único y administrador de esa
  edición**: es su partida, y tiene que poder apañarse con sus level caps y sus
  reglas sin ir preguntando.
- **No archiva las demás**, al revés que crear una competición normal. Un locke
  en solitario corre en paralelo; archivar el Hexalocke que está jugando todo el
  grupo porque alguien empieza su partida sería un destrozo.

**Un locke no son necesariamente seis personas.** La aplicación nació para el
Hexalocke y lo daba por hecho en todas partes. Ahora hay un **perfil de locke**
(`lib/perfiles-de-locke.ts`) que dice qué cambia según cuánta gente juega, y las
pantallas preguntan al perfil en vez de saberse los casos.

- **El tamaño sale de `Competition.maxPlayers`** —para cuánta gente se montó la
  edición—, **no de los que quedan activos**. Se decide al crear el locke y no
  se recalcula: si se recalculara, retirarse a mitad le cambiaría los menús y
  las reglas a una partida empezada. (El *final* del locke sí mira los activos,
  porque ahí lo que importa es quién queda para jugarlo; son dos cosas
  distintas.) De regalo, las ediciones de antes tienen `maxPlayers` a 6 y no se
  enteran de nada, que era justo lo que se pidió: esto vale **para lockes
  nuevos**.
- **Las cinco reglas de emparejamiento son en realidad una.** Se acordó: seis
  todos contra todos, cinco con uno descansando, cuatro repitiendo parejas, tres
  estilo Champions dentro de la jornada y dos al mejor de tres. Todo eso es
  **una liguilla** vista de dos maneras: con cuatro o más, cada jornada es **una
  ronda**; con tres o menos, la liguilla **entera** cabe en una jornada. De ahí
  salen solos el descanso rotatorio de los impares (rotación fija: todos
  descansan una vez antes de que repita nadie), la repetición de parejas cuando
  se dan más jornadas que rondas tiene la liguilla —que es tanto como decir que
  siempre se propone la pareja que más tiempo lleva sin jugarse— y, de propina,
  el siete y el ocho el día que hagan falta. Está en `lib/emparejamientos.ts`,
  con el método del círculo, y no hay ni un caso escrito a mano.
- **Los emparejamientos se proponen, no se imponen.** Al crear una jornada hay
  una casilla que los reparte; salen combates normales y corrientes, así que se
  borran y se ponen otros como siempre. El orden de los jugadores para la
  rotación es **por fecha de alta**, no por nombre: si alguien se cambia el mote,
  el reparto no puede bailar.
- **La jornada del dualocke son dos combates, o tres.** Un mejor de tres se
  acaba en dos si alguien gana los dos primeros, así que la jornada **nace con
  dos** y el desempate se añade solo cuando la serie queda 1-1 (`lib/series.ts`).
  Crear los tres de entrada dejaba uno de adorno que la mitad de las veces no se
  jugaba. Funciona en los dos sentidos: si se corrige un resultado y el
  desempate deja de hacer falta, se quita —y nunca se borra un combate ya
  jugado. Por eso el perfil guarda `serieAlMejorDe` (3) y no los combates que se
  juegan: eso depende de cómo vaya la serie.
- **El dualocke se gana por jornadas, no por puntos.** Con dos jugadores la
  clasificación no dice nada —un punto por combate y siempre a un palmo—, así
  que la pantalla de Puntos pasa a ser el **Marcador**: jornadas ganadas, cuántas
  faltan y quién se llevó cada una. Cada jornada es un mejor de tres y se cierra
  con un 2-0 sin jugar el tercero, igual que la serie de la Jornada Final.
- **Cuántas jornadas hacen falta sale de `Competition.jornadasPrevistas`.** La
  regla es "gana quien se lleve 4 de las 6", o sea la mayoría, y las jornadas se
  van creando sobre la marcha: contando las que hay, el que ganara la primera
  saldría campeón, porque de una la mayoría es una. El campo es opcional y sin
  rellenar se usan las creadas.
- **El resumen también enseña el marcador**, en el hueco de la clasificación, y
  la tarjeta de "Líder" dice jornadas ganadas en vez de puntos.
- **Aviso de "bola de partido"** en el resumen, en Jornadas y en el marcador
  cuando a alguien le vale ganar la siguiente para llevarse el locke. No sale si
  ya hay campeón ni si **no quedan jornadas por decidir**: con seis jornadas y
  cuatro para ganar se puede acabar 3-3, y ahí decirlo sería mentira. Las que
  quedan se cuentan sobre las **previstas**, no sobre las creadas, porque el
  calendario se monta sobre la marcha. Si los dos están a una, el aviso lo dice
  sin nombres.
- **El cara a cara del perfil, con un solo rival, no tiene presa favorita ni
  bestia negra**: son la misma persona y no decían nada. Se cambian por a quién
  se enfrenta uno, y como el total de victorias-derrotas ya **es** el cara a
  cara, no se repite debajo.
- **Los retos y la ruleta se quedan.** Se planteó esconderlos con dos jugadores
  y el usuario lo descartó: la ruleta se usa para sortearle algo al ganador, y
  los retos también pueden caer.
- **La pantalla es la misma, el rótulo cambia.** El marcador vive dentro de
  `/puntos` y el menú dice "Marcador" en vez de "Puntos", igual que la Final Four
  pasa a llamarse Jornada Final. Una ruta nueva habría duplicado los permisos y
  el aviso de novedades para enseñar lo mismo en otro sitio.
- **Los nombres (Dualocke, Triolocke…) son solo rótulos.** No hay nada colgando
  de ellos: cambiarlos es tocar una línea.

**Pasarse la Liga Pokémon es la otra forma de ganar.** Ganar los combates y
ganarse el juego son cosas distintas —se puede terminar la Liga habiendo perdido
todas las jornadas, y al revés— y la pueden conseguir **varios**, así que no es
un puesto sino una lista. Sale en la clasificación.

Estaba también en el hall de la fama y **se quitó a petición del usuario**: el
hall cierra el locke de combates y allí la Liga era un bloque que casi siempre
decía "todavía no la ha superado nadie".

**No se guarda en ningún sitio nuevo**: se deduce de tener marcado el level cap
de tipo `CHAMPION`, que es el que ya representa la Liga. Un dato calculado no se
puede desincronizar de la marca de la que sale, que es la misma razón por la que
el MVP tampoco se guarda.

**Lo de gestionar no está en el menú: vive dentro de Mi perfil.** *Ediciones*,
*Administración* y *Diagnóstico* se abren desde ahí, a un toque del avatar de
arriba. El diagnóstico ya lo hacía y se extendió a los otros dos: colgados al
final de "La edición" la dejaban en **ocho entradas**, y lo de todos los días
—clasificación, caja, actividad, level caps, reglas, palmarés— no tiene por qué
compartir sitio con lo de montar el tinglado. Con eso "La edición" se queda en
seis, igual para quien administra y para quien solo juega.

**El botón de apuntar va en el centro, montado sobre la barra.** Vivía en la
esquina de abajo a la derecha y **tapaba contenido**: una tarjeta del palmarés,
un sprite del hall. En medio cae en el hueco que le deja la barra y no pisa
nada.

- Se lee como **acción y no como pestaña** porque es un círculo de color, más
  grande y levantado, con un **aro del color de la barra** que lo despega. Plano
  y del tamaño de los demás, la gente esperaría que llevara a una pantalla.
- **El hueco y el botón se deciden en el mismo sitio** (`seVeElBotonApuntar` y
  `HUECO_DEL_BOTON`, en `boton-apuntar.tsx`). Si cada uno mirara sus propias
  reglas, bastaría tocar una para dejar un agujero en medio de la barra sin nada
  dentro: en Administración, por ejemplo, el botón no sale y la barra vuelve a
  repartirse a partes iguales.
- El reparto de pestañas a cada lado sale de cuántas hay, no de un dos escrito a
  mano: en un locke en solitario se cae "Combates" y quedan tres, y el botón
  sigue centrado.
- En el ordenador no hay barra que pisar, así que se queda en su esquina como
  siempre.
- El hueco de abajo de la página pasa de `pb-24` a `pb-32`: con el botón
  asomando por encima de la barra, el de antes dejaba la última fila debajo.

**Las cuatro pestañas de abajo no se tocan**: el usuario lo pidió así, y son lo
que la gente ya tiene aprendido. Si mañana hace falta otra pantalla de
gestionar, el sitio es ese bloque de *Mi perfil*, no una pestaña nueva.

Ojo con una cosa: las pantallas que se guardan para verlas sin conexión salen
del propio menú (`rutasParaGuardar`), así que al sacar *Ediciones* de ahí dejaba
de guardarse. Se añade a mano, porque es de donde sale la lista de quién juega.

**Un locke no se ve por defecto.** Hasta ahora cualquier cuenta que entrara se
leía todos los Hexalockes enteros —muertes, puntos, jornadas, perfiles—, y eso
no es lo que quiere un grupo privado: un locke es de los que lo juegan. Ahora
una edición la ven sus **jugadores** (los de ahora y los de antes: basta con
tener ficha de participante, aunque esté retirado, porque lo que jugó sigue
siendo suyo), los **administradores globales** y los **espectadores** invitados.
El resto no la ve ni sabe que existe.

- **El espectador es por locke, no un papel de la cuenta.** El usuario lo pidió
  como "rol", pero guardarlo en `User` obligaría a elegir entre enseñarlo todo o
  nada; con una fila en `Spectator` (usuario + edición) el administrador decide
  **qué locke** enseña y a quién, que es lo que pedía de verdad. Un espectador
  ve la edición entera —clasificación, jornadas, cementerio, perfiles— y no
  puede tocar nada.
- **El filtro está en `getActiveCompetition` y `listCompetitions`**, que es por
  donde pasan todas las páginas. Poner la comprobación en cada pantalla sería
  acordarse de ella cada vez que se añade una; puesta aquí, una sección nueva
  nace protegida sola. La cookie de "qué edición estoy viendo" la manda el
  navegador, así que se vuelve a comprobar al leerla y al cambiarla: si no,
  bastaría con escribir el identificador de un locke ajeno a mano.
- **Se filtra con un trozo de `where`, no con una lista de identificadores.**
  Traerse antes "los lockes de esta persona" sería un viaje más a la base de
  datos en **cada** página, y de eso ya se habló largo en el apartado del
  rendimiento. Para un administrador global el filtro es `{}`, o sea nada.
- **Escribir sigue exigiendo ser jugador.** Casi todas las acciones ya pedían
  ficha de participante o permisos de administrador, así que un espectador se
  quedaba fuera solo; la única que se colaba eran las notas, que solo pedían
  sesión iniciada —cualquiera podía escribir en cualquier edición—, y ahora pasa
  por `assertPuedeTocarLocke`.
- **La página de un jugador se comprueba aparte.** A `/jugador/[id]` se llega
  por identificador y sin pasar por la edición activa. Si no puedes ver ese
  locke sale un **404** y no un "no puedes": quien no tiene acceso tampoco tiene
  por qué enterarse de que ese jugador existe.
- **El mapa, la bolsa y las notas desaparecen del menú si no juegas.** Son de tu
  ficha de participante, así que a un espectador no le llevan a ninguna parte:
  en "Lo mío" le queda su cuenta, que sí es suya.
- Lo que **no** cambia son las imágenes: se sirven por dirección firmada y
  cacheable, con acceso público a sabiendas (está explicado más arriba). Quien
  tenga la dirección exacta de un sprite la puede abrir sin sesión; lo que se ha
  cerrado son las páginas, que es donde están los datos.

**La Final Four se abre sola, pero se siembra a mano.** Mientras quede un
combate de jornada sin resultado, la pantalla está bloqueada con una barra de
progreso: hasta entonces no se sabe cómo queda la tabla. Cuando están todos,
un administrador genera el cuadro y ahí se **congela la clasificación** en
`FinalFour.seeds`; si después se corrige un punto, el cuadro no se recoloca a
mitad del torneo. Los emparejamientos no se guardan, se deducen de la siembra y
de quién va ganando, así que el cuadro no puede quedar incoherente. Cambiar un
resultado limpia los de las rondas siguientes.

**El formato del final lo decide cuánta gente queda jugando.** El locke nació
para seis, pero alguien se retiró y el cuadro de seis dejó de tener sentido. Hay
cinco formatos, uno por cada número de jugadores **activos** —los retirados no
cuentan—, en `lib/formatos-finales.ts`:

| Quedan | Cómo se juega | Esperan |
| --- | --- | --- |
| 6 o más | Cruces 3º-6º y 4º-5º, semifinales contra 1º y 2º, y final. | 1º y 2º |
| 5 | Cruces 2º-5º y 3º-4º, los ganadores se juegan la otra plaza, y la final contra el 1º. | 1º |
| 4 | Torneo normal: 1º-4º, 2º-3º y final. | nadie |
| 3 | El 1º pasa directo y se juegan el 2º y el 3º la otra plaza. | 1º |
| 2 | Al mejor de tres. | nadie |

Con uno solo no hay nada que jugar y la pantalla lo dice.

- **De cuatro para arriba se llama "Final Four"; de tres para abajo, "Jornada
  Final".** Con tres personas ya no hay cuatro finalistas y llamarlo Final Four
  sería mentir. El nombre sale del formato y lo usan la pantalla, el menú de la
  izquierda, la hoja del móvil y el hall de la fama: no está escrito a mano en
  ningún sitio.
- **El formato se congela al generar el cuadro** (`FinalFour.jugadores`), igual
  que la siembra. Si alguien se retira con la final ya empezada, los combates
  jugados tienen que seguir significando lo mismo; sin guardarlo, el cuadro
  cambiaría de forma a mitad y los resultados apuntados quedarían colgando.
- **Los formatos son datos, no código.** Cada uno es una lista de plantillas de
  combate que dicen de dónde sale cada lado: un puesto de la siembra
  (`{ puesto: 2 }`) o el ganador de otra llave (`{ ganadorDe: "SEMI_A" }`). De
  ahí se deduce solo qué llaves hay que crear y **qué rondas hay que limpiar** al
  corregir un resultado (`llavesPosteriores`), en vez de una lista de
  dependencias escrita a mano que se quedaría vieja al añadir un formato.
- **Cuántos se clasifican directos también sale del formato** (`esperan`), y es
  lo que decide a quién le pone la medallita la clasificación: con seis son dos,
  con cinco o tres es uno, y con cuatro o dos no es ninguno, porque juegan todos
  desde el principio.
- **Todas las llaves son al mejor de tres**, de los cruces a la final. Por eso lo
  que hay en el formato son *llaves* y no combates sueltos: cada una son tres
  filas de `FinalMatch` con la clave `LLAVE#n` —`SEMI_A#2`— y se la lleva quien
  gane dos. Las tres se crean al sembrar el cuadro, aunque el tercero casi nunca
  se juegue: así no hay que crear filas a mitad de una serie.
- **La serie se cuenta en orden y hasta que alguien llega a dos**
  (`comoVaLaSerie`). Eso es lo que hace que corregir un combate no obligue a
  borrar los siguientes de su llave: si se arregla el primero y la serie pasa a
  decidirse en el segundo, lo que se apuntó del tercero **deja de contar solo**,
  y la pantalla lo enseña apagado con un "no cuenta". Sin esa regla, el marcador
  diría 2 con tres coronas debajo.
- **Corregir un combate limpia las rondas siguientes, no la suya.** `llavesPosteriores`
  trabaja con llaves y la acción expande cada una a sus tres claves.
- **Cada combate lleva su enlace a la repetición**, igual que los de jornada
  (`FinalMatch.replayUrl`, saneado con `enlaceSeguro`). Es por combate y no por
  llave porque una serie son tres partidas con tres repeticiones distintas.
- Añadir mañana un formato distinto es escribir una entrada más en esa tabla:
  ni la pantalla, ni las acciones, ni la clasificación hay que tocarlas.

**Copiar una edición copia la configuración, no lo que pasó.** Reglas, level
caps y ajustes; ni jugadores, ni jornadas, ni puntos, ni bajas. Y tampoco
`maxPlayers`, que se decide al crear el locke y cambia cómo se comporta entero
(`lib/perfiles-de-locke.ts`).

- **Si ya hay reglas o level caps, no se copia: se avisa.** Mezclar dos juegos
  de reglas es peor que no copiar, y deshacerlo a mano sería un suplicio. Los
  ajustes sí se pueden copiar las veces que haga falta, porque se sobrescriben.
- **Entre juegos distintos se deja, pero se dice.** El usuario lo pidió así, y
  las reglas valen igual; lo que no valen son los level caps, que llevan los
  líderes de otra región. Se avisa en la casilla antes de copiar y otra vez en
  la respuesta, y se recuerda que están los de fábrica en *Level caps*.
- Del **origen basta con poder abrirlo**; del **destino hay que administrarlo**.
  Las dos cosas se comprueban en el servidor: lo que elige el desplegable lo
  manda el navegador.
- Copiar las imágenes de los level caps no cuesta nada, por lo mismo que en el
  hall: lo que guarda la columna es una referencia al almacén.

**Las fotos de perfil se piden como dirección, nunca con un `select`.** El
cliente de Prisma descarta las columnas de imagen por defecto (`SIN_IMAGENES` en
`lib/db.ts`) justo para que no se cuelen enteras en el HTML, así que pedir
`user.avatarImage` a pelo devuelve vacío y la foto no sale. Pasó en el palmarés
recién hecho. Lo que hace falta es `urlsDeImagen("avatar", userIds)`, como en
`getParticipants`.

**Un locke de antes no es una `Competition` vacía.** Vive en su propia tabla
(`LockeDeAntes`) y no se cuela como edición sin jornadas: si fuera una
`Competition`, el resto de pantallas —jornadas, bajas, clasificación, la
final— tendría que aprender a esquivar una edición de la que no hay nada. Así
solo aparece donde tiene sentido, que es el palmarés, y se marca con 📜.

- **De aquello no se inventa nada.** Suma un locke jugado y, al ganador, uno
  ganado; las bajas y las victorias se quedan a cero, que es más honesto.
- **Quién lo ve sale de `jugadoresIds`**, no de nadie más. Si se viera entero,
  alguien que monta su propio locke se encontraría el histórico de un grupo con
  el que no tiene nada que ver. Vienen marcados los del locke que se está
  jugando, que es lo que acierta casi siempre: marcarlo **todo** por defecto
  colaba cuentas que no pintaban nada, y esas acababan viéndolo.
- Al ganador y al subcampeón se les añade a esa lista **en el servidor**: no
  tendría sentido apuntar que alguien ganó un locke y que él no lo viera.

**El palmarés junta todas las ediciones, y solo las que puedes abrir.** Sale de
`listCompetitions`, que ya lleva el filtro de visibilidad; comprobado con una
cuenta que solo juega una edición, que no ve ni el nombre ni las cifras de la
otra. Las cuentas van **por cuenta de usuario y no por participante**, porque el
mote cambia de una edición a otra y la persona es la misma.

Son **cinco consultas para todas las ediciones a la vez**, no cinco por edición:
todo se pide con `in`. El campeón de cada una se saca de su cuadro
(`campeonYSubcampeon`) en vez de llamar a `getFinalFourState` por edición, que
se traería la clasificación entera de cada una.

**Los cuadros de antes del mejor de tres siguen contando.** Los que se sembraron
cuando cada llave era un combate tienen la clave pelada (`FINAL` en vez de
`FINAL#1`), y `ganadoresDeLaLlave` los reconoce: ese combate **era la llave
entera**, así que su ganador cuenta como si hubiera ganado los dos primeros. Sin
eso, una edición archivada aparecería como "en marcha" y sin campeón para
siempre, justo en la pantalla que va de celebrarlos.

**El hall de la fama se abre al haber campeón.** Cada jugador registra el
equipo de 6 con el que terminó, con el mismo buscador de especie, y se ordena
como una clasificación final: campeón, subcampeón y el resto por puntos. Se
comprueba en el servidor que la Final Four esté decidida antes de admitir nada.

Es **el cierre del locke**, así que cuenta cómo fue:

- **El podio solo lo pisa quien jugó la final.** El 1º y el 2º salen de ella; el
  3º sale de la tabla y se dice —"Tercero en la tabla"—, porque en el cuadro no
  se juega un combate por el tercer puesto. Quién puede estar sale de
  `FinalFour.seeds`, **no de la clasificación entera**: mirando la tabla, en un
  locke de dos se colaba de tercero alguien que estaba fuera del locke y no
  había jugado la final. Con dos, el podio es de dos.
- **Cómo se ganó, con nombres**: "Draka ganó la final a Pablo por 2 pokémon", o
  "ganó la serie por 2-1" si el formato era al mejor de tres. Sale del propio
  cuadro, así que vale para los cinco formatos sin escribir ninguno a mano.
- **Las cifras del locke no se guardan, se cuentan al mirarlas**
  (`lib/resumen-del-locke.ts`): cuánto duró, cuántas jornadas y combates, los
  caídos con su ruta más mortífera, los wipeos, quién perdió más y quién menos,
  y quién se llevó más MVPs. Los MVPs **no están guardados** —se calculan de los
  votos, ver `lib/mvp.ts`—, así que hay que pedir el estado de todas las
  jornadas. Es caro y se hace **solo aquí**: el hall se abre una vez, al final.
  No vale para la portada.
- **Sin equipo apuntado, la tarjeta se queda en una línea.** Antes se pintaban
  igual los seis huecos vacíos y, hasta que no lo rellenaba todo el mundo, la
  página era medio ladrillo en blanco.
- **El equipo del campeón se pinta en dorado**, que es de lo que va la página.
- **El equipo se puede traer del último combate** en vez de teclearlo
  (`lib/ultimo-equipo.ts`). El que termina el locke suele ser el del último
  combate de jornada, y volver a escribir seis pokémon que la aplicación ya
  conoce no tenía sentido. Mira los combates de jornada **y los Battle Royale**,
  que son los dos sitios donde un equipo cuelga de una jornada, y se queda con
  el de la jornada más avanzada.
  - **Copiar las imágenes no cuesta nada**: desde que existe el almacén, la
    columna guarda una referencia (`ref:pkm-157-box`), así que copiar la cadena
    apunta a la misma imagen sin duplicar bytes ni volver a bajarla.
  - Solo se ofrece **con el equipo vacío**, y lo que deja se cambia como si se
    hubiera escrito a mano: es un atajo, no una regla. Por eso tampoco se
    pregunta por los que ya tienen equipo, que sería una consulta tirada.
- Cada pokémon se abre en grande con su ilustración. Por eso
  `HallOfFameEntry.detailImage`: antes solo se guardaba el sprite de la casilla.
  Los equipos apuntados antes de que existiera no la tienen y la ficha se apaña
  con el sprite pequeño, así que **no hay que rellenar nada hacia atrás**.

**Lo caro no son los milisegundos, son los viajes a la base de datos.** En el
ordenador Postgres está al lado y todo va en 20-70 ms; en producción está en
Neon, por internet, y lo que se paga es **cuántas consultas hace cada página**.
Medido con `CONTAR_CONSULTAS=1` sobre `next start` (en desarrollo los tiempos
mienten), un locke de seis con 66 bajas y seis jornadas jugadas: la portada 40,
`/jornadas` 30, `/puntos` 30, y de ahí para abajo.

De eso, lo que sobraba eran **consultas repetidas dentro de la misma página**:
el layout y la página pedían lo mismo por su cuenta. Se arregla envolviendo el
ayudante en `cache()` de React, que recuerda el resultado **dentro de una misma
visita** —`getActiveCompetition`, `getParticipants` y `getMyParticipant` ya lo
llevaban—, y así cayeron `getFormatoFinal` y `getStandings`: portada de 40 a 37
y `/puntos` de 30 a 28. Si mañana se añade un ayudante que pidan el layout y la
página a la vez, el sitio es ese.

Lo que **no** se tocó, porque no era desperdicio: el muro de actividad consulta
cada fuente por separado a propósito (abajo), y el aviso de novedades ya estaba
resuelto en una sola consulta con `EXISTS`.

### Lo que se paga no son las consultas, son las tandas

Contar consultas resultó ser **la medida equivocada**, y hubo que medirlo para
verlo. Casi todas se piden con `Promise.all`, así que veinte a la vez cuestan
**una** ida y vuelta, no veinte. Lo que se paga es cuántas veces hay que ir y
volver **en fila**, esperando la anterior: las tandas.

Para verlo aquí está `LATENCIA_FALSA=30`, que le suma 30 ms a cada consulta
como si la base de datos estuviera lejos (`lib/db.ts`). Con `CONTAR_CONSULTAS=1`
a la vez, cada consulta dice además **cuándo** empieza: las de la misma tanda
salen con el mismo momento y la siguiente aparece 30 ms después. Es la única
forma de ver en el ordenador lo que se va a notar en Neon.

Con eso, la portada eran **42 consultas en 8 tandas**, y las tandas salían de
cuatro sitios donde se pedía en fila algo que no dependía de lo anterior:

- **El layout** pedía el participante, el nombre del final, el permiso y los
  avisos en tres pasos. Ninguno necesita a los otros: ahora es un `Promise.all`
  de cuatro. Esto lo notan **todas** las pantallas, que para eso es el layout.
- **`getAvisos`** recibía el participante ya resuelto, así que no empezaba hasta
  que aquello volvía. Ahora lo pide él con `getMyParticipant` —que va con
  `cache()`, o sea que es la misma consulta que ya está en el aire— a la vez que
  las marcas de visita.
- **`getActivity`** esperaba a los jugadores para *luego* consultar sus siete
  fuentes, y ninguna de las siete los necesita: todas filtran por la edición.
- **`getStandings`** pedía dos números de la competición y *después* las seis
  consultas gordas.
- En `/jornadas`, los sprites y la votación del MVP se pedían en fila, y dentro
  del MVP, "a quién he votado yo" esperaba a las imágenes sin necesitarlas.

Medido con 30 ms por consulta, antes y después: portada 250 → 216 ms, `/puntos`
217 → 185, `/actividad` 205 → 172, `/jornadas` 282 → 256. **La cuenta de
consultas no bajó**: son las mismas, pedidas de otra manera.

Lo que queda en fila ya es de verdad encadenado: para pedir la firma de una
imagen hay que saber antes de qué fila es. `getParticipants` son dos tandas por
eso mismo, y se lleva por delante a todo lo que espera por él.

Lo que sigue pesando es **el HTML de `/jornadas`: 353 KB**, porque lleva los
seis pokémon de cada lado de cada combate de todas las jornadas. No es lento,
pero es lo que más datos móviles gasta de toda la aplicación.

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

**La lista de juegos llega hasta la 7ª generación y ahí se para.** De la 8ª
para arriba no hay nada porque el grupo no juega esos lockes; los Let's Go
estuvieron un rato y se quitaron por lo mismo. Añadir uno es una línea en
`JUEGOS` y otra en `GRUPOS_DE_PLANTILLA`.

**Y son globales, no de cada edición.** El mapa de Johto vale igual para un
locke en Oro que en HeartGold, así que se prepara una vez y sirve siempre; por
eso se pueden editar todos desde cualquier locke, y preparar Kanto mientras se
juega en Johto.

**Una pestaña de mapa no es siempre una región: Alola son sus cuatro islas.**
La 7ª generación se juega saltando de isla en isla, y las cuatro juntas en un
lienzo dejarían cada ruta del tamaño de un sello —en el móvil sería imposible
acertarle—. Así que en `JUEGOS` la 7ª sigue apuntando a la región `alola`, que
es de donde salen la generación y la plantilla de level caps, pero lleva además
`mapas: [melemele, akala, ula-ula, poni]`, y eso es lo que usa el Mapa de
capturas. Se aprovecha entero el mecanismo de pestañas que ya existía para
Johto + Kanto: cada isla tiene su imagen, sus zonas y sus cuentas. Alola se
queda marcada `sinMapa` y por eso no sale en Administración → Mapas.

**Los tipos de combate son una lista fija en el código, no una tabla.** Un
formato no es solo un nombre y un color: cambia cómo se comporta la
aplicación —el editor pide cuatro huecos en VGC y seis en singles, en dobles
marca los dos que abren, el royale tiene pantalla propia—, y eso no se puede
rellenar en un formulario de Administración. Para las variaciones que se
inventan sobre la marcha está el campo **condiciones** de cada jornada, que es
texto libre. Añadir un formato nuevo es una ficha en
`lib/formatos-de-combate.ts`.

**La chapa del formato no sale en singles.** Es lo normal, y si saliera en
todas partes dejaría de querer decir nada; así, que una jornada lleve chapa ya
significa por sí solo "ojo, que esta es distinta".

**El Battle Royale tiene su propia tabla y no cabe en `Match`.** Un combate de
siempre es "A contra B, gana uno y le quedan tantos pokémon vivos"; un royale
es "entran seis y salen en este orden". Meterlo a la fuerza en la tabla de los
combates habría llenado de excepciones la clasificación, el cara a cara y el
emparejador, y a cambio no habría contado bien ninguna de las dos cosas. Lo
que sí comparte es el editor de equipos, que es el mismo dato.

**El orden de llegada se apunta tocando a la gente en orden**, no arrastrando
filas ni con un desplegable por puesto: arrastrar seis filas con el dedo es un
suplicio en un móvil y seis desplegables son seis oportunidades de
equivocarse. Se toca al primero, luego al segundo, y se puede deshacer.

**La crónica es pública y la línea de cada uno es suya.** Contar lo que pasó
es media gracia de un royale, así que tiene sitio propio en vez de acabar en
las notas privadas de alguien: la crónica la escribe la organización y cada
jugador puede dejar su propia línea, con la misma comprobación que usan las
bajas.

**El sorteo de préstamos es una pantalla aparte y no cuelga de la jornada.**
Nació para las jornadas de *Pokémon de Préstamo*, pero atarlo a una jornada lo
habría dejado inservible para todo lo demás —repartir bichos para un pique
suelto, para probar equipos, para lo que se invente— y habría obligado a crear
una jornada antes de poder repartir nada. Un sorteo es un bote y una lista de
gente; dónde se usa lo que sale es cosa de quien lo use.

**Al bote echa cualquiera que juegue; repartir es de la organización.** La
gracia es que cada uno ponga los suyos, así que pedir que los eche un
administrador lo convertiría en un recado. Queda apuntado **quién puso cada
uno**, porque en un préstamo importa de quién era el bicho, y quitarlo del bote
lo puede hacer quien lo puso o un administrador.

**Lo que sobra se queda en el bote, no se tira ni se avisa.** Si hay más
pokémon que huecos —seis por persona— los que sobran simplemente no le tocan a
nadie y salen en su apartado. Cualquier otra cosa (negarse a repartir, avisar
con un error, elegir cuáles descartar) sería inventarse una regla que nadie ha
pedido para algo que no es un problema.

**Se baraja con Fisher-Yates.** Ordenar por `Math.random()` parece que baraja,
pero no reparte parejo, y aquí lo único que hay que hacer bien es justo eso.
Repartir otra vez vuelve a barajar desde cero, así que no quedan restos del
reparto anterior.

**Las constantes del sorteo viven en `lib/sorteo.ts` y no en la server action.**
Un fichero `"use server"` **solo puede exportar funciones**: en cuanto exporta
una constante, Next se queda sin exportaciones y la pantalla entera deja de
compilar, con un error que no dice eso en ningún momento. Vale para cualquier
otro fichero de acciones.

**Sin conexión se lee lo último y se escribe en una cola.** La aplicación se
dibuja en el servidor, así que sin línea no había nada que enseñar. Ahora el
service worker guarda cada pantalla al visitarla y la sirve cuando la petición
falla —**siempre pide primero al servidor**, así que con cobertura lo que se ve
sigue estando al día—, y lo que se escribe sin línea va a una cola en el propio
móvil que se sube sola al volver.

Lo importante de esa cola es lo que **no** hace:

- **No miente.** El mensaje nunca dice "guardado": dice que está pendiente, y
  el apunte sale listado en su pantalla hasta que sube de verdad.
- **No duplica.** Cada apunte lleva un identificador que genera el móvil y que
  el servidor guarda al aplicarlo (`ApunteSincronizado`); si llega dos veces, la
  segunda se descarta.
- **No se salta los permisos.** La dirección que los recibe (`/api/sincronizar`)
  **llama a las mismas server actions** que los formularios de siempre, con sus
  comprobaciones. No hay una segunda puerta a la base de datos.
- **No reintenta lo que el servidor rechaza.** Si falla por una regla, se queda
  en la lista con su explicación para poder tirarlo a mano; solo se reintenta lo
  que falló por la conexión.

**Y sin conexión los enlaces recargan la página entera.** Por dentro Next
cambia de pantalla sin recargar, pidiendo solo el trozo que cambia, y ese
trozo no se guarda a propósito: hay peticiones de "adelanto" a medias que,
servidas como si fueran la pantalla entera, la dejarían rota. La primera
versión le contestaba un error a esas peticiones y **eso era peor**: Next tiene
su propio plan B —recargar la página, que sí sabemos servir— y solo lo usa
cuando la petición falla de verdad, así que contestándole se quedaba sin él y
no se podía cambiar de pestaña. Ahora esas peticiones no se tocan y, además,
sin línea cada enlace se convierte en una carga de página entera.

**Un service worker con un fallo es pegajoso, y hay que poder quitárselo.**
Se quedó uno roto en los móviles —el que contestaba a las peticiones internas
de Next— y desde el servidor no hay forma de alcanzarlo: manda él hasta que
otro lo releva. De ahí tres cosas: el nombre de sus cachés lleva **versión**
(al subirla, tira lo del anterior y empieza limpio), la aplicación pide la
actualización en cada carga y **se recarga sola cuando uno nuevo releva a
otro**, y hay un botón de **"Reparar la aplicación"** en Mi perfil que lo
desinstala todo y deja el navegador como la primera vez.

Ojo con esa recarga: solo vale cuando el nuevo **releva a otro**. En la
primera instalación también avisa, y recargar ahí se llevaba por delante el
inicio de sesión, porque la instalación cae justo mientras se escribe la
contraseña. Tampoco recarga si hay un campo enfocado.

**Las pantallas del menú se guardan de antemano.** Con solo guardar lo que se
visita, quien abriera la aplicación, mirara la portada y se metiera en el metro
no tenía nada más. Cada diez minutos como mucho, y de fondo, el service worker
se trae las pantallas del menú de esa persona; con abrir la aplicación una vez
al día con cobertura se lleva la aplicación entera encima.

Es una dirección propia y no una server action **porque el identificador
interno de una server action cambia en cada despliegue**: un apunte que se quedó
en la cola el martes tiene que poder subirse el jueves aunque la aplicación se
haya actualizado.

**Solo se encola lo que es de uno.** Capturas, bajas, gimnasios y notas: cada
uno apunta lo suyo y solo se añade, así que no hay conflicto posible. Los
resultados, los puntos, la ruleta y los retos se quedan fuera a propósito —los
toca la organización y son de varios— y sin conexión simplemente no se pueden
tocar.

**La guía va en `public/` y no en la base de datos.** Es un fichero estático
de tres megas que se sube con el código: así se abre igual de rápido para
todos, se puede guardar en el móvil y no hay nada que administrar ni que
subir desde ninguna pantalla. La alternativa —que un administrador subiera el
PDF— habría que pasarla por una server action, que **no admite tres megas** sin
tocar la configuración, y a cambio no arregla nada: la guía la rehace quien
toca el código, y cuando la rehace ya está desplegando.

**El visor solo sale en pantalla grande.** En el móvil los navegadores no
pintan un PDF metido en la página: o lo descargan o abren su propio visor. Por
eso arriba mandan los dos botones —abrir y guardar—, que funcionan en todas
partes, y el visor se queda para el ordenador.

**El círculo y el óvalo son dos formas distintas.** El "círculo" de siempre
era en realidad una elipse: se estiraba a lo ancho y a lo alto por separado y
salir de ahí con un redondo perfecto era imposible a pulso. Ahora hay
**"Círculo"**, que se dibuja con un solo radio y mantiene el ancho igual que el
alto al estirarlo, y **"Óvalo"**, que es lo de antes. El óvalo sigue guardándose
como `circle` a propósito: es lo que ya hay escrito en la base de datos y
cambiarle el nombre dejaría sin forma a todas las zonas viejas.

**Las zonas se pueden girar y el relleno se regula por mapa.** Hay rutas en
diagonal que un rectángulo recto no cubre sin comerse media ciudad de al lado,
así que cada zona guarda su `angle` y se gira arrastrando un tirador ↻ (o
escribiendo los grados, para clavarlos). El giro es solo al dibujar: por dentro
la zona sigue derecha, y por eso el número de capturas y la chapa de bajas se
siguen leyendo del derecho. Y como las imágenes bonitas —las islas de Alola son
un dibujo detallado, no una cuadrícula— se tapan con zonas rellenas, cada mapa
guarda su `relleno` en tanto por ciento: al bajarlo, las zonas quedan como
puntos de color encima del sitio que marcan, con su borde de siempre.

**Los nombres de las zonas están escritos a mano porque PokéAPI no los tiene.**
Se comprobó: de Johto, Kanto, Sinnoh y Teselia no hay **ni un solo** nombre en
español (Hoenn 85 %, Kalos 98 %, Alola 88 %). Las rutas se traducen solas
("Route 29" → "Ruta 29") y los sitios con nombre propio los escribí yo. Como el
mapa es editable, un fallo se corrige sin tocar código.

**Las zonas son formas sobre el mapa, y van sin el nombre escrito.** La primera
versión ponía una etiqueta con el nombre de cada zona colocada en una rejilla, y
quedaba mal: cincuenta etiquetas tapan el mapa entero. Ahora cada zona es un
rectángulo, un círculo o un polígono **dibujado encima de la imagen** y
transparente, y se rellena de su color cuando apuntas algo dentro. De un vistazo
se ve por dónde has pasado, que es de lo que va la pantalla.

**Un encuentro fallado también se apunta, y manda la captura buena.** Una ruta
donde se te escapó el pokémon está hecha, pero sin premio: se guarda con
`Capture.failed`, sale en rojo con una ✕ en vez del número, y en la ficha lleva
la ✕ en el hueco del sprite con el nombre tachado. **De los fallados no se baja
el sprite**: no se va a ver, y así apuntarlos es instantáneo. Si luego capturas
algo en esa misma zona, la ✕ pasa a ser el número de capturas buenas y la zona
recupera su color; el fallo se queda apuntado en la ficha, que para eso está.
El recuento de un grupo suma los de sus hijas con la misma regla.

**Y por eso el primer toque dice qué zona es y el segundo la abre.** Sin el
nombre escrito hace falta una manera de saber qué estás tocando, y en un móvil
no hay ratón que pasar por encima. El nombre sale en el cartel de debajo del
mapa; tocar otra vez la misma zona la abre.

**El mapa va en SVG con `viewBox`, no con divs colocados.** Las zonas son formas
de verdad y las coordenadas se guardan en unidades del lienzo: el navegador
escala todo solo, así que el mismo mapa vale en un móvil de 390 píxeles y en un
monitor sin botones de acercar ni scroll horizontal. Y cambiar la imagen de
fondo por una mejor no mueve ninguna zona, porque las zonas no están en
coordenadas de la imagen.

**Una zona puede llevar otras dentro.** Una ciudad que además tiene su cueva o
su torre no cabe en una sola casilla: `MapZone.parentId` la cuelga de otra, la
hija deja de dibujarse, y al tocar a la de fuera sale la lista para elegir en
cuál capturaste. El recuento del padre suma el de sus hijas, así que se rellena
igual. Solo hay **un nivel** a propósito: una zona dentro de otra dentro de otra
no aporta nada y complica el editor.

**Las zonas se pueden sacar de la imagen automáticamente.** Los mapas de tracker
que circulan por internet ya llevan las casillas pintadas —las ciudades en rojo
y las rutas en blanco—, así que `lib/detectar-zonas.ts` busca las manchas de
esos colores y crea una zona por cada una, en su sitio. Con el mapa de Johto
saca 36 de una vez. Colocar cincuenta zonas a mano se convierte en ponerles el
nombre, y funciona con cualquier región que use un mapa parecido.

**El editor se usa sobre el mapa, no sobre una lista.** Eliges una zona
tocándola, y ahí mismo la mueves, la estiras por su esquina y le cambias
nombre, tipo, forma y color. Las que no se dibujan —las que están dentro de un
grupo y las de forma "Sin dibujar"— tienen su propia fila de botones debajo:
sin eso quedaban **inalcanzables**, porque metías una zona en un grupo y ya no
había forma de volver a abrirla para sacarla (pasó).

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

**El sitio de una baja se elige del mapa, pero el texto libre no se tira.**
Antes `Death.location` era un campo de escribir y cada uno ponía lo que le
salía —"Ruta 32", "ruta 32", "la del pescador"—, así que no había forma de
contar nada. Ahora hay `Death.zoneId` apuntando a la zona del mapa de esa
región, y de ahí salen dos cosas que antes eran imposibles: la chapa roja de
"aquí has perdido N" en tu mapa privado y el ranking de dónde cae más gente.
`location` **sigue existiendo** por dos motivos: hay bajas que no pasan en
ninguna zona (un combate de jornada, un intercambio), y las de antes de esto
tienen ahí lo que se escribió en su día. El desplegable ofrece las zonas
agrupadas por tipo y una opción de "Otro sitio" que abre el campo de siempre.
Al guardar, la zona manda: si viene una válida, el texto se descarta. Y se
comprueba en el servidor que la zona sea de la región de esa edición, porque el
desplegable solo ofrece las que tocan pero el formulario se puede mandar a mano.

**Hay dos retiradas distintas y conviene no confundirlas.** Una es **irse del
locke** (`retirarParticipanteAction`, abajo): esa persona deja de jugar del
todo. La otra es **no presentarse a un combate** (`darPorRetiradaAction`), que
le puede pasar a alguien que sigue jugando tan tranquilo. Comparten la marca
`Match.porRetirada` —las dos son victorias sin jugar y se enseñan igual— pero
se resuelven distinto:

- **No presentarse** se resuelve en el momento, se elige quién faltó (no quién
  ganó, que es como se cuenta en el grupo) y el ganador se lleva el punto **y
  una diferencia de 3 pokémon**: no presentarse no puede salir más barato que
  perder jugando, y la diferencia es el segundo desempate de la clasificación.
- **Irse del locke** no reparte nada de golpe; ver más abajo.

Guardar un resultado normal encima quita la marca: si se jugó, ya no fue una
retirada.

**Retirarse no es lo mismo que salirse de la competición.** Sacar a alguien
(`removeParticipantAction`) le borra el cementerio y los puntos, como si nunca
hubiera jugado, y eso falsea lo que pasó. Cuando alguien se raja a mitad del
locke lo que hace falta es **retirarlo** (`retirarParticipanteAction`): no se
borra nada suyo, sigue saliendo en la clasificación tachado, y lo único que
cambia es que deja de contar para lo que hace avanzar al grupo. En concreto:

- **Los gimnasios** solo esperan a los que siguen (`soloActivos()`). Si no, el
  grupo entero se quedaría bloqueado esperando a alguien que ya no juega.
- **En la clasificación va al final y sin puesto** (`position: 0`, una raya).
  Si se quedara en su sitio, alguien que ya no juega saldría segundo y
  parecería clasificado para la Final Four.
- **No cuenta como votante del MVP**, o la votación nunca estaría completa.
- **No se ofrece para emparejar** combates nuevos.
- Se puede **readmitir**: es solo quitarle la marca.

**Los combates que gana el rival por retirada no se dan todos de golpe.** Cada
uno espera a que el resto de su jornada esté jugada, como si se hubiera jugado
el último (`lib/retiradas.ts`). Repartir de una vez los puntos de cinco
jornadas dejaría la clasificación adelantada respecto a lo que ha pasado, y el
gráfico de puestos jornada a jornada —que se dibuja con la fecha de cada
punto— daría un salto que no se corresponde con ninguna jornada. Mientras
esperan se enseñan como "por retirada, al acabar la jornada". La resolución se
dispara al retirar a alguien y cada vez que se apunta o se borra un resultado,
que son los momentos en que una jornada puede completarse. Un combate entre
dos retirados no se resuelve nunca y **no bloquea** a los demás.

**La cobertura de tipos usa la tabla de la generación del locke, no la de hoy.**
Es la diferencia entre una herramienta que sirve y una que engaña: en Johto el
Acero resiste al Fantasma y al Siniestro, el tipo Hada no existe y Clefairy es
Normal. `scripts/generate-tipos.ts` baja de PokéAPI también los ficheros de
"cómo era antes" (`type_efficacy_past`, `pokemon_types_past`) y deja calculada
**una tabla por generación**, más los tipos de cada pokémon en cada tramo. No
hay ni un valor escrito a mano, y el propio script comprueba siete casos
conocidos antes de escribir el fichero.

De la generación se encarga `generacionDelJuego()`, que la saca de la región
principal, así que HeartGold cuenta como 2ª aunque el juego sea de la 4ª. Da
igual: está comprobado en los datos que **la tabla no cambió entre la 2ª y la
5ª**, ni los tipos de ningún pokémon en ese tramo.

Es una tabla **defensiva** a propósito: responde a "si me sacan un ataque de
Fuego, ¿a quién le duele?". Por eso en la fila del Fuego un Charizard sale ×½ y
un Durant ×4. El resumen de cada fila no es una nota media sino cuántos son
débiles y cuántos resisten, que es lo que se mira al preparar un combate, y las
filas salen ordenadas por peligro para que lo que te mata esté arriba.

**Pero se puede pedir la tabla de ahora, y esa es la gracia.** Muchos grupos
juegan los combates en un simulador moderno aunque el locke sea de Johto, así
que hay una casilla —"Contar con la tabla de ahora"— que cambia a la
efectividad y a los tipos de hoy: sale el Hada, Clefairy y compañía pasan a
Hada, y el Acero deja de resistir Fantasma y Siniestro. La elección se guarda
en `TypeTeam.tabla` y es **de cada uno**, no de la edición: la casilla solo
aparece si el locke es de 5ª generación o anterior, porque de la 6ª en adelante
no cambiaría nada.

Medido sobre los datos generados, entre la 2ª y hoy solo cambian **dos
casillas** de la tabla (Fantasma y Siniestro contra Acero, de ×½ a ×1) y 22
pokémon de tipo, todos los que se volvieron Hada.

Vive en la pantalla de las notas porque se usa **mirando las notas**, y es igual
de privada: el equipo se guarda por participante y no hay ninguna consulta que
devuelva el de otro. Se guarda solo, 800 ms después de dejar de tocar, para no
escribir en la base por cada letra. De momento solo la forma normal de cada
pokémon: las de Alola y las megas cambian de tipo, pero en un locke de Johto no
pintan nada y el desplegable de formas ensuciaba los seis huecos.

**Un juego puede tener varias regiones, y la 2ª generación tiene dos.** En Oro,
Plata, Cristal, HeartGold y SoulSilver, al ganar la Liga de Johto se abre
**Kanto entero**, con sus ocho medallas y sus rutas, así que atarlos a un solo
mapa dejaba fuera media partida. `Juego` tiene ahora `region` (la principal, la
de empezar) y `extra`, y `regionesDelJuego()` las devuelve juntas. De ahí sale
todo lo demás: el mapa de capturas saca una fila de pestañas, el desplegable de
"dónde cayó" ofrece las zonas de las dos y la comprobación del servidor acepta
cualquiera de ellas.

Cuál se está viendo va en la dirección (`?region=kanto`) y no en un estado del
navegador: así el enlace se puede guardar y no hay que traerse las dos regiones
a la vez. Las capturas y las bajas se filtran a las zonas del mapa que se está
viendo, para que el "4 de 36 zonas" hable de lo que hay delante y no de las dos
mezcladas.

El desplegable de "dónde cayó" cambia de criterio según el caso: con una sola
región agrupa por **tipo** de sitio (Rutas, Ciudades, Cuevas…), que es lo que
ayuda a encontrar algo entre cincuenta; con dos agrupa por **región**, porque
entonces saber en cuál estás importa más.

Kanto tiene sus 44 zonas escritas de fábrica en `lib/mapas-de-fabrica.ts`, pero
**hay que pedirlas con el botón** de Administración → Mapas → Kanto, como Johto:
no se rellena solo, para que borrar una zona a conciencia no la haga volver.

**Las bajas se pintan en el mapa con una chapa, no con una calavera.** Se probó
con el emoji y no se lee: un mapa de región entero cabe en la pantalla de un
móvil, así que cada zona mide cuatro píxeles y el dibujo se convierte en una
mancha. Un círculo rojo liso con la cifra sí se distingue, y en las zonas
estrechas se queda el círculo solo —que ya dice "aquí has perdido algo"— y el
número se lee en la lista o abriendo la zona.

**El botón de apuntar navega, no abre formularios.** Los tres atajos llevan a
su página con `?apuntar=1` y esa página se encarga: la Caja despliega su
formulario y baja hasta él, el mapa enfoca el buscador de rutas y los level caps
resaltan el primer gimnasio que te queda. Meter aquí una copia del formulario de
bajas —que arrastra el buscador de especies y sus imágenes— era la forma segura
de que una de las dos copias se quedase vieja.

**El aviso de novedades es una fecha por pestaña, no una lista de cosas sin
leer.** `TabSeen` guarda cuándo miraste cada grupo del menú, y lo nuevo se
deduce comparando esa fecha con la de lo que ha pasado. Así no hay nada que
marcar pieza a pieza ni que limpiar, y no se puede desincronizar de los datos
de verdad. Tres detalles pensados:

- **Todo se resuelve en una consulta** (`$queryRaw` con `EXISTS`), porque esto
  corre en el layout, o sea en cada página que se abre, y contra una base de
  datos en internet cada viaje se nota. No interesa cuánto hay nuevo, solo si
  hay algo, y `EXISTS` para en la primera fila.
- **De lo tuyo no se avisa**: tus propias bajas, puntos y gimnasios se
  descuentan, que ya te has enterado tú de hacerlos.
- **Estando dentro del grupo no se pinta el punto**, así que se apaga en cuanto
  entras sin esperar a que el servidor guarde la visita. Por eso la acción que
  guarda la visita **no revalida nada**: si lo hiciera, volvería a montar el
  componente que la llama y entraría en bucle.

La excepción es el MVP por votar: ese no se va por mirar la pestaña, porque no
es algo que ver sino algo que hacer. Se apaga al votar.

**Lo que ocupa la base de datos se mide, no se calcula de cabeza.** La pregunta
de cuántos lockes caben no tiene respuesta de memoria: casi todo el peso son
**imágenes guardadas como data URL** dentro de la propia base —sprites,
ilustraciones y fondos de mapa—, y eso depende de cuánto haya apuntado la gente,
no del número de tablas. Por eso `/diagnostico` lo mide sobre la base de datos
de verdad (`lib/ocupacion.ts`), y lo mide donde está desplegada, que es donde
importa.

Dos cosas que salen de ahí y conviene tener presentes:

- **El esqueleto se paga una vez.** Las tablas, los índices y el texto ocupan
  unos megas estén llenos o vacíos, y valen para todos los lockes. Lo que crece
  con cada locke son las imágenes, así que el "por locke" se mide con ellas; si
  se repartiera el total, saldría inflado por algo que ya estaba pagado.
- **El mismo sprite se guarda una vez por fila.** Si dos personas usan Garchomp
  en dos combates, son cuatro copias de la misma imagen. Mientras sea un locke
  da igual; si algún día se comparte la aplicación con gente de fuera, guardar
  cada sprite **una sola vez por especie** y apuntar a él es lo que multiplica
  el sitio disponible, y es un cambio de tabla, no de pantallas.

**Cada imagen se guarda una sola vez, y las filas apuntan a ella.** Era lo que
más pesaba con diferencia: el sprite de Garchomp se guardaba entero en cada
combate, en cada baja y en cada bote, y la misma imagen de 18 KB estaba repetida
decenas de veces. Ahora vive en la tabla `Imagen` y la columna de siempre lleva
`ref:<clave>`, veinte caracteres. Medido: 306 filas de equipo con las mismas seis
especies ocupan **208 KB en vez de 16,5 MB**.

Tres cosas que salieron gratis con el mismo cambio:

- **No se vuelve a descargar un sprite que ya se tiene.** La clave dice de dónde
  salió (`pkm-445-box`), así que apuntar un pokémon que ya está guardado no cruza
  hasta GitHub ni pasa por sharp: se apunta la referencia y ya.
- **El navegador se baja un Garchomp, no doce.** La dirección pasa a ser la de la
  imagen (`/api/imagen/c/<clave>`) y no la de la fila, así que la comparten todas
  las pantallas y todas las filas que la usen.
- **Las firmas dejan de resumir 35 KB por fila y por visita.** El `md5` que
  calculaba PostgreSQL para saber qué versión era ahora cae sobre veinte
  caracteres.

**Convive con lo de antes a propósito.** Una columna puede llevar todavía la
imagen entera y se sirve igual: así el despliegue no depende de haber migrado
nada. El botón de *Diagnóstico* pasa lo que quede, y se puede pulsar las veces
que haga falta porque solo toca lo que empieza por `data:`.

**Y hace `VACUUM FULL` al terminar.** Sin eso el cambio no se nota: PostgreSQL
marca como libre lo que ocupaban las filas viejas pero no encoge el fichero, así
que la tabla seguiría midiendo lo mismo y la cuenta de cuántos lockes caben
saldría igual de mala.

**Los dibujos de objetos se quedan fuera.** Hay uno por objeto del catálogo, no
uno por uso, así que no hay nada repetido que quitar, y la bolsa los pinta
directamente desde la fila en vez de pedirlos a `/api/imagen`.

**Tirar una imagen huérfana es un botón aparte y no pasa al borrar una fila.**
Al borrar una baja no se puede borrar su imagen: puede que la estén usando otras
diez. Así que se recorren todas las columnas al revés y se tira lo que no aparece
en ninguna, cuando uno quiere.

**El permiso de organizador es una marca, no un rol nuevo.** Alguien con
`puedeCrearLockes` puede montar sus lockes y dar de alta a su gente, y nada más:
no ve los lockes en los que no juega —eso lo decide `filtroDeLockesVisibles`, que
no cambió—, ni entra en Administración, ni toca los mapas, el catálogo, las
plantillas o las copias. Un rol nuevo habría obligado a repasar todas las
comprobaciones de la aplicación para decidir de qué lado cae; una marca solo
levanta la puerta de "crear".

Lo que hubo que cuidar al abrir esa puerta, que es donde estaban los líos:

- **Quien crea un locke entra dentro como administrador de esa edición.** Si no,
  un organizador montaría el suyo y no podría ni abrirlo.
- **"Archivar las anteriores" solo archiva las que lleva él**, no las que juega.
  Con el filtro de "las que puede ver", montar su primer locke habría archivado
  de paso el de la casa en el que juega.
- **Copiar de otro locke solo se puede desde los que puede abrir.** Copiar es
  leerlo entero.
- **Solo ve las cuentas que él dio de alta** (`creadoPorId`) y la suya, así que
  puede armar su locke con su gente sin ver la lista entera de la casa. Y las
  cuentas que crea son siempre jugadores: repartir permisos de administrador no
  es cosa suya.

**Las copias de seguridad ya no llevan las imágenes dentro.** Eran **147 MB de
179**: cinco copias guardando cada una todas las imágenes, que ya estaban ahí al
lado en el almacén. Ahora la copia que vive en la base de datos guarda el texto
y **la lista de claves** que necesita, y las imágenes se sacan del almacén al
leerla. Medido en pruebas: de 512 KB a 14 KB por copia.

Tres cosas de esto que no son obvias:

- **El fichero que se descarga sigue llevándolo todo dentro.** Es el único que
  vive fuera de Neon: si se cae la base de datos entera, una copia con
  referencias a esa misma base de datos no valdría de nada. `leerCopia` rehace
  la tabla de imágenes antes de entregarlo, así que descargar y restaurar no se
  enteran de cómo estaba guardado por dentro.
- **La limpieza de huérfanas respeta lo que necesita una copia.** Por eso se
  apunta la lista de claves en `Backup.imagenes`: sin ella, tirar una imagen que
  ya no usa ninguna fila dejaría coja una copia que sí la necesitaba.
- **Las copias de antes se aligeran con un botón, y de una en una.** No encogen
  solas: son un JSON ya escrito. El botón de *Diagnóstico* coge una, le saca las
  imágenes al almacén y la reescribe. Va de una en una porque una copia
  descomprimida son decenas de megas en memoria, y hacerlas todas de un tirón se
  comería el tiempo del servidor. **Es cosa de una vez**: las copias nuevas
  nacen ya ligeras, la del día incluida.
- **Ligera o no lo dice una columna (`Backup.formato`), no la lista de claves.**
  Una copia puede necesitar cero imágenes —una base de datos recién puesta— y
  entonces parecería para siempre una copia por aligerar: un aviso que no se iría
  nunca y un botón que no haría nada.

**Restaurar una copia antigua ya no se cae.** Era un fallo de siempre que
apareció al añadir una columna: la restauración insertaba **todas** las columnas
de la tabla, y las que no existían cuando se hizo la copia entraban como nulo. Si
esa columna no admitía nulo —porque tiene valor por defecto—, la restauración
entera se caía con un error de PostgreSQL. Ahora se insertan **solo las columnas
que trae la copia** y cada una de las demás toma su valor por defecto.

**Administrador dejó de ser un papel de cuenta.** Antes había un
«administrador global» que lo era de todo, y un `Participant.isAdmin` que mandaba
dentro de una edición; las dos cosas se llamaban igual y se mezclaban. Ahora:

- **Creador**: quien lleva la aplicación. Los mapas, las plantillas de level
  caps, el catálogo de objetos, las copias, el almacén de imágenes, las cuentas,
  el diagnóstico y todos los lockes.
- **Administrador de locke**: manda dentro de *su* edición —jornadas, retos,
  puntos, level caps, reglas, ruleta, jugadores, repartir objetos, archivarla y
  borrarla— y en nada más. No entra en Administración ni toca nada que valga
  para toda la casa.

**El `"ADMIN"` de antes se sigue leyendo como Creador.** Cambiar el nombre del
papel sin esto habría dejado a quien lleva la aplicación fuera de su propia
aplicación en el mismo despliegue en que se cambia. Por eso `esCreador` acepta
los dos, y no hace falta tocar ninguna fila al publicar.

**Lo que se movió de sitio al repartir:**

- **Dar y quitar objetos de una bolsa** pasa a los administradores del locke. El
  **catálogo** de objetos no: lo que existe es de toda la casa. Las dos cosas
  viven en la misma pantalla, así que la de *Bolsas de todos* se abre a los
  administradores del locke y **la parte del catálogo se enseña solo al
  Creador**.
- **Archivar y borrar un locke** pasa a quien lo administra: es su edición y
  decide él cuándo se acaba.
- **Los ajustes de la edición** se fueron de Administración —que es del
  Creador— a *Competiciones*, que es donde llega quien lleva el locke.

**Se puede pedir un locke de cualquier tamaño, no solo en solitario.** La
petición lleva para cuánta gente es, y al aceptarla quien la pidió entra como
**administrador de esa edición**. Si es de dos o más se lleva además el permiso
de organizador, porque un locke de grupo no sirve de nada si no puede dar de
alta a sus amigos.

**Al cambiar algo hay que refrescar todas las pantallas donde sale, no solo la
suya.** Next guarda lo ya pintado, así que una pantalla que no se refresca
sigue enseñando el número de antes aunque la base de datos ya esté bien. Pasó
con las bajas: borrar una dejaba el cementerio en 10 y la clasificación en 12,
porque las acciones de bajas refrescaban `/muertes`, `/mapa` y la portada pero
no `/puntos` ni los perfiles.

Una baja **no sale solo en el cementerio**: cuenta para la clasificación —es el
primer desempate—, y sale en el perfil de cada jugador, en el hall de la fama y
en el muro. Por eso ahora hay un `refrescarBajas()` con la lista entera en vez
de repetirla a mano en cada acción: si mañana el número aparece en otra
pantalla, se añade una vez y valen las tres.

Lo mismo con los puntos, las jornadas y los royales, que cambiaban la
clasificación y dejaban el perfil de cada jugador con lo de antes. Los perfiles
son una ruta con identificador, así que se refrescan con
`revalidatePath("/jugador", "layout")`, que los coge todos.

**Ojo al probarlo en local**: ahí no se reproduce. Esas pantallas leen la cookie
de la edición, así que el servidor de desarrollo las trata como dinámicas y se
refrescan solas; el número viejo se ve en el navegador de quien lo usa. Que no
pase en `npm run start` no quiere decir que no pase.

**Un wipeo es una marca, no una expulsión.** Por las reglas de siempre que te
barran el equipo es perder el locke, pero eso es muy duro si pasa en la primera
ruta. Así que se cuentan —**sin límite, y se quitan si se apuntó una por
error**— y que alguien quede fuera se decide aparte. Son dos cosas distintas y
por eso viven en sitios distintos: `Wipeo` es una fila más, y quedarse fuera es
una marca en el participante.

Un wipeo lo apunta **el propio jugador o quien administre el locke**, igual que
una baja: es su partida y lo sabe él. Dejar a alguien fuera es solo de la
organización.

**"Perdió el locke" y "se retiró" son el mismo estado con distinto motivo.** Para
la competición son casi idénticos —deja de emparejarse, no cuenta para el
formato del final, y sus combates pendientes los gana el rival—, y toda esa
maquinaria ya preguntaba por `Participant.retiredAt`. Así que un locke perdido
también rellena esa fecha, y lo que los distingue es `motivoDeSalida`.

Se hace así **a propósito**. Con una segunda fecha habría que repasar quince
consultas —emparejamientos, MVP, el formato del final, las retiradas
pendientes— y bastaría olvidarse de una para que alguien que perdió el locke
siguiera emparejándose. Reutilizando la columna, lo único que cambia es cómo se
cuenta, que es justo lo que se quería distinguir: en rojo y con su nombre.

Comprobado que de verdad queda fuera: con seis jugadores y uno con el locke
perdido, la jornada siguiente empareja a cuatro y deja descansando a uno, sin
contar con él.

**El que pierde el locke sigue votando el MVP; el que se retira, no.** Es lo
único en lo que los dos motivos de salida no dan igual, y por eso se pregunta
con `puedeVotarElMvp()` y no con un `retiredAt === null` suelto. Al que lo
pierde no se le echa del grupo: sigue viendo los combates y opinando, y dejarle
sin voto era castigarle dos veces. El que se retira se ha ido, y ya está.

Son **cuatro sitios** y hay que tocar los cuatro: la acción de votar (que es la
que manda), la chapa que pinta los botones, el recuento de votantes de
`lib/mvp.ts` —si contara un retirado la votación nunca estaría completa, y si no
contara un wipeado estaría "completa" faltando su voto— y **el punto ámbar**.
Este último es el que se olvida: el aviso de "te toca votar" no se apaga por
mirarlo, sino por votar, así que a un retirado se le quedaría encendido para
siempre. Por eso `getAvisos` recibe `puedeVotar`.

Un voto de alguien que se retira después **se queda**: es lo que pasó, y borrarlo
cambiaría un MVP ya decidido. Como entonces puede haber más votos que votantes,
el recuento enseña `Math.max(votantes, votos)` y nunca un "6/5".

**Pero estar fuera no quita el mando.** Quien administra el locke lo sigue
administrando aunque se retire o pierda el locke: quien organiza suele jugar, y
que un wipeo le dejara sin poder emparejar la jornada siguiente sería absurdo.
Sale gratis porque los porteros —`canManageCompetition`, `getAcceso`,
`assertPuedeTocarLocke`, `assertCanActForParticipant`— miran la ficha de
participante y la marca de administrador, **nunca `retiredAt`**. Queda dicho en
`canManageCompetition` porque es fácil romperlo sin querer: bastaría con filtrar
ahí por "los que siguen jugando".

**El permiso para jugar estando fuera se da por combate, no por persona.** La
norma es que quien está fuera no juega, y se quería poder saltársela de vez en
cuando. Hacerlo con una marca en el participante —"este puede seguir
combatiendo"— habría sido levantar la norma entera y sin fecha de caducidad;
darlo combate a combate es exactamente lo que se pide y se ve dónde se ha
usado. Lo lleva `Match.excepcion`.

Montar el combate a mano con alguien que está fuera **es el permiso**: no hay
casilla que marcar. La organización es la única que puede montarlo, así que
elegirle del desplegable ya es decidirlo, y la respuesta lo dice con todas las
letras. En el desplegable salen los últimos y con su etiqueta —"Rodri (locke
perdido)"— para que no se cuele sin querer.

Aparte hay un botón de dar y quitar el permiso en cada combate, y **no sobra**:
lo normal es que el wipeo llegue con el combate ya puesto. Sin él habría que
borrar el combate y volver a montarlo, perdiendo las notas y el equipo
apuntado. Si ya se había dado por retirada, darle el permiso lo deshace —le
quita el ganador y el punto— y vuelve a estar pendiente.

Lo que hay que respetar al tocar `lib/retiradas.ts`: un combate con permiso
**no se da por ganado al rival**, pero sí cuenta como algo que falta por jugar.
Son las dos mitades de lo mismo y es fácil quedarse en una: si solo se excluye
del reparto, el resto de combates por retirada de esa jornada se darían por
ganados creyendo que ya no falta nadie.

**La ficha de participante pone los datos arriba y los botones debajo.** Estaban
todos en la misma línea y con el botón de perder el locke ya eran cuatro: en un
móvil el nombre se quedaba en una letra —"A", "D"— y el usuario en una arroba
suelta. Ahora el avatar con el nombre ocupan su línea entera y los botones van
en otra, que se parte sola si no caben. Comprobado a 360, 390 y 430 píxeles.

**Lo que solo sale al pasar el ratón por encima no existe en un móvil.** La ✕
de quitar un pokémon del equipo del hall de la fama estaba con opacidad 0 y se
descubría con `group-hover`: en una pantalla táctil eso no pasa nunca, así que
desde el teléfono no había forma de corregir un equipo. Ahora se ve siempre y
el descubrirla se deja para el ordenador (`sm:opacity-0 sm:group-hover:…`). Si
aparece otro botón escondido así, mismo cuidado.

El mismo apretón estaba en la lista con la que se siembra la Final Four: al
lado de "Juega la primera ronda" los nombres se quedaban en dos letras. Ahí la
chapa se baja a su propia línea en el móvil (`w-full sm:w-auto`) y en el
ordenador se queda donde estaba.

De paso se quitaron dos cosas que sobraban ahí. **Un solo botón para devolver a
alguien al locke**: cuando está fuera por un wipeo se esconde *Readmitir*,
porque *Devolverle el locke* hace lo mismo y dos botones con nombres distintos
para lo mismo solo confunden. Y **el tachado es del nombre**, no de la línea: lo
lleva un `<span>` suyo, que si no las chapas de *admin* y *💥 locke perdido*
salían tachadas y no se leían.

### La ruleta reparte premios de verdad

Una casilla ya no es solo texto. Puede ser **un objeto del catálogo de la
bolsa** o **tickets de una ruleta**, y entonces sale sola de la rueda a la bolsa
o al saldo, igual que los objetos que se lleva quien gana un reto. Lo que no se
hace solo se olvida, y "acuérdate de darle la Ultra Ball a Enzo" es justo el
tipo de cosa que se olvida.

**Quién se lo lleva depende de quién gira**, y es la única regla que hay que
tener en la cabeza:

- **Gira un jugador**: está gastando *su* ticket, así que la tirada es suya y el
  premio también. Cae solo y se avisa ahí mismo.
- **Gira quien administra**: no gasta ticket de nadie, así que la tirada no es
  de nadie todavía. El premio queda **pendiente**, la fila del historial se pone
  ámbar y se elige a quién dárselo con un desplegable.

Un premio ya entregado **se puede pasar a otro** ("✎ Dárselo a otro"): se le
quita al primero y se le da al segundo. Dárselo a quien no era y darse cuenta al
momento es lo que pasa de verdad. Con los tickets no se borra nada, que el saldo
es un historial de sumas y restas: devolver uno es **otra fila en negativo** y
queda dicho por qué.

Dos cosas que no son evidentes y están así a propósito:

**El rótulo de una casilla con premio lo pone el servidor**, con el nombre del
objeto o de la ruleta ("2 × Ultra Ball", "3 🎟️ Recompensas del líder"). Dejarlo
escribir a mano era la forma segura de acabar con una casilla que dice *Ultra
Ball* y reparte otra cosa.

**El premio se copia al giro**, como ya se copiaba el texto: `premioItemId`,
`premioTicketsDeId` y `premioCantidad` viven en `RouletteSpin`. La casilla se
puede borrar o cambiar de premio, y lo que se dio ya está dado; el historial
tiene que aguantarlo. `entregadoA` en null **con premio** significa pendiente.

Los tickets pueden ser **de la ruleta misma**, y entonces lo que toca es volver
a girar ahí. No hace falta nada especial: es una fila más de saldo.

**Los dibujos de los objetos van por el almacén**, con `urlsDeImagen("objeto")`,
como en los retos. La primera versión los pedía con un `select: { image: true }`
y colaba la data URL entera en el HTML —tres veces, una por sitio donde sale el
objeto—; ahora es una dirección de 50 caracteres que además el navegador
guarda. Es el error de siempre con las imágenes de esta aplicación y se coló
igual: conviene mirarlo cada vez que se pinta una imagen nueva.

Meter y sacar cosas de una bolsa se movió a `lib/bolsa-entregas.ts`, que ahora
lo usan los dos sitios que reparten solos —los premios de un reto y esto—.

### El tercer repaso: jugar el locke hasta el final

Los dos repasos anteriores miraban las mismas pantallas en el mismo estado —un
locke a media carrera—, así que el tercero fue **jugar la partida de ejemplo
hasta el final**: anotar las quince jornadas, generar el cuadro, jugarlo entero
y rellenar el hall. Esas pantallas nunca se habían visto con datos, solo con su
aviso de "aún no toca".

Aguantan: el cuadro avanza solo llave a llave, sale el campeón con su
subcampeón, el palmarés se entera y `/jornadas` de un locke terminado se queda
en **una pantalla** porque todas las jornadas se pliegan. Lo que salió fue de
mirar, y son tres cosas:

- **El podio eran tres cajones vacíos.** El comentario decía "es decorativo, lo
  que se lee está arriba", y lo era, pero sobre fondo oscuro tres rectángulos
  sin nada dentro parecen algo que no ha cargado. Ahora llevan su número —1, 2,
  3, cada uno del color de su medalla— y se lee de un vistazo que es un podio.
- **"Tercero en la tabla" no cabía** en una columna de un tercio de móvil y se
  quedaba en "Tercero en la ta…". Ya no se trunca: se parte en dos líneas.
- **En el cuadro final, al nombre del ganador le quedaban cuatro letras**
  ("👑 Adri…"): la columna es estrecha y la diferencia, la fecha y el lápiz se
  llevaban el sitio. Con un ancho mínimo, lo que baja de línea es la fecha.
- **Los huecos del equipo del hall** eran un "·" a opacidad 25 con un borde casi
  invisible: se leían como tres puntos sueltos flotando. Ahora son un recuadro
  punteado y nada dentro, como los del equipo de un combate.

**Lo que no era un fallo**: el detector de desbordes marcó la gráfica de la
clasificación con cinco jornadas. Es falso positivo suyo —el marco de la
gráfica se desplaza en horizontal a propósito, así que lo de dentro se sale de
la pantalla y se llega desplazando—. La página no desborda.

### El segundo repaso: lo que se toca y lo que estorba

**Para abrir la ficha de un jugador había que acertarle a su foto**, un círculo
de 20 píxeles, con el nombre justo al lado sin hacer nada. Ahora la pastilla
entera —foto y nombre— es el enlace, con `EnlaceDeJugador`: de 20×20 a 117×28 en
las jornadas. Está en las jornadas, los retos, la clasificación, el cementerio y
el reparto de tickets. **Ojo**: dentro no puede ir otro enlace ni un botón, así
que el avatar de dentro va sin `participantId` —si no, pondría el suyo y
quedaría un `<a>` dentro de otro—.

**Retirar, dar el locke por perdido y sacar a alguien viven detrás de un "⋯
Más".** Estaban los tres a la vista por jugador: con seis, dieciocho botones en
ámbar y rojo en una pantalla que se abre para mirar quién juega. Son cosas de
una vez en todo el locke. *Editar* se queda fuera, que esa sí se usa.

**El perfil va de dos en dos en pantalla ancha** (`xl:grid-cols-2`, sin
`items-start`: estirando las tarjetas la rejilla se lee mejor que con los huecos
desiguales). De 2449 a 1973 píxeles.

**La gráfica de la clasificación no sale con una sola jornada jugada.** Eran dos
columnas —"Inicio" y "J1"— y trescientos píxeles para decir lo que la tabla de
debajo ya dice. Aparece con dos jornadas, que es cuando hay recorrido que ver.

### El repaso de pantallas: lo que ocupaba de más

Se midieron las 24 pantallas a lo ancho de un móvil (390) y de un ordenador
(1280). Nada se salía por los lados, no había errores en consola ni imágenes
rotas —lo que parecía imagen rota era una foto con carga diferida que no había
llegado a tiempo a la medición, no un fallo—. Lo que sí apareció fue **altura
de sobra**, y de ahí salieron cuatro arreglos.

**Una jornada terminada se pliega.** Ocupaba exactamente lo mismo que una en
marcha, así que con cinco jornadas había que bajar cuatro pantallas para llegar
a la de hoy. Ahora, cuando están todos sus combates jugados, el cuerpo entra en
un `<details>` cerrado y en su sitio queda un renglón con **quién ganó**, que es
lo que se consulta de una jornada vieja. Medido: de 954 a 238 píxeles. En una
jornada en marcha la barra de plegar **se esconde** (`hidden`) en vez de
quitarse el `<details>`, para no tener el mismo cuerpo escrito dos veces; queda
abierta y quieta. Las de Battle Royale también cuentan como terminadas: ahí lo
que las cierra es que todos los royales tengan repartidos sus puestos.

**Los huecos del equipo, solo hasta donde llega el equipo más largo.** Las cajas
de los dos lados pintaban siempre las seis casillas del formato, así que un
combate con tres pokémon por lado arrastraba seis cuadros punteados vacíos. Se
siguen pintando huecos —para eso estaban: que las dos cajas midan igual y se
lean de un vistazo— pero contando desde el equipo más largo **de ese combate**
(`casillas` en `MatchTeams`). El contador de la esquina sigue diciendo `3/6`,
que es la información que se perdería.

**Los level caps, de dos en dos en pantalla ancha.** Una tarjeta de gimnasio no
llega ni a media pantalla y en fila de una sola la página medía 2825 píxeles;
en dos columnas (`xl:grid-cols-2`, solo a partir de 1280: más estrecho no caben
las seis pastillas de jugador) se queda en 1854. En el móvil no cambia nada.

**Los vídeos del gimnasio ya no ofrecen los de los demás.** A quien administra
le salía una pastilla "＋ nombre" por cada jugador que se hubiera pasado el
gimnasio: ocho gimnasios eran cuarenta y ocho botones para no ver ningún vídeo.
Ahora se ofrece **el tuyo** y los demás quedan detrás de un "＋ el de otro (N)",
que sigue dejando poner el de cualquiera.

**Las tarjetas de la derecha de la portada no se estiran.** *Próxima jornada* y
*Ruleta* comparten fila con la clasificación y la actividad, que son mucho más
altas, así que crecían con ellas y dejaban media tarjeta vacía. Con `self-start`
cada una mide lo suyo.

**Un botón que solo es un símbolo tiene que decir qué hace.** La ✕ de borrar
salía sin `title` ni `aria-label` en cinco pantallas: al pasar el ratón no
aparecía nada y un lector de pantalla leía "equis". Ahora `ConfirmSubmit`
**reutiliza la pregunta de confirmación** de etiqueta cuando lo que lleva dentro
no tiene ni una letra, sin obligar a escribirla dos veces en cada sitio. Si el
botón lleva texto de verdad, ese texto manda. Comprobado después: no queda
ningún botón de icono sin nombre accesible (los demás ya lo tenían por `title`,
que es nombre válido).

---

## 4. Reglas del locke que están implementadas

- **Clasificación y desempates**: puntos → menos pokémon muertos → mejor
  diferencia de pokémon en combates de jornada (y en los retos, si el ajuste de
  la edición lo permite). Los que se saltan la primera ronda del final se marcan
  como clasificados directos: dos si quedan seis jugadores, uno con cinco o con
  tres, y ninguno con cuatro o con dos.
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
  guia-de-uso.pdf   la guía que sirve el apartado "Guía de uso" (la hace guia/)
guia/
  guia.html         la guía de uso que se reparte, una hoja A4 por sección
  datos.mjs         prepara la partida de ejemplo para las fotos
  capturas.mjs      saca las fotos de la aplicación en marcha
  pdf.mjs           arma el PDF y avisa si algo no cabe en su hoja
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
- `lib/mapas.ts` — los mapas y las capturas. `lib/detectar-zonas.ts` saca las
  zonas de los colores de la imagen de fondo, `lib/mapas-de-fabrica.ts` es la
  semilla de nombres de Johto y de Kanto, `lib/juegos.ts` la lista de juegos y
  sus regiones —`regionesDelJuego()` devuelve **las láminas de mapa**, que no
  siempre son la región: la 2ª tiene dos y la 7ª cuatro islas, y
  `REGIONES_DE_MAPA` deja fuera a Alola, que no se dibuja—, y
  `lib/zonas.ts` los tipos, las formas y sus colores —**este
  último existe porque un módulo con `"use client"` no puede exportar datos a un
  componente de servidor**: Next devuelve una referencia al cliente en vez del
  array y revienta la página entera (pasó). `components/mapa.tsx` es el mapa en
  SVG, `mapa/mapa-client.tsx` la vista del jugador y `admin/mapas/editor.tsx` el
  editor. Ojo con este último: **el panel de la zona elegida se pinta en el
  cliente**, no en la página, porque un componente de servidor no puede pasarle
  una función a uno de cliente y la página se quedaba en blanco. El giro de una
  zona es solo un `transform` al dibujar: los tiradores van dentro de él para
  que sigan a la forma, el número y la chapa de bajas se quedan fuera para no
  salir torcidos, y **estirar deshace el giro antes de aplicar el arrastre**,
  porque si no una zona tumbada crecería por donde no toca.
- `lib/formatos-de-combate.ts` — las fichas de los tipos de combate (nombre,
  icono, color, cuántos pokémon, cuántos salen a la vez).
  `components/formato.tsx` es la chapa y el desplegable;
  `jornadas/royale.tsx` la pantalla del Battle Royale y
  `actions/royales.ts` sus acciones. **Ojo con el formato de un reto**: la
  acción que anota su resultado guarda el reto entero, así que el formulario
  lleva también el selector; sin él, anotar el resultado lo devolvería a
  singles.
- `lib/sorteo.ts` — los números del sorteo de préstamos (seis por persona, de
  dos a seis personas). Están sueltos y no dentro de `actions/sorteos.ts`
  porque **un fichero `"use server"` solo puede exportar funciones**: si exporta
  una constante, el módulo se queda sin exportaciones y la pantalla no compila.
  `actions/sorteos.ts` son las acciones y `(app)/sorteo/` la pantalla; el
  reparto es un Fisher-Yates y una vuelta por turnos, y lo que sobra se queda
  con `tocaAId` a null, que es lo que la pantalla enseña como "en el bote".
- `lib/auth.ts` — quién es quien mira. `esCreador` es el papel de la cuenta y
  `canManageCompetition` (en `lib/competition.ts`) el del locke: **no son lo
  mismo y conviene no confundirlos**. Al añadir una acción, la pregunta es si lo
  que toca vale para toda la casa (`requireCreador`) o solo para una edición
  (`requireCompetitionManager`).
- `lib/wipeos.ts` — los dos motivos de estar fuera y cómo se cuenta cada uno.
  `actions/wipeos.ts` son las marcas y el estado; `jugador/[id]/wipeos-client.tsx`
  la sección del perfil. **Al mirar si alguien sigue jugando se pregunta por
  `retiredAt`**, que vale para los dos casos; `motivoDeSalida` es para enseñarlo
  y para lo único donde los dos motivos no dan igual: **votar al MVP**, que sí
  puede el que perdió el locke y no el que se retiró (`puedeVotarElMvp()` y
  `VOTANTES_DEL_MVP`, su gemelo para las consultas de Prisma).
- `lib/retiradas.ts` — quién tiene combates pendientes por estar fuera y cuándo
  se le dan al rival. **`Match.excepcion` es lo que le dice que no toque uno**:
  un combate con permiso ni se reparte ni sale como "pendiente por retirada",
  pero **sí cuenta como algo que falta por jugar**, porque lo van a jugar. Las
  dos cosas van juntas; con solo la primera, los demás combates por retirada de
  esa jornada se darían por ganados antes de tiempo. El permiso se pone solo al
  montar el combate a mano (`addMatchAction`) y se da y se quita después con
  `permitirCombateAction`.
- `lib/almacen-de-imagenes.ts` — guardar una imagen una sola vez y resolver la
  referencia. `lib/deduplicar-imagenes.ts` pasa al almacén lo que ya estaba
  escrito (**en SQL**: traerse las imágenes a Node serían cientos de megas de ida
  y vuelta) y tira las huérfanas; `actions/almacen.ts` son los dos botones de
  *Diagnóstico*. **Al añadir una columna que guarde una imagen** hay que
  apuntarla en las tres listas: `COLUMNAS` de `deduplicar-imagenes.ts`, la de
  `ocupacion.ts` y `FUENTES` de `imagenes.ts`.
- `lib/ocupacion.ts` — mide lo que ocupa la base de datos y en qué se va,
  columna de imágenes a columna de imágenes. Lo enseña `/diagnostico`. Si se
  añade una columna que guarde una imagen, hay que apuntarla en su lista
  `COLUMNAS`; si no, no se contará y la cuenta de "cuántos lockes caben" saldrá
  optimista.
- `lib/cola.ts` — la cola de apuntes sin subir, en el `localStorage` del móvil.
  `lib/acciones-sin-conexion.ts` envuelve un formulario para que, si el envío no
  sale, acabe ahí en vez de perderse; `components/estado-conexion.tsx` es el
  aviso de abajo y quien la sube (al volver la línea y al abrir la aplicación), y
  `components/pendientes.tsx` la lista dentro de cada pantalla.
  `api/sincronizar/route.ts` es la puerta del servidor, que reutiliza las server
  actions de siempre. **Cuidado al cambiar una de esas acciones**: los apuntes
  que estén en cola llevan los campos de la versión anterior.
- `public/sw.js` — el service worker: guarda cada pantalla al visitarla (pidiendo
  siempre al servidor primero) y los sprites y mapas, que son inmutables. Al
  cerrar sesión, la pantalla de entrada le manda borrar las pantallas guardadas:
  llevan dentro los datos de quien las vio.
- `lib/bolsa.ts` — el catálogo y las bolsas. El catálogo se lee entero de una
  vez y las bolsas se juntan con él **en memoria**: son cuatro filas y así no se
  repiten por cada jugador las consultas de las firmas de las imágenes.
  `components/objeto-picker.tsx` es de dónde sale cada objeto —de los juegos,
  propio o un grupo—, `bolsa/bolsa-client.tsx` la bolsa con el botón de gastar
  y el menú de elegir, y `bolsa/todas/` el panel del administrador.
- `lib/objetos.ts` — la lista de objetos de los juegos y su buscador, hermana de
  `lib/pokedex.ts`.
- `lib/perfiles-de-locke.ts` — qué cambia según cuánta gente juega el locke: su
  nombre, si la liguilla cabe en una jornada, si se gana por puntos o por
  jornadas y cómo se llama la pantalla de la tabla. Sin `server-only`, porque lo
  leen también componentes de cliente. `lib/emparejamientos.ts` es la liguilla
  (método del círculo) y de ahí salen los combates que propone
  `createMatchdayAction`. `lib/marcador.ts` cuenta las jornadas ganadas del
  dualocke y `components/marcador-dual.tsx` las pinta, dentro de `puntos/page.tsx`.
- `lib/solitario.ts` — cómo va una partida de una persona (hitos, siguiente,
  caídos, zonas). `components/resumen-solitario.tsx` lo pinta, y sale tanto en
  la portada como en la pantalla de la tabla.
- `lib/solicitudes.ts` y `app/actions/solicitudes.ts` — pedir, aceptar y
  rechazar un locke en solitario. Los formularios están en
  `competiciones/solitario-forms.tsx` (pedirlo o crearlo) y
  `admin/solicitudes.tsx` (responderlas).
- `lib/plantillas.ts` y `lib/level-caps-de-fabrica.ts` — los hitos que trae
  cada juego. El segundo es la semilla (por región); el primero, lo guardado
  (por juego). `admin/level-caps/` es el editor y
  `app/actions/plantillas.ts` las acciones, incluida la de traerlos a un locke.
- `lib/premios.ts` — los objetos que reparte un reto y los castigos que hay que
  anunciar. `sincronizarPremios()` es la que da y quita según quién gane;
  `components/castigos.tsx` es el bloque de la portada.
- `lib/bolsa-entregas.ts` — meter y sacar cosas de la bolsa de alguien, sin
  cantidades negativas. Lo usan los dos sitios que reparten solos: los premios
  de un reto y las casillas de la ruleta.
- `lib/premios-de-ruleta.ts` — el premio de un giro: a quién le toca,
  entregarlo y **cambiarlo de dueño**. `ruleta/entregar-premio.tsx` es el
  desplegable del historial y `entregarPremioAction` la acción.
- `lib/series.ts` — el desempate de una jornada al mejor de tres: lo añade
  cuando la serie se empata y lo quita cuando sobra. Se llama desde las tres
  acciones que pueden cambiar el resultado de un combate.
- `lib/liga.ts` — quién se ha pasado la Liga Pokémon. No guarda nada: lo deduce
  de tener marcado el level cap de tipo `CHAMPION`.
- `lib/acceso.ts` — quién puede abrir un locke y quién puede escribir en él.
  `filtroDeLockesVisibles()` es el trozo de `where` que usan
  `getActiveCompetition` y `listCompetitions`; `puedeVerLocke()` es para las
  pantallas a las que se llega por identificador (el perfil de un jugador) y
  `assertPuedeTocarLocke()` el portero de las acciones que escriben.
- `lib/formatos-finales.ts` — los cinco formatos del final del locke (de seis
  jugadores a dos) escritos como datos: cómo se llama cada uno, sus rondas, sus
  combates y cómo se decide el campeón. **No lleva `server-only` a propósito**:
  lo leen tanto el servidor como los componentes de cliente que pintan el
  cuadro. `lib/final-four.ts` lo rellena con quién va ganando
  (`getFinalFourState`) y ofrece `getFormatoFinal()`, una consulta chica para el
  menú y la clasificación, que corren en cada página.
- `lib/retiradas.ts` — los combates que se ganan porque el otro se retiró.
  Decide **cuándo** darlos por ganados (al completarse su jornada, no al
  retirar a la persona) y sabe cuáles están esperando, para poder enseñarlos.
  `soloActivos()` en `lib/competition.ts` es el filtro de "los que siguen".
- `lib/tipos.ts` — los tipos, la tabla de efectividad **de cada generación** y
  qué es cada pokémon en cada una. Los datos salen de
  `scripts/generate-tipos.ts` a `lib/tipos.json` (unos 30 KB); este módulo solo
  consulta. `components/cobertura-de-tipos.tsx` es la calculadora, y vive dentro
  de `notas/page.tsx`.
- `lib/copias.ts` — el volcado, el restaurado y la poda. `lib/copia-automatica.ts`
  es el disparador del resumen; `admin/backups.tsx`, la pantalla.
  Dos formas del mismo volcado: **formato 1** lo lleva todo dentro (el fichero
  que se descarga) y **formato 2** deja las imágenes en el almacén (el que se
  guarda en la base de datos). `leerCopia` devuelve siempre el 1, así que
  restaurar y descargar no se enteran de la diferencia. **Al añadir una columna
  que no admita nulo** no hay nada que hacer: la restauración inserta solo las
  columnas que trae la copia y las demás toman su valor por defecto.
- `lib/youtube.ts` — reconoce enlaces de YouTube y saca el identificador para
  incrustar el reproductor. `level-caps/gym-videos.tsx` es la tira de botones y
  el reproductor de los vídeos de gimnasio.
- `components/replay-link.tsx` — el botón "Ver combate", compartido por las
  jornadas y los retos. Solo se pinta si hay enlace.
- `components/mobile-nav.tsx` y `components/nav.tsx` — las dos formas de la
  misma navegación: la hoja del móvil y la barra lateral del PC.
  `app/(app)/layout.tsx` es quien reparte, a partir del objeto `S` (la lista
  única de secciones) y de `GRUPOS`. Las dos pintan el punto de novedades y las
  dos lo esconden cuando estás dentro del grupo.
- `lib/novedades.ts` — el punto de "hay algo nuevo": una consulta con `EXISTS`
  y el modelo `TabSeen` (una fecha por persona, edición y pestaña).
  `components/marcar-visto.tsx` es quien apunta la visita, y va **en el layout**
  para que una sección nueva entre sola con solo aparecer en el menú.
- `components/boton-apuntar.tsx` — el "＋" flotante. Los atajos los arma el
  layout según lo que esa persona pueda hacer de verdad, y cada página se ocupa
  de su `?apuntar=1` (`muertes/death-form.tsx`, `mapa/mapa-client.tsx` y
  `level-caps/resaltar.tsx`).
- `components/sitio-picker.tsx` — el desplegable de dónde cayó un pokémon, con
  las zonas del mapa agrupadas por tipo y la salida de "Otro sitio".
- `components/roulette-wheel.tsx` — la rueda SVG; las etiquetas de la mitad
  izquierda se voltean para que se lean del derecho.
- `lib/activity.ts` — junta las siete fuentes del muro en una cronología. Las
  siete se piden **a la vez que los jugadores**, no después: ninguna los
  necesita.
- `lib/db.ts` — el cliente de Prisma, con el `omit` de las imágenes y **las dos
  medidas**: `CONTAR_CONSULTAS=1` saca cada consulta y cuándo empieza, y
  `LATENCIA_FALSA=30` le suma 30 ms a cada una para ver aquí lo que costará en
  Neon. Las dos se encienden a mano y no se quedan encendidas.
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

**Visto y sin hacer**: cuando el locke termina y ya hay campeón, **la portada no
se entera**. Sigue diciendo "🟢 En curso", la tarjeta de *Próxima jornada* pone
"no hay combates pendientes, crea una jornada nueva" y no hay ni una palabra del
campeón. Lo suyo sería que al haber campeón la portada lo enseñe y lleve al hall,
y que el estado deje de decir que está en curso. Se dejó a propósito para
consultarlo: es cambiar la pantalla principal, no arreglar un fallo.

**Pendiente pequeño**: el mapa de fondo de Johto que hay subido mide 215×149
píxeles y se ve borroso. Basta con subir uno más grande desde Administración →
Mapas; las zonas no se mueven, porque se guardan en unidades del lienzo y no en
píxeles de la imagen. De los diez mapas, solo Johto tiene zonas hechas: **las
cuatro islas de Alola están vacías** y hay que ponerles su imagen y dibujarles
las zonas isla por isla (y bajarles el relleno, que son dibujos detallados).

**Hecho, pero conviene saberlo**: la aplicación ya sirve **de dos a ocho
jugadores** (jornadas, final y marcador), y todo eso se aplica **a los lockes
nuevos**: el que está en marcha tiene `maxPlayers` a 6 y se comporta igual que
siempre. Al crear un dualocke hay que rellenarle **"Jornadas previstas"** (6, en
lo acordado), que es de donde sale el "gana quien se lleve 4".

Se planteó esconder Retos y la Ruleta en los lockes de dos y el usuario lo
descartó: la ruleta se usa para sortearle algo al ganador y los retos también
pueden caer.

Ideas comentadas y no hechas:

- **Equipos vivos**: fichar los 6 pokémon en juego, no solo los muertos. Sigue
  siendo la siguiente en valor: permitiría el botón "ha caído" que rellena la
  ficha sola, avisar de quién se pasa del level cap y rellenar el hall de la
  fama con el equipo con el que terminaste.
- **Estadísticas del locke**: la causa de muerte más repetida, el pokémon que
  más veces ha caído entre todos, la racha más larga. Ahora sale barato: el
  ranking de rutas ya está y las bajas llevan zona.
- **Apuestas entre jornadas**: proponer y votar, como dicen las reglas.
- **Enlace público de solo lectura** para que gente de fuera vea la
  clasificación sin cuenta. Hoy no hay nada visible sin sesión.
- **Resumen de jornada como imagen** para pegarlo en el grupo de WhatsApp.
- **Exportar una edición archivada** a PDF o imagen como recuerdo, ahora que
  el hall de la fama da un buen cierre. (Distinto de las copias de seguridad,
  que son para restaurar y no para enseñar.)
- **Deshacer al gastar un objeto**: hoy hay una confirmación, pero si le das
  sin querer no hay vuelta atrás. El historial de usos ya guarda lo necesario.

Hay una **guía de uso en PDF** hecha con capturas de la aplicación (23
páginas, escrita para el móvil), y ahora **vive en el repositorio**, en
`guia/`: el texto en `guia.html` y tres scripts que preparan la partida de
ejemplo, sacan las fotos y arman el PDF. La primera versión no se guardó y se
perdió con la máquina donde se hizo, así que hubo que rehacerla entera. Las
fotos no se suben (se rehacen en cinco minutos), pero **el PDF sí**, en
`public/guia-de-uso.pdf`, porque es el que sirve el apartado *Guía de uso*.
Instrucciones en `guia/README.md`; **el índice y la cuenta de páginas** de ese
apartado están escritos a mano y hay que tocarlos si se mueve una página.

**Rehacer las fotos empieza por borrar y volver a sembrar la base local**
(`prisma db push --force-reset` y `npm run db:seed`): en cuanto se prueba algo a
mano, la partida de ejemplo deja de servir para capturas. Y `datos.mjs` arranca
**eligiendo el juego de la edición**, que no sobra: la semilla no lo pone, y sin
juego no hay región, así que el mapa dice "esta edición no tiene juego elegido"
y se cae detrás todo lo que necesita rutas —las capturas y las bajas con su
zona—. Faltaba desde siempre; quien hizo la guía la primera vez lo puso a mano
por la interfaz y no quedó escrito, así que el proceso del README no funcionaba
de principio a fin.

**Dónde va lo nuevo**: si lo hace cualquiera, en la guía de uso; si es de llevar
un locke —emparejar, anotar resultados, repartir premios—, en la del
administrador.

**El índice de la guía de uso estaba mal desde antes** y se ha rehecho: le
faltaban dos páginas —el sorteo de préstamos y el modo sin conexión— y de ahí
para abajo los números no cuadraban con los pies. Va a mano, así que **hay que
mirarlo cada vez que se mueve una página**; ahora hay 21 entradas y la última es
la 23.

**Y el de dentro de la aplicación es otro**, en `guia/page.tsx`, también a mano:
se había quedado en 22 páginas y sin *El palmarés*, con todo lo de detrás
corrido un número. Son dos sitios y **hay que tocar los dos**.

**Al rehacer las fotos, cuidado con lo que se pliega**: una jornada terminada
se pliega sola, y lo de dentro —los equipos, cambiar el resultado— existe pero
no se ve, así que Playwright se queda esperando un clic que nunca llega. Tanto
`datos.mjs` como `capturas.mjs` abren lo plegado antes de tocar nada
(`section.card details:not([open]) summary`). Le pasará lo mismo a cualquier
cosa que se esconda: si un guion de la guía se cuelga en un botón que "está
ahí", es esto.

**Una hoja de la guía no crece**: lo que no cabe se recorta y `pdf.mjs` solo
avisa. La página de las jornadas se quedó **clavada en el límite** al añadirle
la línea de que se pliegan; para que cupiera se recortó su entradilla. Si hay
que meter algo más ahí, hay que quitar otra cosa.

**Para medir pantallas** hay un cuarto script, `guia/medir.mjs`, que no hace
guía ninguna: entra en la aplicación y dice de cada ruta cuánto mide de alto,
cuánto pesa su HTML y cuántos nodos tiene, en móvil y en ordenador. Vive ahí
porque reaprovecha el mismo Playwright y la misma forma de entrar. Se usa antes
y después de tocar algo (`node guia/medir.mjs /jornadas /level-caps`).

Hay **dos guías**: la de uso (23 páginas, para todos) y la del administrador
(13, para quien lleva un locke). Comparten el estilo en `guia/estilo.css` para
que salgan idénticas. Rehacerlas mueve los números de página del índice escrito
a mano, así que conviene juntar varias novedades y hacerlo de una vez.

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
28. **Zonas dibujadas sobre el mapa**, transparentes hasta que capturas ahí, con
    grupos, editor de formas y colores, y detección automática de las casillas a
    partir de la imagen de fondo.
29. **Encuentros fallados**: lo que se te escapó también se apunta, con su ✕ en
    el mapa y en la ficha, y deja de serlo en cuanto capturas algo ahí.
30. **Las bajas se atan al mapa**: dónde cayó cada uno se elige de las zonas de
    la región, tu mapa privado marca con una chapa roja dónde has perdido
    pokémon, y el cementerio enseña las rutas donde más gente cae.
31. **Botón flotante para apuntar** —baja, captura o gimnasio, desde cualquier
    pantalla— y **aviso de novedades** en las pestañas.
32. **Kanto como segunda región**: en la 2ª generación y sus remakes el mapa de
    capturas tiene pestañas de Johto y Kanto, y se puede morir y capturar en
    las dos.
33. **Cobertura de tipos**: dentro de Mis notas, un equipo de seis y la tabla de
    lo que le entra a cada uno, con la tabla de tipos de la generación que se
    esté jugando y una casilla para usar la de ahora, con tipo Hada.
34. **Retirar a quien se va**: sin borrarle nada, deja de contar para gimnasios,
    MVP y emparejamientos, sale tachado y al final de la clasificación, y sus
    combates pendientes los gana el rival por retirada según se van cerrando
    las jornadas.
35. **Combates por retirada**: si alguien no se presenta, el combate se da por
    retirada desde Jornadas y el otro gana con diferencia de 3.
36. **El final del locke se adapta a cuántos queden**: cinco formatos de seis
    jugadores a dos, elegidos por el número de activos, y con dos nombres
    —Final Four de cuatro para arriba, Jornada Final de tres para abajo.
37. **Los lockes dejan de ser públicos entre las cuentas**: cada edición la ven
    solo quienes la juegan o la jugaron, los administradores y los espectadores
    a los que se les dé ese locke.
38. **De dos a ocho jugadores**: las jornadas se emparejan solas con la liguilla
    que toque, el locke de dos se gana por jornadas en vez de por puntos, y
    pasarse la Liga Pokémon queda apuntado como la otra forma de ganar.
39. **Los retos reparten objetos y anuncian el castigo**: el premio puede caer
    solo en la bolsa del ganador y el castigo del perdedor sale en la portada
    hasta que se da por cumplido.
40. **Plantillas de level caps por juego**: los gimnasios (y las pruebas de
    Alola, con sus dominantes) se preparan una vez en Administración y se traen
    a cada locke con un botón, con sus medallas incluidas.
41. **Modo en solitario**: una partida para uno, que se gana pasándose la Liga,
    con su propia portada y su menú, con el equipo con el que se pasó cada
    gimnasio, y que cualquiera puede pedirle a la organización desde la propia
    aplicación.
42. **Alola se dibuja por islas, y las zonas se giran**: la 7ª generación trae
    cuatro mapas en vez de uno, las zonas pueden ir en diagonal —y hay círculo
    redondo aparte del óvalo— y cada mapa decide cuánto se rellenan, para poder
    usar imágenes detalladas sin taparlas.
43. **La guía de uso, dentro de la aplicación**: el manual en PDF se abre, se
    descarga o se lee en un visor desde "Lo mío", para el que se pierda.
44. **Sin conexión**: se sigue viendo lo último que se descargó y lo que se
    apunta se sube solo al volver la línea, sin duplicarse.
45. **Jornadas temáticas**: cada jornada y cada reto tienen su tipo de
    combate, con su chapa y su color, y el Battle Royale trae su propia
    pantalla con orden de llegada y crónica.
46. **Sorteo de préstamos**: un bote al que echa pokémon cualquiera que juegue
    y que la aplicación reparte al azar entre los que entren, seis por cabeza,
    dejando en el bote lo que sobre. Y `/diagnostico` pasa a medir **cuánto
    ocupa la base de datos** y cuántos lockes caben, que era la duda de fondo
    al pensar en compartir la aplicación con amigos.
47. **Una imagen, una copia**: los sprites dejan de guardarse una vez por fila y
    pasan a un almacén con su dirección propia, que además ahorra descargarlos
    otra vez y hace que el navegador se baje cada uno una sola vez. Y aparece el
    permiso de **organizador**, para poder dejarle la aplicación a un amigo y
    que lleve sus lockes sin ver los de nadie más.
48. **Las copias dejan de repetir las imágenes**, que eran 147 MB de los 179 que
    ocupaba la base de datos. De paso se arregla que restaurar una copia
    anterior a una columna nueva se caía.
49. **Creador, administrador de locke y jugador**: administrador deja de ser un
    papel de cuenta y pasa a ser de edición, y lo de la aplicación —mapas,
    catálogo, plantillas, copias, cuentas— se queda en el Creador. Y cualquiera
    puede **pedir un locke de 2 o más**, que al aceptarse le deja administrarlo
    y dar de alta a los suyos.
50. **Una guía para quien lleva un locke**, de trece páginas y con el mismo
    estilo que la de siempre, en su pestaña dentro de *Guía de uso*. Solo la ve
    quien administra alguna edición.
51. **Wipeos**: se cuentan las veces que a alguien le barren el equipo, sin que
    eso le cueste el locke, y aparece un estado de **locke perdido** aparte de
    la retirada para cuando sí se lo cuesta.
52. **La lista de participantes, legible en el móvil**: los datos en una línea y
    los botones en otra, con un solo botón para devolver a alguien al locke.
53. **Excepciones a la norma**: la organización puede dejar que alguien que está
    fuera del locke juegue un combate suelto de jornada o un reto, y el
    cementerio deja de comerse casillas al que más bajas lleva.
54. **El hall de la fama, hecho un cierre de verdad**: podio, las cifras del
    locke entero y las fichas de cada pokémon en grande.
55. **Todo el cuadro final, al mejor de tres**, con su enlace a la repetición en
    cada combate.
56. **Palmarés** de todas las ediciones juntas, el equipo del hall se puede
    traer del último combate en vez de teclearlo, y la configuración de un
    locke se copia a otro aunque sean de juegos distintos.
57. **Los lockes de antes de la app** se apuntan a mano en el palmarés, para
    que el Hexalocke 1 no se quede fuera del histórico.
58. **Repaso de las 24 pantallas** en móvil y en ordenador: las jornadas
    terminadas se pliegan, los equipos dejan de pintar huecos que sobran, los
    level caps van de dos en dos en pantalla ancha y los botones de icono ya
    dicen qué hacen.
59. **La ruleta reparte premios**: una casilla puede ser un objeto de la bolsa
    o tickets de una ruleta, y sale sola a la bolsa o al saldo de quien gira.
60. **El que pierde el locke sigue votando el MVP**, y el que se retira deja de
    votar: es lo único en lo que los dos motivos de salida no dan igual.
61. **Segundo repaso de pantallas**: la pastilla entera del jugador lleva a su
    ficha, las acciones de retirar y demás se guardan detrás de un "⋯", el
    perfil va de dos en dos y la gráfica espera a tener dos jornadas.
62. **Menos idas y vueltas a la base de datos**: no menos consultas, sino menos
    tandas en fila. Con `LATENCIA_FALSA` se puede medir aquí lo que costará en
    Neon.
63. **El locke de ejemplo, jugado hasta el final** para mirar el cuadro y el
    hall con datos: el podio ya no son tres cajones vacíos y se arreglaron tres
    textos que se cortaban.
