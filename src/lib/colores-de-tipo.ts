/**
 * El color de cada tipo, el de siempre de los juegos y la Pokédex. Para teñir
 * lo que es de un pokémon (el fondo de su ficha), no para el texto: sobre el
 * oscuro de la aplicación se usan muy rebajados.
 *
 * Aparte de lib/tipos.ts para no cargar en el navegador la tabla de tipos
 * entera solo por los colores.
 */
export const COLOR_DE_TIPO: Record<string, string> = {
  normal: "#A8A77A",
  fighting: "#C22E28",
  flying: "#A98FF3",
  poison: "#A33EA1",
  ground: "#E2BF65",
  rock: "#B6A136",
  bug: "#A6B91A",
  ghost: "#735797",
  steel: "#B7B7CE",
  fire: "#EE8130",
  water: "#6390F0",
  grass: "#7AC74C",
  electric: "#F7D02C",
  psychic: "#F95587",
  ice: "#96D9D6",
  dragon: "#6F35FC",
  dark: "#705746",
  fairy: "#D685AD",
};
