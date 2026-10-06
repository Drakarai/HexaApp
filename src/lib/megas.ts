import oficiales from "./megas.json";
import { MEGAS_DE_ANIL } from "./anil";
import { queEs } from "./evoluciones";

/**
 * La megaevolución que se enseña cuando un pokémon **lleva su megapiedra**:
 * en la caja, el equipo y la ficha sale su mega (sprite, tipos y debilidades),
 * como en el menú del juego de Añil. Quitarle la piedra lo devuelve a su forma.
 *
 * Qué piedra es de quién sale de Essentials (`scripts/megas.py` para las de los
 * juegos; `scripts/anil.py` para las de Añil, donde hay megas inventadas —las
 * que sustituyen al Gigamax— y la Venusaurita pasa a ser la X). En un locke de
 * Añil valen las de Añil; en los demás, solo las de los juegos.
 *
 * Una piedra puede servir a varias formas (la de Toxtricity, a la Grave y a la
 * otra; la Flapletunita, a Flapple y a Appletun): se elige la mega que sale de
 * la forma que tiene el pokémon y, si ninguna, la primera de su especie.
 */

const OFICIALES = oficiales as unknown as Record<string, [number, number][]>;

export function megaPorPiedra(
  pokemonId: number | null | undefined,
  especie: string,
  objeto: string | null | undefined,
  conAnil: boolean,
): number | null {
  if (!pokemonId || !objeto) return null;
  const opciones = (conAnil ? MEGAS_DE_ANIL : OFICIALES)[objeto];
  if (!opciones) return null;
  const quien = queEs(pokemonId, especie);
  if (!quien) return null;
  const suyas = opciones.filter(([, desde]) => queEs(desde, "")?.especie.dex === quien.especie.dex);
  const elegida = suyas.find(([mega, desde]) => desde === pokemonId || mega === pokemonId) ?? suyas[0];
  return elegida ? elegida[0] : null;
}
