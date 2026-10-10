/**
 * El **Buzón**: donde cualquiera le cuenta a quien lleva la aplicación un
 * error, una mejora o un cambio que haría. Lo pidió el Creador para tener
 * algo mejor que mensajes sueltos por WhatsApp si la aplicación la empieza a
 * usar más gente.
 *
 * Aquí van las reglas, sin base de datos de por medio, para poder probarlas
 * (`tests/buzon.test.ts`) y para que el navegador use los mismos rótulos.
 */

export const TIPOS_DE_SUGERENCIA = {
  error: {
    rotulo: "Un error",
    icono: "🐞",
    pista: "Algo que no funciona, sale mal o da un fallo.",
    ejemplo: "Al apuntar una captura en la Ruta 2 me sale «Se ha roto algo»",
  },
  mejora: {
    rotulo: "Una mejora",
    icono: "💡",
    pista: "Algo que no hay y vendría bien tener.",
    ejemplo: "Que el mapa avise de las zonas que me quedan antes del gimnasio",
  },
  cambio: {
    rotulo: "Un cambio",
    icono: "🔄",
    pista: "Algo que ya está y harías de otra forma.",
    ejemplo: "Que la ruleta gire más rápido",
  },
} as const;

export type TipoDeSugerencia = keyof typeof TIPOS_DE_SUGERENCIA;

export function esTipoDeSugerencia(valor: string): valor is TipoDeSugerencia {
  return Object.hasOwn(TIPOS_DE_SUGERENCIA, valor);
}

/**
 * Por dónde pasa cada una. **Enviada** y **Leída** salen solas —la segunda en
 * cuanto el Creador abre el Buzón, para que quien la mandó sepa que alguien
 * la ha visto—; las otras tres las elige él.
 */
export const ESTADOS_DE_SUGERENCIA = {
  NUEVA: "NUEVA",
  LEIDA: "LEIDA",
  APUNTADA: "APUNTADA",
  HECHA: "HECHA",
  DESCARTADA: "DESCARTADA",
} as const;

export type EstadoDeSugerencia = (typeof ESTADOS_DE_SUGERENCIA)[keyof typeof ESTADOS_DE_SUGERENCIA];

export const ESTADOS: Record<EstadoDeSugerencia, { rotulo: string; clase: string }> = {
  NUEVA: { rotulo: "Enviada", clase: "border-white/15 text-slate-300" },
  LEIDA: { rotulo: "Leída", clase: "border-sky-500/40 text-sky-300" },
  APUNTADA: { rotulo: "Apuntada", clase: "border-amber-500/40 text-amber-300" },
  HECHA: { rotulo: "Hecha", clase: "border-emerald-500/40 text-emerald-300" },
  DESCARTADA: { rotulo: "No se hará", clase: "border-rose-500/40 text-rose-300" },
};

/** Los que puede poner el Creador a mano */
export const ESTADOS_QUE_SE_ELIGEN: EstadoDeSugerencia[] = ["LEIDA", "APUNTADA", "HECHA", "DESCARTADA"];

export function esEstadoDeSugerencia(valor: string): valor is EstadoDeSugerencia {
  return Object.hasOwn(ESTADOS, valor);
}

/** Las que siguen esperando algo del Creador */
export const ESTADOS_PENDIENTES: EstadoDeSugerencia[] = ["NUEVA", "LEIDA", "APUNTADA"];

export const LIMITES_DEL_BUZON = {
  titulo: 100,
  texto: 2000,
  respuesta: 1000,
  dispositivo: 300,
  /**
   * Cuántas se pueden mandar en 24 horas. Sobra para quien tiene algo que
   * contar y para el que se pone a mandar lo mismo diez veces
   */
  alDia: 5,
} as const;

/**
 * Las pantallas que se pueden elegir en «¿Dónde?». Se guarda la dirección y
 * no el nombre, que el menú cambia de rótulo según el locke («Puntos» es el
 * marcador en un dualocke).
 */
export const PANTALLAS_DEL_BUZON: { href: string; rotulo: string }[] = [
  { href: "/", rotulo: "Resumen" },
  { href: "/jornadas", rotulo: "Jornadas" },
  { href: "/retos", rotulo: "Retos" },
  { href: "/sorteo", rotulo: "Sorteo de préstamos" },
  { href: "/ruleta", rotulo: "Ruleta" },
  { href: "/final-four", rotulo: "La final" },
  { href: "/hall-de-la-fama", rotulo: "Hall de la fama" },
  { href: "/puntos", rotulo: "Puntos" },
  { href: "/muertes", rotulo: "Cementerio" },
  { href: "/actividad", rotulo: "Actividad" },
  { href: "/level-caps", rotulo: "Level caps" },
  { href: "/reglas", rotulo: "Reglas" },
  { href: "/palmares", rotulo: "Palmarés" },
  { href: "/mapa", rotulo: "Mapa de capturas" },
  { href: "/equipo", rotulo: "Equipo y PC" },
  { href: "/bolsa", rotulo: "Bolsa" },
  { href: "/notas", rotulo: "Mis notas" },
  { href: "/perfil", rotulo: "Mi perfil" },
  { href: "/competiciones", rotulo: "Ediciones" },
  { href: "/guia", rotulo: "Guía de uso" },
  { href: "/admin", rotulo: "Administración" },
];

export function rotuloDePantalla(href: string | null | undefined) {
  return PANTALLAS_DEL_BUZON.find((p) => p.href === href)?.rotulo ?? null;
}

/**
 * De qué pantalla viene quien abre el Buzón, para dejarla ya elegida: casi
 * siempre se entra justo después de ver el fallo. La más larga que encaje,
 * para que `/equipo?ver=…` sea Equipo y PC y no el Resumen.
 */
export function pantallaDeLaQueVienes(ruta: string | null | undefined) {
  if (!ruta || ruta.startsWith("/buzon")) return "";
  const camino = ruta.split(/[?#]/)[0];
  if (camino === "/") return "/";
  const encaja = PANTALLAS_DEL_BUZON.filter(
    (p) => p.href !== "/" && (camino === p.href || camino.startsWith(p.href + "/")),
  ).sort((a, b) => b.href.length - a.href.length);
  return encaja[0]?.href ?? "";
}

export type SugerenciaValida = {
  tipo: TipoDeSugerencia;
  titulo: string;
  texto: string;
  pantalla: string | null;
};

/** Lo que llega del formulario, ya limpio, o qué le falta */
export function validarSugerencia(entrada: {
  tipo: string;
  titulo: string;
  texto: string;
  pantalla: string;
}): { error: string } | { datos: SugerenciaValida } {
  const tipo = entrada.tipo.trim();
  if (!esTipoDeSugerencia(tipo)) return { error: "Elige si es un error, una mejora o un cambio." };
  const titulo = entrada.titulo.replace(/\s+/g, " ").trim();
  if (!titulo) return { error: "Resúmelo en una línea, que es lo que se ve en la lista." };
  if (titulo.length > LIMITES_DEL_BUZON.titulo) {
    return { error: `La línea de resumen es muy larga: hasta ${LIMITES_DEL_BUZON.titulo} letras. Lo demás, abajo.` };
  }
  const texto = entrada.texto.trim();
  if (!texto) return { error: "Cuéntalo un poco: qué hacías, qué pasó o qué cambiarías." };
  if (texto.length > LIMITES_DEL_BUZON.texto) {
    return { error: `Te has pasado de largo: hasta ${LIMITES_DEL_BUZON.texto} letras.` };
  }
  // Solo una de la lista: lo que no lo sea es «en general»
  const pantalla = PANTALLAS_DEL_BUZON.some((p) => p.href === entrada.pantalla) ? entrada.pantalla : null;
  return { datos: { tipo, titulo, texto, pantalla } };
}

/** ¿Puede mandar otra, con las que lleva en las últimas 24 horas? */
export function puedeMandarOtra(enUnDia: number) {
  return enUnDia < LIMITES_DEL_BUZON.alDia;
}
