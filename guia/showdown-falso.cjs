/**
 * Una repetición de Showdown de mentira, para la foto de «Sacar los equipos de
 * la repetición». La aplicación la pide a replay.pokemonshowdown.com, y al
 * sacar las fotos no hace falta (ni siempre se puede) salir a internet: esto
 * contesta en su lugar. Lo usan la guía y las pruebas de interfaz, cargándolo
 * al arrancar:
 *
 *   NODE_OPTIONS="--require ./guia/showdown-falso.cjs" npm run start
 *
 * Es el combate de la Jornada 3 entre Draka y Pablo, con los nombres que
 * llevarían en Showdown.
 */
const real = globalThis.fetch;
const LOG = [
  "|player|p1|DrakaSD|1|",
  "|player|p2|Pablo_Hexa|2|",
  "|teamsize|p1|6",
  "|teamsize|p2|6",
  // El 9 de octubre de 2026 por la tarde, el día de las jornadas de la guía
  "|t:|1791565200",
  ...["Furret, F", "Graveler, M", "Weepinbell, M", "Quilava, M", "Noctowl, F", "Flaaffy, F"].map(
    (p) => `|poke|p1|${p}|`,
  ),
  ...["Croconaw, M", "Pidgeotto, M", "Onix, M", "Gastly, F", "Ledyba, F", "Sudowoodo, M"].map(
    (p) => `|poke|p2|${p}|`,
  ),
  "|start",
  "|switch|p1a: Colita|Furret, F|100/100",
  "|switch|p2a: Mordiscos|Croconaw, M|100/100",
  "|switch|p1a: Rocoso|Graveler, M|100/100",
  "|switch|p2a: Plumas|Pidgeotto, M|100/100",
  "|switch|p1a: Brasa|Quilava, M|100/100",
  "|switch|p2a: Torre|Onix, M|100/100",
  "|switch|p2a: Bu|Gastly, F|100/100",
  // Y cómo acaba, para «Leer el resultado»: gana Draka con cinco en pie
  "|faint|p1a: Rocoso",
  "|faint|p2a: Mordiscos",
  "|faint|p2a: Plumas",
  "|faint|p2a: Torre",
  "|faint|p2a: Bu",
  "|switch|p2a: Mariquita|Ledyba, F|100/100",
  "|faint|p2a: Mariquita",
  "|switch|p2a: Tronco|Sudowoodo, M|100/100",
  "|faint|p2a: Tronco",
  "|win|DrakaSD",
].join("\n");

globalThis.fetch = async (url, ...resto) => {
  const direccion = String(url instanceof Request ? url.url : url);
  if (direccion.startsWith("https://replay.pokemonshowdown.com/")) {
    return new Response(JSON.stringify({ id: "gen2ou-1", format: "[Gen 2] OU", log: LOG }), {
      headers: { "content-type": "application/json" },
    });
  }
  return real(url, ...resto);
};
