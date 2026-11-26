import "server-only";
import { createCipheriv, createHash } from "node:crypto";

/**
 * **La firma de la partida de USUM** (MemeCrypto de PKHeX): sin ella el juego
 * no abre una partida tocada. Se hace con la clave «PokedexAndSaveFile», que
 * PKHeX publica, y que **no está en el repositorio** (es público y va en un
 * CV): se lee de la variable de entorno `CLAVE_PARTIDAS_3DS`, con el DER y el
 * exponente privado en hexadecimal separados por dos puntos. Sin ella, la GTS
 * dice que falta en vez de dar una partida que el juego rechazaría.
 */

const LARGO_SIG = 0x60;

type Clave = { der: Buffer; n: bigint; e: bigint; d: bigint };

let cacheada: Clave | null | undefined;

export function claveDeFirma(): Clave | null {
  if (cacheada !== undefined) return cacheada;
  const valor = process.env.CLAVE_PARTIDAS_3DS?.trim();
  const [der, d] = valor?.split(":") ?? [];
  if (!der || !d || !/^[0-9a-f]+$/i.test(der) || !/^[0-9a-f]+$/i.test(d)) return (cacheada = null);
  const bytes = Buffer.from(der, "hex");
  if (bytes.length < 0x7e) return (cacheada = null);
  cacheada = {
    der: bytes,
    n: BigInt("0x" + bytes.subarray(0x18, 0x18 + 0x61).toString("hex")),
    e: BigInt("0x" + bytes.subarray(0x7b, 0x7e).toString("hex")),
    d: BigInt("0x" + d),
  };
  return cacheada;
}

/**
 * Para Diagnóstico: si la clave está puesta y **es la buena**. Se firma un
 * número cualquiera con la privada y se comprueba con la pública que sale el
 * mismo: con un trozo de menos al copiarla no saldría, y el juego rechazaría
 * las partidas.
 */
export function estadoDeLaClave(): "falta" | "mal" | "bien" {
  if (!process.env.CLAVE_PARTIDAS_3DS?.trim()) return "falta";
  const clave = claveDeFirma();
  if (!clave) return "mal";
  const prueba = 0x1234567890abcdefn % clave.n;
  return potencia(potencia(prueba, clave.d, clave.n), clave.e, clave.n) === prueba ? "bien" : "mal";
}

function potencia(base: bigint, exponente: bigint, modulo: bigint) {
  let r = 1n;
  base %= modulo;
  while (exponente > 0n) {
    if (exponente & 1n) r = (r * base) % modulo;
    base = (base * base) % modulo;
    exponente >>= 1n;
  }
  return r;
}

const aNumero = (b: Uint8Array) => BigInt("0x" + (Buffer.from(b).toString("hex") || "0"));
const aBytes = (n: bigint, largo: number) => Uint8Array.from(Buffer.from(n.toString(16).padStart(largo * 2, "0"), "hex"));
const xor = (a: Uint8Array, b: Uint8Array) => {
  for (let i = 0; i < 16; i++) a[i] ^= b[i];
};

function subclave(t: Uint8Array) {
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i += 2) {
    s[i] = (2 * t[i] + (t[i + 1] >> 7)) & 0xff;
    s[i + 1] = (2 * t[i + 1]) & 0xff;
    if (i + 2 < 16) s[i + 1] = (s[i + 1] + (t[i + 2] >> 7)) & 0xff;
  }
  if (t[0] & 0x80) s[15] ^= 0x87;
  return s;
}

function aes(clave: Uint8Array, bloque: Uint8Array) {
  const c = createCipheriv("aes-128-ecb", clave, null);
  c.setAutoPadding(false);
  return new Uint8Array(Buffer.concat([c.update(bloque), c.final()]));
}

/** Firma la región de la firma (0x80 bytes) con la tabla de comprobaciones (0x150) */
export function firmarRegion(clave: Clave, region: Uint8Array, tabla: Uint8Array): Uint8Array {
  const datos = region.slice();
  datos.set(createHash("sha256").update(tabla).digest(), 0);
  // El SHA1 de todo menos los 8 últimos: sus 8 primeros bytes, al final
  datos.set(createHash("sha1").update(datos.subarray(0, datos.length - 8)).digest().subarray(0, 8), datos.length - 8);
  const carga = datos.subarray(0, datos.length - LARGO_SIG);
  const sig = datos.subarray(datos.length - LARGO_SIG);
  const llave = createHash("sha1").update(clave.der).update(carga).digest().subarray(0, 16);

  let temp = new Uint8Array(16);
  for (let i = 0; i < LARGO_SIG; i += 16) {
    const trozo = sig.subarray(i, i + 16);
    xor(trozo, temp);
    trozo.set(aes(llave, trozo));
    temp = trozo.slice();
  }
  xor(temp, sig.subarray(0, 16));
  const sub = subclave(temp);
  for (let i = 0; i < LARGO_SIG; i += 16) xor(sig.subarray(i, i + 16), sub);
  temp = new Uint8Array(16);
  for (let i = LARGO_SIG - 16; i >= 0; i -= 16) {
    const trozo = sig.subarray(i, i + 16);
    const siguiente = trozo.slice();
    trozo.set(aes(llave, trozo));
    xor(trozo, temp);
    temp = siguiente;
  }
  sig[0] &= 0x7f;
  sig.set(aBytes(potencia(aNumero(sig), clave.d, clave.n), LARGO_SIG));
  return datos;
}
