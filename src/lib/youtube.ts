/**
 * Enlaces de YouTube: reconocerlos y sacarles el identificador del vídeo.
 *
 * Los vídeos de los gimnasios no se guardan en la aplicación —un combate son
 * unos 115 MB y la base de datos gratis entera son 500 MB—, así que viven en
 * YouTube y aquí solo queda el enlace. Para poder incrustar el reproductor hace
 * falta el identificador, y la gente pega el enlace de siete maneras distintas:
 * el de la barra del navegador, el de "compartir", el de la aplicación del
 * móvil, con el minuto por el que iba…
 */

/** Un identificador de vídeo son 11 caracteres de este alfabeto. */
const ID = /^[\w-]{11}$/;

export type VideoDeYouTube = {
  /** El identificador de 11 caracteres */
  id: string;
  /** Segundo por el que empieza, si el enlace lo traía */
  desde: number | null;
};

/** Los segundos de `?t=90`, `?t=1m30s` o `?start=90`. */
function segundos(valor: string | null): number | null {
  if (!valor) return null;
  if (/^\d+$/.test(valor)) return Number(valor);

  const partes = valor.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!partes || !partes.slice(1).some(Boolean)) return null;
  const [, h, m, s] = partes;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
}

/**
 * Saca el vídeo de un enlace de YouTube, o `null` si no lo es.
 *
 * Se admite pegarlo sin `https://` delante, que es como sale de la aplicación
 * del móvil la mitad de las veces.
 */
export function videoDeYouTube(bruto: string): VideoDeYouTube | null {
  const texto = bruto.trim();
  if (!texto) return null;

  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();
  const desde =
    segundos(url.searchParams.get("t")) ?? segundos(url.searchParams.get("start"));

  // youtu.be/ID
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID.test(id) ? { id, desde } : null;
  }

  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;

  // youtube.com/watch?v=ID
  const v = url.searchParams.get("v");
  if (v && ID.test(v)) return { id: v, desde };

  // youtube.com/embed/ID, /shorts/ID, /live/ID, /v/ID
  const trozos = url.pathname.split("/").filter(Boolean);
  if (
    trozos.length >= 2 &&
    ["embed", "shorts", "live", "v"].includes(trozos[0].toLowerCase())
  ) {
    const id = trozos[1];
    return ID.test(id) ? { id, desde } : null;
  }

  return null;
}

/** La dirección para ver el vídeo en YouTube, limpia de parámetros de sobra. */
export function urlDeYouTube(video: VideoDeYouTube): string {
  const desde = video.desde ? `&t=${video.desde}` : "";
  return `https://www.youtube.com/watch?v=${video.id}${desde}`;
}

/**
 * La dirección del reproductor incrustado.
 *
 * Se usa el dominio `youtube-nocookie.com`, que es el modo de privacidad
 * mejorada de YouTube: no deja cookies de seguimiento hasta que se le da al
 * play. Cuesta lo mismo y es más correcto para seis amigos que solo quieren ver
 * un combate.
 */
export function urlIncrustada(video: VideoDeYouTube): string {
  const desde = video.desde ? `?start=${video.desde}` : "";
  return `https://www.youtube-nocookie.com/embed/${video.id}${desde}`;
}
