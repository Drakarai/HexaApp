import { esPokemonDeAnil } from "@/lib/anil";

/**
 * Los gritos de los pokémon, en el navegador.
 *
 * Suenan con Web Audio y no con `<audio>` por el iPhone: Safari solo deja
 * sonar algo si arranca dentro de un toque, y la evolución grita al final de
 * la animación, segundos después. Con Web Audio basta con **desbloquear el
 * sonido una vez** con el primer toque en la página (`desbloquear`), y a
 * partir de ahí suena lo que sea, cuando sea. De paso, con el móvil en
 * silencio no suena nada, que es lo que se espera.
 *
 * Los sonidos los sirve `/api/grito/…` en un formato que suena en todos (ver allí).
 */

export type PreferenciaDeGritos = "juego" | "clasicos" | "actuales" | "no";

const LLAVE = "hexaapp-gritos";

/** Lo que dice el juego del locke: clásicos hasta la 5ª. Lo pone el layout */
let clasicosPorElJuego = false;

export function gritosDelJuego(clasicos: boolean) {
  clasicosPorElJuego = clasicos;
}

export function leerPreferencia(): PreferenciaDeGritos {
  try {
    const guardada = window.localStorage.getItem(LLAVE);
    if (guardada === "clasicos" || guardada === "actuales" || guardada === "no") return guardada;
  } catch {
    // Sin localStorage (modo privado, bloqueado): lo de por defecto
  }
  return "juego";
}

export function guardarPreferencia(valor: PreferenciaDeGritos) {
  try {
    if (valor === "juego") window.localStorage.removeItem(LLAVE);
    else window.localStorage.setItem(LLAVE, valor);
  } catch {
    // Si no se puede guardar, vale para esta visita y ya
  }
  preferenciaEnMemoria = valor;
}

let preferenciaEnMemoria: PreferenciaDeGritos | null = null;

function preferencia() {
  preferenciaEnMemoria ??= leerPreferencia();
  return preferenciaEnMemoria;
}

let contexto: AudioContext | null = null;
let desbloqueado = false;

function elContexto() {
  if (contexto) return contexto;
  const Clase =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Clase) return null;
  contexto = new Clase();
  return contexto;
}

/**
 * Se llama en el primer toque de la página. En iOS hace falta además hacer
 * sonar algo dentro del toque: un silencio de una muestra.
 */
export function desbloquear() {
  if (preferencia() === "no" && !bipsPuestos()) return;
  const ctx = elContexto();
  if (!ctx || (desbloqueado && ctx.state === "running")) return;
  desbloqueado = true;
  if (ctx.state === "suspended") void ctx.resume();
  const silencio = ctx.createBufferSource();
  silencio.buffer = ctx.createBuffer(1, 1, 22050);
  silencio.connect(ctx.destination);
  silencio.start(0);
}

// Cada grito se baja y se decodifica una vez por visita
const guardados = new Map<string, Promise<AudioBuffer | null>>();

function direccion(pokemonId: number) {
  const pref = preferencia();
  const clasico = pref === "clasicos" || (pref === "juego" && clasicosPorElJuego);
  return `/api/grito/${clasico ? "clasico" : "actual"}/${pokemonId}`;
}

function cargar(pokemonId: number) {
  const ctx = elContexto();
  // Lo de Añil (Royaleon, sus formas) no tiene grito en ningún sitio: ni se pide
  if (!ctx || esPokemonDeAnil(pokemonId)) return Promise.resolve(null);
  const url = direccion(pokemonId);
  let pedido = guardados.get(url);
  if (!pedido) {
    pedido = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((datos) => (datos ? ctx.decodeAudioData(datos) : null))
      // Sin línea o sin grito: callado, que no es para tanto
      .catch(() => null);
    guardados.set(url, pedido);
  }
  return pedido;
}

/** Para que el grito esté listo cuando toque (la entrada al hall, la evolución) */
export function precargarGrito(pokemonId: number | null | undefined) {
  if (!pokemonId || typeof window === "undefined" || preferencia() === "no") return;
  void cargar(pokemonId);
}

/**
 * Que grite. `tono` por debajo de 1 lo hace más grave y más lento: es como
 * suena en los juegos el grito de un pokémon que se debilita.
 */
export function sonarGrito(
  pokemonId: number | null | undefined,
  { tono = 1, volumen = 0.6 }: { tono?: number; volumen?: number } = {},
) {
  if (!pokemonId || typeof window === "undefined" || preferencia() === "no") return;
  const ctx = elContexto();
  if (!ctx) return;
  void cargar(pokemonId).then((buffer) => {
    if (!buffer) return;
    if (ctx.state === "suspended") void ctx.resume();
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.playbackRate.value = tono;
    const ganancia = ctx.createGain();
    ganancia.gain.value = volumen;
    fuente.connect(ganancia).connect(ctx.destination);
    fuente.start();
  });
}

/** El tono del grito de un pokémon que cae */
export const TONO_DE_CAIDO = 0.72;

/**
 * Los «bips» del menú, como en los juegos: al abrir una ficha, al cambiar de
 * caja y al confirmar. Se generan aquí con un oscilador de onda cuadrada (la
 * de la Game Boy y la DS) en vez de bajarse ningún archivo, y van **muy
 * bajitos**: acompañan, no se oyen por encima de nada.
 *
 * Se quitan aparte de los gritos, en Mi perfil: hay quien quiere los gritos y
 * no los bips, o al revés.
 */
export type Bip = "abrir" | "caja" | "confirmar";

const LLAVE_BIPS = "hexaapp-bips";

export function leerBips(): boolean {
  try {
    return window.localStorage.getItem(LLAVE_BIPS) !== "no";
  } catch {
    return true;
  }
}

export function guardarBips(puestos: boolean) {
  try {
    if (puestos) window.localStorage.removeItem(LLAVE_BIPS);
    else window.localStorage.setItem(LLAVE_BIPS, "no");
  } catch {
    // Vale para esta visita y ya
  }
  bipsEnMemoria = puestos;
}

let bipsEnMemoria: boolean | null = null;

function bipsPuestos() {
  bipsEnMemoria ??= leerBips();
  return bipsEnMemoria;
}

/** Las notas de cada bip: frecuencia y duración en segundos */
const NOTAS: Record<Bip, [number, number][]> = {
  // Un toque agudo y corto, el de abrir el menú
  abrir: [[1318, 0.045]],
  // Dos que bajan, como al pasar de caja en el PC
  caja: [
    [1046, 0.035],
    [784, 0.045],
  ],
  // Dos que suben: lo de «hecho»
  confirmar: [
    [988, 0.05],
    [1318, 0.07],
  ],
};

/** Volumen de todos: la onda cuadrada suena fuerte aunque se le dé poco */
const VOLUMEN_DE_BIP = 0.035;

export function sonarBip(cual: Bip) {
  if (typeof window === "undefined" || !bipsPuestos()) return;
  // Sin un toque antes el navegador no deja sonar nada: mejor callado que a destiempo
  if (!desbloqueado) return;
  const ctx = elContexto();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  let cuando = ctx.currentTime + 0.005;
  for (const [frecuencia, duracion] of NOTAS[cual]) {
    const oscilador = ctx.createOscillator();
    oscilador.type = "square";
    oscilador.frequency.value = frecuencia;
    const ganancia = ctx.createGain();
    // Entra y sale en unos milisegundos: cortada a pelo, la onda chasquea
    ganancia.gain.setValueAtTime(0, cuando);
    ganancia.gain.linearRampToValueAtTime(VOLUMEN_DE_BIP, cuando + 0.004);
    ganancia.gain.setValueAtTime(VOLUMEN_DE_BIP, cuando + duracion - 0.01);
    ganancia.gain.linearRampToValueAtTime(0, cuando + duracion);
    oscilador.connect(ganancia).connect(ctx.destination);
    oscilador.start(cuando);
    oscilador.stop(cuando + duracion + 0.01);
    cuando += duracion;
  }
}
