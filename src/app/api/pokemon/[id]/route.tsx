import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { puedeVerLocke } from "@/lib/acceso";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getHistoria } from "@/lib/historia-servidor";
import { spriteGuardado } from "@/lib/sprites-guardados";
import { generacionDeTipos } from "@/lib/juegos";
import { esPokemonAnil } from "@/lib/anil";
import { tiposParaVer } from "@/lib/tipos";
import { COLOR_DE_TIPO } from "@/lib/colores-de-tipo";
import { leerMovimientos, movimientoPorSlug, naturalezaPorSlug } from "@/lib/movimientos";
import { habilidadPorSlug } from "@/lib/habilidades";
import { objetoPorSlug } from "@/lib/objetos";
import { logoSvg } from "@/lib/logo";
import { formatDate } from "@/lib/utils";
import {
  BORDE,
  ORO,
  SUAVE,
  TARJETA,
  TINTA,
  cargarFuentes,
  paraLaImagen,
} from "@/lib/imagen-para-compartir";

/**
 * **Un pokémon como imagen**, para presumir de él en el grupo: su sprite, mote,
 * tipos, lo que lleva para combatir y lo que ha vivido (dónde se capturó,
 * cuántos días lleva contigo, sus combates y MVPs).
 *
 * Solo la puede pedir **quien puede ver su ficha**: su dueño, o cualquiera del
 * locke en un Soul Link, donde el Equipo y PC es de todos. Fuera de eso la caja
 * es privada, y una imagen de ella también.
 */

const ANCHO = 1080;
const ALTO = 1350;
/** El hueco del sprite: el pixel art se amplía un número entero de veces dentro */
const LADO_DEL_SPRITE = 520;

/**
 * El sprite de Blanco y Negro, recortado y ampliado **un número entero de
 * veces** sin suavizar, para que el pixel art salga nítido. Si no hay, el de
 * HOME o el guardado, que no son pixel art y se escalan normal.
 */
async function sprite(pokemonId: number | null, shiny: boolean, guardado: string | null) {
  if (pokemonId) {
    const bw = await spriteGuardado("bw-recorte", String(pokemonId), shiny).catch(() => null);
    const datos = bw && /^data:[^;,]+;base64,(.*)$/s.exec(bw);
    if (datos) {
      try {
        const bytes = Buffer.from(datos[1], "base64");
        const { width = 96, height = 96 } = await sharp(bytes).metadata();
        const veces = Math.max(1, Math.floor(LADO_DEL_SPRITE / Math.max(width, height)));
        const png = await sharp(bytes)
          .resize(width * veces, height * veces, { kernel: "nearest" })
          .png()
          .toBuffer();
        return `data:image/png;base64,${png.toString("base64")}`;
      } catch {
        // Sigue con el de reserva
      }
    }
  }
  return paraLaImagen(guardado, LADO_DEL_SPRITE);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  const captura = await prisma.capture.findUnique({
    where: { id },
    select: {
      id: true,
      species: true,
      nickname: true,
      pokemonId: true,
      shiny: true,
      image: true,
      failed: true,
      naturaleza: true,
      habilidad: true,
      objeto: true,
      movimientos: true,
      createdAt: true,
      zone: { select: { name: true } },
      sitio: true,
      participant: {
        select: {
          userId: true,
          competitionId: true,
          user: { select: { displayName: true } },
          competition: {
            select: {
              name: true,
              estilo: true,
              maxPlayers: true,
              game: true,
              gameId: true,
              juegoNoOficial: true,
              tipos: true,
            },
          },
        },
      },
    },
  });
  if (!captura || captura.failed) return new Response("No encontrado", { status: 404 });

  // Lo suyo, o lo de un Soul Link en el que está: lo mismo que deja ver la ficha
  const { participant } = captura;
  const cooperativo = perfilDeLocke(participant.competition.maxPlayers, participant.competition.estilo).cooperativo;
  const esSuyo = participant.userId === usuario.id;
  if (!esSuyo && !(cooperativo && (await puedeVerLocke(participant.competitionId)))) {
    return new Response("No encontrado", { status: 404 });
  }

  const competicion = participant.competition;
  const conAnil = esPokemonAnil(competicion);
  const generacion = generacionDeTipos(competicion) ?? 9;
  const tipos = tiposParaVer(captura.pokemonId, generacion);
  const color = COLOR_DE_TIPO[tipos[0]?.slug ?? ""] ?? "#6366f1";
  const segundo = tipos[1] ? COLOR_DE_TIPO[tipos[1].slug] : color;

  const [dibujo, historia, letras] = await Promise.all([
    sprite(captura.pokemonId, captura.shiny, captura.image),
    getHistoria({ tipo: "captura", id: captura.id }).catch(() => null),
    cargarFuentes(),
  ]);

  const set = {
    naturaleza: naturalezaPorSlug(captura.naturaleza)?.n ?? null,
    habilidad: habilidadPorSlug(captura.habilidad, conAnil)?.n ?? null,
    objeto: captura.objeto ? (objetoPorSlug(captura.objeto)?.nombre ?? null) : null,
    movimientos: leerMovimientos(captura.movimientos)
      .map((slug) => movimientoPorSlug(slug)?.n ?? null)
      .filter((m): m is string => Boolean(m)),
  };
  const conSet = Boolean(set.naturaleza || set.habilidad || set.objeto || set.movimientos.length);
  const cifras = historia?.cifras;
  const donde = captura.zone?.name ?? captura.sitio;
  const nombre = captura.nickname || captura.species;
  const logoDeLaApp = `data:image/svg+xml;base64,${Buffer.from(logoSvg("pokemon", 64)).toString("base64")}`;

  const datos: { valor: string | number; rotulo: string }[] = [
    { valor: cifras?.dias ?? "—", rotulo: cifras?.dias === 1 ? "día contigo" : "días contigo" },
    {
      valor: cifras ? `${cifras.victorias}-${cifras.combates - cifras.victorias}` : "—",
      rotulo: cifras?.combates === 1 ? "combate" : "combates",
    },
    { valor: cifras?.mvps ?? 0, rotulo: cifras?.mvps === 1 ? "MVP" : "MVPs" },
  ];

  const imagen = (
    <div
      style={{
        width: ANCHO,
        height: ALTO,
        display: "flex",
        flexDirection: "column",
        background: TINTA,
        color: "white",
        fontFamily: "Barlow",
        padding: 64,
      }}
    >
      {/* Arriba: la app y el locke */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDeLaApp} width={48} height={48} alt="" />
          <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 34, letterSpacing: 2 }}>HEXAAPP</span>
        </div>
        <span style={{ fontSize: 26, color: SUAVE }}>{competicion.name}</span>
      </div>

      {/* El pokémon, sobre el color de sus tipos */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 560,
          borderRadius: 36,
          border: `2px solid ${BORDE}`,
          background: `linear-gradient(135deg, ${color}55, ${segundo}22 55%, ${TARJETA})`,
          position: "relative",
        }}
      >
        {dibujo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dibujo} alt="" style={{ maxWidth: LADO_DEL_SPRITE, maxHeight: LADO_DEL_SPRITE }} />
        ) : (
          <span style={{ fontSize: 120, color: SUAVE }}>?</span>
        )}
        {captura.shiny ? (
          <span
            style={{
              position: "absolute",
              top: 24,
              right: 28,
              fontFamily: "Condensed",
              fontWeight: 700,
              fontSize: 30,
              color: ORO,
              letterSpacing: 2,
            }}
          >
            ✦ SHINY
          </span>
        ) : null}
      </div>

      {/* Quién es */}
      <div style={{ marginTop: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 96, lineHeight: 1, textTransform: "uppercase" }}>
            {nombre.length > 14 ? `${nombre.slice(0, 13)}…` : nombre}
          </span>
          <span style={{ marginTop: 10, fontSize: 30, color: SUAVE }}>
            {captura.nickname ? captura.species : "Sin mote"}
            {captura.pokemonId ? ` · #${captura.pokemonId}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, paddingBottom: 6 }}>
          {tipos.map((tipo) => (
            <span
              key={tipo.slug}
              style={{
                fontFamily: "Condensed",
                fontWeight: 700,
                fontSize: 30,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                padding: "6px 18px",
                borderRadius: 10,
                background: COLOR_DE_TIPO[tipo.slug] ?? "#555",
                color: "white",
              }}
            >
              {tipo.nombre}
            </span>
          ))}
        </div>
      </div>

      {/* Para combatir */}
      {conSet ? (
        <div
          style={{
            marginTop: 30,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            padding: "22px 28px",
            borderRadius: 24,
            background: TARJETA,
            border: `2px solid ${BORDE}`,
          }}
        >
          <div style={{ display: "flex", gap: 34, fontSize: 26, color: SUAVE }}>
            {set.naturaleza ? <span>Naturaleza <b style={{ color: "white", marginLeft: 8 }}>{set.naturaleza}</b></span> : null}
            {set.habilidad ? <span>Habilidad <b style={{ color: "white", marginLeft: 8 }}>{set.habilidad}</b></span> : null}
            {set.objeto ? <span>Objeto <b style={{ color: "white", marginLeft: 8 }}>{set.objeto}</b></span> : null}
          </div>
          {set.movimientos.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {set.movimientos.map((movimiento) => (
                <span
                  key={movimiento}
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: 12,
                    background: "#22222a",
                    border: `2px solid ${BORDE}`,
                  }}
                >
                  {movimiento}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Lo que ha vivido */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 18 }}>
          {datos.map((dato) => (
            <div
              key={dato.rotulo}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "18px 10px",
                borderRadius: 22,
                background: TARJETA,
                border: `2px solid ${BORDE}`,
              }}
            >
              <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{dato.valor}</span>
              <span style={{ marginTop: 6, fontSize: 22, color: SUAVE, textTransform: "uppercase", letterSpacing: 2 }}>
                {dato.rotulo}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: SUAVE }}>
          <span>
            {donde ? `Capturado en ${donde}` : "Capturado"} · {formatDate(captura.createdAt)}
          </span>
          <span>de {participant.user.displayName}</span>
        </div>
      </div>
    </div>
  );

  return new ImageResponse(imagen, {
    width: ANCHO,
    height: ALTO,
    fonts: letras.map((letra) => ({ name: letra.name, data: letra.data, weight: letra.weight, style: "normal" as const })),
    // Es de una caja privada (o de un locke cerrado): nada de guardarla en la red
    headers: { "Cache-Control": "private, no-cache" },
  });
}
