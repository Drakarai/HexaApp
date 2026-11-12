"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { puedeVerLocke } from "@/lib/acceso";
import { assertPuedeTocarLaCaja } from "@/lib/caja-servidor";
import { mensajeDeError } from "@/lib/permiso";
import { esElMismo } from "@/lib/historia";
import { findSpecies } from "@/lib/pokedex";
import {
  cargarCombates,
  claveDeRef,
  combatesDelLocke,
  estadisticasDeUnCombate,
  galardonesDe,
  getEstadisticasDelLocke,
  type Numeros,
  type RefCombate,
} from "@/lib/estadisticas";
import type { EstadisticasDePokemon } from "@/lib/showdown";

/** Lo de un pokémon en un combate, con el del equipo apuntado al que corresponde */
export type PokemonDelCombate = Omit<EstadisticasDePokemon, "lado"> & { teamId: string | null };

export type LadoDelCombate = {
  participantId: string;
  nombre: string;
  pokemon: PokemonDelCombate[];
};

/** Los de tu caja que podrían ser uno del equipo, cuando no se sabe cuál */
export type OpcionDeLaCaja = { captureId: string; especie: string; mote: string | null };

export type EstadisticasDelCombateLeidas = {
  /** Uno por combate pedido, en el mismo orden */
  combates?: { lados?: LadoDelCombate[]; error?: string }[];
  /** teamId → los de la caja entre los que elegir, y el elegido si ya lo hay */
  elegir?: Record<string, { opciones: OpcionDeLaCaja[]; elegido: string | null }>;
  error?: string;
};

/** ¿Puede quien llama tocar la caja de este jugador? Sin lanzar */
async function tocaLaCaja(participantId: string) {
  try {
    await assertPuedeTocarLaCaja(participantId);
    return true;
  } catch {
    return false;
  }
}

const dexDe = (especie: string) => findSpecies(especie, true)?.dex ?? null;
const TIPOS = new Set(["jornada", "reto", "final"]);

/**
 * Lo que hizo cada pokémon en uno o varios combates (los de una serie al mejor
 * de tres, o los de la final), para mirarlo antes de votar al MVP. La
 * repetición es pública, así que lo ve cualquiera que pueda mirar el locke; lo
 * que **no** es público es la caja, y por eso las opciones de «¿cuál de tu caja
 * es?» solo le llegan a quien puede tocarla.
 */
export async function estadisticasDeCombatesAction(refs: RefCombate[]): Promise<EstadisticasDelCombateLeidas> {
  await requireUser();
  const pedidos = (Array.isArray(refs) ? refs : [])
    .filter((r) => r && TIPOS.has(r.tipo) && typeof r.id === "string")
    .slice(0, 12);
  if (!pedidos.length) return { error: "No hay ningún combate que mirar." };

  const cargados = await cargarCombates(pedidos);
  const locke = cargados.find(Boolean)?.competitionId;
  if (!locke || cargados.some((c) => c && c.competitionId !== locke) || !(await puedeVerLocke(locke))) {
    return { error: "Ese combate no existe o no es de un locke que puedas ver." };
  }

  const leidos = await Promise.all(
    pedidos.map((r, i) => (cargados[i] ? estadisticasDeUnCombate(r, cargados[i]) : null)),
  );
  const combates = leidos.map((leido) => {
    if (!leido?.combate) return { error: "Ese combate ya no existe." };
    const { guardado, combate, error } = leido;
    if (!guardado) return { error: error ?? "Este combate no tiene repetición." };
    const usados = new Set<string>();
    const lados: LadoDelCombate[] = combate.lados.map((p) => {
      const lado = Object.entries(guardado.lados).find(([, id]) => id === p.id)?.[0];
      const delEquipo = combate.equipo.filter((t) => t.participantId === p.id);
      return {
        participantId: p.id,
        nombre: p.nombre,
        pokemon: guardado.pokemon
          .filter((e) => e.lado === lado)
          .map(({ lado: _lado, ...e }) => {
            // El del equipo apuntado que es, para que al tocar su sprite salga lo suyo
            const t = delEquipo.find(
              (t) =>
                !usados.has(t.id) &&
                esElMismo(
                  { species: t.species, nickname: t.nickname, pokemonId: dexDe(t.species) },
                  { species: e.especie, nickname: e.mote, pokemonId: e.pokemonId },
                ),
            );
            if (t) usados.add(t.id);
            return { ...e, teamId: t?.id ?? null };
          }),
      };
    });
    return { lados };
  });

  // Los que no se sabe de cuál de la caja son: dos iguales sin mote, sobre todo
  const elegir: NonNullable<EstadisticasDelCombateLeidas["elegir"]> = {};
  const equipo = new Map(cargados.flatMap((c) => c?.equipo ?? []).map((t) => [t.id, t]));
  const duenos = [...new Set([...equipo.values()].map((t) => t.participantId))];
  for (const participantId of duenos) {
    if (!(await tocaLaCaja(participantId))) continue;
    const capturas = await prisma.capture.findMany({
      where: { participantId, failed: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, species: true, nickname: true, pokemonId: true },
    });
    for (const t of [...equipo.values()].filter((t) => t.participantId === participantId)) {
      const opciones = capturas.filter((c) =>
        esElMismo(c, { species: t.species, nickname: t.nickname, pokemonId: dexDe(t.species) }),
      );
      if (opciones.length < 2) continue;
      elegir[t.id] = {
        elegido: t.captureId,
        opciones: opciones.map((c) => ({ captureId: c.id, especie: c.species, mote: c.nickname })),
      };
    }
  }

  return { combates, elegir };
}

/**
 * Dice cuál de tu caja es un pokémon de un combate, cuando hay dos que podrían
 * serlo. Solo apunta el vínculo: lo demás del combate no se toca. Vacío lo
 * quita y vuelve a adivinarse.
 */
export async function elegirCapturaDelCombateAction(
  teamId: string,
  captureId: string | null,
): Promise<{ error?: string }> {
  try {
    const miembro = await prisma.matchPokemon.findUnique({
      where: { id: String(teamId ?? "") },
      select: { id: true, participantId: true, species: true, nickname: true },
    });
    if (!miembro) return { error: "Ese pokémon ya no está en el combate." };
    await assertPuedeTocarLaCaja(miembro.participantId);

    if (captureId) {
      const captura = await prisma.capture.findUnique({
        where: { id: String(captureId) },
        select: { participantId: true, species: true, nickname: true, pokemonId: true, failed: true },
      });
      if (
        !captura ||
        captura.failed ||
        captura.participantId !== miembro.participantId ||
        !esElMismo(captura, { species: miembro.species, nickname: miembro.nickname, pokemonId: dexDe(miembro.species) })
      ) {
        return { error: "Ese no es de tu caja o no es el mismo pokémon." };
      }
    }
    await prisma.matchPokemon.update({ where: { id: miembro.id }, data: { captureId: captureId || null } });
    revalidatePath("/estadisticas");
    return {};
  } catch (error) {
    return { error: mensajeDeError(error) };
  }
}

/**
 * Lee unas cuantas repeticiones que aún no se han leído: las de antes de que
 * hubiera estadísticas, o las de un enlace cambiado. Van **de pocas en pocas**
 * para no pasarse del tiempo de una petición; la pantalla vuelve a llamar
 * mientras queden.
 */
export async function leerRepeticionesPendientesAction(
  competitionId: string,
  /** Las que ya fallaron en esta vuelta: se saltan, o se pediría siempre la misma */
  saltar: string[] = [],
): Promise<{ quedan: number; fallidas: string[]; error?: string }> {
  await requireUser();
  const id = String(competitionId ?? "");
  if (!(await puedeVerLocke(id))) return { quedan: 0, fallidas: [], error: "No puedes ver este locke." };

  const yaFallaron = new Set(Array.isArray(saltar) ? saltar.map(String) : []);
  const sinLeer = (await combatesDelLocke(id)).filter(
    (c) => c.replayUrl && !c.guardado && c.lados.length === 2 && !yaFallaron.has(claveDeRef(c.ref)),
  );
  const tanda = sinLeer.slice(0, 6);
  const leidas = await Promise.all(
    tanda.map((c) => estadisticasDeUnCombate(c.ref, c).catch(() => ({ guardado: null }))),
  );
  if (tanda.length) revalidatePath("/estadisticas");
  return {
    quedan: sinLeer.length - tanda.length,
    fallidas: tanda.filter((_, i) => !leidas[i].guardado).map((c) => claveDeRef(c.ref)),
  };
}

/**
 * Los números de un pokémon de tu caja, para su ficha. Fuera de un Soul Link
 * la caja es privada, así que solo los pide su dueño.
 */
export async function numerosDelPokemonAction(
  captureId: string,
): Promise<{ numeros?: Numeros; galardones?: { titulo: string; icono: string }[]; error?: string }> {
  const user = await requireUser();
  const captura = await prisma.capture.findUnique({
    where: { id: String(captureId ?? "") },
    select: {
      id: true,
      participant: { select: { userId: true, competitionId: true, competition: { select: { estilo: true } } } },
    },
  });
  if (!captura) return { error: "Ese pokémon no existe." };
  const { participant } = captura;
  const puede =
    participant.userId === user.id ||
    (participant.competition.estilo === "soullink" && (await puedeVerLocke(participant.competitionId)));
  if (!puede) return { error: "Ese pokémon no es tuyo." };

  const { pokemon } = await getEstadisticasDelLocke(participant.competitionId, user.id);
  const este = pokemon.find((p) => p.clave === `c:${captura.id}`);
  if (!este) return {};
  const galardones = galardonesDe(pokemon)
    .filter((g) => g.pokemon?.clave === este.clave)
    .map((g) => ({ titulo: g.titulo, icono: g.icono }));
  return { numeros: este.numeros, galardones };
}
