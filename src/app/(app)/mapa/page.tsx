import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import { getMapa, getMisBajasPorZona, getMisCapturas } from "@/lib/mapas";
import { nombreDeRegion, regionesDelJuego } from "@/lib/juegos";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { cx } from "@/lib/utils";
import { CapturasExtra, MapaDeCapturas } from "./mapa-client";

export const metadata = { title: "Mapa de capturas" };

/**
 * El mapa de capturas de quien mira, y **solo el suyo**.
 *
 * No hay forma de ver el de otro: la página resuelve el participante desde la
 * sesión y `getMisCapturas` no acepta más de uno. Es privado igual que las
 * notas, también para los administradores.
 *
 * Un juego puede tener **más de una región** —la 2ª generación y sus remakes
 * abren Kanto entero al ganar la Liga de Johto—, y entonces sale una fila de
 * pestañas para cambiar de mapa. Cuál se está viendo va en la dirección
 * (`?region=kanto`) y no en un estado del navegador, para que el enlace se
 * pueda guardar y para no tener que traerse las dos regiones a la vez.
 */
export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<{ apuntar?: string; region?: string }>;
}) {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const { apuntar, region: pedida } = await searchParams;
  const participant = await getMyParticipant(competition.id, user.id);
  const regiones = regionesDelJuego(competition.gameId);
  // La pedida solo vale si es del juego; si no, la principal
  const region = regiones.find((slug) => slug === pedida) ?? regiones[0] ?? null;

  if (!participant) {
    return (
      <>
        <Cabecera region={region} />
        <EmptyState
          title="No juegas esta edición"
          hint="El mapa es de cada participante, así que aquí no hay nada tuyo."
        />
      </>
    );
  }

  if (!region) {
    return (
      <>
        <Cabecera region={null} />
        <EmptyState
          title="Esta edición no tiene juego elegido"
          hint={
            isAdmin(user)
              ? "Elige el juego en Ediciones y aparecerá el mapa de su región."
              : "Pídele a un administrador que elija el juego en Ediciones."
          }
        />
      </>
    );
  }

  const [mapa, capturas, bajas] = await Promise.all([
    getMapa(region),
    getMisCapturas(participant.id),
    getMisBajasPorZona(participant.id),
  ]);

  const pestanas =
    regiones.length > 1 ? (
      <Regiones regiones={regiones} actual={region} />
    ) : null;

  if (!mapa?.zones.length) {
    return (
      <>
        <Cabecera region={region} admin={isAdmin(user)} />
        {pestanas}
        <EmptyState
          title={`El mapa de ${nombreDeRegion(region)} está vacío`}
          hint={
            isAdmin(user)
              ? "Rellénalo desde Administración → Mapas."
              : "Un administrador tiene que rellenarlo desde Administración."
          }
        />
        <CapturasExtra capturas={capturas.filter((c) => !c.zoneId)} />
      </>
    );
  }

  /**
   * Solo lo de este mapa: las capturas y las bajas de la otra región se quedan
   * fuera para que las cuentas de arriba ("4 de 36 zonas") hablen de lo que se
   * está viendo y no de las dos mezcladas.
   */
  const suyas = new Set(
    mapa.zones.flatMap((zona) => [zona.id, ...zona.children.map((h) => h.id)]),
  );
  const bajasDeAqui = Object.fromEntries(
    Object.entries(bajas).filter(([zoneId]) => suyas.has(zoneId)),
  );

  return (
    <>
      <Cabecera region={region} admin={isAdmin(user)} />
      {pestanas}
      <MapaDeCapturas
        mapa={mapa}
        capturas={capturas.filter(
          (captura) => captura.zoneId && suyas.has(captura.zoneId),
        )}
        bajas={bajasDeAqui}
        buscarDeEntrada={apuntar === "1"}
      />
      <CapturasExtra capturas={capturas.filter((captura) => !captura.zoneId)} />
    </>
  );
}

/** Las pestañas de región, solo cuando el juego tiene más de una. */
function Regiones({
  regiones,
  actual,
}: {
  regiones: string[];
  actual: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {regiones.map((slug) => (
        <Link
          key={slug}
          href={`/mapa?region=${slug}`}
          className={cx(
            "chip",
            slug === actual && "border-brand-500/40 bg-brand-600/20 text-white",
          )}
        >
          {nombreDeRegion(slug)}
        </Link>
      ))}
    </div>
  );
}

function Cabecera({
  region,
  admin = false,
}: {
  region: string | null;
  admin?: boolean;
}) {
  return (
    <PageHeader
      title="Mapa de capturas"
      subtitle={`Lo que has ido pillando${region ? ` por ${nombreDeRegion(region)}` : ""}. Es tuyo y de nadie más: no lo ven ni los administradores, como las notas.`}
      actions={
        admin ? (
          <Link href="/admin/mapas" className="btn-ghost btn-sm">
            🗺️ Editar mapas
          </Link>
        ) : null
      }
    />
  );
}
