import frasesDeEspecie from "@/lib/frases-de-especie.json";
import { TIPOS, tiposDePokemon } from "@/lib/tipos";
import { queEs } from "@/lib/evoluciones";
export { GENERICAS } from "@/lib/frases-cortas";

/**
 * Lo que dice el compañero cuando se le toca (ver components/companero.tsx),
 * como el pokémon que te sigue en HeartGold: «Brasas hace chisporrotear la
 * llama de su cola». Hay tres montones, y de los tres se va sacando:
 *
 * - **Las de su especie**, escritas una a una para los 1025 y lo de Añil, con
 *   lo que hace ese pokémon (`scripts/frases-de-especie/`, que junta
 *   `scripts/frases-de-especie.py` en `frases-de-especie.json`).
 * - **Las de su tipo**, para que haya más variedad y para las formas que no se
 *   parecen a su especie (un Vulpix de Alola no tiene llamas en la cola).
 * - **Las del locke**: lo que le está pasando a su entrenador ahora (ver
 *   `frasesDelLocke`). Esas las arma el servidor, que es quien lo sabe.
 *
 * Nada de esto toca la base de datos más que para saber qué pasa en el
 * locke, y solo al tocar al compañero: las frases van en el código y al
 * navegador solo viajan las del as de cada uno.
 *
 * Sin adjetivos con género: el mote no dice si es macho o hembra.
 */

const DE_ESPECIE: Record<string, string[]> = frasesDeEspecie;

const DE_TIPO: Record<string, string[]> = {
  normal: ["{n} se estira de arriba abajo", "{n} bosteza con muchas ganas", "{n} se rasca detrás de la oreja", "{n} te sigue a todas partes"],
  fire: ["{n} suelta una chispita sin querer", "{n} busca un rincón al sol", "{n} huele un poco a hoguera", "{n} te calienta las manos"],
  water: ["{n} se sacude y te salpica", "{n} busca un charco para chapotear", "{n} hace pompas", "{n} echa de menos el agua"],
  grass: ["{n} toma el sol con muchas ganas", "{n} huele a hierba recién cortada", "{n} se bebe el rocío de la mañana", "{n} mordisquea una hojita"],
  electric: ["{n} suelta chispitas al estirarse", "{n} se carga de electricidad frotándose", "{n} hace parpadear la pantalla de tu móvil", "{n} te da un calambrazo de cariño"],
  ice: ["{n} deja escarcha donde se sienta", "{n} te sopla y se te congela la nariz", "{n} busca un sitio fresquito", "{n} juega con un copo de nieve"],
  fighting: ["{n} entrena puñetazos contra el aire", "{n} hace flexiones a tu lado", "{n} calienta por si sale un combate", "{n} se pone en guardia de broma"],
  poison: ["{n} suelta un olor sospechoso", "{n} se relame con cara de travesura", "{n} te avisa de que no toques lo que pica", "{n} deja una gotita morada en el suelo"],
  ground: ["{n} escarba un hoyo para echarse en él", "{n} se revuelca en la tierra", "{n} se sacude el polvo", "{n} nota un temblor que tú no notas"],
  flying: ["{n} mira al cielo con ganas de volar", "{n} siente el viento en la cara", "{n} sigue con la mirada a los pájaros", "{n} quiere subir a lo alto de algo"],
  psychic: ["{n} adivina lo que vas a decir", "{n} hace levitar una piedrita", "{n} te mira como si te leyera la mente", "{n} medita un momento"],
  bug: ["{n} se esconde debajo de una hoja", "{n} busca algo dulce que comer", "{n} trepa por tu manga", "{n} mueve las antenas para saludar"],
  rock: ["{n} se queda inmóvil como una roca", "{n} se lima contra una piedra", "{n} colecciona piedras bonitas", "{n} aguanta lo que le echen"],
  ghost: ["{n} se ríe sin que se le vea", "{n} te da un susto por detrás", "{n} se vuelve medio transparente", "{n} sale de tu sombra"],
  dragon: ["{n} suelta un rugido de dragón", "{n} presume de escamas", "{n} mira desafiante a quien pasa", "{n} sueña con las alturas"],
  dark: ["{n} trama alguna travesura", "{n} se esconde en la sombra más oscura", "{n} sonríe con picardía", "{n} te quita algo de la mochila y te lo devuelve"],
  steel: ["{n} se saca brillo", "{n} hace un ruido metálico al moverse", "{n} aguanta los golpes sin inmutarse", "{n} huele un poco a hierro"],
  fairy: ["{n} reparte buen rollo", "{n} suelta un poco de polvo brillante", "{n} baila de puntillas", "{n} te sonríe con dulzura"],
};



/**
 * Las de su especie. Una forma que no se parece a su especie (otros tipos: un
 * Vulpix de Alola, un Raichu de Alola) no las usa, porque hablarían de otro
 * pokémon; se queda con las de su tipo.
 */
export function frasesDeSuEspecie(pokemonId: number, especie: string): string[] {
  const propias = DE_ESPECIE[String(pokemonId)];
  if (propias) return propias;
  const quien = queEs(pokemonId, especie);
  if (!quien) return [];
  const base = quien.especie.forms[0].id;
  const mismosTipos =
    tiposDePokemon(pokemonId, 9).join() === tiposDePokemon(base, 9).join();
  return mismosTipos ? (DE_ESPECIE[String(quien.especie.dex)] ?? []) : [];
}

/** Las de sus tipos, con los del locke (Añil cambia algunos) */
export function frasesDeSusTipos(pokemonId: number, generacion: number): string[] {
  return tiposDePokemon(pokemonId, generacion).flatMap((id) => {
    const slug = TIPOS.find((t) => t.id === id)?.slug;
    return slug ? (DE_TIPO[slug] ?? []) : [];
  });
}

/** Lo que le está pasando a su entrenador, para que lo comente */
export type ContextoDelLocke = {
  /** El rival de su próximo combate por jugar */
  proximoRival: string | null;
  /** El próximo gimnasio sin pasar y su nivel máximo */
  proximoGimnasio: { nombre: string; cap: number } | null;
  /** El rival de una victoria de los últimos días */
  victoriaContra: string | null;
  /** Un compañero de equipo caído en los últimos días */
  bajaReciente: string | null;
  /** Días desde que se capturó; null si no se sabe */
  dias: number | null;
  shiny: boolean;
  /** Si evolucionó en los últimos días */
  recienEvolucionado: boolean;
};

export function frasesDelLocke(c: ContextoDelLocke): string[] {
  const frases: string[] = [];
  if (c.victoriaContra) frases.push(`{n} sigue celebrando la victoria contra ${c.victoriaContra}`);
  if (c.bajaReciente) frases.push(`{n} echa de menos a ${c.bajaReciente}`);
  if (c.proximoRival) frases.push(`{n} está impaciente: te toca contra ${c.proximoRival}`);
  if (c.proximoGimnasio) {
    frases.push(`{n} entrena para ${c.proximoGimnasio.nombre}: nivel máximo ${c.proximoGimnasio.cap}`);
  }
  if (c.recienEvolucionado) frases.push("{n} todavía se está acostumbrando a su nueva forma");
  if (c.shiny) frases.push("{n} brilla un poco más de lo normal hoy");
  if (c.dias !== null && c.dias > 0) {
    const meses = c.dias / 30;
    frases.push(
      Number.isInteger(meses)
        ? `Hoy hace ${meses === 1 ? "un mes" : `${meses} meses`} que conociste a {n}`
        : `{n} lleva ${c.dias} ${c.dias === 1 ? "día" : "días"} a tu lado`,
    );
  }
  return frases;
}

