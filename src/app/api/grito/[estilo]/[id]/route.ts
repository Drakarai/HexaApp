import { NextResponse } from "next/server";
import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";

/**
 * El grito de un pokémon, listo para sonar en cualquier móvil.
 *
 * Los gritos salen del repositorio de PokéAPI, que los tiene en Ogg Vorbis, y
 * Safari del iPhone no siempre sabe leerlos. En vez de meterle al navegador un
 * decodificador, se decodifica **aquí** una vez y se sirve en WAV, que suena en
 * todas partes. Después la red de Vercel lo guarda para siempre, así que cada
 * grito se convierte una sola vez en la vida de la aplicación.
 *
 * Dos estilos: `clasico` es el grito de los juegos hasta la 5ª generación (el
 * de la Game Boy y la DS) y `actual`, el rehecho desde X e Y. Del clásico solo
 * existen los de hasta la 5ª: para los que vinieron después se sirve el actual.
 */

const ORIGEN = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon";

// Los gritos no cambian: un año, y en la red de Vercel también (ver /api/imagen)
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

async function bajar(estilo: "legacy" | "latest", id: number) {
  const respuesta = await fetch(`${ORIGEN}/${estilo}/${id}.ogg`, { cache: "force-cache" });
  if (!respuesta.ok) return null;
  return new Uint8Array(await respuesta.arrayBuffer());
}

/** PCM de 16 bits en mono con su cabecera: lo más simple que suena en todos */
function aWav(muestras: Float32Array, frecuencia: number) {
  const datos = muestras.length * 2;
  const wav = new DataView(new ArrayBuffer(44 + datos));
  const texto = (en: number, s: string) =>
    [...s].forEach((letra, i) => wav.setUint8(en + i, letra.charCodeAt(0)));

  texto(0, "RIFF");
  wav.setUint32(4, 36 + datos, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true); // PCM
  wav.setUint16(22, 1, true); // mono
  wav.setUint32(24, frecuencia, true);
  wav.setUint32(28, frecuencia * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  texto(36, "data");
  wav.setUint32(40, datos, true);
  muestras.forEach((m, i) => {
    const recortada = Math.max(-1, Math.min(1, m));
    wav.setInt16(44 + i * 2, recortada < 0 ? recortada * 0x8000 : recortada * 0x7fff, true);
  });
  return new Uint8Array(wav.buffer);
}

/**
 * Los actuales vienen a 32 kHz y pesan el triple sin ganar nada en el altavoz
 * de un móvil: se bajan a 22 kHz, que para un grito sobra.
 */
const FRECUENCIA_MAXIMA = 22050;

function rebajar(muestras: Float32Array, frecuencia: number) {
  if (frecuencia <= FRECUENCIA_MAXIMA) return { muestras, frecuencia };
  const paso = frecuencia / FRECUENCIA_MAXIMA;
  const nuevas = new Float32Array(Math.floor(muestras.length / paso));
  for (let i = 0; i < nuevas.length; i++) {
    const donde = i * paso;
    const a = Math.floor(donde);
    const b = Math.min(a + 1, muestras.length - 1);
    nuevas[i] = muestras[a] + (muestras[b] - muestras[a]) * (donde - a);
  }
  return { muestras: nuevas, frecuencia: FRECUENCIA_MAXIMA };
}

function tipoDeAudio(bytes: Uint8Array) {
  const cabecera = String.fromCharCode(...bytes.slice(0, 4));
  if (cabecera === "OggS") return null;
  if (cabecera === "RIFF") return "audio/wav";
  // Un MP3 empieza por su etiqueta ID3 o directamente por un marco (0xFFE…)
  if (cabecera.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return "audio/mpeg";
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ estilo: string; id: string }> },
) {
  const { estilo, id: crudo } = await params;
  const id = Number(crudo.replace(/\.wav$/, ""));
  // Solo números de PokéAPI: esto no puede servir para pedir cualquier cosa
  if (!Number.isInteger(id) || id <= 0 || id > 20000 || !["clasico", "actual"].includes(estilo)) {
    return new NextResponse("No existe", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const ogg =
    (estilo === "clasico" ? await bajar("legacy", id) : null) ?? (await bajar("latest", id));
  if (!ogg) {
    // Sin grito (alguna forma rara): que el navegador no lo vuelva a pedir en un rato
    return new NextResponse("Sin grito", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  }

  /**
   * No todos son lo que dice su nombre: alguno (Pikachu) es un MP3 con la
   * extensión cambiada. Se mira la cabecera: lo que ya suena en todas partes
   * (MP3 o WAV) se sirve tal cual, y solo el Ogg se convierte.
   */
  const tipo = tipoDeAudio(ogg);
  if (tipo) {
    return new NextResponse(ogg, {
      headers: { "Content-Type": tipo, "Content-Length": String(ogg.length), "Cache-Control": CACHE },
    });
  }

  const decodificador = new OggVorbisDecoder();
  try {
    await decodificador.ready;
    const { channelData, sampleRate } = await decodificador.decodeFile(ogg);
    if (!channelData[0]?.length) throw new Error("vacío");
    const { muestras, frecuencia } = rebajar(channelData[0], sampleRate);
    const wav = aWav(muestras, frecuencia);
    return new NextResponse(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": CACHE,
      },
    });
  } catch {
    return new NextResponse("Grito ilegible", { status: 502, headers: { "Cache-Control": "no-store" } });
  } finally {
    decodificador.free();
  }
}
