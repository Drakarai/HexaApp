/**
 * Saca el nombre de cada mapa de Pokémon Añil para leer la partida: el
 * pokémon guarda el **número** del mapa donde se capturó (`@obtain_map`), y el
 * nombre («Ruta 10 Norte») está en los datos del juego. Escribe
 * `src/lib/anil-mapas.json` ({ "número": "nombre" }).
 *
 * Uso:
 *   npx tsx scripts/anil-mapas.ts <carpeta Data del juego>
 *   npx tsx scripts/anil-mapas.ts <Game.rgss3a>      (si el juego va empaquetado)
 *
 * El nombre es el que enseña el juego (`pbGetMapNameFromId` de Essentials
 * v21.1): el de `map_metadata.dat` si lo tiene, y si no el de `MapInfos.rxdata`
 * (el del editor de RPG Maker).
 */
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { leerMarshal, Diccionario, Objeto } from "../src/lib/partida/marshal";

const u32 = (b: Uint8Array, p: number) => (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0;
const siguiente = (k: number) => (Math.imul(k, 7) + 3) >>> 0;

/** Descifra un trozo de un archivo RGSSAD: XOR de 4 en 4 bytes con una llave que avanza */
function descifrar(b: Uint8Array, desde: number, largo: number, llave: number) {
  const salida = new Uint8Array(largo);
  for (let i = 0; i < largo; i++) {
    if (i > 0 && i % 4 === 0) llave = siguiente(llave);
    salida[i] = b[desde + i] ^ ((llave >>> (8 * (i % 4))) & 0xff);
  }
  return salida;
}

/** Los ficheros de un Game.rgssad / .rgss2a (versión 1) o .rgss3a (versión 3) */
function abrirArchivo(b: Uint8Array): Map<string, Uint8Array> {
  if (String.fromCharCode(...b.subarray(0, 6)) !== "RGSSAD") throw new Error("No es un archivo RGSSAD");
  const version = b[7];
  const ficheros = new Map<string, Uint8Array>();
  const latin = new TextDecoder("utf-8");
  if (version === 3) {
    const llave = (Math.imul(u32(b, 8), 9) + 3) >>> 0;
    for (let p = 12; ; p += 16) {
      const desde = u32(b, p) ^ llave;
      if (!desde) break;
      const largo = u32(b, p + 4) ^ llave;
      const magia = u32(b, p + 8) ^ llave;
      const largoDelNombre = u32(b, p + 12) ^ llave;
      const nombre = new Uint8Array(largoDelNombre);
      for (let i = 0; i < largoDelNombre; i++) nombre[i] = b[p + 16 + i] ^ ((llave >>> (8 * (i % 4))) & 0xff);
      p += largoDelNombre;
      ficheros.set(latin.decode(nombre).replace(/\\/g, "/"), descifrar(b, desde, largo, magia));
    }
  } else {
    let llave = 0xdeadcafe;
    for (let p = 8; p < b.length; ) {
      const largoDelNombre = (u32(b, p) ^ llave) >>> 0;
      llave = siguiente(llave);
      p += 4;
      const nombre = new Uint8Array(largoDelNombre);
      for (let i = 0; i < largoDelNombre; i++) {
        nombre[i] = b[p + i] ^ (llave & 0xff);
        llave = siguiente(llave);
      }
      p += largoDelNombre;
      const largo = (u32(b, p) ^ llave) >>> 0;
      llave = siguiente(llave);
      p += 4;
      ficheros.set(latin.decode(nombre).replace(/\\/g, "/"), descifrar(b, p, largo, llave));
      p += largo;
    }
  }
  return ficheros;
}

function datosDelJuego(origen: string): (nombre: string) => Uint8Array | null {
  if (statSync(origen).isDirectory()) {
    return (nombre) => {
      const ruta = path.join(origen, nombre);
      return existsSync(ruta) ? new Uint8Array(readFileSync(ruta)) : null;
    };
  }
  const ficheros = abrirArchivo(new Uint8Array(readFileSync(origen)));
  return (nombre) => ficheros.get(`Data/${nombre}`) ?? null;
}

function main() {
  const origen = process.argv[2];
  if (!origen) throw new Error("Uso: npx tsx scripts/anil-mapas.ts <carpeta Data o Game.rgss3a>");
  const leer = datosDelJuego(origen);
  const nombres: Record<string, string> = {};

  const infos = leer("MapInfos.rxdata");
  if (!infos) throw new Error("No encuentro MapInfos.rxdata");
  const mapas = leerMarshal(infos);
  if (!(mapas instanceof Diccionario)) throw new Error("MapInfos.rxdata no tiene la forma de siempre");
  for (const [id, info] of mapas.pares) {
    const nombre = info instanceof Objeto ? info.get("@name") : null;
    if (typeof id === "number" && typeof nombre === "string" && nombre.trim()) nombres[id] = nombre.trim();
  }

  // El nombre «de verdad» del mapa, el que sale en el juego, manda sobre el del editor
  const metadatos = leer("map_metadata.dat");
  let conMetadatos = 0;
  if (metadatos) {
    const tabla = leerMarshal(metadatos);
    if (tabla instanceof Diccionario) {
      for (const [id, datos] of tabla.pares) {
        const nombre = datos instanceof Objeto ? datos.get("@real_name") : null;
        if (typeof id === "number" && typeof nombre === "string" && nombre.trim()) {
          nombres[id] = nombre.trim();
          conMetadatos++;
        }
      }
    }
  }

  const destino = path.join(__dirname, "..", "src", "lib", "anil-mapas.json");
  writeFileSync(destino, JSON.stringify(nombres));
  console.log(`${Object.keys(nombres).length} mapas (${conMetadatos} con su nombre del juego) en ${destino}`);
}

main();
