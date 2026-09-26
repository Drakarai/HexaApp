/**
 * Datos de ejemplo del Hexalocke 2, sacados del PDF original.
 * Los usan tanto el seed de la terminal como la pantalla de instalación,
 * para que quien monte la aplicación no tenga que teclear las reglas ni los
 * level caps a mano.
 */

export const SAMPLE_COMPETITION = {
  name: "Hexalocke 2",
  slug: "hexalocke-2",
  game: "Pokémon HeartGold y SoulSilver",
  modality: "Random",
  description:
    "Segunda edición del Hexalocke. Seis jugadores, level caps por gimnasio, 5 jornadas y Final Four.",
  startingPoints: 5,
  maxPlayers: 6,
};

export const SAMPLE_RULES = [
  {
    category: "Modalidad",
    title: "Modalidad y juego",
    body: [
      "- El locke es de modalidad **random**: pokémon de ruta (con movimientos y habilidades aleatorios) y también los entrenadores normales e importantes (líderes, Alto Mando, rivales…).",
      "- Se juega la **2ª generación**, remake de DS (HeartGold y SoulSilver).",
      "- Ediciones por participante: HeartGold para Rodri, Enzo y Álex; SoulSilver para Héctor, Pablo y Draka.",
    ].join("\n"),
  },
  {
    category: "Modalidad",
    title: "Reglas básicas de locke",
    body: [
      "- Se puede capturar **un pokémon por ruta**. Si se escapa, lo matas o se inmola, te lo pierdes.",
      "- Si es **shiny** se puede capturar aunque ya tengas el encuentro de esa zona.",
      "- Si sale el mismo pokémon o uno de su misma rama evolutiva no se puede capturar, salvo que tenga forma alterna o rama distinta. Si el tuyo está muerto, sí puedes capturarlo en cualquier forma o etapa.",
      "- **Todos los pokémon llevan mote**. Sin mote no se pueden usar.",
      "- El locke no empieza hasta hacer el tutorial de captura y recibir pokéballs.",
      "- Si un pokémon muere, **muere de verdad**: se deja en una caja específica (normalmente la 8, llamada MUERTOS).",
      "- Los pokémon estáticos o de evento cuentan como captura extra, siempre que sean eventos diferentes.",
      "- Hay que mantener al equipo **al level cap** del siguiente gimnasio hasta superarlo.",
      "- No se sigue jugando hasta que todos hayan pasado el gimnasio correspondiente.",
      "- Saltarse estas reglas se considera hacer trampas.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Añadidos a las reglas generales",
    body: [
      "- Cada combate de gimnasio **se graba** y se envía al grupo para comprobar que no hay trampas.",
      "- Si se pilla a alguien haciendo algo ilegal habrá **juicio**: se expone el caso y se decide un castigo.",
      "- Cada 2 gimnasios hay una **jornada** estilo liga deportiva: 5 jornadas en total (2ª, 4ª, 6ª, 8ª medalla y Liga Pokémon).",
      "- Todos los entrenadores importantes tienen 6 pokémon y se juega en **combates fijos**.",
      "- Los entrenadores llevan movesets con sinergias con la habilidad y objetos en todos sus pokémon.",
      "- Los entrenadores tienen pokémon a etapa final a partir del nivel 35. Los iniciales son de 1ª etapa con 2 evoluciones.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Jornadas",
    body: [
      "- En cada jornada hay **1 combate por pareja**, 3 combates por jornada.",
      "- El orden se decide al principio del locke para que no haya líos.",
      "- Se rota siempre de rival: no se puede repetir enfrentamiento en otra jornada.",
    ].join("\n"),
  },
  {
    category: "Añadidos del Hexalocke",
    title: "Puntos y clasificación",
    body: [
      "- El locke va **a puntos**: todos empiezan con **5 puntos**.",
      "- En las jornadas los ganadores se llevan **1 punto**. Los perdedores no ganan nada.",
      "- Hay clasificación global: primero va quien más puntos tenga.",
      "- Desempates: primero **pokémon muertos**, y si sigue el empate, **diferencia de pokémon** en los combates de jornada.",
      "- La clasificación decide la **Final Four**: los 2 primeros se clasifican directos y del 3º al 6º pelean por las otras 2 plazas. La Final Four es un torneo y quien la gane es el ganador oficial.",
    ].join("\n"),
  },
  {
    category: "Aspectos importantes",
    title: "Mejoras de calidad de vida",
    body: [
      "- Las evoluciones por intercambio pasan a ser **por nivel**, y en general los pokémon evolucionan antes (como máximo full evolved a nivel 40).",
      "- Las evoluciones por amistad necesitan 160 puntos en vez de 220.",
      "- Las evoluciones diurnas y nocturnas pasan a ser **por piedras**.",
      "- Los objetos del suelo y los de la habilidad Recogida son **random**.",
      "- Todos los pokémon tienen 4 movimientos de base, aunque estén a nivel 1.",
      "- Potencia de movimientos y estadísticas base actualizadas a **9ª generación**, además de la tabla de tipos (Fantasma y Siniestro son neutros contra Acero).",
      "- El ratio de captura está duplicado.",
    ].join("\n"),
  },
  {
    category: "Aspectos importantes",
    title: "Recompensas y combates entre jornadas",
    body: [
      "- Se pueden hacer combates entre jornadas **apostando** algo: capturas, objetos, limitaciones en la partida del rival o incluso puntos.",
      "- Los límites de cada apuesta se deciden o se someten a **votación**: si hay mayoría, el combate se hace.",
      "- En cada jornada se mira la tabla global y se reparten recompensas según el puesto.",
    ].join("\n"),
  },
];

export const SAMPLE_LEVEL_CAPS = [
  { label: "Pegaso", cap: 13, kind: "GYM", badge: "Ciudad Malva" },
  { label: "Antón", cap: 17, kind: "GYM", badge: "Pueblo Azalea" },
  { label: "Blanca", cap: 19, kind: "GYM", badge: "Ciudad Trigal" },
  { label: "Morti", cap: 25, kind: "GYM", badge: "Ciudad Iris" },
  { label: "Aníbal", cap: 31, kind: "GYM", badge: "Ciudad Orquídea" },
  { label: "Yasmina", cap: 35, kind: "GYM", badge: "Ciudad Olivo" },
  { label: "Fredo", cap: 36, kind: "GYM", badge: "Pueblo Caoba" },
  { label: "Débora", cap: 41, kind: "GYM", badge: "Ciudad Endrino" },
  {
    label: "Alto Mando",
    cap: 50,
    kind: "ELITE_FOUR",
    notes:
      "Pendiente de decidir: level cap por cada miembro o directamente el del campeón.",
  },
  { label: "Liga Pokémon", cap: 50, kind: "CHAMPION" },
];

export const SAMPLE_ROULETTES = [
  {
    name: "Castigos de la jornada",
    description: "Para el que pierde su combate de jornada.",
    allowRepeats: true,
    options: [
      { label: "Monotipo la próxima ruta", weight: 1 },
      { label: "Sin objetos en el próximo gimnasio", weight: 1 },
      { label: "Liberar un pokémon de la caja", weight: 1 },
      { label: "Nivel del equipo -2 en el próximo combate", weight: 1 },
      { label: "Te salvas", weight: 2 },
    ],
  },
  {
    name: "Recompensas del líder",
    description: "Premios para quien va primero en la tabla global.",
    allowRepeats: true,
    options: [
      { label: "Captura extra en la siguiente ruta", weight: 2 },
      { label: "Elegir el objeto de un rival", weight: 1 },
      { label: "+1 punto", weight: 1 },
      { label: "Revivir un pokémon de la caja MUERTOS", weight: 1 },
    ],
  },
];

/** Parejas de las 5 jornadas del PDF, por nombre de usuario. */
export const SAMPLE_MATCHDAYS = [
  {
    label: "Jornada 1",
    milestone: "2ª medalla",
    pairs: [
      ["alex", "pablo"],
      ["draka", "rodri"],
      ["hector", "enzo"],
    ],
  },
  {
    label: "Jornada 2",
    milestone: "4ª medalla",
    pairs: [
      ["alex", "rodri"],
      ["enzo", "pablo"],
      ["draka", "hector"],
    ],
  },
  {
    label: "Jornada 3",
    milestone: "6ª medalla",
    pairs: [
      ["alex", "enzo"],
      ["hector", "rodri"],
      ["draka", "pablo"],
    ],
  },
  {
    label: "Jornada 4",
    milestone: "8ª medalla",
    pairs: [
      ["alex", "hector"],
      ["draka", "enzo"],
      ["rodri", "pablo"],
    ],
  },
  {
    label: "Jornada 5",
    milestone: "Endgame",
    pairs: [
      ["alex", "draka"],
      ["hector", "pablo"],
      ["enzo", "rodri"],
    ],
  },
];
