/**
 * Lector del formato **Marshal** de Ruby (versión 4.8), que es como guarda la
 * partida Pokémon Essentials: el `.rxdata` es un `Marshal.dump` del estado del
 * juego, sin cifrar. Se lee en el navegador para que el fichero no viaje
 * entero al servidor: de él solo sale lo que hace falta (ver `essentials.ts`).
 *
 * Se lee todo y no solo lo que se busca porque en Marshal no se puede saltar
 * un objeto sin leerlo: las referencias (`@`) apuntan por número a objetos
 * anteriores, y cualquier cosa que se salte descuadraría la cuenta.
 *
 * Lo que no es de Ruby puro (las clases con `_dump`, como `Table` o `Color`)
 * se queda en bytes: no hace falta nada de dentro.
 */

export class Simbolo {
  constructor(readonly nombre: string) {}
}

/** Un objeto de una clase de Ruby, con sus variables de instancia («@species») */
export class Objeto {
  constructor(
    readonly clase: string,
    readonly iv: Map<string, Valor> = new Map(),
  ) {}
  get(nombre: string): Valor | undefined {
    return this.iv.get(nombre);
  }
}

/** Un Hash de Ruby: las claves pueden ser símbolos, números u objetos */
export class Diccionario {
  readonly pares: [Valor, Valor][] = [];
  defecto: Valor = null;
  /** Busca por símbolo, texto o número, que son las claves que usa Essentials */
  get(clave: string | number): Valor | undefined {
    for (const [k, v] of this.pares) {
      if (k instanceof Simbolo ? k.nombre === clave : k === clave) return v;
    }
    return undefined;
  }
}

/** Lo que se guarda con `_dump` o `marshal_dump`: su clase y lo que llevaba */
export class Volcado {
  constructor(
    readonly clase: string,
    readonly datos: Uint8Array | Valor,
  ) {}
}

export type Valor =
  | null
  | boolean
  | number
  | bigint
  | string
  | Uint8Array
  | Simbolo
  | Objeto
  | Diccionario
  | Volcado
  | Valor[];

const utf8 = new TextDecoder("utf-8");
const latin1 = new TextDecoder("latin1");

export class ErrorDeMarshal extends Error {}

export function leerMarshal(bytes: Uint8Array): Valor {
  let p = 0;
  const simbolos: string[] = [];
  const objetos: Valor[] = [];

  const byte = () => {
    if (p >= bytes.length) throw new ErrorDeMarshal("El fichero se acaba antes de tiempo");
    return bytes[p++];
  };

  /** Los enteros de Marshal: un byte con signo que dice cuántos bytes siguen, o el número si es pequeño */
  const entero = (): number => {
    const c = (byte() << 24) >> 24;
    if (c === 0) return 0;
    if (c > 4) return c - 5;
    if (c < -4) return c + 5;
    if (c > 0) {
      let n = 0;
      for (let i = 0; i < c; i++) n |= byte() << (8 * i);
      return n >>> 0;
    }
    let n = -1;
    for (let i = 0; i < -c; i++) {
      n &= ~(0xff << (8 * i));
      n |= byte() << (8 * i);
    }
    return n;
  };

  const trozo = (): Uint8Array => {
    const n = entero();
    if (n < 0 || p + n > bytes.length) throw new ErrorDeMarshal("Un texto se sale del fichero");
    const t = bytes.subarray(p, p + n);
    p += n;
    return t;
  };

  const apuntar = <T extends Valor>(v: T, sitio?: number): T => {
    if (sitio === undefined) objetos.push(v);
    else objetos[sitio] = v;
    return v;
  };

  /** Un símbolo, que puede venir con su codificación delante («I:») */
  const simbolo = (): string => {
    const t = byte();
    if (t === 0x3b /* ; */) {
      const s = simbolos[entero()];
      if (s === undefined) throw new ErrorDeMarshal("Referencia a un símbolo que no existe");
      return s;
    }
    if (t === 0x3a /* : */) {
      const s = latin1.decode(trozo());
      simbolos.push(s);
      return s;
    }
    if (t === 0x49 /* I */) {
      const s = simbolo();
      // Su codificación: no cambia nada, porque los nombres de Essentials son ASCII
      const n = entero();
      for (let i = 0; i < n; i++) {
        simbolo();
        valor();
      }
      return s;
    }
    throw new ErrorDeMarshal(`Se esperaba un símbolo y hay «${String.fromCharCode(t)}»`);
  };

  /** Las variables de instancia de un objeto (o la codificación de un texto) */
  const variables = (destino: Map<string, Valor>) => {
    const n = entero();
    for (let i = 0; i < n; i++) {
      const nombre = simbolo();
      destino.set(nombre, valor());
    }
  };

  const valor = (): Valor => {
    const t = byte();
    switch (String.fromCharCode(t)) {
      case "0":
        return null;
      case "T":
        return true;
      case "F":
        return false;
      case "i":
        return entero();
      case ":":
      case ";":
        p--;
        return new Simbolo(simbolo());
      case "@": {
        const i = entero();
        if (i >= objetos.length) throw new ErrorDeMarshal("Referencia a un objeto que no existe");
        return objetos[i];
      }
      case "I": {
        /**
         * Un texto con su codificación (o cualquier objeto con variables). El
         * texto se lee como bytes y aquí se decide: UTF-8 si lo dice, que es lo
         * normal en Essentials; si no, se queda en bytes.
         */
        const sitio = objetos.length;
        const dentro = valor();
        const iv = new Map<string, Valor>();
        variables(iv);
        if (dentro instanceof Uint8Array) {
          const texto = iv.get("E") === true || iv.has("encoding") ? utf8.decode(dentro) : latin1.decode(dentro);
          objetos[sitio] = texto;
          return texto;
        }
        if (dentro instanceof Objeto) for (const [k, v] of iv) dentro.iv.set(k, v);
        return dentro;
      }
      case '"':
        return apuntar(trozo().slice());
      case "f": {
        const t = latin1.decode(trozo()).split("\0")[0];
        const n = t === "nan" ? NaN : t === "inf" ? Infinity : t === "-inf" ? -Infinity : Number(t);
        return apuntar(n);
      }
      case "l": {
        const signo = byte() === 0x2d ? -1n : 1n;
        const largo = entero() * 2;
        let n = 0n;
        for (let i = 0; i < largo; i++) n |= BigInt(byte()) << BigInt(8 * i);
        n *= signo;
        // Si cabe en un número normal, mejor: un personalID de 32 bits sale por aquí
        return apuntar(n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n);
      }
      case "[": {
        const lista: Valor[] = apuntar([]);
        const n = entero();
        for (let i = 0; i < n; i++) lista.push(valor());
        return lista;
      }
      case "{":
      case "}": {
        const d = apuntar(new Diccionario());
        const n = entero();
        for (let i = 0; i < n; i++) d.pares.push([valor(), valor()]);
        if (t === 0x7d) d.defecto = valor();
        return d;
      }
      case "o": {
        const o = apuntar(new Objeto(simbolo()));
        variables(o.iv);
        return o;
      }
      case "S": {
        const o = apuntar(new Objeto(simbolo()));
        const n = entero();
        for (let i = 0; i < n; i++) {
          const nombre = simbolo();
          o.iv.set(nombre, valor());
        }
        return o;
      }
      case "u": {
        const clase = simbolo();
        return apuntar(new Volcado(clase, trozo().slice()));
      }
      case "U": {
        const sitio = objetos.length;
        apuntar(null);
        const clase = simbolo();
        return apuntar(new Volcado(clase, valor()), sitio);
      }
      case "e": {
        simbolo();
        return valor();
      }
      case "C": {
        simbolo();
        return valor();
      }
      case "/": {
        const texto = latin1.decode(trozo());
        byte();
        return apuntar(texto);
      }
      case "c":
      case "m":
      case "M":
        return apuntar(new Simbolo(latin1.decode(trozo())));
      case "d": {
        const clase = simbolo();
        const sitio = objetos.length;
        apuntar(null);
        return apuntar(new Volcado(clase, valor()), sitio);
      }
      default:
        throw new ErrorDeMarshal(`Tipo de dato desconocido: «${String.fromCharCode(t)}» en el byte ${p - 1}`);
    }
  };

  if (bytes.length < 2 || bytes[0] !== 4 || bytes[1] !== 8) {
    throw new ErrorDeMarshal("No es un fichero de Ruby (Marshal 4.8)");
  }
  p = 2;
  return valor();
}
