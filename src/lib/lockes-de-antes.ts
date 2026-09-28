import "server-only";
import { prisma } from "@/lib/db";
import { esCreador, type CurrentUser } from "@/lib/auth";

/**
 * Los lockes que se jugaron antes de la aplicación: quién puede salir en ellos
 * y cómo se monta la lista de jugadores al guardarlos.
 *
 * De un locke de antes puede haber gente **sin cuenta**: amigos que jugaron
 * aquel y nunca se registraron. Van por su nombre escrito (`sinCuenta`), pueden
 * haber ganado (`ganadorNombre`) y, si un día se hacen cuenta, se **vinculan**:
 * su nombre se cambia por la cuenta y desde entonces el locke les cuenta.
 */

export type CuentaParaElegir = { id: string; displayName: string; username: string };

/**
 * Las cuentas que alguien puede poner como jugadores. El Creador, todas. Un
 * organizador, las que no son un secreto para él: las que dio de alta, la suya,
 * la gente con la que juega y la de los lockes de antes que ya apuntó. Antes
 * veía la lista de todas las cuentas de la casa, que en el resto de la app no
 * ve.
 */
export async function cuentasQuePuedeApuntar(user: CurrentUser): Promise<CuentaParaElegir[]> {
  const orden = { displayName: "asc" } as const;
  const campos = { id: true, displayName: true, username: true } as const;
  if (esCreador(user)) return prisma.user.findMany({ orderBy: orden, select: campos });

  const deSusLockes = await prisma.lockeDeAntes.findMany({
    where: { createdById: user.id },
    select: { jugadoresIds: true },
  });
  return prisma.user.findMany({
    where: {
      OR: [
        { id: user.id },
        { creadoPorId: user.id },
        {
          participations: {
            some: { competition: { participants: { some: { userId: user.id } } } },
          },
        },
        { id: { in: deSusLockes.flatMap((l) => l.jugadoresIds) } },
      ],
    },
    orderBy: orden,
    select: campos,
  });
}

/** Lo que se elige en los desplegables de ganador y subcampeón. */
export type Eleccion = { tipo: "cuenta"; id: string } | { tipo: "nombre"; nombre: string } | null;

/** "u:<id>" es una cuenta, "n:<nombre>" alguien sin cuenta, vacío es nadie. */
export function leerEleccion(valor: string): Eleccion {
  if (valor.startsWith("u:") && valor.length > 2) return { tipo: "cuenta", id: valor.slice(2) };
  if (valor.startsWith("n:")) {
    const nombre = limpiarNombre(valor.slice(2));
    return nombre ? { tipo: "nombre", nombre } : null;
  }
  return null;
}

const MAXIMO_SIN_CUENTA = 20;

function limpiarNombre(nombre: string) {
  return nombre.replace(/\s+/g, " ").trim().slice(0, 40);
}

/** "Marcos, Lucas ,marcos" → ["Marcos", "Lucas"]: sin vacíos ni repetidos. */
export function leerNombres(texto: string): string[] {
  const vistos = new Set<string>();
  const nombres: string[] = [];
  for (const trozo of texto.split(/[,\n]/)) {
    const nombre = limpiarNombre(trozo);
    const clave = nombre.toLocaleLowerCase("es");
    if (!nombre || vistos.has(clave)) continue;
    vistos.add(clave);
    nombres.push(nombre);
  }
  return nombres.slice(0, MAXIMO_SIN_CUENTA);
}

export type JugadoresDeAntes = {
  jugadoresIds: string[];
  sinCuenta: string[];
  ganadorId: string | null;
  ganadorNombre: string | null;
  subcampeonId: string | null;
  subcampeonNombre: string | null;
};

/**
 * Monta quién jugó, quién ganó y quién quedó segundo a partir de lo que llega
 * del formulario. Sin base de datos, para poder probarlo.
 *
 * - El ganador y el subcampeón **entran siempre como jugadores**: no tendría
 *   sentido que alguien ganara un locke y no lo viera en su palmarés.
 * - `vinculos` es "este nombre sin cuenta ya es esta cuenta": el nombre sale de
 *   `sinCuenta`, la cuenta entra en `jugadoresIds`, y si ganó o quedó segundo
 *   también se le pasa.
 */
export function montarJugadores({
  cuentas,
  nombres,
  ganador,
  subcampeon,
  vinculos = new Map(),
}: {
  cuentas: string[];
  nombres: string[];
  ganador: Eleccion;
  subcampeon: Eleccion;
  vinculos?: Map<string, string>;
}): JugadoresDeAntes | { error: string } {
  if (!ganador) return { error: "Elige quién lo ganó." };

  const vinculoDe = (nombre: string) => {
    for (const [conNombre, cuenta] of vinculos) {
      if (conNombre.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es")) return cuenta;
    }
    return null;
  };
  // Un nombre vinculado deja de ser un nombre: es su cuenta
  const resolver = (eleccion: Eleccion): Eleccion => {
    if (eleccion?.tipo !== "nombre") return eleccion;
    const cuenta = vinculoDe(eleccion.nombre);
    return cuenta ? { tipo: "cuenta", id: cuenta } : eleccion;
  };
  const g = resolver(ganador)!;
  let s = resolver(subcampeon);
  const mismo = (a: Eleccion, b: Eleccion) =>
    Boolean(a && b) &&
    ((a!.tipo === "cuenta" && b!.tipo === "cuenta" && a!.id === b!.id) ||
      (a!.tipo === "nombre" &&
        b!.tipo === "nombre" &&
        a!.nombre.toLocaleLowerCase("es") === b!.nombre.toLocaleLowerCase("es")));
  if (mismo(g, s)) s = null;

  const jugadoresIds = new Set(cuentas.filter(Boolean));
  const sinCuenta: string[] = [];
  const anadirNombre = (nombre: string) => {
    const cuenta = vinculoDe(nombre);
    if (cuenta) {
      jugadoresIds.add(cuenta);
      return;
    }
    if (!sinCuenta.some((n) => n.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"))) {
      sinCuenta.push(nombre);
    }
  };
  for (const nombre of nombres) anadirNombre(nombre);
  for (const eleccion of [g, s]) {
    if (eleccion?.tipo === "cuenta") jugadoresIds.add(eleccion.id);
    if (eleccion?.tipo === "nombre") anadirNombre(eleccion.nombre);
  }

  return {
    jugadoresIds: [...jugadoresIds],
    sinCuenta: sinCuenta.slice(0, MAXIMO_SIN_CUENTA),
    ganadorId: g.tipo === "cuenta" ? g.id : null,
    ganadorNombre: g.tipo === "nombre" ? g.nombre : null,
    subcampeonId: s?.tipo === "cuenta" ? s.id : null,
    subcampeonNombre: s?.tipo === "nombre" ? s.nombre : null,
  };
}
