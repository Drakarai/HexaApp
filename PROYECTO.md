# HexaApp — memoria del proyecto

> Resumen de todo lo hablado y decidido, para no depender de que exista el chat
> donde se construyó. Si retomas el proyecto en una conversación nueva, empieza
> pasando este fichero: contiene el contexto, las decisiones y el porqué de cada
> una.
>
> **Este documento se actualiza con cada cambio.** Ver `CLAUDE.md`.

Última actualización: 28 de octubre de 2026 (**retoques del repaso de diseño**: filtros que se deslizan, Puntos más corto, filo de color en el mapa y tu combate una vez en la portada).

Esta línea dice **solo lo último**: lo de antes está en la cronología del
apartado 8, y lo de cada cosa en su fila del apartado 2.

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
| **Resumen** | **Tu combate sale una vez**: con la jornada abierta va en el cartel «VS», y en la tarjeta de la jornada pasa a la lista con los demás, resaltado. **Arriba, lo que toca en grande y lo demás en una tira**: una tarjeta grande con el hito (level cap, jornada o final) y al lado —debajo en el móvil— una tira compacta con jugadores, caídos y líder (o vínculos, o hitos). **Con la jornada abierta y rival, la tarjeta es un cartel de combate**: tu foto, «VS» y la suya. Si no, el dato en grande con su imagen (medalla, retrato del líder, cartel o campeón) **apoyada en el borde de abajo y difuminada hacia arriba**. Level cap actual, clasificación, próxima jornada, actividad reciente y últimos giros. **Cuando toca jornada** (un checkpoint de los level caps), la primera cifra deja de ser el level cap y pasa a ser *Toca jornada* con **tu rival**, y en la tarjeta de la jornada tu combate sale arriba y en grande; si no toca aún, dice cuántos hitos faltan. Cada edición puede llevar **su logo**, que sale de fondo junto al nombre, fundido hacia el título; se sube en *Ediciones → Editar datos* y sin él la cabecera es la de siempre. En el móvil el texto **salta de línea antes de llegar al logo**. **Cuando hay campeón, lo dice**: pone *Terminado* y la tarjeta de la próxima jornada pasa a ser la del ganador, con un enlace al hall de la fama. Cuando ya no queda ningún level cap por superar, esa primera tarjeta **pasa a ser la del final**: enseña a cada uno **su rival** de la llave que tenga por jugar, con su foto, y al acabar, el campeón. |
| **Reglas** | Se leen **como un reglamento**: títulos con número romano (las categorías), artículos numerados seguidos y un **índice** (al lado en el ordenador, plegado arriba en el móvil); lo cambiado sin ver sale avisado arriba con enlace a cada artículo. Los botones de mover, borrar y editar solo salen en **«Editar reglas»** (`?editar=1`), no al leer. Secciones por categorías, editables y reordenables por administradores. **Un cambio con el locke en marcha se avisa**: punto ámbar en *Reglas*, la sección marcada como *Cambiada el…* o *Añadida el…* —resaltada para quien no la ha visto— y un desplegable con **qué líneas ganó y perdió**, más cómo estaba entera. Al editar hay una casilla para no avisar, para las erratas. |
| **Level caps** | Arriba, **el cartel del tope** de quien mira: su **nivel máximo en grande**, «hasta que te pases a X» con su ciudad, quién del grupo lo ha pasado ya (con sus caras), cuántos lleva y, si va por delante, dónde sigue el grupo; la medalla, de fondo. Quien no juega ve el del grupo, y con todo pasado dice «Sin tope». Debajo, **el camino**: los hitos de arriba abajo con su parada, el siguiente destacado y, plegados en una línea, **los que ha pasado todo el mundo y los que aún no tocan** (los de después del de ahora que nadie ha marcado: como nadie sigue hasta que pase el grupo entero, no hay nada que hacer en ellos). Nivel máximo por gimnasio, con una o varias imágenes que se alternan. El administrador marca en un gimnasio **Jornada después** (checkpoint): entre ese gimnasio y el siguiente sale una franja con su jornada —jugada, *toca ahora* o cuándo toca—; cada jugador marca cuándo lo supera y puede enlazar el vídeo de su combate. **El primero en pasárselo lleva una 👑**, y en su perfil sale cuántas veces ha sido el primero. En los lockes **en solitario**, debajo de cada hito se apunta el equipo con el que lo pasaste, como los equipos de un combate. Se pueden **traer de un tirón** los del juego con un botón, y luego cambiarlos solo para ese locke. Marcar **la Liga** suelta **confeti**. |
| **Cementerio** | Cada caído es **una lápida** (piedra con arco, sprite apagado, mote grabado y la causa debajo, sobre una franja de césped). Las **revividas**, en color, con «Volvió» y una marca verde; cada lápida abre **la misma ficha que el Equipo y PC**: cabecera teñida de su tipo (de los dos, uno a cada lado, si tiene dos) con su sprite animado, mote, especie, nivel y tipos, y pestañas *Resumen* (causa, sitio, notas y editar) e *Historia*. El sitio donde cayó cada uno **se elige de las zonas del mapa** de la región, y de ahí sale el ranking de dónde cae más gente. **Revivir** (un premio que sale poco), desde la ficha de la baja o desde *Caídos* en Equipo y PC: el pokémon vuelve al equipo si hay hueco y si no a la caja; si la baja se apuntó a mano y no tenía captura, se le crea una. La baja **se queda y sigue contando** (desempates, mapa, cifras), marcada *Revivido* con su fecha; en la historia del pokémon salen la caída y la vuelta, y puede caer y revivir más de una vez. Se deshace desde Equipo y PC. Al registrar una baja se puede elegir el pokémon **de la caja** (lo vivo de tu Equipo y PC): la especie, el mote y la ruta salen de él, se quita de la caja, se deshace desde Equipo y PC y, en un Soul Link, **cae también su pareja**. La lista es solo de lo tuyo, salvo en un Soul Link si administras. |
| **Jornadas** | **El resultado se lee de la repetición**: en *Anotar resultado*, con el enlace de Showdown, «Leer el resultado» pone el ganador, la diferencia y el día, dice quién es quién y se guarda con el botón de siempre. **Cada combate se lee como un marcador**: un jugador a cada lado y el resultado en medio. El ganador marca la diferencia de pokémon (o una V si no se apuntó), con corona y un aro verde; el perdedor, 0 (o D), atenuado; sin jugar, «VS» en ámbar. Cada jornada puede ser **de un tipo de combate**: Singles, Dobles, Monotipo, VGC, Pokémon de Préstamo o Battle Royale, con su chapa, su color y sus condiciones escritas a mano ("monotipo agua", "nivel 50"). Emparejamientos, que la aplicación **propone sola** siguiendo la liguilla (nadie repite rival hasta jugar contra todos; si sois impares, descansa uno distinto cada vez). Marcar ganador suma el punto automáticamente. En un **dualocke**, cada jornada es **un combate o al mejor de tres con el mismo equipo** (como una llave de la final: cómo va la serie, un equipo por jugador y los combates debajo), a elegir al crearla y cambiable mientras no haya nada apuntado. Si alguien **no se presenta**, un botón da el combate por retirada: se elige quién faltó y con qué fecha, y el otro gana con diferencia de 3. Bajo cada combate, el equipo que sacó cada jugador, y un botón a su repetición si el admin pegó el enlace. El MVP de la jornada se vota entre todos. Una jornada **con todos sus combates jugados se pliega**: deja a la vista su cabecera y un renglón con quién ganó, y se abre de un toque. La cabecera de cada jornada dice **quién descansa** (con cinco o con tres, a alguien le toca), y con uno solo en pie ya no deja crear jornadas vacías. **Borrar una jornada la manda a la papelera**: 14 días con sus combates, equipos, royales, votos y puntos, y *Devolver* la deja exactamente como estaba (o *Borrar para siempre*). La papelera sale abajo, solo para quien administra. Al apuntar los equipos de un combate, **«Sacar los equipos de la repetición»**: con el enlace de la repetición de Showdown (ya relleno si el combate lo tiene) salen la especie y el mote de los pokémon de los dos, se adivina quién es quién por el nombre (se cambia a mano) y se añaden de golpe; leerla otra vez no duplica. En un locke de **Añil** vale también el enlace de la web de repeticiones de su servidor de Showdown (`….pages.dev/replays/…`), con sus pokémon y formas; en los demás lockes ese enlace no se acepta. También se puede **pegar el equipo exportado de Showdown** de uno. Solo en ese sentido, de Showdown a la app. |
| **Retos** | Cada reto es **un cartel de duelo**: los dos frente a frente con el «VS», el que gana con corona y el que pierde apagado; los objetos del premio, plegados. Piques sueltos entre dos, con premio, castigo y enlace a la repetición. Cuentan para victorias y derrotas, pero no dan puntos. El premio puede ser **texto libre** ("eliges su starter") y/o **objetos del catálogo**, que caen solos en la bolsa del que gane. El **castigo del que pierde se anuncia en la portada** hasta que un administrador lo da por cumplido. |
| **Battle Royale** | Una jornada de royale no tiene parejas: nace con **un combate de todos contra todos** y todos los jugadores dentro. Al terminar se apunta el **orden de llegada** tocándolos en orden, el primero se lleva los puntos de la jornada, y queda la **crónica** de lo que pasó más la línea que escribe cada uno de lo suyo ("me tumbó Draka en el turno 3", cuántos le quedaban vivos). Los equipos se apuntan igual que en un combate normal. |
| **Sorteo de préstamos** | Un bote de pokémon que se reparte al azar. Cualquiera que juegue **echa los suyos** al bote y queda apuntado quién puso cada uno; la organización elige **quién entra** (de 2 a 6) y reparte. Se baraja y se da uno a cada uno por turnos hasta seis por cabeza; **lo que sobra se queda en el bote**, a la vista, sin tirarlo. Repartir otra vez baraja desde cero. Nació para las jornadas de *Pokémon de Préstamo*, pero no cuelga de ninguna jornada: vale para lo que se quiera. |
| **Wipeos** | Las veces que a alguien le han barrido el equipo entero en un combate. Se apuntan **sin límite** desde su perfil —con contra qué, cuándo y qué pasó— y se quitan de una en una si se apuntó mal. Las pone el propio jugador o quien administre el locke. Salen en su perfil y como 💥N en la clasificación. |
| **Locke perdido** | Un estado aparte de la retirada. Deja a esa persona fuera igual —no entra en emparejamientos, no cuenta para el MVP ni para el formato del final, y sus combates pendientes los gana el rival— pero se enseña como **locke perdido** y en rojo, no como retirada. Lo decide quien administra el locke y se puede deshacer. |
| **Copiar de otra edición** | Al montar el locke siguiente, traerse de otro las **reglas**, los **level caps** y los **ajustes** (puntos de inicio, jornadas previstas, si los retos cuentan para la diferencia) en vez de reescribirlos. **Vale entre juegos distintos**, avisando de que unos level caps de otra región tienen los líderes que no son. No se copian jugadores, jornadas, puntos ni bajas. |
| **Lockes de antes** | Los que se jugaron **antes de que existiera la aplicación** se apuntan a mano en el palmarés: nombre, juego, cuándo fue, campeón, subcampeón y quiénes jugaron. Solo queda la línea —de aquello no hay bajas ni combates— y **solo lo ven los que lo jugaron**. Lo apunta quien puede montar lockes, y cada uno quita lo suyo. Los que jugaron **sin cuenta** se escriben por su nombre (pueden haber ganado) y cuentan para el tamaño del locke; quien lo apuntó —o el Creador— lo puede **editar**, y si uno de ellos se hace cuenta, se **vincula** y desde entonces le cuenta, título incluido. Un organizador solo ve en ese formulario las cuentas de su gente. Si se borra la cuenta de alguien que jugó uno, **se queda por su nombre** (también si ganó) en vez de desaparecer el locke de todos los palmarés. También pueden llevar **logo**, como una edición: sale en el historial de ediciones y en la vitrina de quien lo ganó. |
| **Palmarés** | El histórico de **todas las ediciones juntas**, que hasta ahora vivían cada una en su burbuja. Arriba, la cuenta de cada persona sumando todos sus lockes, como **una tabla de almanaque**: posición, entrenador, títulos (un trofeo por cada uno; de cinco en adelante, «×N»), victorias-derrotas con su porcentaje y pokémon enterrados; el primero va en ámbar y tu fila con el color de la app. Abajo, cada edición con su campeón, a quién ganó y su categoría; tocando una se abre. **Sale la gente de tus lockes** (los que juegas o jugaste y los que miras), **con las cifras de todos los suyos**, también los jugados con otros; la lista de ediciones es solo la tuya. **Cada uno elige quién sale**: por defecto él y toda la gente con la que ha compartido locke, y desde "Elegir quién sale" busca y quita o vuelve a poner a quien quiera. **Pestañas por tamaño** —Todo, Grupo (3 o más), Dualocke y Solitario—, y en "Todo" cada persona lleva de dónde salen sus títulos ("3 dual · 1 en solitario"). En solitario cuenta como ganado **pasarse la Liga**. **Tocando una fila se abre debajo su vitrina**: los lockes que ha ganado, con logo, nombre y año, también los que ganó con otra gente. En el **historial de ediciones**, cada una con su logo, su descripción y su juego, y además **las de fuera que ha ganado tu gente** ("Héctor ha ganado"), que no se abren; el rival solo se nombra si también está en tu palmarés, y un selector "Con mi gente · Mías" las quita. |
| **Combates con permiso** | La excepción a lo de arriba. Quien administra el locke puede dejar que alguien que está fuera —retirado o con el locke perdido— juegue **un combate concreto** de jornada o un reto. Se da y se quita desde el propio combate, sale marcado con un 🤝 **Con permiso**, y ese combate ya no se da por retirada: se juega y cuenta como cualquier otro. El emparejador automático sigue sin contar con quien está fuera; esto es siempre a mano. |
| **Puntos** / **Marcador** | Clasificación con desempates y **flechas ▲▼ de lo que ha subido o bajado cada uno desde la jornada anterior** (también en la portada), el gráfico de cómo ha ido jornada a jornada —con su pestaña para verlo **descontando a los que se retiran o pierden el locke** desde la jornada en la que se van—, el as de cada jugador, ajustes ±1, con motivo, masivos, e historial. En un locke de **dos** no hay tabla: sale el **marcador de jornadas ganadas**, con cuántas le faltan a cada uno y **el as de cada uno** debajo de su nombre (que si no, en un dualocke, no se veía en ningún sitio a mano). Y en todos, quién se ha **pasado la Liga Pokémon**, que es ganar el locke del juego. **El marcador decide el dualocke**: gana quien se lleve la mayoría de las jornadas previstas (4 de 6, 4 de 7); con un empate (3-3) decide la Jornada Final. Ganado por mayoría, el locke **sigue**: se juegan las jornadas que queden y la final, que ya no cambia el campeón. **En el ordenador, al pasar el ratón** por un jugador sale su **ficha rápida**: el equipo de su último combate (o el de la final), sus últimas bajas y su as. Quien administra tiene el ajuste rápido, sumar o restar con motivo y aplicar a todos **plegados en «Ajustar puntos»**, y el historial enseña los 8 últimos movimientos con el resto detrás de «Ver los N anteriores». Al final de cada fila, la **racha**: los últimos cinco resultados (jornadas y retos con ganador, por fecha) en bolitas verdes y rojas, la más reciente a la derecha (`lib/racha.ts`). |
| **Compañero** | **Tu pokémon as te acompaña** en la cabecera, al lado de tu avatar (en el móvil y en el ordenador), con su **icono de caja** —los de Espada y Escudo, o los «Todos iguales» si son los elegidos; en Añil, los suyos— botando a dos tiempos como en el PC. Al entrar, si has ganado un combate (de jornada, de la final o un reto) en los últimos días y ese dispositivo no lo ha visto, **salta con un corazón**; si ha caído otro de los tuyos, **se encoge con unos puntos suspensivos**. Al tocarlo, **brinca y grita**. Si el que cae es él, se queda **gris y con un lazo negro**. Al **tocarlo reacciona y habla**: grita, hace un movimiento (brinco, salto, vuelta o sacudida) con su bocadillo pequeño (♪, ♥, !, …) que va con lo que dice —si echa de menos a alguien se encoge, si celebra algo salta con un corazón—, y dice algo en un bocadillo que se escribe letra a letra, sin repetir ninguna de las últimas: cosas de **su especie** («Haxorus afila su hacha contra una roca, feliz»), de su tipo, de la hora y de **cómo va el locke** (el próximo rival, el próximo gimnasio y su nivel, la última baja, los días que lleva contigo). **De 0 a 8 duerme**, con sus «zZz». De vez en cuando **mira a los lados** o da un saltito, y, si se enciende en *Mi perfil* (**viene apagado**), **se da un paseo** por encima de la barra de abajo; si se le toca por el camino, se para hasta terminar de hablar. Si **ha evolucionado** desde la última vez, evoluciona ahí mismo, con las dos siluetas como en los juegos. Se esconde desde la tarjeta del as en *Mi perfil*, por dispositivo. |
| **Perfil de jugador** | Página propia de cada uno, con la **ficha de entrenador** arriba (la misma que *Mi perfil*): su título, sus cifras, su as, sus pokémon favoritos, su cara a cara con cada rival y su cementerio. Se llega tocando su foto en cualquier sitio (`Avatar` con `participantId`). Las únicas que no llevan son las que van dentro de algo que ya se pincha —un botón, el resumen de una jornada plegada, la leyenda de la gráfica—, las de editores a medias (equipos de un combate, puestos del royale) y las de cuentas que no son un jugador de ese locke (administración, espectadores, palmarés, la tuya en la cabecera, que va a *Mi perfil*). |
| **Mapa de capturas** | Cada fila lleva **un filo del color de su clase** a la izquierda, en vez del punto de antes, que repetía lo que dice el grupo. **La lista va agrupada por clase de sitio** (Rutas, Ciudades y pueblos, Cuevas y montañas, Bosques, Agua, Otros sitios), cada grupo con su icono, su color y cuántas zonas lleva usadas. Sin barra de progreso: se decidió así. La lista de rutas va en **orden natural** («Ruta 29» antes que «Ruta 30» y que «Ruta 100»), no en el orden en que se dibujaron. El mapa de la región, con sus zonas **dibujadas encima y transparentes**: se rellenan de color cuando apuntas algo dentro, salen en rojo con una ✕ si ahí solo se te escapó lo que hubiera, y llevan una chapa roja con cuántos pokémon **tuyos** han caído allí. El primer toque dice qué zona es y el segundo la abre; si lleva otras dentro, sale la lista para elegir. Tiene también vista de lista con buscador, y las capturas extra aparte. Si el juego tiene **más de un mapa** —la 2ª generación y sus remakes abren Kanto, y la 7ª reparte Alola en sus **cuatro islas**—, arriba salen sus pestañas y cada mapa lleva sus propias cuentas. **Privado como las notas**: no lo ven ni los administradores. En la lista, **Todas · Libres · Usadas**: libre es sin nada apuntado (ni captura ni encuentro fallado, que también gasta la ruta), y la elección se recuerda en el dispositivo. |
| **Bolsa** | Como **la bolsa de los juegos**: la lista con el ×N de cada objeto y, al lado (debajo en el móvil), el elegido con su descripción en un recuadro de texto y el botón de usar. Lo que lleva encima cada jugador. La llenan los administradores; cada uno solo ve la suya y gasta lo suyo con un botón, y **durante un minuto puede deshacerlo** (el servidor deja cinco). Hay **objetos**, que se gastan directamente ("Captura extra"), y **grupos**, que llevan varios dentro ("Objeto competitivo" → Globo Helio, Casco Dentado…) y al usarlos te hacen elegir uno. |
| **Mis notas** | Cuaderno privado con un sub-apartado por jugador. Solo lo ve su autor. Arriba, plegada, la **cobertura de tipos**: metes un equipo de hasta seis y sale una tabla de cuánto le entra a cada uno un ataque de cada tipo, con la cuenta de débiles y resistencias por tipo. Usa la tabla **de la generación del locke** (o la de ahora, si el locke eligió los tipos de ahora), con una casilla para contar con la de ahora si jugáis los combates con las reglas modernas. El equipo se guarda y es igual de privado. **Planificar equipo**: tocar un hueco abre una ficha para elegir con tus pokémon vivos del Equipo y PC en cuadrícula, agrupados por equipo y caja y con sus tipos, un buscador por mote o especie y la Pokédex debajo para los que aún no tienes; se meten varios seguidos y tocar a uno que ya está lo saca («Mi equipo de ahora» y «Vaciar» de atajo), y debajo de la tabla, **a qué le pegas fuerte**: qué tipos rivales recibe ×2 o más de alguno de los tipos de tu equipo y cuáles se quedan sin cubrir. Se llega desde el botón «Planificar equipo» de Equipo y PC, que la abre ya desplegada. |
| **Sin conexión** | Las pantallas por las que ya se ha pasado **se siguen viendo** sin internet, con un aviso de que son de la última vez. Y lo que se apunta —capturas, bajas, gimnasios, notas y lo que se apunta, mueve, evoluciona o da por muerto en Equipo y PC— se guarda en el móvil y **se sube solo** al volver la línea, sin duplicarse aunque se reintente. Mientras tanto sale en su pantalla como "sin subir todavía". Cada captura **va al locke en el que se apuntó**, aunque al subirla se esté mirando otro: antes se paraba y había que cambiarse a mano. |
| **Guía de uso** | El manual de la aplicación en PDF, dentro de la propia aplicación: 28 páginas con fotos de cada pantalla y una **chuleta de qué es cada icono**. Cuenta la aplicación tal y como es, **sin marcar nada como nuevo**. Se abre, se descarga para leerla sin conexión y, en pantalla grande, se lee ahí mismo en un visor. Está en "Lo mío" y **no se le quita a nadie**, juegue o no juegue. |
| **Soul Link** | Un **estilo de juego** aparte del de competir, que se elige al crear el locke y **se puede cambiar después** en *Ediciones → Editar datos* (junto con las plazas). Cooperativo y de 2 a 4: **sin jornadas, puntos ni final**; se quedan los retos (por si se echa alguno de risas), el sorteo, la ruleta y la bolsa. Las capturas de la misma ruta **se vinculan solas** —por la zona del mapa o, sin mapa, por lo escrito ("Ruta 1" y "ruta1" son la misma)—; un pokémon sin pareja va suelto hasta que otro capture ahí, y también se vincula o desvincula a mano. **Si cae uno, cae su pareja**: se apunta la baja de los dos en el cementerio. Se supera cuando **todos los que siguen se han pasado la Liga**, y cuenta como ganado para todo el grupo: la portada lo dice, el hall se abre (con el equipo traído de Equipo y PC) y el palmarés tiene su pestaña **Soul Link**. Se puede **pedir** como cualquier locke (con 2 a 4, «Cómo se juega: Soul Link»). |
| **Equipo y PC** | En el móvil **se pasa de caja deslizando** de lado sobre ella (más de 50 px, rápido y sobre todo horizontal), y la nueva entra por ese lado; la fila lleva `touch-pan-y` para que Chrome no tome el gesto por «atrás». No choca con arrastrar, que es dejar el dedo quieto. El **equipo de 6 y la caja** (cajas de 30, como en los juegos), en `/equipo`, **en todos los lockes**. Fuera del Soul Link es **privado como el mapa**: está en *Lo mío*, solo sale el tuyo y lo toca solo su dueño, ni quien administra. En un Soul Link va primero en *La edición* y salen los de **todos**, lo tuyo arriba. Cada pokémon lleva sus **tipos** (los de la generación del juego) con **las chapas de los juegos** —icono y nombre; en la caja, solo el icono en la esquina— y el **número de su vínculo**, el mismo que su pareja. Se **arrastran** entre huecos y entre equipo y caja —con el ratón al moverlo; con el dedo, dejándolo pulsado un momento, que si no la página no haría scroll—, y soltar encima de otro los cambia. Tocar uno abre su **ficha**: al equipo o a la caja, **evolucionar** —en **dos pasos** (se elige y sale «¡X está evolucionando!» con **Confirmar** y **Darle a la B**), con **la animación de los juegos** (silueta en blanco que se alterna con la nueva cada vez más deprisa —los dos sprites de Blanco y Negro, **quietos**, como en los juegos—, destello y «¡Enhorabuena!», ya animado; «Darle a la B» a mitad la corta y la deshace) y con un **Deshacer** en la propia ficha que solo deshace esa evolución—(si hay varias, todas en botones, **sin límite de juego ni de generación**, y con las formas que salen de evolucionar: Lycanroc, Wormadam, Meowstic hembra…), mote, vincular a mano, **dar por muerto** (con la causa y **dónde cayó** —una zona del mapa o escrito a mano, como en el cementerio—, avisando de quién cae con él; en un Soul Link, la pareja cae en el mismo sitio) y borrarlo si se apuntó por error. **Deshacer** vuelve atrás lo último (hasta 20), también una muerte con su pareja. Las capturas se apuntan aquí mismo (en un fangame sin mapa, es donde se apuntan) o desde el Mapa de capturas, y caen al equipo si hay hueco; aquí también llevan un **apunte** opcional («2ª captura», «huevo de regalo»…), el mismo campo que el del mapa, que sale en el *Resumen* de su ficha y en su historia. En un Soul Link, debajo, la lista de **vínculos**, vivos y caídos. Sin línea, apuntar, mover, evolucionar y dar por muerto van a la cola; deshacer, vincular, el mote y borrar piden conexión. El hall de la fama, si no hay equipo de la final ni de jornadas, se trae el de aquí. Cada caja lleva **un fondo de los juegos** (quince, de la 3ª a la 5ª generación: Poké Ball, Distorsión, Dioses, Demonio, Corazón, Alma, Verdad, Ideales, Yin, Yang, Munna, Croagunk, Césped, Cueva y Ciudad; o sin fondo) y tiene **su forma**, apaisada; de fábrica va uno distinto en cada caja, y con el botón **Fondo** se elige el de cada una (lo elige quien puede tocar esa caja). Hay **cuatro cajas siempre**, aunque estén vacías, y sale una más al llenarse. **Se cambia de caja** con las flechas altas de los lados —y, con un pokémon cogido, quedándose encima de una—, o desde la ficha con **«Mover a la caja…»**, que lo deja en el primer hueco libre de esa caja. **En una pantalla ancha (desde 1280 px) se ven dos cajas a la vez**, la de ahora y la siguiente, cada una con su fondo, y se arrastra de una a otra sin pasar de caja. **Shiny**: un pokémon capturado shiny (la casilla del buscador) o vuelto shiny desde su ficha con **«Hacer shiny»** —uno de los premios— lleva su sprite variocolor, un **destello dorado** en la esquina de su casilla y la etiqueta *Shiny* en la ficha; al volverse shiny sale una ráfaga de destellos y grita. Se deshace como lo demás, queda en su historia, evoluciona en shiny y, si cae, sale shiny en el cementerio. **Intercambiar** (en la ficha, plegado): para los entrenadores del juego que te dan uno a cambio de otro. Se elige la especie que llega (con forma y shiny) y su mote; el que llega **ocupa su sitio** —hueco, vínculo y ruta, que es el encuentro que se gastó—, el mote y la ficha de combate del que se va se van con él, y en el *Resumen* sale «Llegó: por intercambio, a cambio de X». Queda en su historia y se deshace como lo demás; pide conexión. Cada caja **lleva el nombre que se le ponga** («Banquillo», «Para evolucionar»…, tocando su cabecera), que sale también en «Mover a la caja…» y en el planificador. En la ficha de cada pokémon, **«Para combatir»**: su **naturaleza, objeto, habilidad (con su descripción) y cuatro movimientos**, todo opcional y sin nivel, a mano (con la lista en español; sus habilidades salen primero) o **pegando su set de Showdown**. Si lleva **su megapiedra**, se enseña **su mega** en la caja, el equipo y la ficha —sprite, tipos y debilidades, y «Venusaur · Mega Y» en la cabecera— con **su propia habilidad**, vacía la primera vez; quitarle la piedra lo devuelve todo; debajo, sus **debilidades y resistencias** (×4, ×2, ×½, ×¼ y ×0, sin los neutros) con la tabla de tipos de la generación del locke, o con otra de las tres que hay (1ª, 2ª a 5ª, 6ª en adelante) para ver cómo sería. La ficha grande lleva el **sprite al estilo de Blanco y Negro**: animado si lo hay y, si no, quieto (del 650 en adelante, los que hizo Smogon con ese estilo); nunca el modelo 3D. En las casillas, equipos y listas de toda la app, el **quieto** de Blanco y Negro, recortado para que llene su hueco (o el de HOME, si se elige en *Mi perfil → Sprites*). En el ordenador, **al pasar el ratón** por uno sale su naturaleza, habilidad, objeto y movimientos sin abrirlo. **«Leer la partida»**: en un locke de **Pokémon Añil**, su *Partida N.rxdata* (solo en el ordenador, que es donde se juega: en el móvil no sale; la ventana para elegirla recuerda la carpeta, y la primera vez se dice cómo llegar a `%APPDATA%`); en uno de **un juego oficial de la 1ª a la 7ª generación**, el `.sav` de su juego (o el `main` de 3DS), arrastrándolo encima o con el botón, en el móvil y en el ordenador —una partida de otro juego se rechaza diciendo de cuál es—. Se lee en el navegador (al servidor va solo lo sacado, y no se guarda) y se enseña antes qué va a pasar, cada cosa con su casilla para quitarla. Los que **ya estaban** —por **mote y especie**, sin mirar mayúsculas ni tildes, y la especie por familia— se ponen al día: **evolución** (con su historia), forma, shiny (solo a favor), naturaleza, habilidad (también la del modo Random), objeto y movimientos; nada de niveles, IV ni EV. Los que **no estaban** se apuntan con todo eso, **la fecha de captura** del juego y **su ruta**: la zona que se llame igual, o la que sea el principio de su nombre con el nombre del juego de **apunte** («Ruta 10 Norte» → Ruta 10); si no, sin ruta. Los de **la caja de caídos** (la última, o la que se elija) **solo se dan por muertos**, y si no estaban en la app se apuntan en el cementerio. Lo que solo está en la app, o caído en la app y vivo en el juego, no se toca y se avisa. Todo junto es **un solo Deshacer**, que borra también lo apuntado. Lo que el juego no guarda no se inventa: en la 1ª no hay naturaleza, habilidad, objeto ni shiny; en la 1ª, Oro y Plata no hay sitio de captura, y hasta la 3ª no hay fecha (se avisa y se apunta con la de hoy). **Exportar a Showdown**: encima del equipo, el botón saca a los seis en el formato de «Export» del Teambuilder (mote, especie, objeto, habilidad, nivel, shiny, naturaleza y movimientos) para pegarlo en *Import from text*; sale al **level cap que le toca** a quien lo lleva (el primero que no ha superado, o el último), con el nivel y los motes cambiables. En la pestaña *Combate* de la ficha, *Copiar para Showdown* copia solo ese. |
| **Locke en solitario** | Una partida para una persona: sin jornadas, sin clasificación y sin final, pero con su caja, su mapa, sus level caps, su bolsa y sus notas. Se gana **pasándose la Liga**. Un administrador se lo crea al momento; cualquiera lo **pide** y le llega un aviso a la organización, que acepta o rechaza. |
| **Competiciones** | En pestañas debajo de la edición que se ve, dibujada como un **cartucho** (logo en la etiqueta, luz de en curso / sin empezar / archivada): *Jugadores* (y espectadores), *Ajustes* (solo quien la lleva), *Ediciones* (la estantería de cartuchos) y *Nueva* —*Pedir* para quien no organiza—. Crear ediciones copiando configuración, archivar (una edición archivada es **de solo lectura para los jugadores**: se ve entera, con un aviso arriba, pero no se apunta nada; quien la administra sí puede), gestionar jugadores y **retirar** al que se va a mitad del locke. El juego se elige de una lista (1ª a 7ª generación, remakes aparte) y de ahí sale la región del mapa. Aquí se reparte también el acceso de **espectador**: quien no juega un locke no lo ve, salvo que un administrador se lo enseñe. Al crear una, **se elige qué lockes archivar** de una lista (vienen marcados los de grupo en los que juegas): antes era una casilla de "archivar todo lo activo" que al Creador le archivaba los de toda la casa. De 2 a 8 jugadores, y un dualocke nace con **6 jornadas previstas**. Se puede **apuntar a alguien por su usuario exacto**, aunque la cuenta no la hayas dado de alta tú. El juego se elige **en pareja** cuando son gemelos (Rojo y Azul, Rubí Omega y Zafiro Alfa…; las terceras ediciones, sueltas), y cada jugador lleva **una de las dos versiones**, elegida de un desplegable o **repartidas al azar** a partes iguales con un botón. También **juegos no oficiales** (fangames): su nombre a mano y, si se quiere, **el juego en el que se basan** (Pokémon Añil sobre Rojo y Azul), del que salen el mapa de capturas y la plantilla de level caps para ajustarla; o **desde cero**, sin mapa (Pokémon Z). Se puede pedir también en un locke en solitario. Si el fangame se llama **Pokémon Añil** (con o sin tildes; el formulario avisa al escribirlo), el locke usa lo de Añil: sus **tipos** (los 49 que cambia —Meganium Planta/Hada, Typhlosion Fuego/Normal…— y Fuerza, Corte y Clavo Cañón con otro tipo), sus **pokémon nuevos** (Royaleon y Cefireon, que salen en los buscadores y como evolución de Eevee) y sus **formas y megas nuevas** (Pikachu Amarillo, los cortes de Furfrou, Mega Venusaur Y, Mega Snorlax…), con sus dibujos; sus **megapiedras**, que sacan su mega en la caja; sus **habilidades** (nombre y descripción de Añil, y las de cada pokémon), sus **movimientos nuevos** (Escalofrío, Deslizamiento, Atrapabicho, Triple Golpe) y sus potencias, y sus **objetos** (los nuevos, y sin los que allí no hay) en la ficha, la bolsa y al pegar de Showdown; en Combate, la tabla de tipos «Añil». En los demás juegos no sale nada de eso. En juegos de la 1ª a la 5ª (y fangames sin base) se eligen también **los tipos**: los de su generación (sin Hada; es lo de por defecto) o los de ahora (lo de por defecto en un fangame sin base). Cada locke tiene su **estilo de juego** —competitivo o Soul Link—, que se elige al crearlo y, como las plazas, **se cambia después** en *Editar datos*. El Creador ve todos los lockes para supervisar, pero **los de la gente no le llenan nada**: en el selector de arriba solo salen los suyos (los que juega, mira o creó) y, aparte bajo *Supervisando*, el que esté mirando de otro; en Ediciones, los de los demás van en un bloque plegado —*Lockes de los demás (N · M en marcha)*— con de quién es cada uno, y se abre solo si estás mirando uno. Un locke activo se puede marcar **«Aún no ha empezado»** para montarlo con tiempo: los días no corren, la portada lo avisa y en Ediciones sale *Sin empezar*; con **«Empezar el locke»** su fecha de inicio pasa a ser ese día, que es de donde cuenta lo que dura. |
| **Administración** | Arriba, **indicadores con su luz** (cuentas, lockes en marcha, títulos y copias, en ámbar si la última copia se ha quedado vieja) y las herramientas globales como teclas; debajo, *Cuentas · Títulos · Copias*, con el menú al lado en el ordenador. Alta de usuarios, roles y contraseñas, los ajustes de la edición, los títulos, el **editor de mapas** (dibujar zonas sobre la imagen —rectángulo, círculo, óvalo o a medida—, moverlas, estirarlas, **girarlas**, colorearlas, agruparlas y regular cuánto se rellenan), las **plantillas de level caps** de cada juego y las copias de seguridad. |
| **Final Four** / **Jornada Final** | El final del locke, que se abre al terminar todas las jornadas y acaba con un campeón. **El cuadro depende de cuántos sigan jugando**: seis (dos cruces, dos semifinales y final), cinco (dos cruces, una semifinal y el 1º esperando en la final), cuatro (torneo normal: 1º-4º, 2º-3º y final), tres (el 1º espera y se juegan el 2º y el 3º) o dos (una sola llave). De cuatro para arriba se llama **Final Four**; de tres para abajo, **Jornada Final**. **Todas las llaves se juegan al mejor de tres**, y cada combate lleva su ganador, su diferencia, su fecha, sus notas y **su enlace a la repetición**. No se abre hasta que estén creadas **las jornadas previstas**, no solo jugadas las que haya. Y si **solo queda uno en pie** —los demás se retiraron o perdieron el locke—, no hay final: **gana por abandono**, y el hall, la imagen del resumen y el palmarés lo cuentan como campeón. |
| **Tu color en todo** | El tema se sale de la página: la **barra del sistema del móvil** (y la del navegador) va del color de tu tema, el **icono de la pestaña** es la media ball pintada con tus colores, y lo seleccionado, el cursor de escribir, las casillas de los formularios y las barras de desplazamiento del ordenador también. Arriba del todo hay una **franja de luz** del color del tema que en el iPhone rellena el hueco de la cámara. Al probar temas en Mi perfil cambia todo al momento. Y **al cambiar de pantalla** el contenido entra fundiéndose y subiendo un poco, por bloques. |
| **Gritos** | Los pokémon **gritan** al abrir su ficha (Equipo y PC, cementerio y hall), al evolucionar —el de antes al empezar y el nuevo al salir— y al caer, **grave**, como suena en los juegos al debilitarse. En los lockes hasta la 5ª generación suenan **los clásicos** (Game Boy y DS) y en el resto los actuales; en *Mi perfil → Sonido* cada uno elige para su dispositivo: los del juego, siempre clásicos, siempre actuales o sin gritos. Con el móvil en silencio no suenan. Aparte, los **bips del menú**: un pitido de onda cuadrada, muy bajito, al abrir cualquier ficha, al cambiar de caja y al enviar un formulario; se quitan con su interruptor en el mismo sitio. |
| **Sprites** | En *Mi perfil → Personalizar*, por dispositivo: **Blanco y Negro** (de fábrica; los del 650 en adelante, los de Smogon al mismo estilo), **Iconos de caja**, de dos maneras: **Espada y Escudo** (los muñequitos del PC de la 8ª y, para los que no tienen —Hisui, Paldea, las megas nuevas—, los de la comunidad de Pokémon Essentials; sin variocolor, como en Espada y Escudo) o **Todos iguales** (todos los de Essentials, al estilo de la 7ª, con variocolor) o **HOME** (los modelos 3D). Manda en casillas, equipos, listas, el mapa y el hall (el cementerio, el suyo y el del perfil de cada jugador, nunca lleva iconos: con los de Blanco y Negro queda más bonito); la ficha de cada pokémon va siempre **animada** al estilo de Blanco y Negro: los oficiales hasta el #649 y, del 650 en adelante y en las formas, los de la comunidad de Pokémon Essentials, también shiny. |
| **Historia de cada pokémon** | En su ficha del Equipo y PC, del cementerio y del hall, **una línea de tiempo**: dónde y cuándo se capturó (y qué era si ha evolucionado), cada evolución, los gimnasios, jornadas, retos, royales y la final que jugó con su resultado, los **MVP** que ganó, su entrada al hall y **dónde cayó**, con cuántos días duró, cuántos combates y victorias. Lo de la caja (dónde se capturó y sus evoluciones) solo lo ve su dueño fuera de un Soul Link; lo demás, todos. Desde la ficha de Equipo y PC, **«Compartir su tarjeta»**: una imagen (`api/pokemon/[id]`) con su sprite nítido, mote, tipos, su set y lo que ha vivido (días, combates, MVPs, dónde se capturó), para el grupo. Solo la puede pedir quien puede ver su ficha: su dueño, o los del locke en un Soul Link. |
| **Hall de la fama** | El cierre del locke, disponible cuando el final ya tiene campeón. El equipo **se trae de la final** con un botón, y si no jugó el cuadro, del último combate de jornada. **Podio** con el campeón, el subcampeón y cómo se ganó la final; la clasificación final va por **cómo acabó el locke** —primero los del cuadro por lo lejos que llegaron, luego los que seguían jugando, y al final los que se fueron, el último en irse arriba—; **cómo fue el locke** en cifras —cuánto duró, jornadas, combates, caídos con su ruta más mortífera, wipeos, quién más MVPs, quién perdió más y quién menos—; y el **equipo de 6** con el que terminó cada uno, el del campeón en dorado. Cada pokémon abre **la misma ficha que el Equipo y PC** (cabecera teñida, sprite animado, tipos) con su *Historia* en una pestaña, y el equipo **se puede traer del último combate de jornada** en vez de teclearlo. Entre las menciones, **quién se llevó más coronas** y la **causa de muerte más repetida**. Y **Para el grupo**: el locke entero en **una imagen** —campeón con su equipo, podio, cifras y menciones— con botón de compartir (el menú del móvil) o descargar. **La entrada al Hall de la Fama, como en los juegos**: cada pokémon entra en diagonal hasta el centro, grita y se lee su número, mote y especie; se van quedando en fila y al final «¡Bienvenidos al Hall de la Fama!» con el equipo entero y confeti. Tocar la pantalla pasa al siguiente. La primera vez que alguien abre el hall con un equipo **completo** que no ha visto, se le ofrece verla (*Ver la entrada* / *Ahora no*), de uno en uno si hay varios; cada equipo tiene además su botón **Entrada** para repetirla. La entrada acaba con **confeti**. |
| **Ruleta** | Sorteos personalizables; girar gasta un ticket de esa ruleta, salvo los administradores. Una casilla puede ser texto suelto ("monotipo la próxima ruta") o **un premio de verdad**: un objeto del catálogo de la bolsa o tickets de una ruleta, que salen solos de la rueda a la bolsa o al saldo. |
| **Buscador rápido** | En el ordenador, **Ctrl+K** (o ⌘K) o «Buscar…» arriba de la barra lateral: pantallas, jugadores, rutas de tu mapa (abre el Mapa con la ruta escrita), tus pokémon (abre su ficha del Equipo y PC) y el cementerio. Flechas, Enter y Escape. Sin tildes ni mayúsculas. |
| **Clasificación pública** | Un **enlace sin cuenta** (`/clasificacion/<clave>`) para quien sigue el locke de fuera: solo la tabla, o el marcador en un dualocke, sin fotos ni nada más. Lo crea, lo cambia (el de antes deja de abrir) o lo quita quien lleva el locke, en *Competiciones → Ajustes*. No en solitario ni en Soul Link. |
| **Actividad** | **Va por tramos** —Hoy, Ayer, Esta semana, Este mes y luego por meses— y el punto de cada cosa **va del color de su tipo** (rojo las muertes, violeta los combates, ámbar los hitos…). Arriba, **filtros por tipo** (`?tipo=muerte`, `combate`, `hito`, `puntos`, `ruleta`, `objeto`); se filtra después de pedir, así que no se queda corto. Las líneas que no caben (la causa de una baja larga) se cortan con «…» y **se ven enteras al tocarlas** (`components/texto-que-se-abre.tsx`, que solo se deja tocar si de verdad está cortada). Lo que han hecho **todos** el mismo día sale como «Todos han superado a Blanca», no con seis nombres en fila. Cronología con muertes, puntos, gimnasios superados, giros de ruleta, resultados de jornada y objetos gastados, **por días** («Hoy», «Ayer», la fecha) y con lo que pasa a varios el mismo día en **una sola línea** («Álex, Rodri y Pablo han superado a Morty»). Se ven las 40 últimas y el resto con «Ver lo anterior». |
| **Instalación** | Pantalla de primer arranque que crea el administrador. |
| **Bienvenida** | Lo que ve una cuenta **sin ningún locke**: un saludo y tres caminos —que te apunten (con su usuario para copiar y quién le dio de alta), pedir el suyo con el formulario ahí mismo, o pedir acceso de espectador—, cómo va lo que ya ha pedido y atajos a su perfil y la guía. A un organizador le cambia a "móntalo tú" y "trae a los tuyos". El menú se queda en Resumen y Lo mío (perfil, Ediciones, guía, y el palmarés si salió en algún locke de antes); cualquier otra pantalla de locke por un enlace viejo manda al inicio. En *Mi perfil* dice lo mismo: "Sin locke todavía" bajo el nombre (o "Espectador" si solo mira), la foto "se verá… cuando juegues un locke" y Ediciones es "donde pides tu locke". |
| **Guía de uso** | El manual en PDF, con fotos de cada pantalla, y una **segunda guía para quien lleva un locke** en su propia pestaña. La del administrador solo se le enseña a quien administra alguna edición o al Creador. |
| **Pestañas** | Lo que había crecido demasiado va por partes con la misma pastilla (`components/pestanas.tsx`, y `pestanas-enlace.tsx` para las páginas del servidor): la **ficha de cada pokémon** (Resumen · Combate · Historia, con la cabecera fija y teñida del color de su tipo), el **editor de equipos** de un combate (Repetición · A mano · Pegar; abre en Repetición si el combate la tiene) y **Diagnóstico** (Cambios · Errores · Base de datos · Ver como; la base de datos solo se mide al abrir su pestaña). |
| **Registro de cambios** | En Diagnóstico: lo que hace quien administra cada locke —resultados, jornadas y combates, puntos, reglas, bolsas y tickets, gimnasios, jugadores, bajas borradas, la final y los títulos—, con **quién y cuándo**, por días y con filtros por locke y por zona. Se guarda medio año. |
| **Ver como** | En Diagnóstico, el Creador puede ponerse **de jugador o de espectador** para ver la app como la ve la gente. No es solo la pantalla: mientras dura, el servidor le trata como ese papel también al guardar. Arriba de cada pantalla sale un aviso con «Volver a Creador», y se quita solo a las seis horas. |
| **Diagnóstico** | Pantalla del Creador. Mide lo que tarda la base de datos en contestar y **cuánto ocupa**: el total, en qué se va (columna a columna de imágenes), lo que pesa cada locke y **cuántos cabrían** en el plan gratis. Desde aquí se lanza también el mantenimiento del almacén de imágenes. Arriba, **los errores de la app**: lo que se ha roto en el navegador de alguien o en el servidor en los últimos 30 días, agrupado, con cuántas veces, quién, dónde, el código del fallo y su pila; cada uno se da por arreglado con un botón. |
| **Organizador** | Un permiso que da el Creador (botón 🎪 en la lista de usuarios) y que deja a alguien **montar sus propios lockes y dar de alta a su gente**, sin ver los de los demás ni tocar los mapas, el catálogo, las plantillas ni las copias. Al crear un locke entra en él como administrador de esa edición. |
| **Botón de apuntar** | Un "＋" fijo, en todas las pantallas menos Administración, con tres atajos: registrar una baja, apuntar una captura y marcar un gimnasio. Cada uno lleva a su página **con el formulario ya abierto**. |
| **Aspecto** | Sobrio y deportivo —letra condensada de marcador en títulos y cifras, superficies planas en grises neutros, etiquetas cuadradas en vez de píldoras e iconos de línea en el menú en vez de emojis—, con el color del tema en los acentos. **Es el de todo el mundo.** El de antes, el *clásico*, se puede seguir eligiendo en *Mi perfil*, y se guarda por dispositivo. En el móvil, **las fichas suben desde abajo** —la de un pokémon, una baja, una zona del mapa, un objeto, el MVP, el as, los equipos de un combate, los vídeos de un gimnasio— y se cierran **deslizándolas hacia abajo**; en la portada y en Equipo y PC se **tira hacia abajo para refrescar**, con la media ball girando. Lo que está vacío lleva **un dibujo en línea fina** (una ball, una lápida, la mochila, el mapa…) en vez de una caja a rayas. Los dos grises de los textos secundarios (`slate-500` y `slate-600`) van **más claros que los de Tailwind** (en `@theme` y en el aspecto nuevo): el 500 pasa del 4,5:1 sobre las tarjetas y el 600 sube de 2,4:1 a 3,8:1, para que se lean con el móvil al sol. Las **✕ de borrar** sueltas van en gris y se ponen rojas al pasar por encima (`btn-borrar`, lo que pone `ConfirmSubmit` cuando el botón es solo un símbolo); las que llevan texto siguen en rojo. |
| **Aviso de novedades** | Un punto ámbar en las pestañas cuando hay algo que no has visto: jornada o reto nuevos, un combate resuelto o un MVP por votar en *Combates*; bajas, puntos o gimnasios **de otros** en *La edición*; objetos nuevos en tu bolsa en *Lo mío*. Algún apartado lleva **punto propio** además del de su grupo: *Reglas*, cuando cambia una. |
| **HexaPost** | Los filtros van en **filas que se deslizan** en el móvil (`fila-de-filtros`), como en Actividad y Diagnóstico. Los tres tipos son **una fila de botones** (también en el móvil), con la explicación solo del elegido debajo: en tarjetas se comían media pantalla. En *Lo mío → HexaPost* (también sin ningún locke), cualquiera manda **un error, una mejora o un cambio** a quien lleva la aplicación: una línea de resumen, el texto, **dónde** (la pantalla de la que viene, ya elegida) y una **captura** opcional; va solo con su navegador y tamaño de pantalla. Debajo ve lo suyo y en qué está —*Enviada*, *Leída* (en cuanto el Creador abre HexaPost), *Apuntada*, *Hecha* o *No se hará*— con la respuesta, y un **punto de aviso** en *Lo mío* cuando le contestan. Lo puede retirar mientras nadie lo haya leído; cinco al día. El Creador ve en el mismo sitio **lo de todos**, por resolver primero (filtros por estado y por tipo), cambia el estado, contesta o borra, y le avisa el punto mientras haya algo sin leer. La pantalla de **«Se ha roto algo»** lleva a él con el código del fallo ya escrito. |
| **Seguridad** | Contraseñas con bcrypt y sesión firmada en una cookie `httpOnly`, como siempre, y además: **tras cinco fallos seguidos** con una cuenta (o veinte desde una misma red) en 15 minutos hay que esperar, exista la cuenta o no; el login **tarda lo mismo** exista o no el usuario; **cambiar la contraseña** —uno mismo o quien administra— **echa las sesiones abiertas** en otros dispositivos, y en *Mi perfil → Cuenta* está **«Cerrar sesión en los demás dispositivos»**; las contraseñas nuevas tienen **al menos 8 caracteres** y no valen las de siempre («12345678», «contraseña»…) ni el propio usuario; y todas las respuestas llevan **cabeceras de seguridad** (no se puede meter la app en un marco de otra web, sin cámara ni micrófono, siempre por https…). |

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

**La seguridad que se añadió «por si acaso»** (lo pidió el usuario pensando en
abrirla a más gente), y por qué así:

- **El freno al login cuenta en la base de datos** (`IntentoDeEntrada`), no en
  memoria: en Vercel cada petición puede caer en una instancia distinta. Cuenta
  por usuario escrito —exista o no, para no delatar cuáles hay— y por red, esta
  resumida con un hash y el `AUTH_SECRET`: sirve para contar, no para saber
  desde dónde entra nadie. Se borra al entrar bien y lo de más de un día se
  tira solo. Las reglas están en `lib/seguridad.ts`.
- **Las sesiones llevan la versión de la cuenta** (`User.sesionVersion`).
  `getCurrentUser` ya leía la cuenta en cada petición, así que compararla no
  cuesta un viaje más. Las cookies de antes no la llevan y cuentan como 0, que
  es con lo que nacen todas: al desplegarlo no salió echado nadie.
- **Cabeceras sin `script-src`**: Next mete scripts en línea y cerrarlos pide
  un nonce en cada página; lo que más protege de eso —que nada de lo que
  escribe la gente se pinte como HTML— ya lo hace React. `frame-ancestors` y
  `object-src` son `'self'` y no `'none'` porque la guía se ve en un
  `<object>` de la propia app.
- **Contraseñas de 8**, solo para las nuevas: las que ya había siguen valiendo.
- **Las imágenes guardadas no pueden ejecutar nada** (repaso de octubre). Una
  imagen dice ella misma su tipo (`data:image/…`) y eso lo escribe quien la
  sube: se aceptaban SVG, y un SVG con código abierto suelto en
  `/api/imagen/…` corría como una página de la aplicación, con la sesión de
  quien pinchara el enlace. Ahora, tres capas: **al guardar no se aceptan SVG**
  (`isValidImageValue`; lo que sube la gente ya llegaba en WebP desde el
  navegador), **la ruta solo sirve tipos de imagen**, y `/api/imagen` lleva su
  propia CSP con `sandbox` y sin nada que cargar (en `next.config.ts`: la lista
  de allí pisa lo que ponga la ruta, por eso no va en la ruta).
- **Las imágenes por enlace solo se redirigen a quien las pinta**: abiertas
  como página, `/api/imagen/…` llevaba a cualquier web con la dirección de la
  app delante. Se mira `Sec-Fetch-Dest`; un navegador que no lo manda es viejo y
  se le deja pasar.
- **Las capturas de HexaPost van por su propia dirección**
  (`/api/imagen/sugerencia/<id>`), que solo abren quien la mandó y el Creador, y
  **sin la caché de la red**: lo demás va a la caché pública de Vercel (sprites
  y fotos de perfil), pero una captura de pantalla puede enseñar cualquier cosa.
- **El registro de errores del navegador, con tope por persona** (30 a la
  hora): guarda unos miles y tira lo viejo, y alguien mandando basura habría
  tapado los fallos de verdad.

**Contra copiar la app, lo que sirve y lo que no.** El usuario preguntó cómo
evitar que se la clonen. Lo que llega al navegador no se puede esconder, y
ofuscarlo o bloquear el clic derecho no lo evita y hace la app más lenta, así
que no se hizo. Lo que sí protege: el **repositorio privado** (sin sesión,
GitHub da 404), el código del servidor, que no sale de Vercel, la compilación
**sin mapas del código** (`.map`) y las claves solo en Vercel. Se añadió
`LICENSE` («todos los derechos reservados», con la nota de que Pokémon es de
sus dueños) y `"license": "UNLICENSED"` en `package.json`. Se le recomendó al
usuario la **verificación en dos pasos en GitHub, Vercel y Neon**, que es lo que
de verdad evita que se lo lleven todo (eso lo hace él en cada web).

**Dependencias al día, con aviso.** `.github/dependabot.yml` solo propone las
actualizaciones **de seguridad**, juntas y como mucho una vez por semana
(`open-pull-requests-limit: 0` apaga las de «hay versión nueva»). Abre una
propuesta en GitHub; a la app no llega nada hasta aceptarla. Hace falta tener
activado *Settings → Code security → Dependabot security updates*. Next va
**fijado a una versión exacta** a propósito: se sube a mano y probando.

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

**Hay dos gráficas, con su pestaña: "Con todos" y "Sin los que se fueron".** La
segunda contesta a otra pregunta: *cómo iría esto contando las retiradas y los
lockes perdidos*. Desde la jornada en la que alguien se va deja de estar en la
tabla y los de abajo suben, así que la línea de quien se fue **acaba ahí** y las
demás se recolocan en esa misma columna.

- **Se va en "su" jornada, no en la siguiente.** La fecha de salida se compara
  con los cortes de cada jornada y se coge **la primera que termina después**:
  esa es la que se estaba jugando cuando lo dejó. Si se retira jugándose la
  tercera, en la tercera ya no sale.
- **Los puntos no se tocan**, solo los puestos. Lo que cambia es quién está en
  la tabla; recalcular los puntos quitando los combates contra el que se fue
  sería reescribir lo que pasó, y no es lo que se pregunta.
- **La pestaña solo aparece si se ha ido alguien.** Si no, las dos gráficas
  serían idénticas y el botón sería ruido.
- Las dos salen **de las mismas cuentas** (`fotos`, una por etapa) y viajan
  juntas al navegador: cambiar de pestaña no pide nada al servidor.
- El pie de la segunda dice quién se fue y cuándo, en orden de marcha y con su
  icono: 🚪 retirada, 💥 locke perdido.
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
archivarse. **Se elige de su caja**: uno vivo de su Equipo y PC, desde Mi perfil
(su caja en cuadrícula, con buscador) o con «Hacerlo as» en la ficha del
pokémon. Antes era una especie escrita con el buscador del cementerio; el
grupo pidió que fuera de verdad uno de los suyos y que **se pusiera al día
solo**. Por eso el participante guarda la captura (`aceCaptureId`) y además
**una copia** de su especie, mote e imágenes en las columnas de siempre: así la
clasificación, el cementerio, la ficha rápida y la dirección de su imagen no
cambian, y la copia se rehace (`sincronizarAs`, en `lib/as-servidor.ts`) cada
vez que una acción del Equipo y PC cambia quién es ese pokémon —evolucionar,
mote, shiny, intercambio y deshacer—. Borrar la captura deja al jugador sin as.
Lo eligen quien puede tocar esa caja (su dueño; en un Soul Link, también quien
administra), porque para elegir se enseña la caja, que es privada; quitarlo lo
puede hacer quien administra, como antes. Los ases de antes, sin captura, se
quedan como estaban hasta que se cambien.

**Las frases del compañero van en el código, no en la base de datos.** El
usuario quería que hablara de su propio pokémon («Haxorus afilando su hacha»)
y temía cargar la base de datos. Las de especie son texto fijo: se escribieron a
mano, dos por pokémon, para los 1025 y lo de Añil, en
`scripts/frases-de-especie/*.txt` (una línea por especie, fáciles de retocar),
y `scripts/frases-de-especie.py` las junta en `lib/frases-de-especie.json`, que
**solo lee el servidor**. Se piden **la primera vez que se toca al compañero**
(`frasesDelCompaneroAction`), no al cargar cada pantalla, y al navegador solo
viajan las del as de cada uno; las del locke son tres o cuatro consultas
pequeñas en ese momento. Van **sin adjetivos con género** («quieto»,
«contento»…), porque el mote no dice si es macho o hembra: el script avisa si
se cuela alguno. Una forma con otros tipos que su especie (Vulpix de Alola) no
usa las de la especie, que hablarían de otro pokémon: se queda con las de su
tipo. La hora (dormir de 0 a 8, «buenos días»…) la decide el navegador, que es
quien sabe la hora de quien mira. El paseo se probó encendido para todos y **se
apagó de base**: andando, el bocadillo se iba con él y no había quien lo
leyera. Ahora se enciende en *Mi perfil* (en el dispositivo), y al tocarle
mientras pasea se para hasta acabar la frase, con el bocadillo abierto hacia
el lado de la pantalla donde hay sitio.

**Cada relevo queda en la historia de los dos.** `historialDeAses` guarda los
turnos: quién, desde cuándo, hasta cuándo y por qué dejó de serlo (**cayó**, si
estaba en el cementerio al elegir otro; **relevo**, si había uno mejor; o
**quitado**). De ahí salen «Nombrado as · tras caer Canto» y «Dejó de ser el
as · le relevó Fideo» en la historia de cada pokémon (`lib/as.ts`, probado en
`tests/as.test.ts`). Va en el participante y no en la captura porque el as es
público: sale también en la historia que ven los demás desde el cementerio o
el hall, reconociéndolo por mote y familia como en las jornadas. Se enseña en
la clasificación y en la cabecera de su caja del cementerio; al
pincharlo se abre su ficha con la ilustración grande, el mote y el motivo por el
que es su as. **A propósito no aparece en las jornadas**: el usuario prefiere no
perder el factor sorpresa antes de un combate.

**El compañero es el as, no otra cosa que elegir.** La idea era el pokémon
que te sigue en HeartGold y SoulSilver, y el usuario propuso usar el as, que
ya tiene todo el mundo: así sale solo y no hay otro ajuste más. Va con el
**icono de caja** y no con el sprite de HOME, que en treinta píxeles no se
distingue, y siempre con icono aunque se hayan elegido otros sprites: es un
muñequito que acompaña, no una ficha. Sus reacciones salen de lo que ya está
guardado —la última victoria y la última baja— y lo visto se apunta **en el
dispositivo** (`localStorage`), sin tabla nueva: si se cambia de móvil vuelve a
celebrar lo último, que tampoco es grave. Solo reacciona a lo de **los últimos
tres días**, para que el primer día no llore bajas de hace un mes. El as no va
enlazado a ninguna captura, así que «ha caído» es que hay una baja suya con esa
especie y ese mote. Se pide en el layout **en la misma tanda** que lo demás de
la cabecera (`companeroDe` busca por locke y cuenta, sin esperar a la ficha del
jugador), y de la imagen del as solo lee el principio, que dice qué pokémon es.

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
- **Cada jornada de dualocke elige: un combate o al mejor de tres** (`Matchday.alMejorDe`,
  1 o 3; vacío es «la de su locke», 3, para que las de antes no cambien). Al
  mejor de tres va **como una llave de la final**: los dos con cómo va la
  serie, **un equipo por jugador para toda la serie** —colgado del primer
  combate; los demás solo llevan su resultado— y los combates debajo. Se
  cambia con el selector de la jornada **mientras no haya nada apuntado** (ni
  resultado, ni equipo, ni nota), y el servidor lo vuelve a comprobar: a mitad
  de serie cambiar las reglas dejaría combates sin sentido. Pasar a un combate
  quita el segundo (sin jugar); pasar a tres lo añade. En la historia de un
  pokémon, de una serie va una línea con cómo quedó («Victoria 2-1»). Las
  series de antes tenían equipo en cada combate: si un combate posterior trae
  el suyo, se enseña con él.
- **La jornada del dualocke al mejor de tres son dos combates, o tres.** Un mejor de tres se
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

**Ediciones volvió, pero a "Lo mío"**: dentro del perfil no la encontraba nadie
(el usuario la notaba "bastante escondida"). Ahora está en el grupo de lo tuyo
—son tus lockes— y con un botón de icono pegado al selector de lockes, arriba,
que es donde uno piensa en cambiar de locke o montar otro. "La edición" sigue en
seis; Administración y Diagnóstico siguen en el perfil.

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

**Cada uno apunta el equipo con el que juega la final, y es uno para todo el
cuadro.** En la Final Four te presentas con un equipo y con ese juegas hasta que
caes, así que no hay que apuntarlo combate a combate como en las jornadas: la
pantalla del final tiene su sección *Los equipos*, con una caja por sembrado.

- **Lo apunta su dueño**, o quien administre (`assertCanActForParticipant`, el
  mismo portero que el resto de lo que es de cada uno). En los otros equipos
  —jornada, reto, royale— manda la organización, porque son datos del combate;
  este es tuyo.
- Cuelga de `FinalFour` (`MatchPokemon.finalFourId`, el **quinto** sitio del que
  puede colgar un equipo) y se distingue por `participantId`.
- **De ahí se lo lleva el hall**: `getUltimoEquipo` mira primero el de la final
  —"⤵ Traer el equipo de la final"— y solo si no jugó el cuadro cae al último
  combate de jornada, que es lo que había antes.

**El hall de la fama se abre al haber campeón.** Cada jugador registra el
equipo de 6 con el que terminó, con el mismo buscador de especie. Se comprueba
en el servidor que la Final Four esté decidida antes de admitir nada.

**Su orden no es la clasificación: es cómo acabó el locke.** Era la tabla con el
campeón y el subcampeón puestos a mano encima, y eso estaba **mal**: los que
están fuera llevan `position: 0` —no ocupan puesto en la tabla—, así que el que
perdía el locke a media carrera salía **tercero**, por delante de los que
jugaron la final. Ahora son tres grupos:

1. **Los que jugaron el cuadro**, por lo lejos que llegaron. La ronda se mide
   por el orden en que aparece en el cuadro (cruces → semifinales → final) y no
   por la llave: si no, el que cae en la segunda semifinal quedaría por encima
   del de la primera sin haber hecho nada distinto. Ganar la última suma medio
   punto, que es el campeón. A igualdad de ronda decide la siembra.
2. **Los que seguían jugando** y no se clasificaron, por la tabla.
3. **Los que se fueron**, por quién aguantó más: arriba el último en irse. Para
   esto `StandingRow` lleva `retiredAt`.

Es **el cierre del locke**, así que cuenta cómo fue:

- **El podio solo lo pisa quien jugó la final.** El 1º y el 2º salen de ella y
  el 3º es **el que más lejos llegó de los demás**; como no se juega un combate
  por el tercer puesto, a igualdad de ronda lo decide la siembra. Quién puede estar sale de
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

### De 5-10 tandas por pantalla a 2-3

Aquello de «lo que queda ya es de verdad encadenado» resultó no serlo. Medido
con `LATENCIA_FALSA=50`, casi todas las pantallas iban en 5 tandas, y la
portada, `/muertes` o `/palmares` en 8-10. Se bajaron así, **sin cambiar nada
de lo que se ve** (comparado el DOM de 81 pantallas con seis cuentas contra la
versión anterior, y los permisos entrando como gente de fuera):

- **El locke se pide a la vez que la cuenta.** `getActiveCompetition` y
  `listCompetitions` esperaban a `getCurrentUser` para saber qué lockes puede
  ver. Ahora leen el `userId` de la cookie (`readSession`), se traen el locke con
  dos marcas —si juega y si mira— y aplican la misma regla que
  `filtroDeLockesVisibles` **al llegar la cuenta**, en memoria. Si la cuenta no
  cuadra con la cookie, no se enseña nada. Es la tanda que ahorran todas.
- **Las firmas de las imágenes se piden por el locke, no por los ids.** Para
  firmar una imagen hacía falta saber antes de qué fila era; pidiéndolas con el
  mismo filtro que los datos (`competitionId`, `userId`…) van en la misma tanda.
  `firmaDeColumna` en `lib/imagenes.ts` es el `case` de SQL que calcula la
  firma, para meterlo en cualquier consulta.
- **`relationJoins` de Prisma**: los `include` salen en una sola consulta con
  `join` en vez de una por relación. Menos consultas, mismo resultado.
- **Lo que dependía de un dato que ya se sabía por otro lado**: `getMvpStates`,
  `getBolsa(s)`, `getEquiposDelLocke`, `getMisCapturas`… aceptan ahora «el de
  tal persona en tal locke» o una promesa, en vez de esperar al participante.
- **`getMapa` lee antes de escribir**: hacía un `upsert` en cada visita, que es
  una escritura; ahora solo crea el mapa si no existe.
- **`getAvisos`** es una sola consulta con CTE.

Resultado, en tandas: portada 8 → 3, `/jornadas` 7 → 2, `/puntos` 5 → 2,
`/muertes` 8 → 3, `/palmares` 10 → 4, `/perfil` 7 → 3 y casi todas las demás
5 → 2. Con Neon a unos 20-40 ms por viaje, cada tanda menos se nota.

De paso se quitó código que nada usaba (acciones sin formulario, ayudantes
sustituidos por su versión «del locke», imports sueltos) y el selector de lockes
desempata por `id` a los que empezaron a la vez, que antes podían bailar.

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

**Y va con la huella de su contenido en la dirección**
(`/guia-de-uso.pdf?v=d2a9b56895`). El service worker guarda las guías para
leerlas sin conexión, y al principio las trataba como los sprites —guardadas
una vez, servidas de la copia para siempre—, así que quien la había abierto
antes seguía viendo la vieja aunque se subiera una nueva. La huella la calcula
`next.config.ts` al compilar (un trozo del sha256 del fichero, pasado como
`HUELLA_GUIA_USO` / `HUELLA_GUIA_ADMIN`), así que cambia sola al subir un PDF
distinto y no hay nada que acordarse de tocar. El service worker guarda **solo
la última** de cada guía, pide siempre a la red la dirección sin huella —un
enlace viejo— y sin línea sirve la que tenga. Lo que ya no tiene arreglo es la
copia **descargada** en el móvil, que es un fichero suelto: por eso la pantalla
dice de qué fecha es la versión (a mano, en `guia/page.tsx`, como el índice) y
pide volver a guardarla si es de antes.

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
consultas de `lib/mapas.ts` piden de quién son —el participante o, para no
esperarlo, `{ competitionId, userId }` (`DeQuien`)— y filtran por él, y **no
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

De la generación se encarga `generacionDelJuego()`: **la del juego, no la de
su región**. Los remakes llevan la suya escrita en `lib/juegos.ts` (Rojo Fuego
y Verde Hoja 3ª, HeartGold y SoulSilver 4ª, Rubí Omega y Zafiro Alfa 6ª). Al
principio salía de la región, y en Rubí Omega Clefairy salía Normal en vez de
Hada; Rojo Fuego, con la tabla de la 1ª.

**Y cada locke elige.** De la 1ª a la 5ª (y en un fangame sin base), en
*Editar datos* sale "Tipos: los de su generación / los de ahora": hay grupos que
juegan los combates con los tipos del juego y otros con los de hoy. Se guarda en
`Competition.tipos` y lo resuelve `generacionDeTipos()` (vacío es lo de cada
juego: los antiguos, o los de ahora en un fangame sin base, cuyos "antiguos"
son los de la 5ª). Manda en los tipos de Equipo y PC y en la cobertura de Mis
notas, que sigue teniendo su casilla para mirar la tabla de ahora por encima.

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

**Planificar equipo: la misma calculadora, con tu caja y la otra cara.** Se
pensó en una pantalla aparte, pero ya estaba casi todo aquí: lo que faltaba era
no tener que escribir los nombres y ver también el ataque. Los pokémon que se
ofrecen son **solo los tuyos y vivos** (la caja es privada), y lo que se elige
va a los mismos huecos de siempre, así que se guarda igual. Al principio salían en
una fila que se recorría de lado, y con una caja llena no se encontraba a
nadie: ahora tocar un hueco abre una ficha (`Hoja`) con todo a la vista en
cuadrícula, como el PC, agrupado por equipo y caja, con buscador y la Pokédex
debajo; sustituye al buscador que había en cada hueco. Los seis huecos van
arriba y fijos: el marcado es donde cae el próximo, y salta al siguiente libre
para poder meter varios sin cerrar. La cobertura
ofensiva (`coberturaOfensiva` en `lib/tipos.ts`) cuenta **solo los tipos del
pokémon**, como si cada uno llevara un ataque de cada uno de sus tipos: no se
apuntan movimientos, y la pantalla lo dice. Es una pista para ver huecos, no un
cálculo de combate. El enlace de Equipo y PC es `/notas?planificar=1#cobertura`:
el parámetro despliega el `<details>`, que plegado no deja saltar al ancla.

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

### Tres molestias de entrar y volver

**La sesión caduca a los 30 días sin entrar, no a los 30 de iniciarla.** Antes
se firmaba al entrar y ya no se tocaba, así que a cada uno le echaba un día
cualquiera a mitad de locke aunque la usara a diario. Ahora `src/proxy.ts` (lo
que en Next 16 sustituye al middleware) la vuelve a firmar cuando tiene más de
un día: cada día que se entra, otros 30 por delante. Una vez al día y no en
cada petición, para no mandar una cookie nueva con cada toque. Como las
sesiones no se pueden anular una a una, **una sesión robada vive mientras se
use**; antes vivía como mucho un mes. Si algún día hace falta echar a alguien,
lo suyo es guardar en la cuenta una "versión de sesión" y subirla al cambiar la
contraseña.

**Después de entrar se vuelve a donde se iba.** Quien abría un enlace sin
sesión acababa en la portada tras meter la contraseña. Las páginas no saben en
qué dirección están, así que el proxy la apunta en una cabecera,
`requireUser` la pasa al login en `?volver=` y el login lleva ahí. **Solo si es
de esta aplicación** (`destinoSeguro` en `lib/volver.ts`): la URL la escribe
cualquiera, y sin ese filtro el login serviría para mandar a la gente a otra web
justo después de meter la contraseña.

**Al volver a la aplicación se traen los cambios.** Instalada en el móvil no se
cierra: se queda de fondo y al volver enseñaba lo de hacía horas hasta cambiar
de pestaña. `estado-conexion.tsx`, al volver a estar visible tras más de 30
segundos fuera y con línea, sube lo que quedara en la cola y hace
`router.refresh()`, que trae los datos **sin recargar**: lo que se estuviera
escribiendo sigue ahí. Menos de 30 segundos (ir a WhatsApp a copiar algo) no
merece una ronda de consultas.

### La tarjeta del resumen: de los level caps al final

La primera tarjeta del resumen enseñaba el level cap que tocaba… y cuando ya no
quedaba ninguno **se quedaba congelada en el último para siempre**, repitiendo un
número que ya no le decía nada a nadie. Ahora, con todos superados, esa tarjeta
cambia de tema y pasa a ser la del final del locke.

Lo que enseña depende de quién mira, que es la gracia:

- **Si tienes llave por jugar**, tu rival con su foto: *"Álex · Tu rival · Por
  el locke"*. Cada uno ve el suyo, igual que la medalla te decía qué gimnasio
  tenías delante.
- Si tu rival **aún no se sabe** —falta que se juegue el cruce de abajo—, el
  hueco tal cual: *"Ganador de 3º-6º"*.
- Si **no estás en el cuadro** o el cuadro no está sembrado, en qué anda la cosa.
- **Acabado el locke**, el campeón con su foto.

Y tiene **su propio cartel de imágenes**, como las medallas de un gimnasio: se
suben desde la pantalla del final (`🖼️ Imágenes de Final Four`) y se alternan de
fondo. La foto del rival manda sobre el cartel cuando hay rival: es lo que hay
que mirar.

Tres decisiones que no se ven:

- **El cartel vive en `Competition.finalImages`, no en `FinalFour`.** La fila del
  cuadro no existe hasta que se siembra, y las imágenes se quieren poder poner
  antes —justo cuando la tarjeta empieza a enseñarlas—.
- **La tarjeta no cambia si no hay final que mirar**: en un locke en solitario, o
  sin jornadas jugadas, se queda el último hito. Sin eso, quien juega solo vería
  una "Final Four" que no existe.
- **`getFinalFourState` se pide siempre en el resumen**, aunque casi nunca haga
  falta: va en la misma tanda que todo lo demás, así que **no cuesta una ida y
  vuelta más** (medido: las mismas seis tandas), y por dentro reaprovecha
  `getStandings`, que esa página ya pide.

### El aspecto nuevo, de prueba y al lado del de siempre

El usuario pidió probar un look "que no se note tanto que está hecho con IA"
**sin perder el de siempre**. Lo que delataba la pinta de plantilla era el
cristal esmerilado con halos de colores de fondo, todo en píldoras redondas,
los emojis como iconos y la letra del sistema. El aspecto nuevo va de
**marcador deportivo**: Barlow Condensed en títulos, rótulos y cifras (Barlow
en el texto), tarjetas planas sin sombra ni desenfoque, grises neutros en vez
del azul marino y el color del tema solo en los acentos, títulos de página
grandes en mayúsculas, rótulos de sección con una tilde de color, botones con
canto de tecla e iconos de línea (Lucide) en los menús.

**Cómo está montado, para poder quitarlo de un tirón**:

- Se elige en *Mi perfil → Personalizar → Aspecto* y se guarda en una **cookie del
  dispositivo** (`lib/estilo.ts`, `actions/estilo.ts`), no en la cuenta: es una
  prueba, y así no toca la base de datos.
- El `<html>` lleva `data-estilo="clasico"` o `"nuevo"`, y **todo el aspecto
  nuevo vive en `globals.css`** bajo ese atributo: un bloque al final y, dentro
  de cada utilidad (`card`, `btn`, `chip`…), su versión con
  `:where(html[data-estilo="nuevo"]) &`. El `:where()` es para no ganar
  especificidad: una tarjeta que lleva su propio `bg-emerald` (un gimnasio que
  han pasado todos) tiene que seguir mandando igual que en el clásico.
- Casi todo sale de **cambiar variables** y no clases: las de letra
  (`--font-sans`), esquinas (`--radius-*`), grises (`--color-slate-*`) y
  superficies (`--color-ink-*`). Las superficies llevan `!important` porque el
  tema las pone en el `style` del `<html>`, que si no ganaría; se mezclan con un
  pelo del acento del tema para que cada juego siga notándose.
- Los iconos del menú se pintan **dobles** (`components/icono.tsx`): el emoji
  y su icono de línea, y el CSS esconde uno según el aspecto. Así ningún
  componente tiene que saber qué aspecto lleva quien mira.
- Unos pocos ganchos sin estilo propio en el clásico: `.logo`, `.logo-marca`,
  `.pastilla[data-encendida]` en la barra del móvil, `.boton-apuntar`, y
  `tabular-nums` en las cifras de la portada.
- Las letras vienen de `@fontsource` y se importan en el layout raíz: un
  `@font-face` que ningún texto usa no descarga nada, así que al clásico no le
  cuestan.

**Gustó, y es el de todos desde el mismo día.** `getEstilo` devuelve `"nuevo"`
si no hay nada elegido, y **la cookie cambió de nombre** (`hexaapp_estilo` →
`hexaapp_aspecto`) para que nadie se quedara en el clásico por lo que pulsó
probando. El clásico sigue elegible en Mi perfil como *Clásico*. Si algún día
se quiere quitar del todo, se borra el bloque final de `globals.css`, los
`:where(html[data-estilo="nuevo"])` de las utilidades, `components/icono.tsx`
(volviendo a pintar `item.icon`), `lib/estilo.ts`, `actions/estilo.ts`, la
sección *Aspecto* de Mi perfil y los paquetes `@fontsource/*` y `lucide-react`
—eso era quitar el nuevo—; para quitar el clásico, al revés: dejar las reglas
del nuevo sin la condición y borrar los emojis de `components/icono.tsx`.

### La pantalla de carga

Al tocar una sección, la pantalla de antes se quedaba quieta hasta que llegaba
la nueva —con Neon por internet, un segundo largo en el móvil—, y parecía que
no se había tocado nada. `src/app/(app)/loading.tsx` enseña **al momento** un
esqueleto gris con la forma de una página (título, cuatro cifras y una tarjeta
con filas) que late despacio hasta que llegan los datos. El menú y la cabecera
no se mueven, porque son del layout.

Es **una sola para todas las secciones**: la forma es la de casi todas, y una
por pantalla sería mucho que mantener. En las que no se parecen (el mapa, la
ruleta) se puede poner un `loading.tsx` propio en su carpeta, que manda sobre
este. El latido respeta a quien pide menos movimiento (`motion-safe:`).

Para verla en local hay que simular la lentitud: con `LATENCIA_FALSA=250` en
`npm run start` cada consulta tarda un cuarto de segundo y el esqueleto se ve.

### La papelera de jornadas, el registro de errores y el tema fuera de la página

**La papelera no marca la jornada como borrada: la copia y la borra.** Marcarla
(una columna `borradaAt`) obligaba a filtrarla en todas las cuentas que leen
jornadas —clasificación, MVP, marcador, final, actividad— y un olvido en una
habría sido un fallo silencioso. En vez de eso, `lib/papelera.ts` guarda en
`JornadaBorrada` todo lo que se lleva el borrado en cascada (combates, equipos,
royales y puestos, votos, puntos de esos combates) y luego borra de verdad.
Devolver la vuelve a crear **con los mismos ids**, así que lo que apuntaba a
ella cuadra solo; se comprobó con una huella de todas esas tablas antes de
borrar y después de devolver: idéntica. Dos cuidados: los equipos se piden con
sus imágenes (que `lib/db.ts` omite siempre), y si alguien que jugaba ya no
está en el locke, no se devuelve y se dice por qué.

**El registro de errores apunta dos cosas**: lo del servidor, con el gancho
`onRequestError` de Next en `src/instrumentation.ts` (pantallas, acciones y
rutas de /api, con quién por su cookie), y lo del navegador, con
`CazadorDeErrores` (errores sueltos y promesas sin recoger) y la pantalla de
error de `(app)`, que manda lo que se rompe al pintar si no tiene `digest` (con
`digest` ya lo apuntó el servidor). Con freno: unos pocos por visita, nada sin
cobertura, solo con sesión, y fuera el ruido (extensiones, cortes de red,
`NEXT_REDIRECT`…). Se queda en 30 días y 500 filas.

**El logo lleva el tema.** La media ball se pintaba con colores fijos, así que
con Dinotren o con Rojo seguía saliendo añil en la cabecera y al refrescar.
`lib/logo.ts` sigue siendo la única copia del dibujo, pero ahora recibe los
colores: dentro de la app van `COLORES_DEL_TEMA` (variables del tema, por eso
los colores van en `style` y no en atributos, que no entienden `var()`), los
iconos de instalar siguen con los fijos, y el de la pestaña sale de ahí mismo
con los hex del tema. **Tirar para refrescar** pasó al layout: está en todas
las pantallas, menos encima de una ficha, del mapa al editarlo, de un texto
largo o de un desplegable.

**El tema fuera de la página.** El color de la barra del móvil llega ya en el
HTML (`generateViewport` del layout raíz, con el tema de la cuenta), para que
no se vea negra y luego de color; `TemaEnElSistema` la mantiene al día al
probar temas y pinta el icono de la pestaña, que no se puede servir por tema
sin un fichero por cada uno. El color de la barra es el fondo con un 28 % del
acento: que se note el tema sin que grite más que la pantalla.

**La transición entre pantallas es CSS sobre `(app)/template.tsx`**, que Next
vuelve a montar al navegar. Anima cada bloque de la pantalla al aparecer, así
que vale igual para la de carga y para la de verdad cuando llega. Con
`animation-fill-mode: backwards` a propósito: al acabar no queda ningún
`transform`, que si no todo lo `fixed` de dentro (avisos, el fantasma de
arrastrar) se colocaría respecto al bloque.

### Cosas solo del ordenador

**Pegar y arrastrar imágenes** (`components/soltar-y-pegar.ts`). Quien
administra sube casi todas las imágenes, y lo normal es tenerlas en el
portapapeles (una captura de pantalla del juego) o en el escritorio. Pegar no
va a ningún campo en concreto, así que los campos de imagen montados se apuntan
en una lista y la imagen va al que tiene el ratón encima, el que tiene el foco,
el último que se tocó o, si solo hay uno a la vista, ese; si no está claro, a
ninguno. Un pegado sin imagen (texto) ni se toca.

**Dos cajas a la vista** en Equipo y PC desde `xl`. Con CSS y no con
JavaScript, para que no salte de una a dos al cargar. Lo delicado fue el
arrastre con el dedo: la casilla del pokémon cogido **no puede salir de la
página** al cambiar de caja (los toques van al elemento donde empezó y se
perdían). Por eso se pintan, cada una con `key` su número, la caja que se ve,
la de al lado y **la del pokémon cogido aunque ya no se vea** (escondida), en
el orden de su número y colocadas con `order` de CSS: si React las
recolocara, movería la casilla por la página y se perdería igual. Sustituye al
"marcador escondido" de antes, que solo valía con una caja.

**La ficha rápida de la clasificación** (`lib/ficha-rapida.ts`) usa **solo lo
público**: el equipo del último combate o de la final, nunca el de Equipo y PC
(privado fuera de un Soul Link). Por eso no reutiliza `getUltimoEquipo`, que sin
combates tira de la caja: allí vale porque lo usa el propio jugador. Se pide al
pasar el ratón (con 350 ms de espera, para no disparar una por fila al cruzar
la tabla) y se guarda para el resto de la visita. Solo con ratón: en táctil no
hay "pasar por encima" y tocar el nombre ya lleva al perfil.

### Los lockes de la gente, fuera de la vista del Creador

El Creador puede abrirlos todos (para supervisar y cazar problemas), y eso no
cambia; lo que cambia es **dónde salen**. `listCompetitions` marca cada uno con
`mio` —lo juega, lo mira o lo creó—: el selector del layout enseña solo los
suyos más el que esté mirando, y Ediciones pone los demás en un `<details>`
aparte. Tampoco salen en la lista de «qué archivar» al crear uno nuevo, que era
la misma trampa de antes (archivarle los lockes a la gente sin querer). Para
cualquier otra cuenta todos son `mio`, así que no le cambia nada.

**Un locke pedido es de quien lo pidió.** Al aceptar una solicitud, el locke se
guardaba con `createdById` de **quien la aceptaba**, así que al Creador le
contaban como suyos todos los que aprobaba. Ahora se guarda a nombre de quien la
pidió; y para los que ya estaban mal, `listCompetitions` mira las solicitudes
aceptadas (`LockeRequest.competitionId`): si el locke salió de la de otra
persona, es de esa persona (`deQuien`), sin tocar los datos.

### El selector de lockes no puede ir en un `<form>`

El selector cambiaba de locke enviando un formulario, y **desde React 19 un
formulario se vacía solo al terminar su acción**: el `<select>` volvía a la
opción con la que se pintó (o a la primera), así que la pantalla era de un
locke y el selector decía otro, y elegir ese otro no hacía nada porque para el
navegador ya estaba elegido. Se notaba sobre todo al venir de supervisar uno
ajeno, porque además desaparece el grupo «Supervisando» y se rehace la lista.
Ahora el selector está atado al locke de verdad (`value`, no `defaultValue`) y
llama a la acción directamente, sin formulario. **Cuidado con cualquier
`<select>` o campo que deba conservar su valor dentro de un `<form action>`**:
le pasará lo mismo.

Y sin ningún locke elegido (sin la cookie), el Creador entraba en **el más
nuevo de cualquiera**, aunque fuera de otra persona: ahora entra primero en el
más nuevo de los que juega o mira.

### Shiny

**`Capture.shiny`** guarda si lo es. Antes la casilla «Shiny» del buscador solo
bajaba el sprite variocolor y no quedaba apuntado en ningún sitio, así que no
se podía enseñar ni cambiar. Al capturarlo se guarda; después, `cambiarShinyAction`
lo vuelve shiny (o se lo quita, si se marcó sin querer) bajando el sprite que
toca, y va en la foto de deshacer (`CAMPOS`) y en `Capture.historia` como
`{ tipo: "shiny" }`, así que «Deshacer» lo quita también de su historia.
Evolucionar baja el sprite shiny de la forma nueva si lo era.

### Un locke sin empezar

**`Competition.sinEmpezar`, y al empezar se mueve `startedAt`.** La duración del
locke (el resumen del hall, el «desde…» de la portada) sale de `startedAt`, así
que lo más simple y que no deja cabos sueltos es que empezar lo ponga en ese
día, en vez de llevar la cuenta de los días que estuvo parado. **No bloquea
nada**: se puede apuntar y preparar todo mientras tanto; solo dice que no ha
empezado. La acción solo cambia algo si el estado cambia de verdad, para que un
doble clic en «Empezar» no mueva la fecha de un locke ya en marcha.

### Gritos, la entrada al hall y la historia de cada pokémon

**Los gritos salen de PokéAPI, pero pasan por casa.** El repositorio de gritos
de PokéAPI los tiene en Ogg Vorbis, y Safari del iPhone no siempre los lee.
En vez de meterle un decodificador al navegador, `/api/grito/[estilo]/[id]`
los baja, los **convierte a WAV en el servidor** (a 22 kHz, que para un grito
sobra) y los sirve con caché de un año: la red de Vercel los guarda y cada
grito se convierte una vez en la vida de la aplicación. El service worker los
guarda con las imágenes, así que suenan sin conexión. **Ojo: no todos son lo que
dicen**: el de Pikachu es un MP3 con extensión `.ogg`; se mira la cabecera y lo
que ya es MP3 o WAV se sirve tal cual. `clasico` son los de hasta la 5ª (solo
existen de ahí para abajo; para los nuevos se sirve el actual).

**Suenan con Web Audio y no con `<audio>`**, por el iPhone: Safari solo deja
sonar algo que arranque dentro de un toque, y la evolución grita al final de la
animación, segundos después. Con Web Audio basta **desbloquear el sonido una
vez** con un toque cualquiera (`GritosDelLocke`, en el layout, escucha todos) y
luego suena lo que sea. Por eso la entrada al hall **no arranca sola**: se
ofrece con un botón, que es el toque que deja sonar los gritos. La preferencia
va en `localStorage` porque es cosa del aparato, no de la cuenta.

**Un pokémon no tiene un número que lo siga por la aplicación**: la captura, los
equipos de cada combate, la baja y el hall se apuntan cada uno por su lado. La
historia los une por **el mote y la familia de evolución** (`esElMismo` en
`lib/historia.ts`, con sus pruebas): Chispas el Cyndaquil de la captura es
Chispas el Typhlosion del hall. Sin mote no se puede distinguir dos Zubat del
mismo jugador, así que uno sin mote solo se reconoce en equipos que tampoco le
pusieron. Lo único que **no se podía sacar de ningún sitio** eran las
evoluciones, y por eso `Capture.historia` (JSON, por defecto `[]`): cada
evolución se apunta ahí y **va en la foto de deshacer**, así que «Darle a la B»
la borra también de la historia. Las evoluciones de antes de esto no constan.

**Lo de la caja no se filtra por la historia, ni al administrador.** Los
equipos de las jornadas los apunta quien administra, a mano, y el editor no
mira las capturas de nadie. La historia une una cosa con otra **al leerla**, sin
guardar ningún enlace, y lo que sale de una caja privada (dónde se capturó,
qué era, cuándo evolucionó, cuántos días lleva) solo se usa si quien mira es su
dueño o es un Soul Link. Para los demás —el Creador incluido— la captura **ni
siquiera se usa para reconocer al pokémon**: se le busca solo con su baja o su
casilla del hall, que ya son públicas. Pedir a mano la historia de una captura
ajena lo rechaza el servidor.

**La historia se pide al abrir la ficha**, con `historiaAction`, y no con la
página: son varias consultas que solo interesan del pokémon que se mira. El MVP
sale de `getMvpStates`, la misma cuenta que la pantalla de jornadas.

### Detalles de app del móvil: fichas, refrescar y pantallas vacías

- **Las fichas son una sola pieza** (`components/hoja.tsx`) y no una ventana
  copiada en cada pantalla: en el móvil sube desde abajo con su asa y se
  cierra arrastrándola, en el ordenador sale centrada como antes. El arrastre
  solo empieza con la ficha subida del todo, así que su scroll de dentro sigue
  funcionando. Va en z 65, por encima del ＋ y de la barra, que antes tapaban
  el final de las fichas largas; y cuenta cuántas hay abiertas para que al
  pasar de una a otra (del grupo del mapa a su zona) no se suelte el scroll de
  la página con la nueva encima. La del hall (la celebración) se quedó como
  estaba: es un cartel, no una ficha.
- **Tirar para refrescar** usa `router.refresh()`, que trae los datos sin
  recargar y no pierde lo que haya a medio escribir. Apaga el del navegador
  (`overscroll-behavior`), que si no recargaba la página entera por encima, y
  se aparta cuando el tablero ya ha cogido un pokémon: ese `touchmove` le llega
  con el `preventDefault` hecho. Solo en la portada y en Equipo y PC, que son
  las que cambian mientras se miran.
- **Los dibujos de lo vacío** son SVG a mano (`components/dibujo-vacio.tsx`),
  todos en el mismo lienzo y trazo, con el color del tema en los acentos.
  `EmptyState` elige uno con `dibujo`; sin decirlo, una ball.

### Rematar el aspecto: emojis e iconos, y restos del estilo antiguo

Con el aspecto nuevo de todos quedaban dos cosas que lo delataban: **los emojis
de color dentro de las pantallas** (🏆 Terminado, 🏳️ Dar por retirada, 🥇 en la
tabla…) al lado de los iconos de línea del menú, y **piezas que seguían con el
azul marino del clásico**.

- **Todos los emojis que hacen de icono pasan por `components/icono.tsx`**, el
  mismo del menú: pinta el emoji y su icono de línea, y el CSS de cada aspecto
  esconde uno. El clásico sigue con sus emojis. El mapa de emojis a iconos está
  ahí, y **cada icono puede llevar su color**, para los que dicen algo con él:
  oro, plata y bronce en las medallas, dorado en la corona y el trofeo, rojo en
  el wipeo, verde en "en curso". Por defecto mide como la letra de alrededor
  (`1.15em`), para ir dentro de un texto.
- **Los que vienen de datos** —el icono de cada entrada de la actividad, de cada
  tipo de combate, de cada apunte pendiente, de las salidas del locke, las
  medallas del podio— se siguen guardando como emoji y se pasan por `Icono`
  **donde se pintan**. Así una lista nueva de iconos no obliga a tocar datos.
- **Se quedan en emoji a propósito**: el icono que cada uno elige para sus
  títulos (es suyo), los textos de `title`, las confirmaciones y las etiquetas
  pintadas dentro de la rueda de la ruleta (no admiten iconos), las opciones de
  un `<select>` (el navegador no pinta nada que no sea texto) y la muestra del
  aspecto clásico en Mi perfil. Los símbolos tipográficos (✕ ✎ ✓ ▸ →) también
  se quedan: son de un color y ya casan con el trazo.
- **Restos del estilo antiguo**: la casilla del nivel de un gimnasio sin imagen
  pasa a ser una baldosa de marcador con su rótulo "Nivel" (`.casilla-nivel`);
  la rueda de la ruleta y las chapas del mapa usaban el azul marino escrito a
  mano y ahora toman `--color-ink-*`; la etiqueta del tipo de combate deja de
  ser píldora (`.etiqueta-formato`); la página de error y la de sin conexión
  pasan al fondo y las mayúsculas del aspecto nuevo; y la hoja del menú del
  móvil redondea como el resto (`--radius-3xl`).
- Las ventanas emergentes siguen con el fondo desenfocado detrás: ahí tiene
  sentido, es lo que dice que están encima.
- Dos fallos que salieron al mirarlo: en una jornada con votación de MVP el ✕
  de borrarla se caía solo a una línea aparte (la cabecera dejaba saltar de
  línea a sus hijos), y en la barra del móvil, con un grupo abierto, quedaban
  **dos pestañas encendidas**. Ahora, con la hoja abierta, solo se enciende la
  suya.

### El logo de la aplicación: la media ball

Se propusieron siete logos y el usuario pidió **fusionar el de siempre** (un
hexágono de contorno con un punto) **con la "captura hexagonal"** (una ball de
captura con forma de hexágono). De las tres fusiones eligió la **media ball**:
arriba la mitad rellena de la ball, con degradado; abajo el contorno hueco del
original; y el punto del original hace de botón.

- **Hay una sola copia del dibujo**, `lib/logo.ts`, que da el SVG como texto.
  De ahí salen el componente `components/logo.tsx` (cabeceras del móvil y del
  PC, pantalla de entrar e instalación) y **`scripts/iconos.ts`**, que genera
  `src/app/icon.svg`, `favicon.ico` (16, 32 y 48, PNG dentro de un .ico),
  `apple-icon.png` y los `public/icons/icon-*.png`. Si cambia el logo: se
  cambia `lib/logo.ts` y se lanza `npx tsx scripts/iconos.ts`.
- Cada logo de una página lleva **su propio `id`** para el degradado: la
  cabecera del móvil y la del PC están las dos en la página (una escondida), y
  con el mismo nombre el de la escondida podía dejar al otro sin color.
- **Los iconos van como archivos de `src/app`**, no en `metadata.icons`: con
  `icons` puesto en el layout, Next dejaba de enlazar el `icon.svg` y la
  pestaña se quedaba con el .ico. El de iPhone pasó de
  `public/icons/apple-touch-icon.png` a `src/app/apple-icon.png` por lo mismo.
- Los de instalar llevan ahora **fondo transparente** fuera de la baldosa
  (los de antes tenían las esquinas en blanco), y los *maskable* y el de iPhone
  van a sangre con el logo más pequeño, para que el recorte del móvil no se lo
  coma.
- La página de sin conexión y la portada de las dos guías llevan el SVG
  pegado, porque son HTML suelto. Por la de sin conexión **se subió el service
  worker a v4**: si no, el móvil seguía con la copia guardada con el hexágono de
  antes.
- El color de la barra del sistema (`themeColor`, y el del manifiesto) pasó al
  fondo del aspecto de ahora, `#0b0b0e`.

### El logo de cada edición

El grupo se está haciendo logos para cada competición, y el usuario pidió
ponerlo **de fondo junto al nombre de la edición** en el resumen. Es una imagen
suelta en `Competition.logo`, dada de alta donde todas (`FUENTES` y
`TipoImagen`, las listas del reparto y de la ocupación, y `SIN_IMAGENES` para
que no viaje en cada consulta de la competición), y se sube desde *Ediciones →
Editar datos*, reducida en el navegador a 640 px en WebP, que **conserva la
transparencia** de un logo recortado.

La pinta la cabecera de página (`PageHeader`, prop `fondo`): a la derecha,
**fundida hacia la izquierda** con una máscara para que el título pase por
encima y se siga leyendo, y a un 45 % de opacidad. Con logo la cabecera guarda
un alto mínimo para que se vea entero, centra el título en ese alto y baja la
etiqueta de *Terminado / En curso* debajo del subtítulo, porque a la derecha se
montaba encima de la imagen. Sin logo no cambia nada.

**En el móvil el texto se aparta del logo.** Con el logo de fondo y el texto a
todo el ancho, los títulos y subtítulos largos pasaban por debajo (el subtítulo
del Hexalocke 2 a 360 px, 71 px; el título del Soulink 1 a 430 px, 51 px). Por
debajo de `sm` el logo es un `<img>` **flotando a la derecha** dentro del bloque
del texto, y el texto lo rodea según lo que ocupa el dibujo de verdad, que
puede ser alto (Papyrus) o ancho (MEGA Añil): con un hueco fijo, a unos les
sobraba y a otros les faltaba. `shape-outside: inset(0 0 0 15%)` deja que el
texto entre solo en su borde izquierdo, que la máscara deja casi transparente.
Desde `sm` sigue el `<span>` de fondo de siempre, que allí no estorba.

### Flechas, coronas y reglas que avisan

Tres ideas que eligió el usuario de una ronda de propuestas, las tres hechas
con datos que ya se guardaban.

**Las flechas de la clasificación** comparan el puesto de ahora con el de al
acabar la penúltima jornada jugada, y salen de las mismas fotos que la gráfica
(`movimientosEnLaTabla` en `lib/grafico-clasificacion.ts`). Dos cuidados: el
puesto de antes se ordena **exactamente como la tabla**, desempate por nombre
incluido, porque si no dos empatados que no se han movido llevarían flecha; y
se cuenta **solo entre los que siguen**, para que una retirada no haga subir a
todos los de debajo sin haber jugado. Con una sola jornada no hay flechas:
antes de la primera estaban todos empatados y dirían que todo el mundo ha
bajado. Quien se queda igual no lleva nada; una columna de "=" no dice nada.

**La corona** sale de la fecha de cada marca de gimnasio (`lib/coronas.ts`).
Si dos lo marcan en el mismo instante, corona para los dos. Cuenta aunque luego
se retirara: fue el primero igual. En solitario no hay corona, que siendo uno
sería primero siempre. Si alguien desmarca y vuelve a marcar, vale la fecha
nueva: si lo marcó por error, no se lo había pasado.

**Las reglas que cambian** guardan cuándo (`cambiadaAt`), quién (para no
avisarle a él) y **lo que decían antes del último cambio** (`tituloAnterior`,
`textoAnterior`). No sirve `updatedAt`, que también se mueve al reordenar.
Tres decisiones:

- **Solo cuenta con el locke en marcha** (hay una jornada o alguien se ha
  pasado un gimnasio, ver `lib/reglas.ts`). Antes, las reglas se están
  montando, y avisar de cada una llenaría de puntos a todo el mundo antes de la
  primera ruta. Copiar reglas de otra edición tampoco avisa.
- **Al editar hay una casilla, marcada, de "avisar a todos"**. Se quita para
  corregir una errata, que no es una regla nueva.
- Lo que se enseña es **qué líneas ganó y perdió** la regla —una línea
  retocada sale como una quitada y otra añadida, que es como se cuenta un
  cambio de reglas—, y debajo, plegado, el texto de antes entero. Solo se
  guarda **el último** texto anterior: si cambia dos veces, el primero se
  pierde. Para un grupo de amigos basta; si hiciera falta el historial
  completo, sería una tabla aparte.

El punto de novedades era **solo de grupo** y para esto no bastaba: el de "La
edición" se apaga al entrar en la clasificación, y la regla se quedaba sin
leer. Ahora hay **apartados con punto propio** (`APARTADOS_CON_AVISO` en
`lib/novedades.ts`), que llevan su visita aparte en `TabSeen` con el rótulo del
menú como nombre, encienden también el de su grupo y se pintan en el menú del
PC y en la hoja del móvil. De momento solo *Reglas*; otro apartado entra
añadiéndolo ahí y a la consulta.

### El cuarto repaso: entrar con cada papel

Los repasos anteriores miraban las pantallas con una sola cuenta. Este entró con
**cinco** —Creador, jugador, retirado, con el locke perdido y espectador— y en
**lockes raros** creados desde la propia interfaz: uno vacío, un dualocke y uno
en solitario. Ningún papel da errores ni pantallas rotas; lo que salió fueron
cosas que se le enseñaban **a quien no le tocaban**:

- **La portada no se enteraba de que el locke había terminado** (estaba en
  pendientes desde el tercer repaso). Con campeón pone *🏆 Terminado*, y la
  tarjeta de la próxima jornada, que pedía crear otra, enseña al campeón y
  lleva al hall. Con el cuadro en juego, lleva al cuadro.
- **"Crea una jornada nueva" se le decía a todo el mundo**, espectadores
  incluidos. Ahora solo a quien puede crearla; al resto, que ya saldrá.
- **Al espectador se le ofrecía escribir notas** que el servidor luego le
  rechazaba, y en la ruleta se le decía que pidiera un ticket que nadie le puede
  dar. Ahora se le dice de entrada que está mirando, como ya hacían el mapa y la
  bolsa. En la portada, su enlace a la ruleta dice *Ver* y no *Girar*.
- **Líder con empate**: con todos igualados salía de líder el primero de la
  lista, así que un dualocke recién creado ya tenía líder con 0-0. Si los
  desempates (puntos, caídos, diferencia) no deshacen el empate de arriba, la
  tarjeta dice *Empate*.
- **Copiar jugadores de un locke que no cabe**: de uno de seis a un dualocke se
  copiaban los dos primeros por orden de alta **sin avisar**, y un organizador
  acababa con uno de más porque su propia ficha no contaba. Ahora, si no caben,
  no se crea nada y se explica por qué.
- **"Ha superado a Liga Pokémon"**: la actividad ponía "a" delante de cualquier
  hito. Los que son cosas y no personas llevan su artículo ("la Liga Pokémon",
  "al Alto Mando", "la Gran prueba de Kaudan"); se decide por cómo empieza el
  nombre, y lo que no encaje sigue con "a".
- En la tarjeta de jugadores se distinguen **retirados y lockes perdidos**, que
  antes eran todos "retirados".
- En solitario, sin level caps puestos, la portada decía "No queda ninguno" como
  si ya estuviera acabado, y en Level caps salía "nadie sigue hasta que estén
  todas", cuando juega uno.
- `npm run lint` estaba roto: llamaba a `next lint`, que Next 16 quitó, y ESLint
  no está instalado. Ahora comprueba los tipos (`tsc --noEmit`).

**Las plantillas de level caps de fábrica tenían nombres mal en casi todas las
regiones**, y eso se copia a cada locke nuevo: ciudades cambiadas (Aníbal en
Ciudad Olivo, Morti en "Pueblo Ecruteak", en inglés), líderes que son del Alto
Mando (Mento y Fausto como líderes de Sinnoh), Altos Mandos de otra región, y
en Alola los nombres en inglés de capitanes y kahunas (en español son Liam,
Nereida, Zarala, Rika, Kaudan, Mayla, Denio y Hela). Se comprobaron **uno a uno
contra los títulos de WikiDex** y se corrigieron, con Sinnoh en el orden de
Diamante y Perla, que es el de sus niveles. **Lo ya guardado no cambia solo**:
una plantilla que ya se hubiera rellenado o un locke que ya los tenga siguen con
los nombres viejos, y *Rellenar de fábrica* no lo arregla —solo añade los hitos
cuyo nombre no esté, así que un líder renombrado entraría duplicado—. Eso se
corrige a mano. Los datos de ejemplo (Johto) tenían el mismo problema.

**Se miró y está bien**: todas las server actions comprueban permisos, y las que
reciben un identificador sacan el locke **del registro** y no del formulario,
así que el admin de un locke no puede tocar otro.

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

**Los level caps, en camino y con los pasados plegados.** Primero fueron de dos
en dos en pantalla ancha, porque en fila de una la página medía 2825 píxeles.
Luego se cambió por algo mejor: un camino de arriba abajo en el que los
gimnasios que ha pasado todo el mundo se pliegan en una línea. Así mide poco
igual, se lee en orden y lo que queda por hacer es lo que se ve.

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

**Sin locke, bienvenida y no candado.** Una cuenta recién creada veía el menú
entero —doce pantallas— y todas decían "aquí no hay nada tuyo, pide acceso de
espectador", que es lo menos útil para quien viene a jugar; lo único que podía
hacer, pedir un locke, estaba plegado dentro de Ediciones, que ni siquiera
está en el menú. Ahora `NoCompetition` distingue: en la portada (`principal`)
es la bienvenida, y en las demás pantallas un aviso corto que manda al inicio.
El menú sin locke se recorta en el layout y vuelve entero solo en cuanto hay
uno. El rótulo "Histórico" de Ediciones ya no sale cuando no hay nada debajo.

**Los checkpoints de jornada van por orden, no enlazados a una jornada.** Se
marcan en el level cap con un sí/no (`jornadaDespues`) y el primero es la
primera jornada, el segundo la segunda… (`lib/checkpoints.ts`). Guardar qué
jornada es no valía: se ponen al montar el locke, cuando las jornadas aún no
existen. La pantalla de level caps enseña en cada franja qué jornada le ha
tocado, así que si alguien mete una jornada de más se ve al momento. Manda
**el primero que todos han pasado y sigue sin jugar**, no el último: si una
jornada se quedó sin jugar y el grupo siguió, esa se sigue debiendo. Y una
jornada está jugada cuando no le queda ningún combate ni royale sin ganador.

**Archivada es solo lectura, pero comprobado en el servidor.** La primera idea
fue esconder los formularios, y no basta: la cola sin conexión y cualquier
pestaña vieja siguen mandando. Así que va dentro de cada acción de jugador:
`assertCanActForParticipant` lo mira para todo lo que pasa por ella (bajas,
equipos, wipeos, hall, as, favoritos, royales) y el resto usa
`assertPuedeApuntarEn` o `edicionCerradaPara` (capturas, gimnasios y sus
vídeos, MVP, bote del sorteo, gastar objetos, girar la ruleta). **Las notas y
la cobertura de tipos no**: son privadas y no apuntan nada del locke. Quien
administra sí puede, para corregir lo que se quedó mal al cerrarla. En la
pantalla hay un aviso arriba, desaparece el botón de apuntar y **no se enseñan
los formularios** de jugador: cada pantalla lo decide con
`soloLectura(competition, canManage)` —bolsa, mapa, caja, level caps, hall,
ficha, tabla (el as), jornadas (voto y línea del royale), ruleta, sorteo,
cuadro final y el as y los favoritos de Mi perfil—. Los títulos no: son de la
persona, no del locke.

**Deshacer al gastar vive en la bolsa entera, no en la ficha.** Al gastar el
último de algo, la ficha desaparece, y con ella se iba el aviso y el botón de
deshacer; por eso el estado de gastar es uno para toda la bolsa, y la bolsa se
pinta aunque esté vacía. Deshacer borra el apunte del uso —así se va también
del muro— y devuelve una unidad. Un minuto en pantalla, cinco en el servidor:
pasado ese rato lo gastado gastado está, y si hay que devolverlo lo hace la
organización con su apunte.

**La imagen del resumen se dibuja en el servidor con `next/og`** (satori), en
`api/resumen/[id]`, con las letras de la app leídas de `node_modules`
(`outputFileTracingIncludes` en `next.config.ts` para que viajen al desplegar).
Tres cosas con truco: las imágenes se leen de la base de datos y no por
`/api/imagen`, porque satori las pediría sin sesión (`buscarValor` salió de esa
ruta a `lib/imagen-por-tipo.ts` para compartirla); van en WebP y satori no las
pinta, así que se pasan a PNG con sharp; en solitario la imagen es cuadrada
y cuenta días, hitos, zonas y caídos (sin jornadas ni combates que contar), y
el final del locke sale del último gimnasio si no hay combates; y Next no deja `react-dom/server` en
una ruta, así que los seis iconos van con sus trazos copiados de lucide. El orden
del hall y el podio salieron de la página a `lib/hall.ts` para que la imagen y
el hall digan lo mismo. Solo de lockes que quien pide puede abrir, y
`private` en la caché.

**El palmarés es de cada uno.** Antes salía de `listCompetitions`, así que
contaba todo lo que uno puede abrir, y al Creador —que puede abrirlo todo— se le
llenaba de desconocidos: los solitarios de cada uno, los lockes de otros
organizadores. Ahora **la gente** que sale es la de sus lockes (ficha de jugador
o de espectador, y los lockes de antes que jugó o apuntó), y de ella cada uno
quita a quien no quiera ver. **Las cifras de cada persona, en cambio, cuentan
todos sus lockes**, también los que jugó con gente que tú no conoces: el usuario
lo quiso así para comparar entre amigos. De un locke ajeno no se ve quién jugó
ni cómo fue; **solo se enseña algo de él si lo ganó alguien de tu gente**: sale
en la vitrina de esa persona y en tu historial como edición "de fuera",
con su nombre, logo, descripción y juego (también lo pidió el usuario, para ver
con detalle qué han ganado). De su gente solo se nombra al ganador y, si
también es de tu palmarés, al subcampeón o rival; si lo ganó un desconocido, no
sale en absoluto. Quitar a alguien de tu palmarés quita también sus títulos de
fuera del historial. Los logos se sirven como el resto de imágenes —basta con
tener sesión—, así que cargan aunque no estés en ese locke. Se guardan **los quitados** (`User.palmaresOcultos`)
y no los elegidos, para que quien empiece a jugar contigo aparezca solo. El
buscador solo ofrece gente de tus lockes: a un desconocido no se le puede
añadir. Las **categorías** van por tamaño (`categoriaDelLocke`: 1
solitario, 2 dual, 3 o más grupo) porque ganar un Hexalocke de seis no es lo
mismo que un dualocke; se cuentan todas a la vez y las pestañas solo cambian qué
se enseña, sin volver a pedir nada. Un locke en solitario se gana pasándose la
Liga (el hito de tipo Campeón), como en su portada; antes sumaba como jugado y
nunca como ganado.

**Lockes de antes con gente sin cuenta.** De aquellos lockes suele haber
amigos que nunca se registraron, y antes no había forma de apuntarlos; si uno
había ganado, el locke no se podía apuntar con su ganador de verdad. Ahora van
por nombre (`sinCuenta`, `ganadorNombre`, `subcampeonNombre`; `ganadorId` pasó
a opcional) y cuentan para el tamaño del locke, así que uno de seis con cuatro
cuentas es de seis. No tienen fila en ningún palmarés: no hay cuenta a la que
colgársela. **Vincular** es cambiar su nombre por su cuenta al editar; se hace
en el servidor (`montarJugadores`), que pasa también el título si ganó. Al
editar, las cuentas que ya estaban se respetan aunque un organizador no las
tenga en su lista, para no borrarlas sin querer.

**La captura sin conexión va a su locke.** La acción de apuntar sacaba la
edición de la sesión, así que una captura que esperaba en la cola se paraba si
entre medias se había cambiado de locke. Ahora `apuntarCapturaAction` usa el
`competitionId` que la cola guarda con ella, y la seguridad no cambia: sin
ficha de jugador en esa edición no hay mapa, y en una archivada no se apunta.
Las bajas, los gimnasios y las notas ya llevaban su locke dentro.

**Un locke dura hasta que tiene ganador.** El "del … al … · N días" del
resumen (hall e imagen para compartir) acababa en la fecha de archivar, y
reabrir un locke y volver a cerrarlo lo alargaba hasta ese día. Ahora acaba
cuando se decidió el ganador, según cómo se ganó (`cuandoSeDecidio` en
`lib/resumen-del-locke.ts`): el último combate de la final, la jornada que dio
la mayoría en un dualocke (`cuandoSeGanoPorJornadas`, probada; las que se
juegan después por el honor no cuentan), la marcha del penúltimo que quedaba
o, en solitario, el día que se pasó la Liga. Sin ganador, hasta lo último que se
jugó. La fecha de archivar solo sale en el histórico de Ediciones, que es lo que
significa.

**La foto del resumen, sin caché vieja.** Su dirección lleva `?v=` con una
**huella de todo lo que se pinta** (resumen, podio, equipos, nombre y juego de
la edición) y va con `Cache-Control: private, no-cache`. Antes la firma era un
recuento de cuatro cifras y se guardaba cinco minutos, así que al arreglar las
fechas el Hall seguía enseñando la foto vieja con la misma dirección. Si se
añade algo nuevo a la imagen, hay que meterlo en la huella del Hall.

**El logo de un locke de antes es una imagen más.** Va en
`LockeDeAntes.logo` y se trata exactamente como el de una edición: se reduce en
el navegador, se guarda en el almacén (`guardarPorContenido`) y se sirve por
dirección con su tipo propio, `logo-antes`. Por eso está dado de alta en los
cuatro sitios que llevan la lista de columnas de imagen: `SIN_IMAGENES` en
`lib/db.ts` (para que no se cuele en el HTML), `FUENTES` en `lib/imagenes.ts`,
`deduplicar-imagenes.ts` y `ocupacion.ts`. Una columna de imagen nueva tiene
que ir en los cuatro.

**Borrar una cuenta no borra la historia.** La relación del ganador de un locke
de antes borra en cascada, así que borrar su cuenta se llevaba el locke entero
del palmarés de todos. Antes de borrarla, `pasarASinCuenta` lo convierte en
alguien sin cuenta con su nombre (ganador, subcampeón o jugador).

**Juegos en pareja.** El grupo juega los gemelos repartiéndose las versiones
(dos con Rubí Omega y dos con Zafiro Alfa), así que el juego de una edición
puede ser **una pareja**. Las parejas no son una lista nueva: salen de las
plantillas de level caps de dos juegos (`GRUPOS_DE_PLANTILLA`), que son justo
esas, con el mismo id, y copian región, mapas y tema de su primera versión; así
todo lo que ya colgaba del juego (mapa, plantilla, generación, tema) funciona
igual. En el desplegable salen la pareja y la tercera edición; las versiones
sueltas se esconden salvo la que ya tuviera puesta una edición de antes. La
versión de cada jugador sigue guardándose como texto en `gameVersion` (con
pareja, se elige de un desplegable), y el reparto al azar
(`repartirVersiones`) baraja de verdad y sortea también a quién le toca la
versión que sobra con un número impar.

**Juegos no oficiales: la base va en `gameId`.** Un fangame se guarda con
`juegoNoOficial` a verdadero, su nombre en `game` y, si se basa en un juego de
la lista, ese juego en `gameId`. Así todo lo que ya colgaba de `gameId` —región,
mapas del Mapa de capturas, plantilla de level caps, generación de la tabla de
tipos, tema— funciona sin tocarlo, y solo dos cosas miran la marca: **el
nombre** (`nombreDelJuego` enseña el escrito, no el de la base) y **las
versiones** (`versionesDeLaEdicion`: un fangame sobre Rojo y Azul es un solo
juego, no se reparten). Sin base, `gameId` va vacío: no hay mapa (el Mapa de
capturas lo explica en vez de pedir que se elija juego) ni plantilla, y los
level caps se hacen a mano. El formulario lo lee `leerJuego`, el mismo para
crear, editar, pedir y crearse un locke en solitario; las solicitudes guardan
también el nombre y la marca.

**Pruebas de las reglas, dentro del build.** Como cada push a la rama
principal va directo a producción, un cambio que rompiera una cuenta (quién
gana, desempates, retiradas, el cuadro) se descubría a mitad de locke. Ahora
`tests/` tiene ~80 casos inventados con su resultado sabido, y `npm test` va en
el build **entre `prisma generate` y `prisma db push`**: si falla uno, ni se
tocan las tablas ni se compila. Van con el ejecutor que ya trae Node
(`node --test`) y `tsx`, que ya estaba, para no añadir dependencias. Prueban
**las cuentas, no las pantallas**; por eso lo que antes mezclaba cuenta y
consulta se partió en dos, sin cambiar lo que devuelve: `calcularEstadoDeLaFinal`
(dentro de `getFinalFourState`, que ahora pide la clasificación en la misma
tanda), `calcularMarcador`, `decidirCampeon`, `queHacerConElDesempate`,
`combatesPorRetirada`, `contarCombates` y `ordenarClasificacion`. Lo que se ve
se sigue comprobando arrancando la app.

**Quién gana el locke, en un solo sitio (`lib/campeon.ts`).** El usuario lo
dejó claro para el dualocke: **gana quien se lleve la mayoría de las jornadas**
—con 7, el primero a 4; con 6, el primero a 4— y la Jornada Final es el
desempate de un 3-3. Si hay mayoría, el locke **sigue**: se pueden jugar las
jornadas que falten y la final, "por el honor", pero no cambian el campeón. Como
había cinco pantallas decidiendo el campeón cada una a su manera (portada, hall,
cuadro, imagen del resumen y las acciones del hall), ahora todas preguntan a
`getCampeonDelLocke`, que mira en este orden: mayoría de jornadas (solo en el
dual), abandono y final. Devuelve también `quedaPorJugar`: con campeón por
mayoría y la final sin terminar, la portada no pone "Terminado" y enseña el
enlace a la final. El hall se abre en cuanto hay campeón, y si la final se jugó
lo cuenta ("la final, por el honor, fue para Pablo"). El palmarés lo recalcula con
las mismas piezas del marcador (`ganadorDeLaJornada`, `jornadasDelDualocke`),
sin traérselo entero por cada edición. En un locke de más gente que se queda en
dos, la Jornada Final sí decide: la regla de la mayoría es del **dualocke**, no
de quedar dos.

**Campeón por abandono.** En cuanto alguien deja un dualocke —o en un locke de
tres pierden dos— queda uno solo en pie, y no hay final posible: el locke se
quedaba sin campeón para siempre y el hall cerrado. Ahora `getFinalFourState`
devuelve `POR_ABANDONO` con ese uno de campeón (solo sin cuadro generado y con
al menos dos fichas en el locke) y `getCampeonDelLocke` (ver arriba) lo
cuenta como campeón, salvo que el dual ya estuviera ganado por mayoría. El
palmarés lo deduce aparte (sin final, dos o más fichas y una sola sin
`retiredAt`). El podio en ese caso es **solo el campeón**: poner de segundo y
tercero a los que se fueron sería inventarse un orden que no se jugó.

**La final espera a las jornadas previstas.** "Todos los combates jugados" era
verdad con una jornada de seis creada y jugada, y el botón de generar el cuadro
salía. Ahora cuentan también las previstas sin crear; si al final se juegan
menos, se bajan en Ediciones. La acción de generar pregunta al mismo
`getFinalFourState` que la pantalla, para que no se pueda saltar mandando el
formulario a mano.

**Puntos huérfanos.** Los puntos automáticos apuntan a su combate con
`sourceMatchId` **sin clave ajena** (añadirla haría que `db push` avisara de
pérdida de datos y el despliegue se parara). Borrar la jornada entera, quitar
a un jugador del locke o borrar su cuenta se llevaba los combates en cascada,
pero no los puntos: la victoria se iba del V-D y el punto seguía sumando, sin
botón para quitarlo por ser automático. `lib/puntos-huerfanos.ts` los barre
después de cada uno de esos borrados (y de paso los que quedaran de antes).

**Retiradas en un dualocke, en vueltas.** Dar por ganado un combate por
retirada puede dejar la serie 1-1, y entonces hace falta el tercero, que es
otro combate contra el retirado. `resolverRetiradas` llama a
`ajustarDesempate` en cada jornada que toca y repite hasta que una vuelta no
resuelve nada.

**La portada de quien está fuera.** El retirado seguía viendo "Toca jornada ·
tu rival", y su rival le tenía de rival aunque ese combate se gana solo.
`miParteDeLaJornada` recibe quién está fuera: al retirado no se le da parte, al
rival le sale "Por retirada" con la explicación, y al que no tiene combate,
"Descansas".

### El Soul Link: cooperativo, vinculado y con su propia pantalla

Lo pidió un amigo del grupo que iba a jugar un Soul Link en un fangame: un
locke **cooperativo** en el que lo que captura cada uno en una ruta va
**vinculado** con lo que capturan los demás en esa misma ruta, y si muere uno
muere su pareja. Quería ver su equipo y su caja, y los del otro, moverlos y
evolucionarlos.

- **Es un estilo de juego y no un tamaño.** Hasta ahora todo salía de
  `maxPlayers` (uno es solitario, dos dualocke…). Un Soul Link de dos no es un
  dualocke, así que va en `Competition.estilo` y `perfilDeLocke(jugadores,
  estilo)` devuelve `cooperativo` y `sinJornadas` (este último vale también en
  solitario, que es lo que casi todas las pantallas querían preguntar).
- **Editable después de crearlo**, estilo y plazas: el grupo ya había montado
  el locke como dualocke. Lo que hubiera de antes (jornadas, puntos) se queda
  guardado y deja de enseñarse. No se puede bajar de los apuntados ni pasar de
  cuatro en un Soul Link.
- **El vínculo es por ruta y se guarda.** Se pensó en calcularlo al vuelo por
  la zona, pero con capturas extra, fangames sin mapa y rutas escritas a mano
  no vale: cada captura lleva `vinculo` (una clave compartida), se busca solo
  al apuntar (misma zona o mismo texto normalizado) y se corrige a mano. Un
  vínculo del que solo queda uno es como ir suelto, sin limpiar nada. Vale igual
  para 2 que para 4 jugadores.
- **Las capturas son las de siempre** (`Capture`), con su sitio en el equipo o
  la caja (`lugar`, `hueco`) y qué pokémon son de verdad (`pokemonId`, para
  tipos y evoluciones). Así lo del Mapa de capturas entra solo, y el día que
  los lockes normales tengan su caja (privada) no hay que migrar nada.
- **Los huecos nunca se dan por buenos**: `colocar()` resuelve choques, séptimos
  en el equipo y las capturas de antes, que nacieron todas en el hueco 0.
- **Arrastrar sin librería**, con eventos de puntero. Con el dedo hace falta
  una pulsación larga, y para que la página no se desplace mientras se arrastra
  el `touchmove` que lo bloquea tiene que estar puesto **desde el principio**
  en el tablero: si se pone al empezar a arrastrar, el navegador ya ha decidido
  que ese dedo hace scroll. La casilla se mueve al soltar y el servidor
  confirma detrás; si dice que no, vuelve.
- **Deshacer** guarda cómo estaban las capturas tocadas y qué bajas se crearon
  (`CambioDeCaja`), no una lista de operaciones inversas: volver atrás es
  dejarlas como estaban y borrar esas bajas.
- **Sin campeón.** Se supera cuando todos los que siguen se han pasado la Liga,
  y en el palmarés cuenta como ganado para todos, en su propia categoría. Al
  mirarlo salió un fallo viejo: las acciones del hall pedían campeón y en
  solitario no dejaban apuntar el equipo; ahora preguntan `lockeTerminado()`.
- **Segunda parte: el equipo y la caja para todos.** Fuera del Soul Link son
  **privados como el mapa**: la página solo lee las capturas de quien mira
  (`getEquiposDelLocke(…, soloDe)`) y las acciones solo dejan tocarlas a su
  dueño, ni a quien administra (`assertPuedeTocarLaCaja`). La pantalla pasó de
  `/soul-link` a `/equipo` (la vieja redirige). La caída vive en
  `lib/caja-servidor.ts` y no en el fichero de acciones porque un `"use server"`
  convierte en acción todo lo que exporta: sin su permiso delante, cualquiera
  podría llamarla. Así el cementerio usa la misma caída —con pareja y deshacer—
  cuando se elige el pokémon de la caja.
- **Sin línea**, apuntar, mover, evolucionar y dar por muerto van a la cola
  (`directaConCola` para lo que no es un formulario) y se repiten al subir con
  las mismas acciones; deshacer, vincular, el mote y borrar no se encolan
  (`sinConexion` avisa), porque dependen de cómo esté todo en ese momento.
- **La animación de evolucionar no espera al servidor**: arranca al
  confirmar, con la silueta latiendo, y el cambio empieza cuando llega la
  respuesta (con la imagen nueva ya cargada, que no salga a medias). La
  evolución ya está guardada mientras se ve, así que **«Darle a la B» es un
  deshacer** —con `soloSi`, para no deshacer otra cosa si alguien tocó la caja
  entremedias—. Sin línea o con error, se queda en «no ha podido
  evolucionar». Con *reducir movimiento* del móvil va directa al final.
- **Los fondos de las cajas son los de los juegos.** Primero se probaron
  paisajes dibujados a mano y no gustaron; el usuario pasó quince fondos de
  verdad, de la 3ª a la 5ª generación («de ahí en adelante no convencían»).
  Van en `public/cajas/<número>.png` tal cual llegaron (al triple, y pesan
  entre 3 y 11 kB). El slug es el número y no el nombre, para poder
  renombrarlos sin tocar lo guardado; lo guardado de la primera prueba
  («noche», «playa»…) se lee como vacío y sale el de fábrica. La caja tiene
  la forma de las imágenes (162×122) y los huecos van dentro de su marco;
  sobre un fondo no se marca cada hueco, como en los juegos. **Dentro de la
  caja el fondo va apagado** (`APAGADO` en el tablero: 35 % de opacidad sobre
  negro y algo menos de color) y cada sprite lleva una sombra al borde: a todo
  color se comían a los pokémon, sobre todo los claros (Ho-Oh, Reshiram, las
  flores). En el selector se ven a todo color, para reconocerlos.
- **Los pokémon de la caja no se agrandan** y hay aire entre huecos (en % de
  la caja, que escala igual en el móvil y en el ordenador). Se probó a
  dibujarlos un 30 % más grandes que su hueco y, con la caja llena, quedaban
  pegados unos a otros. En el móvil los iconos de tipo van a 9 px, que a 11
  tapaban medio pokémon.
- **Arrastrar por la caja iba a tirones** y por el equipo no. Medido con una
  traza de Chrome: cada casilla llevaba `transition`, y al barrer la caja con
  el dedo el resaltado saltaba por muchas casillas pequeñas que se quedaban
  animándose (unas 120 animaciones en 20 movimientos, frente a 30 en el
  equipo); cada repintado recalculaba las dos sombras desenfocadas de su
  sprite. Ahora las casillas cambian de golpe, el sprite lleva una sola sombra
  casi sin desenfoque, y el fantasma que sigue al dedo **se mueve sin pasar
  por React** (`transform` en su propia capa, tocando el estilo a mano): antes
  cada movimiento volvía a dibujar el tablero entero. Pintar y rasterizar
  bajaron a una sexta y una octava parte. Si se vuelve a añadir algo a las
  casillas de la caja, mejor sin transiciones ni filtros caros.
- **Cambiar de caja arrastrando** tenía dos trampas. Pasar de caja solo se
  comprobaba al mover el dedo, así que quieto encima de la flecha no pasaba
  nada: ahora lo mira el mismo temporizador que desplaza la página. Y con el
  dedo los eventos van al elemento donde empezó el toque: al pasar de caja el
  pokémon cogido dejaba de pintarse, sus eventos ya no llegaban y no había
  forma de soltarlo. Ahora **sigue en la página, escondido y con la misma
  `key`** (React lo mueve en vez de quitarlo).
- **Cuatro cajas mínimo** (`MINIMO_DE_CAJAS`): con una sola no había a dónde
  mover nada. No se guarda nada: `colocar` las pinta siempre.
- **Sin `@unique` en `Capture.deathId`**: una restricción única hace que
  `db push` pida permiso para perder datos y el despliegue se pararía.


**La ficha completa no lleva nivel, y guarda lo de PokéAPI.** El grupo quería
naturaleza, objeto y movimientos, pero el nivel ni opcional: sobra. Se guardan
los identificadores de PokéAPI (`Capture.naturaleza`, `objeto`, `movimientos`),
que son los mismos que usa Showdown y no cambian con la traducción; los nombres
en español salen de `lib/movimientos.json`. El servidor manda la ficha ya
resuelta (nombres y tipos) y la lista entera de movimientos solo se carga al
editar. Con movimientos apuntados, «a qué le pegas fuerte» del planificador
cuenta **sus movimientos de daño** (con el tipo de su generación: Mordisco era
Normal en la 1ª) en vez de los tipos del pokémon.

**De la repetición, no del «Export».** De una repetición no se puede sacar el
Export de los demás, pero el registro del combate (`<enlace>.json`) trae la
vista previa de equipos (`|poke|p1|Garchomp, F|`) y, al salir cada uno al
campo, su mote (`|switch|p1a: Chompy|…`). Con eso basta, que es lo que el grupo
quiere apuntar en una jornada: especie y mote. Lo lee `leerRepeticion` en
`lib/showdown.ts`; sin vista previa salen solo los que llegaron a salir, y se
avisa. Solo se pide a replay.pokemonshowdown.com (`datosDeLaRepeticion`), y
desde el servidor.

**El resultado, también de la repetición.** El mismo registro dice quién ganó
(`|win|`) y quién cayó (`|faint|`), así que *Anotar resultado* tiene **Leer el
resultado**: pone el ganador, la diferencia (los que le quedaban al ganador
menos los del otro, que es cero salvo rendición) y el día (la primera marca
`|t:|`, en hora de Madrid). Los que saca cada uno son los de `|teamsize|`, o los
de `|teampreview|4` si se eligen; un pokémon revivido que vuelve a caer cuenta
una vez. **No guarda nada**: rellena el formulario y se guarda con el botón de
siempre, que es el que comprueba retiradas, series y puntos. Lo difícil es
**quién es quién**, porque el nombre de Showdown casi nunca es el de aquí:
`quienEsQuien` suma pistas —nombre parecido, y pokémon que coinciden con el
equipo apuntado en el combate o con lo capturado, **pesando más el mote que la
especie**— y se queda con el reparto que más tenga. Sin ninguna, va por orden y
el aviso sale en ámbar para que se mire; «Están al revés» le da la vuelta.

**Las repeticiones de Añil, como plan B.** El servidor de Showdown de Añil
(`PepeLePew016/AnilShowdown`) no sube sus combates a replay.pokemonshowdown.com:
los publica como páginas sueltas en Cloudflare Pages
(`https://<proyecto>.pages.dev/replays/<fecha>_<p1>-vs-<p2>_<id>`), en el mismo
formato que «Download replay» de Showdown, con el registro dentro de un
`<script class="battle-log-data">` y las barras escritas `\/`. Así que en un
locke de Añil `leerRepeticionAction` acepta también esos enlaces
(`paginaDeRepeticionDeAnil`): pide la página desde el servidor, saca el
registro (`logDeLaPagina`) y lo lee con el mismo `leerRepeticion`, ahora con
`conAnil` para que Royaleon, Cefireon y lo demás de Añil tengan número. Vale
cualquier proyecto de pages.dev, porque el nombre puede cambiar si el elegido
estaba cogido, pero solo la carpeta `replays/`. Fuera de Añil ese enlace se
rechaza con su mensaje: no tiene sentido en otro juego.

**Showdown, de entrada y de salida.** Se lee el «Export» del Teambuilder
(`lib/showdown.ts`) para meter un equipo en un combate de jornada o un set en la
ficha, y desde el Equipo y PC se escribe al revés (`escribirShowdown`) para
probar combates. Al principio el grupo lo quería solo de entrada; luego pidió
la salida. Se escribe **en el navegador**, cargado con `import()` al abrir la
hoja: es texto puro a partir de lo que ya trae el tablero y no merece un viaje
al servidor. Los nombres en inglés salen de los slugs de PokéAPI con
mayúsculas (más una lista corta de excepciones como «U-turn»), y las especies
de `showdown.json` con unas reglas para las formas que PokéAPI llama de otra
manera; todo comprobado contra los datos de Showdown, y los tests hacen ida y
vuelta con todas las formas y todos los movimientos. Las megas, Gigamax y
formas de combate salen como su especie: la mega la pone Showdown con la
piedra. Los EV e IV no se apuntan en la app, así que no salen. Se lee en el servidor
(`leerShowdownAction`) para no mandar al navegador los nombres de Showdown, y
los pokémon se añaden con la acción de siempre, uno detrás de otro, así que
pasan por los mismos permisos y el mismo tope del formato. Lo que no se
reconoce (un fakemon, un objeto raro) se avisa y no tumba el resto.

**El registro de cambios se escribe a mano en cada acción**, con
`registrar(locke, zona, texto)`, y no con un enganche automático a la base de
datos: así cada línea dice algo legible («Jornada 3, Pablo vs Draka: gana Draka
por 2 (antes ganaba Pablo)») y no «Match actualizado». Se apunta con `after()`,
después de contestar, para no frenar a nadie ni romper lo guardado si falla.
Va sin relaciones con el locke ni con la cuenta, con los nombres copiados,
porque tiene que aguantar que se borren. Los equipos de los combates y lo de
cada uno en su caja no se apuntan: sería ruido.

**«Ver como» baja el papel de verdad, no solo la pantalla.** `getCurrentUser`
devuelve al Creador como jugador mientras está la cookie, y `getMyParticipant`
le quita el mando de sus lockes (o la ficha entera, de espectador), así que
cada pantalla y cada acción se comportan solas como para ese papel, sin
repasarlas. Sigue pudiendo abrir cualquier locke —si no, no podría mirar el de
otro—. Es por papel y no por persona porque «ver como Pablo» enseñaría su caja y
sus notas.

**Animados para todos: los oficiales hasta el #649 y los de Essentials del
#650 en adelante.** El estilo de Blanco y Negro de PokéAPI tiene animados todos
los de los juegos, pero de la 6ª en adelante solo 219 de 376 (de Paldea, 25 de
120): son los que va haciendo la comunidad. Los fangames los tienen todos
porque usan el paquete de Pokémon Essentials «Animated Pokemon System»; nos lo
pasó el grupo (carpetas `Front` y `Front shiny`) y
`scripts/sprites-animados.py` saca de ahí **solo lo que falta** —del #650 en
adelante y las formas (235: regionales, megas, Rotom, Ogerpon…), normal y
shiny— a `public/sprites-animados/`. Se quedan **en tira**, como los trae
Essentials, y `SpritePokemon` los mueve (`TiraAnimada`, 100 ms por fotograma
como los oficiales): un WebP o un GIF animado pesaban de 4 a 7 veces más. Se
mueven **con un temporizador y no con `steps()` de CSS**: al animar
`background-position` en porcentaje el navegador se quedaba a veces entre dos
fotogramas y salían medio uno y medio otro. Con paleta de colores exactos (el
cuantizador de Pillow cambiaba algún color; se comprueba que no cambia ni un
píxel) y oxipng con libdeflater (zopfli apretaba un 10 % más pero tardaba
minutos por tira). **Nueve de cada diez shiny son el mismo dibujo con otros
colores**: de esos no se guarda imagen, solo un JSON de qué color pasa a cuál
(`shiny/<id>.json`, ~135 bytes) y la ficha repinta el normal en un lienzo. Total:
611 tiras normales, 113 shiny enteras y 498 repintados, **8,2 MB** de los 79 del
paquete. Qué forma de Essentials es cada número de PokéAPI
está en `scripts/sprites-animados-formas.json`: se cruzaron los nombres de
forma de Essentials con los de PokéAPI (el orden de PokéAPI no vale: mete las
Gigamax por medio) y se revisaron a ojo. `src/lib/sprites-animados.json` dice
cuáles hay, para no pedir lo que no existe.

**Sprites de la ficha, siempre al estilo de Blanco y Negro.** Hasta el #649
son los de los juegos; del 650 en adelante, los que hizo la comunidad de Smogon
con el mismo estilo, que PokéAPI sirve en la misma carpeta
(`versions/generation-v/black-white`). Del 650 en adelante y en las formas va
primero la tira de Essentials (ver arriba); si algo falla, el animado de
PokéAPI y luego el quieto: los modelos 3D de los juegos de ahora no le gustan
al grupo y no salen. El animado, solo en la ficha
grande; en la caja, treinta moviéndose a la vez serían una feria.

**Fuera de la ficha, el quieto de Blanco y Negro; y HOME, si se quiere.** El
grupo quería 2D en toda la app y no solo en la ficha. Todas las imágenes de
pokémon del almacén tienen la misma dirección (`/api/imagen/c/pkm-<id>-…`), así
que `SpritePokemon` saca de ella qué pokémon es y pinta el de Blanco y Negro
**sin tocar nada de lo guardado**; si no carga, o la imagen es una subida a mano,
la de siempre. La preferencia va en una **cookie** y no en `localStorage`
porque el layout la lee y la pasa por contexto: la página sale ya con los
buenos, sin pintar unos y cambiar a otros. Los quietos **van recortados**
(lienzo de 96 px en el que el pokémon ocupa a veces un tercio: en una casilla
salían diminutos); los recorta el servidor una vez (ver «Los sprites de
PokéAPI, por el servidor»). En la ficha no, para que el quieto de respaldo se
vea igual que el animado.

**Los sprites de PokéAPI, por el servidor, y una sola vez.** Las imágenes de
las capturas ya se bajaban una vez y se reutilizaban (el almacén, `pkm-…`),
pero el resto de sprites —los de Blanco y Negro, quietos y animados; los
iconos de Espada y Escudo; el HOME de una mega; la vista previa del buscador;
los dibujos de los objetos— los pedía **cada navegador a GitHub**, uno por
uno, y recortaba los quietos y los iconos con un lienzo en cada visita
(salían un instante invisibles). Ahora van por `/api/sprite/v1/<clase>/…`
(`lib/sprites-guardados.ts`): el primero que pide uno hace que el servidor lo
baje, lo **deje recortado** con sharp —sin tocar un píxel— y lo guarde en el
almacén (`spr-…`; el de HOME es el mismo `pkm-…-box` de las capturas); los
demás lo sacan de ahí o, en producción, de la red de Vercel (un año,
`immutable`). Sin sesión, como los gritos: son los sprites de los juegos,
iguales para todos, y así la red los comparte. Solo acepta números de pokémon
y objetos que existen. Lo que no existe contesta 404 un día, sin guardarse.
La `v1` de la dirección es para poder cambiar cómo se preparan sin que nadie
se quede con los de antes. El service worker los guarda en el móvil como las
demás imágenes inmutables, así que se ven también sin conexión. Lo que va en
`public/` (los de Essentials y Añil) ya salía de aquí.

**Iconos de caja de la 8ª, con un lado mínimo.** Los de la 7ª tienen la mitad
de detalle y los de la 9ª no están en PokéAPI. Se recortan como los de Blanco y
Negro pero sin bajar de 26 px de lado: recortados al justo, un Pikachu salía
igual de grande que un Charizard y con los píxeles como puños; así se parecen al
PC de los juegos, donde los hay más grandes y más pequeños.

**Iconos de caja en dos estilos: Espada y Escudo rellenado, o todos de
Essentials.** Al grupo le faltaban iconos (Paldea entera y unas cuantas formas)
y pasó los del paquete de Essentials. Son los de la 7ª al doble: menos detalle
que los de Espada y Escudo, pero todos iguales y **con variocolor**, que los de
Espada y Escudo no tienen. Como cada cosa tiene lo suyo, se elige en Mi perfil
(cookie `iconos` o `iconos-todos`): «Espada y Escudo» usa los del paquete solo
para las 256 especies y formas sin icono en PokéAPI (`sinEspadaYEscudo` en
`lib/iconos-de-caja.json`) y sin shiny, para que no salgan unos sí y otros no;
«Todos iguales» usa los del paquete para todo, con shiny, y el de Espada y
Escudo solo para lo que el paquete no trae (algunas Gigamax, los Pikachu con
gorra…). Las formas que se ven igual que otra (Dominantes, Minior Meteorito,
Greninja Fuerte Vínculo, Zygarde Agrupamiento, Koraidon y Miraidon en sus
modos) usan el de esa (`alias`). `scripts/iconos-de-caja.py` se queda con el
**primer fotograma** (en una caja, todos botando serían una feria), lo baja **a
la mitad** si está al doble exacto —así miden lo mismo que los de Espada y
Escudo: Pikachu, 21×20 en los dos—, y lo deja **ya recortado** como lo
recortaría `SpritePokemon`, con el lado mínimo; los pocos dibujados a 64 de
verdad (los de Hisui) se quedan a 64 con el mínimo al doble. Los shiny van
enteros o, **si ocupa menos**, como la lista de colores de los animados más
algún píxel suelto que no sigue el cambio (un ojo, un brillo); a 32 px el PNG
gana la mitad de las veces. 1270 iconos con sus shiny: **828 KB**.

**Revivir no borra la baja.** Lo decidió el grupo: la muerte pasó y cuenta para
los desempates, el mapa y las cifras; el premio es recuperar al pokémon. La baja
lleva `revividoEl` y la captura deja de apuntarla (`deathId` a null) y guarda en
su historia `{ tipo: "revive", deathId }`: así la historia encuentra sus caídas
pasadas (puede morir dos veces) y, desde una baja revivida, su captura (por esa
entrada, con `array_contains`). Deshacer devuelve la captura a la baja y le quita
`revividoEl` a las que vuelven a tener su pokémon caído. La de una baja apuntada
a mano crea la captura con fecha de la caída, para que «capturado» no salga
después de «revivió»; deshacerla la deja caída, no la borra.

**Intercambiar es cambiar la misma captura, no borrar una y crear otra.** Así
el que llega hereda el hueco, el vínculo del Soul Link y la ruta (en los lockes
el encuentro es de la ruta, no del pokémon), deshacer funciona como con la
evolución y su historia cuenta de dónde vino. Lo que era del que se fue —su mote
y su ficha de combate— se borra, y por eso la foto de deshacer de un intercambio
lleva además esos campos (`Foto` en `lib/caja-servidor.ts`); las demás no, que
deshacer un movimiento no tiene por qué devolver un mote viejo. El mapa de esa
ruta pasa a enseñar al que llegó.

**Las debilidades del locke vienen hechas del servidor** (`debilidadesDe`, con
pruebas), junto a los tipos de cada pokémon. Las de las otras tablas se calculan
en el navegador solo si se piden, trayendo la tabla de tipos en ese momento
(`import()`): son 30 KB que casi nadie va a necesitar. Se ofrecen tres tablas y
no nueve porque dentro de cada una no cambia nada.

**Una cabecera de ficha para los tres sitios.** Equipo y PC, cementerio y hall
usan `CabeceraDeFicha`: un pokémon se ve igual esté donde esté. Con dos tipos,
el fondo lleva uno a cada lado y se funden en el medio; con uno, el degradado
en diagonal de siempre. Para eso la baja
y la casilla del hall llevan sus tipos, sacados (como su número) de la imagen
cuando es del almacén, que sabe la forma, y si no de la especie.

**Bips sintetizados, no grabados.** Una onda cuadrada de 40-70 ms con Web Audio,
sin bajar nada; muy bajitos (0,035) y solo tras el primer toque, que sin él el
navegador no deja y sonarían a destiempo. El de confirmar suena cuando el
formulario **empieza a enviarse** (`useFormStatus`), no al pulsar: si falta un
campo, o se dice que no a «¿Borrar…?», no se ha confirmado nada.

**Un rótulo de apartado, no cinco.** Los títulos pequeños dentro de una tarjeta
(«Para combatir», «Dónde cae más gente»…) son `rotulo` y los antetítulos de
color de una ficha, `antetitulo` (las dos en `globals.css`). Antes cada pantalla
llevaba su mezcla de grosor, gris y espaciado. Y los subtítulos de página, de
una o dos líneas en el móvil, no tres.

**Pokémon Añil: lo suyo, solo en sus lockes, y por el nombre.** El grupo juega
Añil y quería todo lo suyo —pokémon, formas, megas, tipos, habilidades,
movimientos y objetos—, pero sin que apareciera en otros juegos. Los datos
salen de los ficheros del juego (`pbs/` del repositorio de su servidor de
Showdown, `PepeLePew016/AnilShowdown`, que son los mismos que pasó el usuario)
con `scripts/anil.py`, que compara con los de la app y guarda **solo lo que
cambia** en `lib/anil.json` (28 KB) y `lib/habilidades-anil.json` (61 KB, que
el navegador solo carga al editar una ficha). Lo que entra:
- **Pokémon nuevos** (Royaleon y Cefireon, 20001 y 20002) y **41 formas y
  megas nuevas** (20003 en adelante, que no chocan con PokéAPI): Pikachu
  Amarillo, Mewtwo Armadura, los nueve cortes de Furfrou con su segundo tipo y
  30 megas, la mayoría las que sustituyen al Gigamax (Mega Snorlax, Mega
  Corviknight…) y las «Y» de Venusaur, Blastoise y Gengar. Una forma de Añil es
  **la oficial** si está en Essentials estándar con el mismo número (aunque
  Añil la renombre: la Mega Venusaur es allí la «X») o si su nombre coincide
  con una de la app; las cosméticas oficiales que la app no tiene aparte
  (Unown, Vivillon…) no son de Añil y no entran. Salen en su especie en los
  buscadores («Mega Y» en Venusaur) y no se ofrecen como evolución.
- **Tipos** (los 49 cambios y los de las formas nuevas) y los tres
  movimientos que cambian de tipo; **potencias** distintas (56: Ciclón 60,
  Fuerza 90…), que es lo que enseña la ficha. Precisión y PP no salen en la
  app.
- **Movimientos nuevos**: los cuatro de verdad (Plegaria Vital y Luz
  Devastadora salían como nuevos y son oficiales que la lista de la app no
  tiene; Agarre y Eevimpacto, oficiales con otro identificador).
- **Habilidades**: las 328 de Añil con **su nombre y su descripción**, que es
  la que vale allí (Entusiasmo también potencia los especiales), las 18 nuevas
  («anil-…») y las de cada pokémon cuando no son las oficiales (343).
- **Objetos**: los 192 que la app no tiene (megapiedras nuevas, Peluca Regia,
  Pluma Eólica, Supermin. Evol…; sin MT ni objetos clave), con su dibujo, y
  fuera los 279 de la app que Añil no tiene (la Venusaurita es allí la X).
- **Dibujos** de lo exclusivo (`scripts/anil-sprites.py`, de la carpeta
  `Graphics` del juego): tira animada, quieto e icono, normal y shiny, en
  `public/anil` (888 KB con los objetos). Los de los pokémon de siempre **no**:
  son los del paquete de Essentials con otro ritmo (cada fotograma repetido;
  por eso las tiras de Añil van a 50 ms). El quieto va también **dentro del
  código** (`lib/anil-quietos.json`) porque es lo que el servidor guarda como
  imagen de la captura, y en el servidor no se puede contar con leer `public/`.
- **No** entran los level caps del juego (el plugin trae los niveles —14, 23,
  30, 39, 49, 54, 59, 66, 75, 100— pero no quién es cada líder) ni las
  estadísticas, que la app no enseña.

Se reconoce **por el nombre** del juego no oficial («Pokémon Añil», «Añil»,
«Pokemon Anil 2.0»), sin columna nueva: es lo que ya se escribe, y el
formulario lo confirma al teclearlo. Los tipos van por **una generación
propia**, `GENERACION_ANIL` (100): toda la app pasa ya la generación del locke
a fichas, debilidades, cobertura y movimientos, así que Añil llega a todas
por el mismo camino sin tocarlas una a una; al no haber tabla 100, se usa la
de ahora. Para lo que no sabe de generaciones (los buscadores de especie y la
ficha de combate, en una docena de pantallas), el layout pone **un contexto**
(`useEsAnil`), como el del estilo de sprites. En el servidor, evolucionar y
guardar la ficha (movimientos, objeto, habilidades) comprueban que lo de Añil
sea en un locke de Añil.

**Leer la partida de Añil.** El grupo juega Añil en modo Random (no en su
modo nuzlocke: las muertes las llevan ellos, poniendo a los caídos en la
última caja) y quería que la app se pusiera al día sola con la partida, sin
tocar medallas ni gimnasios. La partida de Essentials es un `Marshal.dump` de
Ruby sin cifrar, así que se lee **en el navegador** (`lib/partida/marshal.ts`,
un lector de Marshal entero, porque las referencias `@` obligan a leerlo todo)
y al servidor va solo lo que hace falta, con **los nombres internos del juego**
(«CHARMELEON», «BLAZE»). La traducción a los de la app va en el servidor
(`lib/partida/traducir.ts`, con `lib/anil-internos.json`, que saca
`scripts/anil.py` de los mismos datos del juego), que no se fía de lo que
llega. Lo que Essentials calcula al vuelo y puede no estar guardado se calcula
igual que el juego: shiny y naturaleza del `personalID`; la habilidad, por
orden, la de la **cápsula** del Random, la **forzada**, la **guardada** o la de
su especie según su índice, con **la tabla del Random**, que el plugin guarda
en la partida (`:randomized_data`) y solo vale con su interruptor (el 48)
puesto. Quién es quién: **mote y familia** (el de la app puede no haber
evolucionado), y sin mote con los sin mote; nada de emparejar «a ojo» un mote
con uno sin mote, que juntaría dos pokémon distintos: sale como nuevo y se
desmarca en la vista previa. La ruta, por **palabras enteras** («Ruta 1» no es
el principio de «Ruta 10»), como pidió el usuario: igual, o el principio con el
nombre del juego de apunte, o en blanco. El **shiny solo se gana**: en la app
puede serlo por un premio que el juego no sabe. Lo que solo está en la app no
se toca (puede ser una captura fallida o un liberado). Lo que se aplica
**se vuelve a calcular** en el servidor con lo que haya en ese momento, y queda
en un solo `CambioDeCaja`, que ahora sabe también **qué capturas creó**
(`capturas`) para borrarlas al deshacer. Los nombres de los mapas no están en
la partida (guarda el número): salen de `Data/MapInfos.rxdata` y
`Data/map_metadata.dat` del juego con `scripts/anil-mapas.ts` (que abre también
un `Game.rgss3a`) en `lib/anil-mapas.json`; mientras esté vacío, los nuevos se
apuntan sin ruta salvo los regalos con nombre, y la vista previa lo avisa.

**El día de captura sale de la partida, también al releerla.** Lo guardan
el Añil (con hora) y los juegos de la 4ª en adelante (el día); de la 1ª a la
3ª no existe. Con los nuevos se apuntaba desde el principio; ahora, al
releer, a los que ya estaban se les pone al día si es **otro día** (la hora
no cuenta: la partida oficial no la guarda y apuntarlo a mano el mismo día no
es una diferencia), con su línea en la vista previa y deshaciéndose como lo
demás (la foto de leer la partida lleva `createdAt`). Las fechas siguen
acotadas por `fechaDeCaptura`: nada antes de crear el locke en la app. La
ficha del Equipo y PC dice «Capturado el …» debajo de «Capturado en».

**Leer la partida de los juegos oficiales.** El usuario quería lo mismo que
en el Añil para todos los juegos, cada uno con su generación. La app tiene de
la 1ª a la 7ª (más los remakes), así que esos: `lib/partida/oficial/`, un
lector por familia de formato (`gen12.ts`, `gen345.ts`, `gen67.ts`), con lo
de cada juego sacado de **PKHeX** (kwsch/PKHeX), que es la referencia: dónde
va el equipo, las cajas y sus nombres, cuál de las dos copias de la partida
es la buena (GBA y 4ª guardan dos y vale la del contador más alto), cómo se
descifra cada pokémon (el XOR y el orden de bloques de cada generación) y
cómo se reconoce cada juego (tamaño, marcas y pies; la 5ª, por su CRC). El
código es nuestro; de PKHeX salen **datos**: las tablas de letras de la 1ª a
la 4ª, los números de especie de la 1ª y la 3ª, y los **nombres de los
lugares en español** de cada juego, que es lo que permite apuntar la ruta
como en el Añil. Los objetos cambian de número según la generación y salen
de PokéAPI (`item_game_indices`), igual que movimientos, habilidades y
naturalezas; las dos habilidades de cada especie en la 3ª (que solo guarda
cuál de las dos), de `pokemon_abilities_past`. Todo lo genera
`scripts/partidas-oficiales.py`: `oficial/letras.json` va al navegador con
los lectores (8 KB) y `oficial-tablas.json` solo al servidor. Un locke lee
**solo la partida de su juego** (`lib/partida/formato.ts`): los fangames que
no son Añil no, porque cada uno guarda a su manera. Lo que el juego no guarda
(naturaleza en la 1ª y 2ª, sitio en la 1ª, Oro y Plata, fecha hasta la 3ª) no
se inventa. El mote: de la 4ª en adelante el juego dice si se le puso; antes
no, y uno igual que la especie («PIKACHU») cuenta como sin mote. Probado con
las partidas reales de X, SoulSilver y Blanco (68 y 57 pokémon,
con la copia buena de las dos que guarda la 4ª y los shiny bien sacados) y,
para el resto, con **partidas montadas**
con la forma de cada juego y **pokémon de verdad** de las pruebas de PKHeX
(`tests/partidas-falsas.ts`): sus datos cuadran (el Jynx «ZYNX» sale de un
intercambio del juego, el Geodude de Golpe Roca en las Ruinas Alfa).

**El Añil, en el ordenador y sin rodeos.** Ningún navegador deja abrir la
ventana de elegir fichero en una carpeta concreta como `%APPDATA%`. Lo que sí
se puede es que **la recuerde**: en Chrome y Edge se usa `showOpenFilePicker`
con un `id`, así que la primera vez se llega a mano (la pantalla dice cómo:
escribir `%APPDATA%` en la ventana) y desde ahí se abre sola en la carpeta de
las partidas; en Firefox, el selector de siempre. Como el Añil se juega en el
ordenador, en las pantallas táctiles el apartado no sale (`pointer: fine`).
Los nombres de sus mapas salen de `Data/MapInfos.rxdata` y
`Data/map_metadata.dat`, que pasó el usuario (`lib/anil-mapas.json`, 218
mapas), y Plegaria Vital y Luz Devastadora entran como movimientos de Añil
porque salían en su partida y la app no los tenía.

**La habilidad en la ficha, y la mega con su megapiedra.** La ficha de
combate lleva **habilidad** (`Capture.habilidad`; las suyas salen primero en
la lista, y con descripción). Si un pokémon **lleva su megapiedra**, en la
caja, el equipo y la ficha **se enseña su mega**: sprite, tipos y
debilidades, y «Venusaur · Mega Y» en la cabecera (`lib/megas.ts`; qué piedra
es de quién sale de Essentials, `scripts/megas.py` para las de los juegos).
Su número de siempre no cambia —es el que evoluciona y grita—: el tablero
lleva aparte `mega`. La mega tiene **su propia habilidad**
(`Capture.habilidadMega`), que **empieza vacía** la primera vez, como pidió el
usuario; el editor enseña una u otra según el objeto que se escriba y guarda
las dos, así que quitar y poner la piedra no pierde ninguna. Con HOME, el
render de la mega se pide aparte (lo guardado es el de la forma normal). En
Añil valen sus piedras; en los demás, solo las de los juegos (47).
---

**Mi perfil va en pestañas, con una ficha de entrenador encima.** Había
crecido a una sola columna con todo —as, favoritos, títulos, tema, aspecto,
sprites, sonido, contraseña, gestionar, reparar, salir—, casi 5000 px en el
móvil. Ahora arriba va la **ficha** (foto, nombre, título, número de
entrenador sacado del id, el as y las cifras) y debajo cuatro pestañas:
*Tu locke* (as y favoritos; no sale si no juegas ninguno), *Títulos*,
*Personalizar* (tema, aspecto, sprites, sonido) y *Cuenta* (contraseña,
gestionar, reparar, salir). Son **enlaces con `?seccion=`**, pintados en el
servidor: se puede volver a una pestaña con atrás y no hay estado que
perder. En el móvil van en rejilla de cuatro, icono encima y texto debajo,
para que quepan sin desplazar. El perfil público usa la misma ficha
(`@utility ficha-de-entrenador` y `MarcaPokeBall`), así que el tuyo y el de
los demás se reconocen como lo mismo.

**Cada pantalla con su cara, no una plantilla para todas.** Al ordenar
Competiciones y Administración se probó primero a ponerles lo mismo que a Mi
perfil —ficha con la Poké Ball y rejilla de botones— y el usuario lo
rechazó: todas se veían iguales. Comparten lo de debajo (partes por
`?seccion=` con `seccionActiva`, pintadas en el servidor) pero no la pinta:
**Mi perfil** es la ficha de entrenador con botones en rejilla;
**Competiciones**, el cartucho de la edición con pestañas subrayadas y una
estantería de cartuchos; **Administración**, una sala de control con
indicadores con luz, teclas que se hunden y el menú en pastillas (móvil) o
al lado (ordenador). Lo que se añada en una de ellas sigue su estilo, no el
de las otras.

**Leer la partida no puede dejar nada a medias.** Repaso a fondo pedido por
el usuario («que no se pete ni haya consecuencias»). Lo que se encontró y
cómo quedó:
- **Fechas.** Un reloj de consola mal puesto o una partida tocada traen
  fechas imposibles; una que no existe reventaba al guardarla, a mitad de la
  lectura. `fechaDeCaptura` (en `plan.ts`): la que no existe o es del futuro
  se queda en nada (fecha de hoy) y la de antes de crear el locke, en el día
  en que se creó. La marca de tiempo del Añil, fuera de 1970–2100, no se lee.
- **Tiempo.** La acción tiene un minuto. Los dibujos se piden **antes de
  tocar nada** y con **tope de 20 s** (`dibujosConTope`): con GitHub lento,
  cada uno podía tardar 24 s. Los que no llegan se quedan sin dibujo guardado
  y la caja pinta el de su especie. Las posiciones de los nuevos se llevan en
  memoria, sin preguntar a la base de datos por cada uno. Medido: **541
  pokémon nuevos en 22 s**; las partidas reales, en 1,5–3 s.
- **A medias.** Si algo falla escribiendo, lo que sí se hizo se apunta como
  «Leer la partida (a medias)» para **Deshacer**, el detalle va al registro
  de Diagnóstico y a quien juega se le dice qué hacer. Probado con un fallo
  forzado al llegar a Mew: 150 creados, Deshacer los quita todos.
- **El navegador.** Tope de tamaño antes de leer (4 MB las de consola, 64 MB
  el Añil, que ronda los 6), candado contra el doble toque y, si se corta la
  conexión, un aviso en vez de caerse la pantalla. Volver a leer la partida
  **nunca duplica** (se empareja por mote y familia), así que ante la duda se
  relee.
- **Caja de caídos.** Sigue siendo la última por defecto (es la costumbre del
  grupo), pero antes del botón sale **en rojo** cuántos van al cementerio y
  de qué caja.
- **Lectores.** Pasados por miles de ficheros rotos a propósito (bytes
  cambiados, cortados, basura del mismo tamaño): ningún cuelgue ni error
  raro, el peor 0,3 s. La 6ª y 7ª se reconocen solo por tamaño, como PKHeX;
  basura de ese tamaño exacto puede dar algún pokémon raro en la vista
  previa, que se desmarca.

**Revisión general (octubre).** Se recorrieron todas las pantallas con
cada papel, en el móvil y en el ordenador (sin errores ni nada que se salga
de lado; todo en 0,7–1 s salvo la imagen del resumen del Hall, que llega
aparte y sin caché a propósito), y se repasó el código: permisos, notas por
autor, índices, código muerto y repetido. Lo que se cambió:
- **Permiso denegado en un formulario.** `requireCreador`,
  `requireOrganizador`, `requireCompetitionManager` y
  `assertPuedeApuntarEn` **lanzan** un error, y dentro de una acción de
  formulario eso tiraba la pantalla entera de error (le pasaba a quien tenía
  un formulario abierto cuando le quitaban el permiso). Ahora las 22 que lo
  hacían usan `conPermiso` (`lib/permiso.ts`), que lo devuelve como mensaje
  del formulario y deja pasar las redirecciones de Next. Lo nuevo que se
  escriba debería hacer lo mismo. `requireUser` no hace falta: redirige.
- **Pantallas largas.** Actividad (5000 → 1900 px en el móvil): por días,
  lo de varios junto y paginada. Puntos (4400 → 2900): el ajuste plegado y
  el historial corto. Level caps, un poco (el rótulo de vídeos va en la
  fila de los botones). Reglas, Mapa y Ruleta son largas por contenido y se
  dejan.
- Fuera `getCambios`, que no usaba nadie.

**Lo único público, y solo la tabla.** El enlace de la clasificación es la
primera página de la aplicación que se ve sin sesión, así que enseña lo
mínimo: nombres, puntos, combates y bajas (o el marcador en un dualocke). Ni
fotos —sus direcciones piden sesión y son de cada uno; va la inicial sobre su
color—, ni enlaces hacia dentro, ni equipos ni mapas, y `noindex` para los
buscadores. La clave son 24 bytes al azar (32 letras): no se adivina. Cambiarla
es la forma de cortar a quien ya la tenía. La columna `enlacePublico` lleva
**índice y no `@unique`**: añadir una restricción única hace que `prisma db
push` pida `--accept-data-loss`, y el build de Vercel lo lanza sin él, así
que el despliegue se pararía.

**El buscador rápido respeta lo privado.** Las pantallas salen del propio
menú (ya sabe cuáles te tocan); jugadores y cementerio, de quien ve el locke;
las rutas, solo si juegas (son de tu mapa); y los pokémon de la caja, solo
los tuyos, salvo en un Soul Link. Se piden al abrirlo (`buscadorAction`), no
en cada pantalla.

**Confeti hecho a mano** (`lib/confeti.ts`): un lienzo encima de todo que se
quita solo, con los colores del tema y oro, sin librerías. Quien tiene
«reducir movimiento» no lo ve.

### El repaso de pantallas de octubre: cada una con su cara

Después de rehacer el perfil, Competiciones y Administración, el usuario pidió
mirar el resto con el mismo criterio: **que no se parezcan todas**. Se sacaron
fotos de las 25 pantallas y se rehicieron las que eran tarjetas genéricas, cada
una con algo de su mundo:

- **Reglas, como un reglamento** (títulos, artículos numerados, índice). Los
  botones de administrar salían en cada sección **aunque solo se fuera a
  leer**, y la normativa parecía un formulario: ahora van en «Editar reglas»
  (`?editar=1`, comprobado en el servidor: un jugador con la dirección a mano
  no ve nada).
- **Level caps, con el cartel del tope** y el camino: lo primero que se quiere
  saber es a qué nivel puedes llevar el equipo, y antes había que buscarlo
  entre diez tarjetas iguales. Primero fue un **estuche de medallas** (todas en
  fila, encendidas las pasadas) y **no gustó**: mucho círculo para contestar
  una sola cifra. El cartel la pone en grande, como un marcador.
- **La bolsa, como la de los juegos**: lista y recuadro de texto. Con dos
  objetos, la rejilla de antes dejaba la pantalla vacía.
- **El cementerio, con lápidas**: eran las mismas casillas que el PC.
- **Los retos, como cartel de duelo**: eran dos nombres en una línea.

**Grises más claros, no letra más grande.** El problema de leer al sol era el
contraste, no el tamaño: `slate-500` y `slate-600` se quedaban en 3,8:1 y
2,4:1 sobre las tarjetas. Se aclararon los dos en el tema, que lo arregla en
toda la app de una vez sin tocar ni un componente, y los textos con
información que iban en el más tenue pasaron al 500. Solo se agrandaron (de 10
a 11 píxeles) los subtítulos de las casillas y fichas.

**Las pruebas de la interfaz, aparte del build.** Las de `npm test` van dentro
del build porque son rápidas y no necesitan nada; estas necesitan un navegador
y una base de datos, y Vercel no tiene navegador. Se lanzan a mano antes de un
cambio grande. Usan **su propia base**, recién sembrada en cada pasada, para
que nunca dependan de lo que haya en la de trabajo ni la toquen; por eso se
niegan a crear o borrar nada si la base de `.env` no está en la máquina.

**HexaPost, dentro de la aplicación y no por WhatsApp.** El usuario lo pidió
para cuando la use más gente: un sitio donde lo que se cuenta no se pierde y
se ve en qué quedó. Nació como «Buzón» y él lo rebautizó **HexaPost**; en la
interfaz y en la dirección (`/hexapost`) se llama así, y por dentro el código
sigue diciendo `buzon` (`lib/buzon.ts`, `actions/buzon.ts`, la tabla
`Sugerencia`). Decisiones:

- **Es de la aplicación, no de un locke** (`Sugerencia` no cuelga de ninguna
  edición), así que está en *Lo mío* para todos, también sin locke.
- **Cada uno ve solo lo suyo y el Creador todo**: se comprueba en las
  acciones y en la página, filtrando por `userId`; contestar, cambiar el
  estado y borrar es `requireCreador`.
- **«Leída» sale sola** al abrir el Creador HexaPost: un acuse de recibo que
  no le obliga a tocar una a una, y no enciende el aviso de nadie. Lo que sí lo
  enciende es contestar o cambiar el estado (`vistaPorAutor`).
- **La captura solo puede ser subida** (un data URL reducido en el
  navegador), nunca un enlace de fuera, y va al almacén de imágenes; por eso
  está en las listas de `deduplicar-imagenes.ts` (si no, la limpieza de
  huérfanas la tiraría) y de `ocupacion.ts`.
- **La pantalla se rellena sola** con la última por la que pasaste
  (`components/recordar-pantalla.tsx`, en `sessionStorage`): `document.referrer`
  no sirve en una aplicación que no recarga al cambiar de pantalla.
- **Cinco al día**: sobra para quien tiene algo que contar y frena al que
  manda lo mismo diez veces.

**El repaso de diseño de octubre: lo que se tocó y lo que no.** Se repasaron
las 23 pantallas en móvil y ordenador. Se tocó: los filtros que saltaban de
línea dejando uno solo abajo (ahora `@utility fila-de-filtros`, que se desliza
en el móvil), la explicación de ocho líneas del gráfico de Puntos (una frase y
el porqué plegado), el punto repetido de las filas del mapa y tu combate dos
veces en la portada. **No se tocó, a propósito**: las pestañas, que son
distintas en cada pantalla porque cada una tiene su cara; las ✕ de borrar, que
ya van en gris, piden confirmación y dicen qué borran; el recuadro de la bolsa,
que imita el de los juegos; y el gris del texto pequeño, que ya está aclarado
en `@theme` (5:1; medido con el de fábrica de Tailwind parecía que no).

**Las remodelaciones se probaron sin publicar.** Portada, jornadas, actividad,
mapa y HexaPost se rehicieron en una rama aparte y se enseñaron con fotos
antes de subir nada; solo se publicaron cuando gustaron. De ahí salen algunos
detalles que parecen caprichos y no lo son:

- **El «VS» de la portada lleva relleno**: va en cursiva con el degradado
  recortado al texto (`bg-clip-text`), y el degradado solo pinta dentro de la
  caja; sin el relleno, la punta de la S salía cortada.
- **El cartel «VS» solo sale con la jornada abierta**: la próxima jornada
  también tiene rival, pero mientras no toque manda el level cap.
- **La imagen del hito va apoyada en el borde de abajo**, del alto de la
  tarjeta y difuminada hacia arriba: asomando por el lado parecía cortada por
  error, y un retrato de líder que acaba en el borde queda como si saliera de
  ella.
- **En el mapa, grupos sí y barra de progreso no**: se pidió así.

## 4. Reglas del locke que están implementadas

- **Clasificación y desempates**: puntos → menos pokémon muertos (los revividos
  siguen contando) → mejor
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
  pdf.mjs           arma el PDF, pinta los iconos y avisa si algo no cabe
  logo-ejemplo.svg  el logo de mentira de la edición de ejemplo
```

Piezas con truco:

- `lib/competition.ts` — `getStandings()` calcula la clasificación con sus
  desempates; `assertCanActForParticipant()` centraliza los permisos. Jornadas y
  retos se apuntan con la **misma función** (`apuntar`), que recibe si esa
  diferencia de pokémon cuenta o no; los puntos van por otro lado y los retos no
  los tocan.
- `lib/grafico-clasificacion.ts` — rehace la clasificación al final de cada
  jornada y la convierte en carriles, con los empates compartiendo carril.
  Devuelve **dos juegos de etapas**: el de siempre y el que descuenta a los que
  se fueron (`etapasDeLosQueSiguen`), más `salidas` con quién se fue y en qué
  jornada. `components/points-chart.tsx` es el dibujo y la pestaña que cambia
  de uno a otro.
- `lib/cara-a-cara.ts` — el marcador de un jugador contra cada rival, juntando
  jornadas y retos, y de ahí salen la presa favorita y la bestia negra.
  `components/head-to-head.tsx` es la casilla desplegable del perfil.
- `components/species-picker.tsx` — buscador de pokémon. Solo manda **qué**
  pokémon es; las imágenes las baja `lib/sprites-servidor.ts` al guardar. La
  vista previa usa el sprite pixelado, que pesa 900 bytes en vez de 110 KB. Lo
  comparten el cementerio, el as, el hall de la fama y los equipos de jornada.
- `lib/imagenes.ts` y `lib/imagen-url.ts` — las direcciones de las imágenes y
  sus firmas. `app/api/imagen/[...partes]/route.ts` es quien las sirve. Los sprites de
  PokéAPI los sirve `app/api/sprite/[...partes]/route.ts`, que los baja, prepara
  y guarda una vez con `lib/sprites-guardados.ts`; las direcciones las arma
  `lib/sprites-de-quinta.ts` (`urlDeSprite`).
  `firmaDeColumna` es la firma escrita en SQL, para pedirla en la misma
  consulta que los datos o filtrando por el locke (`firmasDeMedallasDelLocke`,
  `firmasDeEquiposDeJornadas`) y no tener que esperar a los ids.
- `lib/mvp.ts` — el recuento de la votación al MVP: quién gana, si hay empate y
  cuándo vale el desempate manual. Es la única fuente de verdad del MVP.
  `getMvpStates` acepta las jornadas como promesa y a quien mira como
  `{ participantId }` o `{ userId }`, para ir en la misma tanda que la página.
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
- `lib/titulos.ts` — los títulos de alguien y los que llevan puestos los
  jugadores de un locke (`getTitulosEquipadosDelLocke`, para la clasificación).
  `components/title-badge.tsx` es la chapa; `components/titles-section.tsx`, la
  lista del perfil, compartida por el perfil público y por Mi perfil.
- `lib/mapas.ts` — los mapas y las capturas. `lib/detectar-zonas.ts` saca las
  zonas de los colores de la imagen de fondo, `lib/mapas-de-fabrica.ts` es la
  semilla de nombres de Johto y de Kanto, `lib/juegos.ts` la lista de juegos y
  sus regiones —`regionesDelJuego()` devuelve **las láminas de mapa**, que no
  siempre son la región: la 2ª tiene dos y la 7ª cuatro islas, y
  `REGIONES_DE_MAPA` deja fuera a Alola, que no se dibuja—, y
  `lib/zonas.ts` los tipos, las formas y sus colores —con su plural e icono
  para los grupos de la lista del jugador—; **este
  último existe porque un módulo con `"use client"` no puede exportar datos a un
  componente de servidor**: Next devuelve una referencia al cliente en vez del
  array y revienta la página entera (pasó). `components/mapa.tsx` es el mapa en
  SVG, `mapa/mapa-client.tsx` la vista del jugador y `admin/mapas/editor.tsx` el
  editor. Ojo con este último: **guarda el mapa en el navegador**
  (`RegionEnEdicion`) y cada acción del editor devuelve el mapa como ha quedado
  (`EstadoDelEditor` en `actions/mapas.ts`) en vez de hacer `revalidatePath`,
  que en una acción de servidor refresca la página entera: a cada zona movida o
  renombrada la pantalla saltaba de sitio y se volvían a pedir todas las
  pestañas, y el usuario se quejó. Solo «usar las que traigo escritos», que
  rellena una región vacía, sigue refrescando. Lo prueba
  `tests/interfaz/4-mapas.prueba.mjs`. **Cambiar el tamaño del lienzo mueve
  las zonas con él** (`reescalarZonas` en `actions/mapas.ts`, con
  `reescalarZona` en `lib/zonas.ts`): la imagen se estira al lienzo, así que
  las zonas se escalan igual para seguir encima del mismo sitio; los círculos
  siguen redondos. Antes se quedaban en sus números y, al encoger el lienzo,
  se salían y parecía que se habían borrado (le pasó al usuario). Para las que
  ya se quedaron fuera, el editor avisa (`zonasQueSeSalen`, por el centro: una
  que solo asoma por el filo no cuenta) y `recolocarZonasAction` las lleva del
  tamaño que tenía al de ahora. Y **el panel de la zona elegida se pinta en el
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
- `lib/session.ts` y `lib/sesion-token.ts` — la cookie de la sesión. El token
  se firma y se lee **solo** en `sesion-token.ts`, porque lo usan también
  `src/proxy.ts` (que la estira una vez al día) y este no puede tirar de
  `next/headers`. `lib/volver.ts` es lo de volver a la pantalla pedida tras
  entrar; el proxy es quien apunta la dirección en la cabecera.
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
  **Si guarda una lista** (`String[]`) el camino es otro, el de las medallas:
  no entra en `FUENTES` —hay que sacarla del `Exclude` de su tipo— sino en
  `LISTAS` de `deduplicar-imagenes.ts`, con su consulta de firmas propia en
  `imagenes.ts`, su `urlDeX` en `imagen-url.ts` y su rama en
  `api/imagen/[...partes]`. Hay tres así: las medallas de un level cap, las de
  una plantilla y el **cartel del final** (`Competition.finalImages`).
- `lib/ocupacion.ts` — mide lo que ocupa la base de datos y en qué se va,
  columna de imágenes a columna de imágenes. Lo enseña `/diagnostico`. Si se
  añade una columna que guarde una imagen, hay que apuntarla en su lista
  `COLUMNAS`; si no, no se contará y la cuenta de "cuántos lockes caben" saldrá
  optimista.
- `lib/cola.ts` — la cola de apuntes sin subir, en el `localStorage` del móvil.
  `lib/acciones-sin-conexion.ts` envuelve un formulario para que, si el envío no
  sale, acabe ahí en vez de perderse; `components/estado-conexion.tsx` es el
  aviso de abajo y quien la sube (al volver la línea, al abrir la aplicación y
  al volver a ella tras un rato de fondo, que además refresca la pantalla), y
  `components/pendientes.tsx` la lista dentro de cada pantalla.
  `api/sincronizar/route.ts` es la puerta del servidor, que reutiliza las server
  actions de siempre. **Cuidado al cambiar una de esas acciones**: los apuntes
  que estén en cola llevan los campos de la versión anterior.
- `lib/checkpoints.ts` — los checkpoints de jornada: qué jornada toca tras cada
  level cap marcado, cuál está abierto y qué le toca a cada uno.
- `lib/hall.ts` — el orden del hall y el podio; lo usan el hall y la imagen.
- `app/api/resumen/[id]/route.tsx` — la imagen del resumen del locke (satori).
- `public/sw.js` — el service worker: guarda cada pantalla al visitarla (pidiendo
  siempre al servidor primero) y los sprites y mapas, que son inmutables, y las
  guías en PDF por su huella (ver `unaGuia`; la versión va en v5). Al
  cerrar sesión, la pantalla de entrada le manda borrar las pantallas guardadas:
  llevan dentro los datos de quien las vio.
- `lib/bolsa.ts` — el catálogo y las bolsas. El catálogo se lee entero de una
  vez y las bolsas se juntan con él **en memoria**: son cuatro filas y así no se
  repiten por cada jugador las consultas de las firmas de las imágenes.
  `getBolsa` y `getBolsas` aceptan el participante o `{ competitionId, userId }`
  / `{ competitionId }`, y el catálogo como promesa, para no esperar a nadie.
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
- `tests/` — las pruebas (`npm test`). `preparar.cjs` cambia `server-only`
  —que lo pone Next y fuera de él no existe— por un módulo vacío, y
  `ayudas.ts` monta fichas, combates y jornadas inventados. Un fichero por
  tema: dualocke, clasificación, retiradas, emparejamientos, final,
  checkpoints, y hall con perfiles y tipos. Las funciones que prueban son las
  "sueltas" (sin base de datos) de cada `lib/`; si una cuenta nueva lee de la
  base de datos, se separa igual para poder probarla.
- `tests/interfaz/` — las **pruebas de la interfaz** (`npm run test:interfaz`),
  aparte de las de arriba. `correr.mjs` rehace la base `hexaapp_pruebas`
  (solo si la de `.env` está en esta máquina), la siembra, levanta la app
  compilada en el puerto 3100 y pasa los `*.prueba.mjs`: `1-pantallas` abre
  todas las pantallas en móvil y ordenador con quien administra y con un
  jugador; `2-flujos` hace lo de todos los días en orden (apuntar, ficha,
  buscador, Showdown, gimnasio, resultado a mano y leído de la repetición,
  actividad, reglas). La app de las pruebas arranca con
  `guia/showdown-falso.cjs`, así que **ninguna repetición sale a internet**.
  `comun.mjs` lleva el
  **vigía**, que suspende la prueba si hay un error de la página, de la
  consola o un 500 del servidor aunque la pantalla parezca bien.
- `lib/palmares.ts` — el palmarés: la gente de tus lockes con la cuenta de
  todos los suyos, y tus ediciones. Quién ganó cada locke (final,
  mayoría en el dual, abandono o Liga en solitario) y la cuenta de cada persona
  en total y por categoría. `palmares/cuenta-de-cada-uno.tsx` pinta la tabla con
  las pestañas y el panel de elegir quién sale, que guarda con
  `actions/palmares.ts` (solo la fila de quien lo pide).
- `lib/lockes-de-antes.ts` — quién puede salir en un locke de antes
  (`cuentasQuePuedeApuntar`) y cómo se montan jugadores, ganador y
  subcampeón con gente sin cuenta y vínculos (`montarJugadores`, probada en
  `tests/palmares.test.ts`). El formulario, el mismo para apuntar y editar, está
  en `palmares/apuntar-form.tsx`.
- `lib/juegos.ts` — los juegos, sus regiones y mapas, las plantillas de level
  caps, **las parejas** (`versionesDelJuego`, `repartirVersiones`) y **los no
  oficiales** (`leerJuego`, `nombreDelJuego`, `versionesDeLaEdicion`), probados
  en `tests/juegos.test.ts`. El selector es `components/juego-picker.tsx`.
- `lib/equipo-y-caja.ts` — las cuentas del Soul Link sin base de datos, que
  usan igual el servidor y el navegador: `colocar` (dónde se pinta cada uno),
  `mover`, `sitioParaUnaNueva`, y los vínculos (`vinculosDe`, `companerasDe`,
  `vinculoAlCapturar`, `sePuedenVincular`). Probadas en
  `tests/soul-link.test.ts`. `lib/soul-link.ts` lee los tableros de todos
  (`getEquiposDelLocke`), vincula lo recién apuntado (`vincularCapturaNueva`,
  la llaman el mapa y Equipo y PC) y dice si el grupo ya se pasó la Liga
  (`getLigaEnCooperativo`). `actions/equipo-y-caja.ts` son las acciones, cada
  una con su permiso y su foto para deshacer, y `lib/caja-servidor.ts` lo que
  comparten con el cementerio (quién puede tocar una caja, la foto para
  deshacer y `darPorMuerto`); `(app)/equipo/` la pantalla
  (`tablero.tsx` el tablero de cada jugador, `casilla.tsx` las casillas, las
  flechas y los sprites, `arrastre.tsx` el arrastre con su pokémon que sigue al
  dedo, `ficha-del-tablero.tsx` la ficha, `evolucion.tsx` la animación
  de evolucionar, con sus `@keyframes evo-*` en `globals.css`) y
  `components/resumen-soul-link.tsx` la portada.
- `components/hoja.tsx` — las fichas: abajo y deslizable en el móvil, centrada
  en el ordenador. Toda ventana nueva debería usarla.
- `components/tirar-para-refrescar.tsx` — tirar hacia abajo para refrescar; se
  pone en la página que lo quiera.
- `components/dibujo-vacio.tsx` — los dibujos de las pantallas vacías.
- `lib/fondos-de-caja.ts` y `components/fondo-de-caja.tsx` — los fondos de las
  cajas del PC: cuáles hay, el de fábrica de cada caja y cómo se guardan; las
  imágenes están en `public/cajas/`. También los **nombres** de las cajas
  (`Participant.nombresDeCaja`).
- `components/chapa-de-tipo.tsx` — la chapa de un tipo, con las imágenes que
  pasó el grupo en `public/tipos/`: `<slug>.webp` (la chapa entera, 200×44) y
  `<slug>-icono.svg` (el cuadrado del icono, en SVG y centrado, que pasó el grupo;
  antes se recortaba de la chapa y quedaba descentrado), para donde no cabe el
  nombre. La usan Equipo y PC y la cobertura de tipos.
- `lib/papelera.ts` y `jornadas/papelera.tsx` — la papelera de jornadas.
- `lib/movimientos.ts` (+ `movimientos.json`) y `lib/tipo-del-movimiento.ts` —
  movimientos y naturalezas para la ficha completa; el segundo es lo único que
  necesita el navegador para la cobertura. Salen de
  `scripts/generate-movimientos.ts`, que hace también `lib/showdown.json`.
- `lib/showdown.ts` y `actions/showdown.ts` — leer un equipo exportado de
  Showdown, o los equipos y el resultado de una repetición
  (`resultadoDeLaRepeticion`, `quienEsQuien`, `leerResultadoDeRepeticionAction`)
  a partir de su enlace (de
  replay.pokemonshowdown.com o, en Añil, de la web de repeticiones de su servidor),
  y escribirlo (`escribirShowdown`, `especieEnShowdown`). `equipo/exportar-showdown.tsx`
  es la hoja de *Exportar a Showdown* y el botón de copiar de la ficha; el nivel
  de cada uno lo calcula `equipo/page.tsx` con sus level caps. `equipo/ficha-de-combate.tsx` es la ficha completa.
- `components/pestanas.tsx` y `components/pestanas-enlace.tsx` — las pestañas,
  con estado o como enlaces. `lib/colores-de-tipo.ts`, el color de cada tipo
  (aparte de `lib/tipos.ts` para no cargar la tabla entera en el navegador).
- `equipo/ficha-al-pasar.tsx` — la ficha al pasar el ratón por la caja.
- `lib/registro.ts` — `registrar()`, el registro de cambios de cada locke. Toda
  acción nueva de administrar debería llamarlo.
- `VER_COMO` en `lib/auth.ts`, `getMyParticipant` y `actions/ver-como.ts` —
  «Ver como» jugador o espectador.
- `components/buscador-rapido.tsx` y `actions/buscador.ts` — el buscador
  rápido (Ctrl+K). Lleva a `/mapa?buscar=…` y a `/equipo?ver=<captura>`.
- `app/clasificacion/[clave]/page.tsx` — la clasificación pública, fuera de
  `(app)` (sin sesión); `competiciones/enlace-publico.tsx`, la caja de
  Ajustes, y `enlacePublicoAction`.
- `lib/confeti.ts` — `lanzarConfeti()`: en `level-caps/marcar-gimnasio.tsx`
  (la Liga) y en `hall-de-la-fama/entrada.tsx`.
- `lib/permiso.ts` — `conPermiso`, para que un permiso denegado salga en el
  formulario y no como pantalla de error (ver la revisión general, arriba).
- `lib/errores.ts`, `instrumentation.ts`, `api/errores`,
  `lib/avisar-de-errores.ts` y `components/cazador-de-errores.tsx` — el
  registro de errores que se ve en Diagnóstico.
- `components/tema-en-el-sistema.tsx` y `colorDeBarra` / `iconoDelTema` en
  `lib/themes.ts` — el tema en la barra del móvil y en el icono de la pestaña.
- `(app)/template.tsx` — la transición entre pantallas.
- `perfil/page.tsx` — Mi perfil: `FichaDeEntrenador` y las pestañas por
  `?seccion=`. `components/marca-poke-ball.tsx` es la Poké Ball de fondo y
  `@utility ficha-de-entrenador` en `globals.css` el fondo de la ficha, que
  comparte con `jugador/[id]/page.tsx`. `components/menu-de-secciones.tsx`
  tiene el menú del perfil, `Atajo` y `seccionActiva`, que usan también
  Competiciones y Administración.
- `competiciones/cartucho.tsx` — el cartucho de la edición, los de la
  estantería, su luz y las pestañas subrayadas; `@utility cartucho`,
  `estrias-de-cartucho` y `etiqueta-de-cartucho` en `globals.css`. Los
  indicadores y las teclas de Administración viven en `admin/page.tsx`.
- `guia/capturas.mjs` con `GUIA_FOTOS=a,b` rehace solo esas fotos.
- `components/soltar-y-pegar.ts` — pegar (Ctrl+V) y arrastrar imágenes en
  `ImageInput` e `ImageListInput`.
- `lib/ficha-rapida.ts`, `actions/ficha-rapida.ts` y
  `components/ficha-rapida.tsx` — la ficha que sale al pasar el ratón por un
  jugador en la clasificación.
- `lib/frases-del-companero.ts`, `lib/frases-cortas.ts` y `actions/companero.ts`
  — lo que dice el compañero: las de su especie (`lib/frases-de-especie.json`,
  generado desde `scripts/frases-de-especie/` con `scripts/frases-de-especie.py`),
  las de su tipo y las del locke (en el servidor), y las de la hora, dormido y
  de cualquiera (en el navegador). Probadas en `tests/companero.test.ts`.
- `lib/as.ts`, `lib/as-servidor.ts` y `actions/aces.ts` — el pokémon as:
  los turnos de su historial y sus líneas en la historia (puro, con tests),
  la copia que se pone al día con su captura (`sincronizarAs`, que llaman las
  acciones del Equipo y PC; `soltarAs` al borrar una captura) y elegirlo o
  quitarlo. La ficha con la caja para elegir está en `components/ace-badge.tsx`
  (`ElegirDeLaCaja`) y el botón «Hacerlo as», en la ficha de `equipo/ficha-del-tablero.tsx`.
- `lib/companero.ts` y `components/companero.tsx` — el compañero de la
  cabecera: los datos (el as, si ha caído, la última victoria y la última
  baja) y el muñequito con sus reacciones, que se deciden una vez por página
  aunque la cabecera esté dos veces (móvil y ordenador). Las animaciones van al
  final de `globals.css` (`companero-…`); el interruptor, en
  `perfil/companero.tsx`, con la cookie `hexaapp-companero`.
- `lib/gritos.ts` — los gritos en el navegador (Web Audio, desbloqueo, preferencia
  del dispositivo y `TONO_DE_CAIDO`; lo de Añil no tiene grito y ni se pide). `components/gritos-del-locke.tsx` va en el
  layout y le dice qué estilo pide el juego; `app/api/grito/[estilo]/[id]` los
  sirve (ver arriba); `perfil/gritos.tsx` es el selector de *Mi perfil*. Ahí
  mismo, `sonarBip` y su preferencia: los bips del menú, que suenan desde `Hoja`
  (abrir), el tablero (cambiar de caja) y `SubmitButton` / `ConfirmSubmit`.
- `lib/anil.ts` y `lib/anil.json` — lo propio de Pokémon Añil (pokémon, formas
  y megas nuevas, tipos, movimientos, potencias, megapiedras, objetos),
  `esPokemonAnil`, `GENERACION_ANIL` y `spritesDeAnil`. Se rehace con
  `scripts/anil.py` (datos, también `lib/habilidades-anil.json` y
  `scripts/anil-objetos.json`) y `scripts/anil-sprites.py` (dibujos en
  `public/anil`, `lib/anil-sprites.json` y `lib/anil-quietos.json`).
  `components/juego-del-locke.tsx` es el contexto que dice a los buscadores y
  a la ficha si el locke es de Añil.
- `lib/partida/` — leer la partida de Añil: `marshal.ts` (el lector de
  Marshal), `essentials.ts` (equipo, cajas y lo de cada pokémon, en el
  navegador), `traducir.ts` (a los nombres de la app, en el servidor, y la
  comprobación de lo que llega) y `plan.ts` (quién es quién, la ruta y qué se
  hace, sin base de datos). Acciones en `actions/partida.ts` (`verPartidaAction`,
  `aplicarPartidaAction`), pantalla en `equipo/leer-partida.tsx`. Tablas:
  `lib/anil-internos.json` (`scripts/anil.py`) y `lib/anil-mapas.json`
  (`scripts/anil-mapas.ts`). Pruebas con `tests/partidas/anil.rxdata`, que
  genera `scripts/partida-de-prueba.rb` con el Marshal de Ruby. `caer` (en
  `lib/caja-servidor.ts`) es la caída sin apuntarla para deshacer. En
  `aplicarPartidaAction` el orden importa: primero lo que no toca nada
  (fichas y dibujos, con tope), luego las escrituras dentro de un
  `try` que, si falla, apunta lo hecho para deshacer.
  Los **juegos oficiales**: `lib/partida/oficial/` (`index.ts` reconoce el
  juego y llama al lector: `gen12.ts`, `gen345.ts`, `gen67.ts`; `comun.ts`
  con el descifrado y el formato común, `letras.json`), `traducir-oficial.ts`
  (con `oficial-tablas.json`) y `formato.ts` (qué partida va en cada locke).
  Tablas con `scripts/partidas-oficiales.py`; pruebas con las partidas que
  monta `tests/partidas-falsas.ts` alrededor de los pokémon de
  `tests/partidas/pk` (de las pruebas de PKHeX).
- `lib/habilidades.ts` (con `habilidades.json`, de `scripts/habilidades.py` y
  PokéAPI) — nombre, descripción y las de cada pokémon; en Añil, las de Añil.
- `lib/megas.ts` (con `megas.json`, de `scripts/megas.py`) — `megaPorPiedra`:
  la mega que se enseña si lleva su megapiedra.
- `public/iconos-de-caja/` (y `shiny/`) con su lista en
  `lib/iconos-de-caja.json` (cuáles hay, cuáles no tiene Espada y Escudo y los
  alias de las formas iguales a otra) — los iconos de caja del paquete de
  Essentials, ya recortados. Se rehacen con `scripts/iconos-de-caja.py`.
- `public/sprites-animados/` (y `shiny/`) con su lista en
  `lib/sprites-animados.json` — los animados en tira de Essentials, del #650 en
  adelante y las formas. Se rehacen con `scripts/sprites-animados.py` (Python,
  Pillow y pyoxipng) a partir del paquete y de `scripts/sprites-animados-formas.json`.
- `lib/sprites-de-quinta.ts` (direcciones de Blanco y Negro, `pokemonDeLaImagen`
  y la cookie) y `components/sprite-pokemon.tsx` (`SpritePokemon`, que elige y
  recorta, y el proveedor del estilo que pone el layout). Todo `<img>` de un
  pokémon pasa por ahí; `perfil/sprites.tsx` es el selector. **En grande, el
  pixel art se amplía un número entero de veces** (`useHueco` y
  `vecesEnteras`): mide el hueco y la densidad de la pantalla y elige cuántos
  píxeles de pantalla da a cada píxel del dibujo. Se vio en la ficha del as: un
  sprite de 96 a unas 6,3 veces (con el zoom de Windows) sacaba unos píxeles de
  6 y otros de 7, los bordes se veían rotos, y la tira además se salía del
  recuadro y cortaba el sombrero de Meowscarada. Se elige el entero más cercano
  (si no cabe, el de abajo, con un 4 % de holgura); por debajo de 2,5 píxeles
  por píxel se deja como antes, porque ahí casi no se nota y redondear lo
  dejaba a la mitad.
- `equipo/intercambio.tsx` — el formulario plegado de intercambiar, en la
  ficha; lo guarda `intercambiarAction`.
- `equipo/debilidades.tsx` — las debilidades y resistencias de la pestaña
  Combate; las cuenta `debilidadesDe` en `lib/tipos.ts`.
- `components/cabecera-de-ficha.tsx` — la cabecera de la ficha de un pokémon
  (Equipo y PC, cementerio y hall). `tiposParaVer` en `lib/tipos.ts` le da los tipos.
- `lib/historia.ts` (cuentas, con pruebas) y `lib/historia-servidor.ts`
  (consultas y permisos) — la historia de un pokémon desde su captura, su baja o
  su casilla del hall. `components/historia-del-pokemon.tsx` la pinta y
  `actions/historia.ts` la pide.
- `hall-de-la-fama/entrada.tsx` — la entrada al Hall de la Fama, el aviso de las
  que no has visto (se recuerdan en `localStorage` por equipo: si cambia un
  pokémon, es otra entrada) y el botón de cada equipo.
- `lib/evoluciones.ts` — a qué evoluciona cada uno, con sus formas. **Sin filtro por juego**: se probó a quitar lo que no existía en él, pero la generación salía de la región (HeartGold contaba como 2ª y se quedaba sin Roselia ni Magnezone) y entre randoms y fangames se sale siempre de la pokédex del juego. Las formas que no se consiguen evolucionando (megas, Gigamax, tótems, las de combate) van en `NO_SE_EVOLUCIONA_A`.
  Los datos salen de `scripts/generate-evoluciones.ts` a `lib/evoluciones.json`.
- `lib/campeon.ts` — `getCampeonDelLocke`: quién ha ganado el locke (mayoría de
  jornadas en el dual, abandono o final) y si queda algo por jugar. **Cualquier
  pantalla que quiera saber el campeón, aquí**; `lib/hall.ts` lo usa para el
  podio y el "cómo lo ganó". `lockeTerminado()` es si se abre el hall, que no
  siempre es tener campeón (solitario y Soul Link se acaban con la Liga).
- `lib/solitario.ts` — cómo va una partida de una persona (hitos, siguiente,
  caídos, zonas). `components/resumen-solitario.tsx` lo pinta, y sale tanto en
  la portada como en la pantalla de la tabla.
- `lib/buzon.ts`, `app/actions/buzon.ts` y `(app)/hexapost/` — HexaPost: tipos,
  estados, límites y la pantalla de la que vienes (probado en
  `tests/buzon.test.ts` y en `tests/interfaz/3-buzon.prueba.mjs`); las
  acciones con sus permisos; y la página, con la cara del que manda y la
  bandeja del Creador. Su punto de aviso sale de `lib/novedades.ts`
  (`sqlDelBuzon`, y `getAvisoDelBuzon` cuando no hay locke elegido).
- `lib/seguridad.ts` (las reglas: cuánto esperar tras los fallos y qué
  contraseñas valen, probadas en `tests/seguridad.test.ts`) y
  `lib/intentos-de-entrada.ts` (los fallos en la base de datos). Las cabeceras
  están en `next.config.ts` y la versión de las sesiones en `lib/auth.ts`
  (`getCurrentUser`) y `lib/sesion-token.ts`. Lo prueba en la app de verdad
  `tests/interfaz/5-seguridad.prueba.mjs`.
- `lib/imagen-para-compartir.ts` — lo común de las imágenes que se dibujan
  con `next/og` para mandar al grupo: colores, letras, cómo se pasan a satori
  las imágenes guardadas y los iconos. Lo usan `api/resumen/[id]` (el locke) y
  `api/pokemon/[id]` (la tarjeta de un pokémon), y `lib/compartir-imagen.ts`
  es el lado del navegador (menú de compartir o descarga). Cada ruta nueva de
  estas necesita sus letras en `outputFileTracingIncludes` de `next.config.ts`.
- `lib/solicitudes.ts` y `app/actions/solicitudes.ts` — pedir, aceptar y
  rechazar un locke en solitario. Los formularios están en
  `competiciones/solitario-forms.tsx` (pedirlo o crearlo) y
  `admin/solicitudes.tsx` (responderlas).
- `lib/plantillas.ts` y `lib/level-caps-de-fabrica.ts` — los hitos que trae
  cada juego. El segundo es la semilla (por región); el primero, lo guardado
  (por juego). `admin/level-caps/` es el editor y
  `app/actions/plantillas.ts` las acciones, incluida la de traerlos a un locke.
  **Los nombres van como en los juegos en español**, comprobados contra WikiDex:
  si se añade una región, se comprueba igual y no de memoria (el primer
  borrador tenía media Alola en inglés).
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
  acciones que pueden cambiar el resultado de un combate. De cuántos es la
  serie de cada jornada lo dice `alMejorDeDeLaJornada` (`lib/perfiles-de-locke.ts`);
  la pinta `SerieDeJornada` en `jornadas/page.tsx`, y la cambia
  `cambiarSerieDeJornadaAction` (selector `ElegirSerie`).
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
- `lib/puntos-huerfanos.ts` — borra los puntos automáticos cuyo combate o
  royale ya no existe. Llamarlo después de cualquier borrado que se lleve
  combates por delante (jornada, jugador, cuenta).
- `lib/tipos.ts` — los tipos, la tabla de efectividad **de cada generación** y
  qué es cada pokémon en cada una. Los datos salen de
  `scripts/generate-tipos.ts` a `lib/tipos.json` (unos 30 KB); este módulo solo
  consulta; `coberturaOfensiva` es la cuenta de a qué le pega un equipo.
  `components/cobertura-de-tipos.tsx` es la calculadora (con el planificador:
  el `Selector` de la ficha y los pokémon de tu caja que le pasa
  `notas/page.tsx`), y vive dentro de
  `notas/page.tsx`.
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
  `APARTADOS_CON_AVISO` son los apartados con punto propio (hoy, Reglas).
- `lib/reglas.ts` — si el locke ya ha empezado (de eso depende que un cambio de
  reglas se avise) y qué líneas ha ganado y perdido una regla.
- `lib/coronas.ts` — quién se pasó cada gimnasio antes que nadie.
- `lib/logo.ts`, `components/logo.tsx` y `scripts/iconos.ts` — el logo (única
  copia), su componente y el script que saca de él todos los iconos.
- `lib/estilo.ts` y `components/icono.tsx` — el aspecto elegido (clásico o
  nuevo, por cookie) y los iconos dobles del menú. El CSS del nuevo está al
  final de `globals.css`.
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
  Cada entrada lleva su **`tipo`** (muerte, combate, hito, puntos, ruleta,
  objeto) para los filtros de `/actividad`; los nombres, iconos y colores de
  cada tipo están en `TIPOS_DE_ACTIVIDAD` de `components/activity-feed.tsx`,
  que es donde se pintan. Los tramos (Hoy, Ayer, Esta semana…) se cuentan por
  días de Madrid, como los rótulos de antes.
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

**Seguridad, pendiente o a decidir**: `npm audit` sigue marcando **Prisma**
(alto): el arreglo es pasar a Prisma 7, que es un cambio grande, y el fallo
(`deepmerge-ts`, en su herramienta de configuración) no lo puede tocar ningún
usuario; se deja para cuando se migre con calma. La **verificación en dos
pasos dentro de la app para la cuenta del Creador** se le ofreció y quedó para
cuando la pida. Recomendado al usuario: bajar de vez en cuando una copia desde
Administración y guardarla fuera de Neon (las copias viven en la misma base de
datos, y llevan las contraseñas cifradas y las notas: el archivo hay que
guardarlo bien). Del repaso de octubre quedan **a propósito sin hacer**: la CSP
con `script-src` (necesita nonce en cada página; con las imágenes blindadas el
riesgo es pequeño) y una copia automática fuera de Neon.

**Desplegada**: la aplicación está en Vercel con la base de datos en Neon, y
cada push a la rama de trabajo se publica solo. `DEPLOY.md` sigue valiendo para
montarla de cero.

**Pendiente pequeño**: el mapa de fondo de Johto que hay subido mide 215×149
píxeles y se ve borroso. Basta con subir uno más grande desde Administración →
Mapas; las zonas no se mueven, porque se guardan en unidades del lienzo y no en
píxeles de la imagen. De los diez mapas, solo Johto tiene zonas hechas: **las
cuatro islas de Alola están vacías** y hay que ponerles su imagen y dibujarles
las zonas isla por isla (y bajarles el relleno, que son dibujos detallados).

**Repaso de pantallas**: el Palmarés ya es una tabla de almanaque, y el usuario
la aprobó viéndola. **Mis notas se queda como está**: se probó
como cuaderno (renglones, margen, anillas y pestañas de separador) y **no gustó
nada**; no volver a proponerlo.

**Hecho, pero conviene saberlo**: la aplicación ya sirve **de dos a ocho
jugadores** (jornadas, final y marcador), y todo eso se aplica **a los lockes
nuevos**: el que está en marcha tiene `maxPlayers` a 6 y se comporta igual que
siempre. Al crear un dualocke el campo **"Jornadas previstas"** viene con 6 y
es obligatorio, que es de donde sale el "gana quien se lleve 4"; si uno de antes
no lo tiene, el marcador cuenta con 6 igualmente.

**Decidido tras el betatesting**: en el dualocke el campeón es el del
marcador (mayoría de jornadas); la Jornada Final solo decide un empate y, si no,
se juega igual sin cambiar nada. Ver "Quién gana el locke" en el apartado 3.

Se planteó esconder Retos y la Ruleta en los lockes de dos y el usuario lo
descartó: la ruleta se usa para sortearle algo al ganador y los retos también
pueden caer.

**Pokémon Añil, lo que queda**: si se quiere, una **plantilla de level caps de
Añil** (los niveles están en su plugin: 14, 23, 30, 39, 49, 54, 59, 66, 75 y
100; faltan los nombres de los líderes). Las estadísticas no salen porque la
app no las enseña.

**Leer la partida, lo que queda**: probarla con **partidas de verdad** de
la 3ª generación para abajo (el usuario no tiene): del Añil, de X, de
SoulSilver y de una de Blanco (hackeada) ya están probadas con las suyas; la
1ª, la 2ª y la 3ª, con partidas montadas con la forma de cada juego y pokémon
de verdad. Un pokémon metido con PKHeX sin sitio de captura se apunta sin
ruta, que es lo que dice su partida. Fuera a propósito: las
versiones japonesas y coreanas (otra disposición y otras letras), Let's Go y
de la 8ª en adelante (la app no tiene esos juegos) y los fangames que no son
Añil. No se colocan como en el juego: los nuevos van al equipo si estaban en
el del juego y hay hueco, y si no a la caja; los que ya estaban no se mueven.

**Equipo y PC, lo que queda**: nada de lo hablado. Límites conocidos: una
captura apuntada **sin línea** no está en el tablero hasta que sube, así que no
se puede mover ni dar por muerta antes; y una baja **escrita a mano** en el
cementerio (sin elegirla de la caja) sigue sin saber de vínculos.

Ideas comentadas y no hechas (al día en octubre; lo que ya existe se quitó
de aquí: el Equipo y PC con los vivos, el enlace público, el confeti, la barra
del sistema con el color, el Equipo y PC a lo ancho en el ordenador):

- **Avisos en el móvil** (notificaciones push): «te toca contra X», resultados,
  retos, reglas cambiadas, votaciones del MVP. Lo que más cambiaría el día a
  día. Necesita dos claves en Vercel.
- **Aviso de level cap al leer la partida**: el .sav y el main guardan el
  nivel de cada pokémon y aún no se usa; podría avisar de quién se pasa del
  cap del próximo gimnasio.
- **Recordatorio de leer la partida** en Equipo y PC («la última vez, hace 5
  días»).
- **Resumen de jornada como imagen** para pegarlo en el grupo de WhatsApp
  (se reaprovecha la del resumen del locke).
- **Estadísticas del locke**: la causa de muerte más repetida, la ruta más
  letal, el pokémon que más ha caído entre todos, la racha más larga.
- **Logros automáticos** además de los títulos a mano ("sin bajas hasta la 4ª
  medalla", "tres coronas"…).
- **Aviso al organizador** cuando alguien se retira o pierde el locke, con lo
  que queda en el aire por ello.
- **Apuestas entre jornadas**: proponer y votar, como dicen las reglas.
- **Retoques sin elegir**: vibraciones cortas al soltar o evolucionar, cifras
  que cuentan hasta su número, el aviso de abajo con «Deshacer» en todas las
  pantallas y teclas rápidas en la ficha.

Hay una **guía de uso en PDF** hecha con capturas de la aplicación (26
páginas, escrita para el móvil), y ahora **vive en el repositorio**, en
`guia/`: el texto en `guia.html` y tres scripts que preparan la partida de
ejemplo, sacan las fotos y arman el PDF. La primera versión no se guardó y se
perdió con la máquina donde se hizo, así que hubo que rehacerla entera. Las
fotos no se suben (se rehacen en cinco minutos), pero **el PDF sí**, en
`public/guia-de-uso.pdf`, porque es el que sirve el apartado *Guía de uso*.
Instrucciones en `guia/README.md`; **el índice y la cuenta de páginas** de ese
apartado están escritos a mano y hay que tocarlos si se mueve una página.

**Los scripts de la partida de ejemplo siguen a la app** (octubre): elegir el
juego va en *Competiciones → Ajustes*, donde el formulario ya viene abierto
(un toque en el título lo cerraría); crear el Soul Link, en la pestaña
*Nueva*; la ficha completa se apunta desde la pestaña *Combate* de la ficha;
las capturas nuevas caen solas en el equipo si hay hueco, así que «Al equipo»
se salta si no hace falta; y los avisos del navegador se aceptan sin romper si
otro script ya lo hizo. Si un cambio de la app mueve algo de eso, el script
se para con un «Timeout» en el paso que sea: se mira qué ha cambiado y se
ajusta ahí.

**Rehacer las fotos empieza por una base recién sembrada, y mejor que sea
otra**: en cuanto se prueba algo a mano, la partida de ejemplo deja de servir
para capturas. Ya no se borra la de trabajo con `--force-reset`: se crea una
aparte (`hexaapp_guia`), se le pasa el esquema y la semilla, y la aplicación se
compila y se arranca apuntando a ella con `DATABASE_URL`/`DIRECT_URL`. Los
pasos están en `guia/README.md`. Conviene hacer un `pg_dump` justo después de
`datos.mjs`: si hay que repetir las fotos, se restaura y listo, sin volver a
pasar los datos. Y `datos.mjs` arranca
**eligiendo el juego de la edición**, que no sobra: la semilla no lo pone, y sin
juego no hay región, así que el mapa dice "esta edición no tiene juego elegido"
y se cae detrás todo lo que necesita rutas —las capturas y las bajas con su
zona—. Faltaba desde siempre; quien hizo la guía la primera vez lo puso a mano
por la interfaz y no quedó escrito, así que el proceso del README no funcionaba
de principio a fin.

**Las guías no marcan nada como nuevo** (lo pidió el grupo): ni página de
novedades ni etiquetas en el índice. Lo que cambia se reescribe en su página, o
se añade una si de verdad hace falta. Desde el 4 de octubre: la página de *Lo
nuevo* fuera, una hoja para *La ficha de cada pokémon*, y *Notas y planificar
equipo* en lugar de la cobertura de tipos. Los datos de esas fotos salen de
`guia/datos-equipo.mjs`, y la de los equipos de la repetición necesita el
servidor arrancado con `guia/showdown-falso.cjs` (ver `guia/README.md`).

**Las fotos de las guías nunca salen de la base de datos del usuario.** Lo dejó
claro: la base de la guía es la semilla más los `datos*.mjs`, con cuentas de
ejemplo sin foto. **La única excepción, pedida por él, es el mapa**: las fotos
del mapa y del editor usan su **Isla Melemele** —el dibujo y las zonas que
colocó a mano, sin ninguna captura suya—, guardada en `guia/mapa-melemele.webp`
y `guia/mapa-melemele.json`. `guia/datos-mapa.mjs` la mete directamente en la
base (el editor no tiene «importar»; por eso exige `DATABASE_URL` en el
entorno y no lee la de `.env`) y monta el *Hexalocke Alola* de Draka con
capturas, un fallo y una baja en la isla. Las zonas de fábrica de Johto son un
esquema sin dibujo y no enseñaban cómo queda un mapa hecho. Si hay que sacar
otro mapa suyo, se exporta igual: solo `MapRegion` y `MapZone`, nada más.

**Dónde va cada cosa**: si lo hace cualquiera, en la guía de uso; si es de llevar
un locke —emparejar, anotar resultados, repartir premios—, en la del
administrador.

**El índice de la guía de uso estaba mal desde antes** y se ha rehecho: le
faltaban dos páginas —el sorteo de préstamos y el modo sin conexión— y de ahí
para abajo los números no cuadraban con los pies. Va a mano, así que **hay que
mirarlo cada vez que se mueve una página**; ahora hay 24 entradas y la última es
la 26. Los **pies** y los comentarios de cada hoja sí se pueden renumerar por
orden con un par de líneas de script, que es lo que se hizo al meter las tres
páginas nuevas.

**Y el de dentro de la aplicación es otro**, en `guia/page.tsx`, también a mano:
se había quedado en 22 páginas y sin *El palmarés*, con todo lo de detrás
corrido un número. Son dos sitios y **hay que tocar los dos**.

**Al rehacer las fotos, cuidado con lo que se pliega**: una jornada terminada
se pliega sola, y lo de dentro —los equipos, cambiar el resultado— existe pero
no se ve, así que Playwright se queda esperando un clic que nunca llega. Tanto
`datos.mjs` como `capturas.mjs` abren lo plegado antes de tocar nada
(`section.card details:not([open]) summary`), **de una en una y volviendo a
buscar**: con dos jornadas plegadas, recorrer la lista de golpe se quedaba
esperando a la segunda, que al abrir la primera ya no era la misma. Le pasará lo mismo a cualquier
cosa que se esconda: si un guion de la guía se cuelga en un botón que "está
ahí", es esto.

**Una hoja de la guía no crece**: lo que no cabe se recorta y `pdf.mjs` solo
avisa. El aviso mira ahora **también el pie**: el pie va pegado abajo por
encima de todo, y un texto largo se le metía debajo sin que la hoja llegara a
desbordarse, así que antes no avisaba. Con `GUIA_VISTAS=carpeta` deja además una
foto de cada hoja, para revisarlas sin visor de PDF. La página de las jornadas se quedó **clavada en el límite** al añadirle
la línea de que se pliegan; para que cupiera se recortó su entradilla. Si hay
que meter algo más ahí, hay que quitar otra cosa.

**Para medir pantallas** hay un cuarto script, `guia/medir.mjs`, que no hace
guía ninguna: entra en la aplicación y dice de cada ruta cuánto mide de alto,
cuánto pesa su HTML y cuántos nodos tiene, en móvil y en ordenador. Vive ahí
porque reaprovecha el mismo Playwright y la misma forma de entrar. Se usa antes
y después de tocar algo (`node guia/medir.mjs /jornadas /level-caps`).

Hay **dos guías**: la de uso (28 páginas, para todos) y la del administrador
(15, para quien lleva un locke; la 7 es la de los checkpoints de jornada). Comparten el estilo en `guia/estilo.css` para
que salgan idénticas. Rehacerlas mueve los números de página del índice escrito
a mano, así que conviene juntar varias novedades y hacerlo de una vez.

**Las guías llevan el aspecto nuevo**: Barlow y Barlow Condensed (las mismas
de la app, leídas de `node_modules/@fontsource`, así que hace falta
`npm install` antes de generarlas), títulos en mayúsculas, portada oscura con la
retícula de puntos y la media ball, y los pasos numerados en la casilla oscura
del "Nivel" de los level caps. **El papel sigue blanco** a propósito: se lee en
el móvil de día y, si alguien la imprime, no se gasta el tóner.

**Los iconos de la guía son los de la app**: en el HTML se escriben como
`<i data-i="Crown" class="oro"></i>` (el nombre del icono en lucide) y
`pdf.mjs` los cambia por su SVG justo antes de imprimir, con el mismo grosor
de trazo. Así el original se lee sin SVG por medio y no hay dos dibujos de la
misma cosa. Un nombre que no exista en lucide para el script con error.

**Lo que enseñan las fotos nuevas y por qué los datos van así**: `datos.mjs`
sube un **logo de mentira** (`guia/logo-ejemplo.svg`, un emblema sin letras
para no depender de fuentes al pasarlo a PNG), juega **dos jornadas** y no una
—las flechas comparan con la jornada anterior, y con una sola no hay nada—,
marca gimnasios en un orden que reparte **las coronas** entre Draka y Pablo, y
cambia una regla con el locke en marcha. La foto de esa regla se saca **como
Héctor**, que no administra (Pablo sí, y salían sus botones), y las dos fotos
—la regla resaltada y lo que ha cambiado— **en la misma visita**: al entrar, la
visita se apunta y en la siguiente la regla ya no sale como nueva.

**Las fotos se comprimen con mozjpeg** (sharp, calidad 80) en vez del JPEG del
navegador: a la vista iguales y un tercio menos. Con tres páginas más, los PDF
pesan menos que antes (3,1 y 1,4 MB).

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

**La rama principal es `claude/competition-management-app-k9ua86`**: en GitHub
no hay otra (ni `main`), así que cada push a esa rama es lo que publica Vercel.

**Pruebas (`npm test`).** Antes de publicar, el build corre las pruebas de
`tests/`: si alguna falla, se para antes de tocar la base de datos y de
compilar, Vercel no publica y se queda la versión anterior. Al cambiar una regla
del locke, se cambia o se añade su caso; al añadir una, se le escribe el suyo.

**Pruebas de la interfaz (`npm run test:interfaz`).** Después de `npm run
build` y con PostgreSQL en marcha. Tardan minuto y medio y no tocan la base de
trabajo. Pásalas antes de subir algo que cambie pantallas, y si cambias un
texto o un botón que usan para encontrar las cosas, cámbialo también en
`tests/interfaz/`. Si Playwright no encuentra su navegador:
`PLAYWRIGHT_CHROMIUM=/ruta/al/chromium npm run test:interfaz`.

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
64. **La gráfica, con dos vistas**: la de siempre y otra que descuenta a los que
    se retiran o pierden el locke desde la jornada en la que se van.
65. **La tarjeta del resumen releva a los level caps**: cuando están todos
    superados pasa a ser la del final, con el rival de cada uno y su foto, y su
    propio cartel de imágenes.
66. **El hall se ordena por cómo acabó el locke** y no por la tabla, y **los
    equipos de la final** se apuntan una vez en el cuadro y se traen de ahí.
67. **Entrar y volver sin molestias**: la sesión se estira al usarla, tras
    entrar se vuelve a la pantalla que se pedía y la aplicación se refresca
    sola al volver a ella.
68. **Cuarto repaso, con cada papel y en lockes raros**: la portada se entera
    de que el locke ha terminado, cada uno ve solo lo que puede hacer, y las
    plantillas de level caps pasan a tener los nombres de verdad.
69. **Flechas, coronas y reglas que avisan**: ▲▼ en la clasificación, 👑 para
    el primero en pasarse cada gimnasio, y las reglas que cambian con el locke
    en marcha encienden su propio punto y enseñan qué ha cambiado.
70. **Un aspecto nuevo, de prueba**: más sobrio y deportivo, se elige en Mi
    perfil y el de siempre sigue intacto.
71. **El aspecto nuevo, para todos**, y **el logo de cada edición** de fondo
    junto a su nombre en el resumen.
72. **Logo nuevo**: la media ball, fusión del hexágono de siempre y una ball de
    captura, en la aplicación, la pestaña y los iconos del móvil.
73. **Rematar el aspecto**: los emojis de dentro de las pantallas pasan a iconos
    de línea (con su color cuando lo necesitan) y fuera los últimos restos del
    azul marino del clásico.
74. **Pantalla de carga**: un esqueleto al momento al cambiar de sección, en vez
    de la pantalla de antes quieta hasta que llegan los datos.
75. **Las guías, al día**: las dos rehechas con el aspecto nuevo y fotos
    nuevas; la de uso gana una página de lo nuevo, otra de las reglas y sus
    cambios y una chuleta de iconos (26); la del administrador, una del logo y
    los datos de la edición (14).
76. **La guía ya no se queda vieja**: el PDF va con la huella de su contenido
    en la dirección y el service worker guarda solo la última.
77. **Checkpoints de jornada, archivadas de solo lectura, deshacer y resumen
    en imagen**: tras qué gimnasios toca jornada (y la portada enseña tu
    rival), las ediciones archivadas ya no se tocan salvo quien las lleva, un
    minuto para deshacer un gasto, y el locke terminado en una imagen para
    mandar al grupo desde el hall.
78. **Bienvenida sin locke**: quien no juega ninguno ya no ve doce pantallas
    con un candado, sino cómo entrar en uno, con el formulario de pedirlo.
79. **Rematar lo de antes y fotos nuevas en las guías**: las archivadas ya no
    enseñan formularios a los jugadores, y las guías tienen fotos de la jornada
    que toca, los checkpoints, deshacer y la bienvenida, con una página nueva
    en la del administrador para los checkpoints.
80. **Betatesting a fondo**: haciendo de usuario en dualockes, lockes de tres y
    de seis salieron una docena de fallos —archivar de más al crear, puntos
    que sobrevivían a su combate, series atascadas, lockes sin campeón al
    quedar uno— y se arreglaron todos, con quién descansa y apuntar a alguien
    por su usuario de regalo.
81. **El dualocke se gana por mayoría**: quien se lleve la mayoría de las
    jornadas es el campeón, la Jornada Final solo desempata, y el locke se
    puede seguir jugando hasta el final sin que cambie nada. El campeón sale
    ya de un solo sitio para todas las pantallas.
82. **Pruebas automáticas**: unos ochenta casos de las reglas del locke (quién
    gana, desempates, retiradas, emparejamientos, la final, los checkpoints)
    corren en cada publicación y la paran si alguno falla.
83. **Palmarés a medida**: cada uno ve su gente y elige a quién, con las
    cifras de todos sus lockes para comparar entre amigos, pestañas de grupo,
    dualocke y solitario, y los solitarios ganados por fin cuentan.
84. **Lockes de antes completos**: con los que jugaron sin cuenta, editables
    y vinculables cuando alguien se registra.
85. **Remates**: la captura sin conexión va sola a su locke, borrar una
    cuenta deja su nombre en los lockes de antes y las fotos de las guías
    enseñan el palmarés nuevo.
86. **Vitrina de títulos**: en el palmarés, cada uno enseña los lockes que ha
    ganado con su nombre y su logo.
87. **Historial con lo que gana tu gente**: las ediciones llevan logo y
    descripción, y entre ellas salen los lockes de fuera que ha ganado alguien
    de tu palmarés.
88. **Juegos en pareja**: Rojo y Azul, Rubí Omega y Zafiro Alfa… se eligen
    juntos y las versiones se reparten entre los jugadores, a mano o al azar.
89. **Fangames**: un locke puede ser de un juego no oficial, con su nombre y un
    juego de base para el mapa y los level caps, o desde cero.
90. **Logos en los lockes de antes**, que salen en el historial y en la vitrina.
91. **Guías al día**: las dos rehechas con lo nuevo y fotos con HeartGold y
    SoulSilver en pareja.
92. **Soul Link**: estilo de juego cooperativo y editable, con el Equipo y PC
    de todos, vínculos por ruta, muertes en pareja, evoluciones y deshacer.
93. **Equipo y PC para todos**: privado fuera del Soul Link, la baja elegida de
    la caja, sin conexión, Soul Link en las solicitudes y las guías (28 páginas).
94. **Evoluciones sin límite**: todas y con sus formas, en cualquier juego.
95. **Los remakes, con su generación**: los tipos de Rubí Omega ya son los de la 6ª.
96. **Elegir los tipos**: de la 1ª a la 5ª, los de su generación o los de ahora.
97. **Evolucionar en dos pasos**, con su deshacer al lado.
98. **Chapas de tipo** de los juegos en Equipo y PC y en la cobertura de tipos.
99. **Evolucionar como en los juegos**: la animación con su «Darle a la B».
100. **Detalles de app del móvil**: fichas que suben, tirar para refrescar y
     pantallas vacías con dibujo.
101. **Fondos de caja** como en el PC de los juegos, de prueba.
102. **Las cajas de los juegos**: sus fondos y su forma, cuatro como mínimo y
     cambiar de caja arrastrando o desde la ficha.
103. **Optimización**: de 5-10 viajes a la base de datos por pantalla a 2-3.
104. **Gritos**, la **entrada al Hall de la Fama** y la **historia de cada
     pokémon**.
105. **Lockes sin empezar**: se montan con tiempo y los días cuentan desde que
     se empiezan.
106. **Cosas del ordenador**: pegar y arrastrar imágenes, dos cajas a la vista
     y la ficha rápida de la clasificación.
107. **Papelera de jornadas**, **registro de errores**, transiciones entre
     pantallas y **el color del tema** en la barra del móvil, la pestaña y los
     detalles.
108. **Planificar equipo**: la cobertura de tipos con los pokémon de tu caja
     en una ficha con cuadrícula y buscador, y la cobertura ofensiva.
109. **Nombre de cada caja**, **ficha completa** con movimientos, **pegar de
     Showdown**, **registro de cambios** y **«Ver como»** para el Creador.
110. **Los equipos de la repetición**: especie y mote de los dos, del enlace de
     Showdown.
111. **Las dos guías al día**, contando la app como es: sin página de novedades,
     con la ficha de cada pokémon, el planificador y los equipos de la repetición.
112. **Repaso estético**: la ficha del pokémon por pestañas, teñida y con sprite
     animado; editor de equipos y Diagnóstico por pestañas; lo del ordenador; y
     rótulos y subtítulos iguales en toda la app. Las guías, con sus fotos al día.
113. **Iconos de tipo en SVG**: los cuadrados, centrados y nítidos a cualquier tamaño.
114. **Blanco y Negro en toda la app** (o HOME, a elegir), **fichas del cementerio y
     del hall** como la del Equipo y PC, y **bips del menú**.
115. **Iconos de caja** como estilo de sprites y **debilidades y resistencias** en la
     ficha, con la tabla de tipos a elegir.
116. **Intercambiar** un pokémon con los entrenadores del juego, desde su ficha.
117. **Revivir** a un caído; la baja se queda y sigue contando.
118. **Jornadas de dualocke** de un combate o al mejor de tres con el mismo equipo.
119. **Todos los pokémon animados** en su ficha, con los sprites de Essentials.
120. **Iconos de caja para todos**, con los de Essentials: rellenando los de Espada y Escudo o todos iguales y con shiny.
121. **Pokémon Añil**: sus pokémon nuevos, sus tipos y sus movimientos, solo en sus lockes.
122. **Añil completo** (formas, megas, habilidades, objetos y dibujos), **habilidad** en la ficha y **la mega con su megapiedra**.
123. **Los sprites de PokéAPI, por el servidor**: se bajan, recortan y guardan una vez.
124. **Repeticiones del servidor de Añil**: sus enlaces de pages.dev también sacan los equipos, solo en sus lockes.
125. **El compañero**: tu as en la cabecera, con su icono de caja, que celebra, llora y grita.
126. **El as, de la caja**: se elige de tu Equipo y PC, se pone al día solo y cada relevo queda en la historia.
127. **El compañero, con vida**: habla de lo suyo y del locke, duerme, se pasea y evoluciona en la cabecera.
128. **Los ases en el dualocke** (en el marcador) y **las fotos que faltaban, al perfil**.
129. **Leer la partida de Añil**: el Equipo y PC se pone al día con la partida del juego.
130. **Leer la partida de los juegos oficiales**, de la 1ª a la 7ª generación, y el Añil solo en el ordenador.
131. **Mi perfil, ordenado**: ficha de entrenador y pestañas.
132. **Competiciones y Administración, cada una con su cara**: el cartucho y la sala de control.
133. **Leer la partida, a prueba de sustos**: nada a medias, fechas acotadas y probado a lo bestia.
134. **Revisión general**: permisos que no tiran la pantalla y Actividad y Puntos más cortas.
135. **Calidad de vida**: rutas libres, buscador rápido, clasificación pública y confeti.
136. **El día de captura**, también al releer la partida, y a la vista en la ficha.
137. **Las guías, rehechas de cero** con la app de ahora.
138. **Exportar a Showdown** el equipo, al nivel del level cap.
139. **Repaso de pantallas** (reglamento, cartel del tope, bolsa, lápidas y
     duelos), grises legibles al sol y **pruebas de la interfaz**.
140. **Detalles de comodidad**: ✕ discretas, «Todos» en Actividad, gimnasios por
     venir plegados y el Mapa en orden natural.
141. **Deslizar entre cajas** en el móvil y causas largas que se abren al tocarlas.
142. **Palmarés como almanaque** y el logo de la portada que ya no tapa el texto en el móvil.
143. **Las fotos del mapa de las guías, con el Melemele del usuario** (dibujo y zonas hechas a mano).
144. **HexaPost** (nació como «Buzón»): errores, mejoras y cambios que cualquiera le manda a quien lleva la aplicación, con respuesta y aviso.
145. **El editor de mapas sin refrescos**: cada cambio se repinta solo, sin que la pantalla salte.
146. **Seguridad**: freno al login, sesiones que se cierran en todos los dispositivos, cabeceras y contraseñas de 8.
147. **Dependencias al día**: Next 16.4.3 y sharp 0.35.5 (fallos de seguridad), Dependabot y `LICENSE`.
148. **Sprites nítidos en grande**: el pixel art de las fichas se amplía por números enteros.
149. **El lienzo de los mapas arrastra sus zonas**: cambiar el tamaño ya no las deja fuera, y las que se quedaron se recolocan.
150. **Racha en la clasificación y tarjeta de un pokémon** para compartir.
151. **Remodelaciones**: portada con tarjeta grande y cartel «VS», jornadas como marcador, actividad por tramos con filtros, mapa agrupado por clase de zona y HexaPost compacto.
152. **El resultado, leído de la repetición**: ganador, diferencia y día sacados del enlace de Showdown.
153. **Repaso de seguridad**: imágenes que no pueden ejecutar código, sin redirecciones abiertas, capturas de HexaPost privadas y tope al registro de errores.
154. **Retoques del repaso de diseño**: filtros que se deslizan, Puntos más corto, filo de color en el mapa y tu combate una sola vez en la portada.
