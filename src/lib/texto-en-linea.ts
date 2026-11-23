/**
 * Lo que va dentro de una línea de texto de las reglas y las notas: **negrita**,
 * enlaces escritos como [texto](https://…) y direcciones pegadas tal cual.
 *
 * Solo se aceptan direcciones http y https: un "javascript:" o un "data:" escrito
 * en una regla no puede acabar en un href. Lo demás se queda como texto.
 */
export type Trozo =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; texto: string }
  | { tipo: "enlace"; texto: string; href: string };

// Por orden: negrita, [texto](dirección) y dirección suelta
const PATRON = /\*\*([^*]+)\*\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"]+)/g;

// Lo que suele ir pegado detrás de una dirección sin ser parte de ella: el punto
// final de la frase, una coma, el paréntesis que la encierra…
const COLA = /[.,;:!?¡¿)\]'"»]+$/;

export function trozosDeLinea(linea: string): Trozo[] {
  const trozos: Trozo[] = [];
  const texto = (t: string) => {
    if (!t) return;
    const ultimo = trozos[trozos.length - 1];
    if (ultimo?.tipo === "texto") ultimo.texto += t;
    else trozos.push({ tipo: "texto", texto: t });
  };

  let desde = 0;
  for (const m of linea.matchAll(PATRON)) {
    const inicio = m.index ?? 0;
    texto(linea.slice(desde, inicio));
    if (m[1] !== undefined) {
      trozos.push({ tipo: "negrita", texto: m[1] });
    } else if (m[2] !== undefined && m[3] !== undefined) {
      trozos.push({ tipo: "enlace", texto: m[2].trim(), href: m[3] });
    } else {
      const entera = m[4];
      let cola = entera.match(COLA)?.[0] ?? "";
      let direccion = entera.slice(0, entera.length - cola.length);
      // "(mira https://x.com)": el paréntesis de cierre es de la frase, salvo que la
      // dirección abra uno suyo, como las de Wikipedia "…/Pokémon_(serie)"
      const cuenta = (t: string, c: string) => t.split(c).length - 1;
      while (cola.startsWith(")") && cuenta(direccion, "(") > cuenta(direccion, ")")) {
        direccion += ")";
        cola = cola.slice(1);
      }
      if (direccion.length > "https://".length) {
        trozos.push({ tipo: "enlace", texto: direccion, href: direccion });
        texto(cola);
      } else {
        texto(entera);
      }
    }
    desde = inicio + m[0].length;
  }
  texto(linea.slice(desde));
  return trozos;
}
