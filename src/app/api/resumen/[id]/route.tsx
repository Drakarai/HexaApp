import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { filtroDeLockesVisibles } from "@/lib/acceso";
import { getStandings } from "@/lib/competition";
import { getFinalFourState } from "@/lib/final-four";
import { getCampeonDelLocke } from "@/lib/campeon";
import { getResumenDelLocke } from "@/lib/resumen-del-locke";
import { ordenDelHall } from "@/lib/hall";
import { perfilDeLocke } from "@/lib/perfiles-de-locke";
import { getProgresoEnSolitario } from "@/lib/solitario";
import { resolverImagen } from "@/lib/almacen-de-imagenes";
import { logoSvg } from "@/lib/logo";
import { formatDate } from "@/lib/utils";

/**
 * El **resumen del locke como imagen**, para mandarlo al grupo cuando se acaba:
 * el campeón con su equipo, el podio, las cifras y las menciones del hall de
 * la fama, en una tarjeta vertical que se ve bien en el móvil.
 *
 * Se dibuja en el servidor con `next/og` (satori), con las mismas letras de la
 * aplicación. Las imágenes se leen de la base de datos directamente y no por
 * `/api/imagen`: satori las pediría sin la sesión de nadie.
 */

const ANCHO = 1080;
/** Vertical para el de grupo; en solitario hay menos que contar y va cuadrada */
const ALTO_DE_GRUPO = 1350;
const ALTO_EN_SOLITARIO = 1080;

const TINTA = "#0b0b0e";
const TARJETA = "#16161b";
const BORDE = "#2a2a31";
const SUAVE = "#9c9ca5";
const MARCA = "#818cf8";
const ORO = "#fbbf24";

/** Las letras, leídas una vez por proceso: pesan poco y no cambian */
let fuentes: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 700 | 800 }[]> | null = null;
function cargarFuentes() {
  const de = (paquete: string, fichero: string) =>
    readFile(join(process.cwd(), "node_modules/@fontsource", paquete, "files", fichero));
  fuentes ??= Promise.all([
    de("barlow", "barlow-latin-400-normal.woff").then((data) => ({ name: "Barlow", data, weight: 400 as const })),
    de("barlow", "barlow-latin-600-normal.woff").then((data) => ({ name: "Barlow", data, weight: 600 as const })),
    de("barlow-condensed", "barlow-condensed-latin-700-normal.woff").then((data) => ({ name: "Condensed", data, weight: 700 as const })),
    de("barlow-condensed", "barlow-condensed-latin-800-normal.woff").then((data) => ({ name: "Condensed", data, weight: 800 as const })),
  ]);
  return fuentes;
}

/**
 * Una imagen guardada, lista para satori: en PNG y pequeña. Las de la
 * aplicación van en WebP, que satori no sabe pintar.
 */
async function paraLaImagen(valor: string | null, lado: number) {
  const resuelta = await resolverImagen(valor);
  if (!resuelta) return null;
  try {
    let bytes: Buffer;
    if (/^https?:\/\//.test(resuelta)) {
      const respuesta = await fetch(resuelta);
      if (!respuesta.ok) return null;
      bytes = Buffer.from(await respuesta.arrayBuffer());
    } else {
      const coincide = /^data:[^;,]+;base64,(.*)$/s.exec(resuelta);
      if (!coincide) return null;
      bytes = Buffer.from(coincide[1], "base64");
    }
    const png = await sharp(bytes)
      .resize(lado, lado, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // Una imagen rota no puede tumbar el resumen entero: se queda sin ella
    return null;
  }
}

/**
 * Los trazos de los iconos de línea que salen en la imagen, copiados de lucide
 * (los mismos de la app). Van escritos aquí porque Next no deja renderizar un
 * componente a texto dentro de una ruta, y lucide no exporta los trazos sueltos.
 */
const TRAZOS = {
  Crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
  Star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  Skull: '<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/>',
  Shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  Map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
  Trophy: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
};

/** Un icono de línea de la app, como imagen para satori */
function icono(nombre: keyof typeof TRAZOS, color: string, relleno = false) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="${relleno ? color : "none"}" ` +
    `stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${TRAZOS[nombre]}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const plural = (cuantos: number, palabra: string) =>
  `${cuantos} ${cuantos === 1 ? palabra : `${palabra}s`}`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const usuario = await getCurrentUser();
  if (!usuario) return new Response("No autorizado", { status: 401 });

  const { id } = await params;
  // Solo de los lockes que esa persona puede abrir, como todo lo demás
  const competition = await prisma.competition.findFirst({
    where: { AND: [{ id }, filtroDeLockesVisibles(usuario)] },
  });
  if (!competition) return new Response("No encontrado", { status: 404 });

  const perfil = perfilDeLocke(competition.maxPlayers);
  const [estado, standings, resumen, progreso] = await Promise.all([
    getFinalFourState(competition.id),
    getStandings(competition.id),
    getResumenDelLocke(competition.id),
    perfil.enSolitario ? getProgresoEnSolitario(competition.id) : null,
  ]);

  const elFinal = estado.status === "TERMINADA" ? estado : null;
  const ganador = perfil.enSolitario ? null : await getCampeonDelLocke(competition.id, estado);
  const terminado = perfil.enSolitario ? Boolean(progreso?.ligaSuperada) : Boolean(ganador);
  if (!terminado) {
    return new Response("El locke todavía no ha terminado", { status: 404 });
  }

  const { podio, comoLoGano } = ordenDelHall(standings, elFinal, ganador);
  const campeonId = ganador?.champion.participantId ?? standings[0]?.participantId;
  const campeon = standings.find((fila) => fila.participantId === campeonId);
  if (!campeon) return new Response("No encontrado", { status: 404 });

  // Lo que hay que pintar con imagen: fotos del podio, equipo del campeón y logo
  const idsDelPodio = podio.length ? podio.map((sitio) => sitio.participantId) : [campeon.participantId];
  const [fichas, equipo, conLogo] = await Promise.all([
    prisma.participant.findMany({
      where: { id: { in: idsDelPodio } },
      select: { id: true, user: { select: { avatarImage: true } } },
    }),
    prisma.hallOfFameEntry.findMany({
      where: { participantId: campeon.participantId },
      orderBy: { position: "asc" },
      take: 6,
      select: { species: true, nickname: true, image: true },
    }),
    // El logo no viene con la competición: las columnas de imagen se piden aparte
    prisma.competition.findUnique({ where: { id: competition.id }, select: { logo: true } }),
  ]);
  const [fotos, sprites, logo, letras] = await Promise.all([
    Promise.all(
      fichas.map(async (ficha) => [ficha.id, await paraLaImagen(ficha.user.avatarImage, 220)] as const),
    ).then((pares) => new Map(pares)),
    Promise.all(equipo.map((pokemon) => paraLaImagen(pokemon.image, 160))),
    paraLaImagen(conLogo?.logo ?? null, 420),
    cargarFuentes(),
  ]);

  const logoDeLaApp = `data:image/svg+xml;base64,${Buffer.from(logoSvg("resumen", 64)).toString("base64")}`;
  const segundos = podio.filter((sitio) => sitio.puesto > 1);

  const cuando = [
    `Del ${formatDate(resumen.desde)}`,
    resumen.hasta ? `al ${formatDate(resumen.hasta)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const ALTO = perfil.enSolitario ? ALTO_EN_SOLITARIO : ALTO_DE_GRUPO;
  const dias = { valor: resumen.dias ?? "—", rotulo: resumen.dias === 1 ? "día" : "días" };
  const caidos = { valor: resumen.bajas, rotulo: resumen.bajas === 1 ? "caído" : "caídos" };
  // En solitario no hay jornadas ni combates: se cuenta su partida
  const cifras = progreso
    ? [
        dias,
        { valor: progreso.hitos.hechos, rotulo: progreso.hitos.hechos === 1 ? "hito" : "hitos" },
        { valor: progreso.zonas.visitadas, rotulo: progreso.zonas.visitadas === 1 ? "zona" : "zonas" },
        caidos,
      ]
    : [
        dias,
        { valor: resumen.jornadas, rotulo: resumen.jornadas === 1 ? "jornada" : "jornadas" },
        { valor: resumen.combates, rotulo: resumen.combates === 1 ? "combate" : "combates" },
        caidos,
      ];

  const hayRivales = resumen.jugadores > 1;
  const menciones = [
    resumen.masMvps && hayRivales
      ? { dibujo: icono("Star", ORO, true), rotulo: "Más MVPs", nombre: resumen.masMvps.displayName, color: resumen.masMvps.color, detalle: String(resumen.masMvps.cuantas) }
      : null,
    resumen.masCoronas && hayRivales
      ? { dibujo: icono("Crown", ORO), rotulo: "Más coronas", nombre: resumen.masCoronas.displayName, color: resumen.masCoronas.color, detalle: plural(resumen.masCoronas.cuantas, "corona") }
      : null,
    resumen.masBajas && resumen.masBajas.cuantas > 0 && hayRivales
      ? { dibujo: icono("Skull", "#f87171"), rotulo: "El que más perdió", nombre: resumen.masBajas.displayName, color: resumen.masBajas.color, detalle: plural(resumen.masBajas.cuantas, "caído") }
      : null,
    resumen.menosBajas && resumen.masBajas && resumen.menosBajas.cuantas !== resumen.masBajas.cuantas
      ? { dibujo: icono("Shield", "#34d399"), rotulo: "El más cuidadoso", nombre: resumen.menosBajas.displayName, color: resumen.menosBajas.color, detalle: plural(resumen.menosBajas.cuantas, "caído") }
      : null,
    resumen.zonaMasMortifera
      ? { dibujo: icono("Map", "#f87171"), rotulo: "La ruta más letal", nombre: resumen.zonaMasMortifera.name, color: null, detalle: plural(resumen.zonaMasMortifera.bajas, "caído") }
      : null,
  ]
    .filter((mencion) => mencion !== null)
    .slice(0, 4);

  const imagen = (
    <div
      style={{
        width: ANCHO,
        height: ALTO,
        display: "flex",
        flexDirection: "column",
        backgroundColor: TINTA,
        backgroundImage:
          "radial-gradient(ellipse 80% 40% at 50% 28%, rgba(99,102,241,0.20), transparent 70%), radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 2px)",
        backgroundSize: "100% 100%, 26px 26px",
        color: "white",
        fontFamily: "Barlow",
        padding: "56px 64px 44px",
        position: "relative",
      }}
    >
      {/* El logo de la edición, de fondo arriba a la derecha, como en la portada */}
      {logo ? (
        <img
          src={logo}
          width={420}
          height={420}
          style={{ position: "absolute", top: 40, right: 20, opacity: 0.16, objectFit: "contain" }}
        />
      ) : null}

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logoDeLaApp} width={46} height={46} />
          <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 30, letterSpacing: 3 }}>HEXAAPP</span>
        </div>
        <span style={{ fontFamily: "Condensed", fontWeight: 700, fontSize: 24, letterSpacing: 6, color: MARCA }}>
          RESUMEN DEL LOCKE
        </span>
      </div>

      {/* Nombre y fechas */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
        <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 100, lineHeight: 0.95, textTransform: "uppercase" }}>
          {competition.name}
        </span>
        <span style={{ fontSize: 28, color: SUAVE, marginTop: 14 }}>
          {[competition.game, cuando, resumen.dias ? plural(resumen.dias, "día") : null].filter(Boolean).join(" · ")}
        </span>
      </div>

      {/* El campeón */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 34,
          marginTop: 34,
          padding: "30px 34px",
          borderRadius: 28,
          border: "2px solid rgba(251,191,36,0.45)",
          backgroundColor: "rgba(251,191,36,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 176,
            height: 176,
            borderRadius: 88,
            border: `5px solid ${ORO}`,
            backgroundColor: campeon.color,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {fotos.get(campeon.participantId) ? (
            <img src={fotos.get(campeon.participantId)!} width={176} height={176} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 80 }}>
              {campeon.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={icono("Trophy", ORO)} width={36} height={36} />
            <span style={{ fontFamily: "Condensed", fontWeight: 700, fontSize: 28, letterSpacing: 5, color: ORO }}>
              {perfil.enSolitario ? "SE PASÓ LA LIGA" : "CAMPEÓN"}
            </span>
          </div>
          <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 84, lineHeight: 1, marginTop: 6 }}>
            {campeon.displayName}
          </span>
          {comoLoGano ? (
            <span style={{ fontSize: 26, color: "#d4d4d8", marginTop: 8 }}>{comoLoGano}</span>
          ) : null}
        </div>
      </div>

      {/* Su equipo */}
      {equipo.length ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, gap: 12 }}>
          {equipo.map((pokemon, indice) => (
            <div
              key={indice}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                padding: "12px 6px",
                borderRadius: 20,
                backgroundColor: TARJETA,
                border: `1.5px solid ${BORDE}`,
              }}
            >
              {sprites[indice] ? (
                <img src={sprites[indice]!} width={112} height={112} style={{ objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", width: 112, height: 112 }} />
              )}
              <span style={{ fontSize: 22, fontWeight: 600, marginTop: 4, maxWidth: 140, overflow: "hidden", whiteSpace: "nowrap" }}>
                {pokemon.nickname || pokemon.species}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* El resto del podio */}
      {segundos.length ? (
        <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
          {segundos.map((sitio) => (
            <div
              key={sitio.participantId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flex: 1,
                padding: "16px 20px",
                borderRadius: 20,
                backgroundColor: TARJETA,
                border: `1.5px solid ${BORDE}`,
              }}
            >
              <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 44, color: sitio.puesto === 2 ? "#cbd5e1" : "#fb923c" }}>
                {sitio.puesto}º
              </span>
              <div
                style={{
                  display: "flex",
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: sitio.color,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {fotos.get(sitio.participantId) ? (
                  <img src={fotos.get(sitio.participantId)!} width={64} height={64} style={{ objectFit: "cover" }} />
                ) : (
                  <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 32 }}>
                    {sitio.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Condensed", fontWeight: 700, fontSize: 38, lineHeight: 1 }}>{sitio.displayName}</span>
                <span style={{ fontSize: 20, color: SUAVE, marginTop: 4 }}>{sitio.titulo}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Las cifras */}
      <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
        {cifras.map((cifra) => (
          <div
            key={cifra.rotulo}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              padding: "18px 8px",
              borderRadius: 20,
              backgroundColor: TARJETA,
              border: `1.5px solid ${BORDE}`,
            }}
          >
            <span style={{ fontFamily: "Condensed", fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{cifra.valor}</span>
            <span style={{ fontSize: 22, color: SUAVE, marginTop: 6, textTransform: "uppercase", letterSpacing: 2 }}>
              {cifra.rotulo}
            </span>
          </div>
        ))}
      </div>

      {/* Las menciones, de dos en dos */}
      {menciones.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 18 }}>
          {menciones.map((mencion) => (
            <div
              key={mencion.rotulo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: (ANCHO - 128 - 16) / 2,
                padding: "16px 20px",
                borderRadius: 20,
                backgroundColor: TARJETA,
                border: `1.5px solid ${BORDE}`,
              }}
            >
              <img src={mencion.dibujo} width={40} height={40} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: 19, color: SUAVE, textTransform: "uppercase", letterSpacing: 1.5 }}>{mencion.rotulo}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                  {mencion.color ? (
                    <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, backgroundColor: mencion.color }} />
                  ) : null}
                  <span style={{ fontSize: 30, fontWeight: 600 }}>{mencion.nombre}</span>
                </div>
              </div>
              <span style={{ fontSize: 22, color: "#d4d4d8" }}>{mencion.detalle}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Pie */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          paddingTop: 16,
          borderTop: `1.5px solid ${BORDE}`,
          fontSize: 22,
          color: "#71717a",
        }}
      >
        <span>
          {resumen.causaMasRepetida
            ? `Lo que más mató: «${resumen.causaMasRepetida.texto}» (${resumen.causaMasRepetida.veces})`
            : competition.modality ?? ""}
        </span>
        <span>
          {perfil.enSolitario
            ? plural(resumen.wipeos, "wipeo")
            : `${plural(resumen.wipeos, "wipeo")} · ${plural(resumen.retos, "reto")}`}
        </span>
      </div>
    </div>
  );

  return new ImageResponse(imagen, {
    width: ANCHO,
    height: ALTO,
    fonts: letras.map((letra) => ({ name: letra.name, data: letra.data, weight: letra.weight, style: "normal" as const })),
    headers: {
      /**
       * Es de un locke privado: nada de guardarla en la red. Y **sin reutilizar
       * sin preguntar**: con cinco minutos de caché, un cambio en algo que no
       * movía la dirección (las fechas) seguía enseñando la foto vieja. La
       * huella de la dirección ya evita casi todo; esto cubre el resto.
       */
      "Cache-Control": "private, no-cache",
    },
  });
}
