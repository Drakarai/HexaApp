import Link from "next/link";
import { requireUser, isAdmin } from "@/lib/auth";
import { getActiveCompetition, getMyParticipant } from "@/lib/competition";
import { getMapa, getMisCapturas } from "@/lib/mapas";
import { nombreDeRegion, regionDelJuego } from "@/lib/juegos";
import { PageHeader } from "@/components/page-header";
import { NoCompetition } from "@/components/no-competition";
import { EmptyState } from "@/components/ui";
import { CapturasExtra, MapaDeCapturas } from "./mapa-client";

export const metadata = { title: "Mapa de capturas" };

/**
 * El mapa de capturas de quien mira, y **solo el suyo**.
 *
 * No hay forma de ver el de otro: la página resuelve el participante desde la
 * sesión y `getMisCapturas` no acepta más de uno. Es privado igual que las
 * notas, también para los administradores.
 */
export default async function MapaPage() {
  const user = await requireUser();
  const competition = await getActiveCompetition();
  if (!competition) return <NoCompetition canCreate={isAdmin(user)} />;

  const participant = await getMyParticipant(competition.id, user.id);
  const region = regionDelJuego(competition.gameId);

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

  const [mapa, capturas] = await Promise.all([
    getMapa(region),
    getMisCapturas(participant.id),
  ]);

  if (!mapa?.zones.length) {
    return (
      <>
        <Cabecera region={region} />
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

  return (
    <>
      <Cabecera region={region} admin={isAdmin(user)} />
      <MapaDeCapturas
        mapa={mapa}
        capturas={capturas.filter((captura) => captura.zoneId)}
      />
      <CapturasExtra capturas={capturas.filter((captura) => !captura.zoneId)} />
    </>
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
