/**
 * **Ultrasol y Ultraluna con el mod de expansión** (PokemonUSUMExpansion, el
 * del Hexalocke 3, aleatorizado con nuestro pk3DS). La partida es la de USUM,
 * pero el mod usa números que el juego original deja libres:
 *
 * - **Habilidades** con un 9º bit (`0x15 & 0x10` del pokémon, ver `gen67.ts`)
 *   y, desde la 299, su propio orden, que no es el de PokéAPI: allí Encarnación
 *   es una sola y aquí son cuatro (una por máscara).
 * - **Objetos** en los huecos 505–520 y 960–1023: los de la 8ª y la 9ª y las
 *   megapiedras de Leyendas Z-A. Son fijos del mod (`Gen7Expansion` de PKHeX).
 * - **Objetos de los paquetes de pk3DS** (mentas, Parche Habilidad, Botas
 *   Gruesas…): cada ROM los pone en los números que le quedan libres. Los del
 *   Hexalocke 3 son los de su `hexalocke-items.txt`, el fichero que pk3DS deja
 *   junto a la ROM; si se vuelve a aleatorizar con otros paquetes, hay que
 *   copiar aquí la lista nueva.
 * - **Formas** que el juego original no tiene.
 *
 * Nada de esto choca con una partida de USUM sin mod: son números que el juego
 * no usa (en PokéAPI algunos tienen objetos de la 3ª que en la 7ª no existen),
 * así que se aplica a todas las de USUM sin tener que saber de qué ROM es.
 */

/** Número de habilidad del mod → la de la app, de la 299 en adelante */
export const HABILIDADES_DEL_MOD: Record<number, string> = {
  299: "hospitality",
  300: "minds-eye",
  // Las cuatro Encarnaciones de Ogerpon (una por máscara) son una en la app
  301: "embody-aspect",
  302: "embody-aspect",
  303: "embody-aspect",
  304: "embody-aspect",
  305: "toxic-chain",
  306: "supersweet-syrup",
  307: "tera-shift",
  308: "tera-shell",
  309: "teraform-zero",
  310: "poison-puppeteer",
  311: "piercing-drill",
  312: "dragonize",
  313: "mega-sol",
  314: "spicy-spray",
  // 315 Eelevate y 316 Fire Mane son inventadas del mod: no están en la app
};

/** Los objetos fijos del mod. Faltan los que la app no tiene (Eternatusita, Teracristal, Emblema del Líder) */
export const OBJETOS_DEL_MOD: Record<number, string> = {
  505: "golurkite",
  506: "crabominite",
  507: "golisopite",
  508: "zeraorite",
  509: "scovillainite",
  510: "baxcalibrite",
  511: "glimmoranite",
  512: "absolite-z",
  513: "garchompite-z",
  514: "lucarionite-z",
  515: "greninjite",
  516: "floettite",
  517: "zygardite",
  518: "meowsticite",
  519: "magearnite",
  520: "tatsugirinite",
  960: "booster-energy",
  963: "rusted-sword",
  964: "rusted-shield",
  965: "reins-of-unity",
  966: "adamant-crystal",
  967: "lustrous-globe",
  968: "wellspring-mask",
  969: "hearthflame-mask",
  970: "cornerstone-mask",
  971: "galarica-cuff",
  972: "galarica-wreath",
  973: "tart-apple",
  974: "sweet-apple",
  975: "cracked-pot",
  976: "chipped-pot",
  977: "strawberry-sweet",
  978: "berry-sweet",
  979: "love-sweet",
  980: "star-sweet",
  981: "clover-sweet",
  982: "flower-sweet",
  983: "ribbon-sweet",
  984: "scroll-of-darkness",
  985: "scroll-of-waters",
  986: "black-augurite",
  987: "peat-block",
  988: "auspicious-armor",
  989: "malicious-armor",
  991: "syrupy-apple",
  992: "unremarkable-teacup",
  993: "masterpiece-teacup",
  994: "gimmighoul-coin",
  995: "raichunite-x",
  996: "raichunite-y",
  997: "clefablite",
  998: "victreebelite",
  999: "starminite",
  1000: "dragoninite",
  1001: "meganiumite",
  1002: "feraligite",
  1003: "skarmorite",
  1004: "froslassite",
  1005: "emboarite",
  1006: "excadrite",
  1007: "scolipite",
  1008: "scraftinite",
  1009: "eelektrossite",
  1010: "chandelurite",
  1011: "chesnaughtite",
  1012: "delphoxite",
  1013: "pyroarite",
  1014: "malamarite",
  1015: "barbaracite",
  1016: "dragalgite",
  1017: "hawluchanite",
  1018: "drampanite",
  1019: "falinksite",
  1020: "chimechite",
  1021: "staraptite",
  1022: "heatranite",
  1023: "darkranite",
};

/** Los objetos de los paquetes de pk3DS, por su nombre en inglés (el de `hexalocke-items.txt`) */
export const OBJETOS_DE_LOS_PAQUETES: Record<string, string> = {
  "Ability Patch": "ability-patch",
  "Ability Shield": "ability-shield",
  "Adamant Mint": "adamant-mint",
  "Blunder Policy": "blunder-policy",
  "Bold Mint": "bold-mint",
  "Booster Energy": "booster-energy",
  "Brave Mint": "brave-mint",
  "Bug Tera Shard": "bug-tera-shard",
  "Calm Mint": "calm-mint",
  "Careful Mint": "careful-mint",
  "Clear Amulet": "clear-amulet",
  "Covert Cloak": "covert-cloak",
  "Dark Tera Shard": "dark-tera-shard",
  "Dragon Tera Shard": "dragon-tera-shard",
  "Eject Pack": "eject-pack",
  "Electric Tera Shard": "electric-tera-shard",
  "Fairy Feather": "fairy-feather",
  "Fairy Tera Shard": "fairy-tera-shard",
  "Fighting Tera Shard": "fighting-tera-shard",
  "Fire Tera Shard": "fire-tera-shard",
  "Flying Tera Shard": "flying-tera-shard",
  "Gentle Mint": "gentle-mint",
  "Ghost Tera Shard": "ghost-tera-shard",
  "Grass Tera Shard": "grass-tera-shard",
  "Ground Tera Shard": "ground-tera-shard",
  "Hasty Mint": "hasty-mint",
  "Heavy-Duty Boots": "heavy-duty-boots",
  "Ice Tera Shard": "ice-tera-shard",
  "Impish Mint": "impish-mint",
  "Jolly Mint": "jolly-mint",
  "Lax Mint": "lax-mint",
  "Loaded Dice": "loaded-dice",
  "Lonely Mint": "lonely-mint",
  "Mild Mint": "mild-mint",
  "Mirror Herb": "mirror-herb",
  "Modest Mint": "modest-mint",
  "Naive Mint": "naive-mint",
  "Naughty Mint": "naughty-mint",
  "Normal Tera Shard": "normal-tera-shard",
  "Poison Tera Shard": "poison-tera-shard",
  "Psychic Tera Shard": "psychic-tera-shard",
  "Punching Glove": "punching-glove",
  "Quiet Mint": "quiet-mint",
  "Rash Mint": "rash-mint",
  "Reins of Unity": "reins-of-unity",
  "Relaxed Mint": "relaxed-mint",
  "Rock Tera Shard": "rock-tera-shard",
  "Room Service": "room-service",
  "Sassy Mint": "sassy-mint",
  "Serious Mint": "serious-mint",
  "Steel Tera Shard": "steel-tera-shard",
  "Throat Spray": "throat-spray",
  "Timid Mint": "timid-mint",
  "Utility Umbrella": "utility-umbrella",
  "Water Tera Shard": "water-tera-shard",
};

/**
 * Dónde puso cada objeto de los paquetes la ROM del Hexalocke 3: su
 * `hexalocke-items.txt` tal cual. Los objetos clave (Riendas Unión,
 * Rizador de Nata, RecuerdaMovimientos) no los lleva nadie, pero se dejan
 * para que la lista sea la del fichero.
 */
export const OBJETOS_DEL_HEXALOCKE_3: Record<number, string> = {
  113: "Lonely Mint",
  114: "Adamant Mint",
  115: "Naughty Mint",
  120: "Ability Shield",
  121: "Clear Amulet",
  122: "Reins of Unity",
  123: "Brave Mint",
  124: "Bold Mint",
  125: "Impish Mint",
  126: "Lax Mint",
  127: "Relaxed Mint",
  128: "Modest Mint",
  129: "Mild Mint",
  130: "Rash Mint",
  131: "Quiet Mint",
  132: "Calm Mint",
  133: "Gentle Mint",
  426: "Careful Mint",
  427: "Sassy Mint",
  622: "Timid Mint",
  837: "Hasty Mint",
  838: "Jolly Mint",
  839: "Naive Mint",
  840: "Serious Mint",
  848: "Covert Cloak",
  859: "Cream Reswirler",
  861: "Heavy-Duty Boots",
  862: "Fairy Feather",
  863: "Loaded Dice",
  864: "Eject Pack",
  865: "Mirror Herb",
  866: "Blunder Policy",
  867: "Ability Patch",
  868: "Punching Glove",
  869: "Room Service",
  870: "Throat Spray",
  871: "Utility Umbrella",
  874: "Move Reminder",
};

/**
 * Formas del mod que el juego original no tiene: a su pokémon de la app, o a
 * la especie cuando solo cambia el dibujo (Sinistea y Polteageist auténticos,
 * los lazos de Alcremie…).
 */
export const FORMAS_DEL_MOD: Record<string, number> = {
  // Darumaka de Galar
  "554_1": 10176,
  // Meowstic hembra megaevolucionado
  "678_3": 10326,
  // Zygarde megaevolucionado
  "718_5": 10301,
  // Eternatus Dinamax Infinito
  "890_1": 10190,
  "854_1": 854,
  "855_1": 855,
  "869_1": 869,
  "869_2": 869,
  "869_3": 869,
  "869_4": 869,
  "869_5": 869,
  "869_6": 869,
  "869_7": 869,
  "869_8": 869,
  "1012_1": 1012,
  "1013_1": 1013,
};

/** El objeto del mod con ese número, o null si no es suyo */
export function objetoDelMod(numero: number): string | null {
  const fijo = OBJETOS_DEL_MOD[numero];
  if (fijo) return fijo;
  const nombre = OBJETOS_DEL_HEXALOCKE_3[numero];
  return nombre ? (OBJETOS_DE_LOS_PAQUETES[nombre] ?? null) : null;
}
