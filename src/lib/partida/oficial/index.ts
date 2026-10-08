import { PartidaOficialNoValida, type PartidaOficial } from "./comun";
import { familiaGen67, leerGen67 } from "./gen67";
import { esPartidaG3, esPartidaG4, esPartidaG5, leerGen3, leerGen4, leerGen5 } from "./gen345";
import { esPartidaG12, leerGen12 } from "./gen12";

/**
 * Lee la partida de cualquier juego oficial de la 1ª a la 7ª generación: mira
 * qué es por su tamaño y por sus marcas (como PKHeX) y llama a su lector.
 */
export function leerPartidaOficial(bruto: Uint8Array): PartidaOficial {
  let datos = bruto;
  // DeSmuME añade 122 bytes de pie a las partidas de DS (.dsv); el juego no los usa
  if (datos.length === 0x80000 + 0x7a) datos = datos.subarray(0, 0x80000);
  const familia67 = familiaGen67(datos.length);
  if (familia67) return leerGen67(datos, familia67);
  if (esPartidaG5(datos)) return leerGen5(datos);
  if (esPartidaG4(datos)) return leerGen4(datos);
  if (esPartidaG3(datos)) return leerGen3(datos);
  if (esPartidaG12(datos)) return leerGen12(datos);
  throw new PartidaOficialNoValida(
    "No reconozco esa partida. Tiene que ser el .sav (o el main de 3DS) de un juego de la 1ª a la 7ª generación.",
  );
}

export { PartidaOficialNoValida, type PartidaOficial };
export { NOMBRE_DE_FAMILIA, GENERACION_DE, type Familia } from "./comun";
