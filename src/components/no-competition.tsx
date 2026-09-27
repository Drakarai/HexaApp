import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser, puedeCrearLockes } from "@/lib/auth";
import { getMisSolicitudes } from "@/lib/solicitudes";
import { Icono } from "@/components/icono";
import { UsuarioCopiable } from "@/components/usuario-copiable";
import {
  LockeEnSolitarioForm,
  MisSolicitudes,
} from "@/app/(app)/competiciones/solitario-forms";

/**
 * Lo que se ve cuando no hay ninguna edición delante.
 *
 * Tres casos, y decir lo mismo en los tres confundía:
 *
 * - **La aplicación está vacía y eres el Creador**: toca crear la primera.
 * - **En la portada, sin ningún locke tuyo**: la bienvenida, con las formas de
 *   entrar en uno. Antes salía un candado y "pide acceso de espectador", que es
 *   justo lo menos útil para quien acaba de llegar: lo que quiere es jugar.
 * - **En cualquier otra pantalla**: un aviso corto que manda a la portada. El
 *   menú ya no lleva a ellas sin locke, pero un enlace viejo sí.
 */
export async function NoCompetition({
  canCreate,
  principal = false,
}: {
  canCreate: boolean;
  /** Es la portada: aquí va la bienvenida entera */
  principal?: boolean;
}) {
  const hayAlguna = (await prisma.competition.count()) > 0;

  if (!hayAlguna && canCreate) {
    return (
      <div className="card text-center">
        <p className="text-4xl" aria-hidden>
          <Icono emoji="🗂️" />
        </p>
        <h2 className="mt-3 text-lg font-semibold text-white">
          Todavía no hay ninguna competición
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Crea la primera competición para empezar a cargar reglas, level caps y
          jugadores.
        </p>
        <Link href="/competiciones" className="btn-primary mt-5">
          Crear competición
        </Link>
      </div>
    );
  }

  if (!principal) {
    return (
      <div className="card text-center">
        <p className="text-4xl" aria-hidden>
          <Icono emoji="🔒" />
        </p>
        <h2 className="mt-3 text-lg font-semibold text-white">
          Todavía no juegas ningún locke
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
          Esta pantalla es de un locke, y un locke solo lo ven quienes lo juegan
          o lo miran. En el inicio tienes cómo entrar en uno.
        </p>
        <Link href="/" className="btn-primary mt-5">
          Ir al inicio
        </Link>
      </div>
    );
  }

  return <Bienvenida />;
}

/**
 * La portada de quien no tiene ningún locke: qué es esto, cómo se entra en uno
 * y qué puede ir haciendo mientras.
 */
async function Bienvenida() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [ficha, solicitudes, deAntes] = await Promise.all([
    // Quién le dio de alta: es a quien tiene que pedirle que le apunte
    prisma.user.findUnique({
      where: { id: user.id },
      select: { creadoPor: { select: { displayName: true } } },
    }),
    getMisSolicitudes(user.id),
    // Si sale en algún locke de antes de la aplicación, tiene palmarés que ver
    prisma.lockeDeAntes.count({ where: { jugadoresIds: { has: user.id } } }),
  ]);
  const organiza = puedeCrearLockes(user);
  const esperando = solicitudes.some((solicitud) => solicitud.estado === "PENDIENTE");
  const quienTeDioDeAlta = ficha?.creadoPor?.displayName ?? null;

  return (
    <>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">
          Bienvenido a HexaApp
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Hola, {user.displayName}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          {organiza
            ? "Todavía no llevas ningún locke. Tienes permiso para montar los tuyos: en cuanto crees uno, esto se llena."
            : "Aquí se lleva el locke entero: capturas, bajas, gimnasios, jornadas y puntos. Todavía no juegas ninguno; así es como se entra."}
        </p>
      </header>

      {/* Si ya pidió uno, lo primero es decirle cómo va */}
      <MisSolicitudes solicitudes={solicitudes} />

      <div className="grid gap-3 lg:grid-cols-3">
        {organiza ? (
          <Camino
            numero="01"
            emoji="🎪"
            titulo="Móntalo tú"
            destacado
          >
            <p>
              Crea tu edición, elige el juego y da de alta a los tuyos. Entras
              en ella como su administrador.
            </p>
            <Link href="/competiciones" className="btn-primary mt-4">
              Crear mi locke
            </Link>
          </Camino>
        ) : (
          <Camino numero="01" emoji="🤝" titulo="Que te apunten" destacado>
            <p>
              Quien organiza un locke te añade como jugador desde su edición.
              Pásale tu usuario:
            </p>
            <div className="mt-3">
              <UsuarioCopiable username={user.username} />
            </div>
            {quienTeDioDeAlta ? (
              <p className="mt-3 text-xs text-slate-500">
                Te dio de alta <strong className="text-slate-300">{quienTeDioDeAlta}</strong>:
                seguramente es a quien tienes que decírselo.
              </p>
            ) : null}
          </Camino>
        )}

        {organiza ? (
          <Camino numero="02" emoji="🔑" titulo="Trae a los tuyos">
            <p>
              Desde <strong className="text-slate-200">Ediciones</strong> creas
              las cuentas de tus amigos y los apuntas a tu locke. Cada uno entra
              con su usuario y la contraseña que le pongas.
            </p>
          </Camino>
        ) : (
        <Camino numero="02" emoji="🎮" titulo="Pide el tuyo">
          <p>
            Para ti solo o para jugarlo con tus amigos. Se lo pides a quien lleva
            la aplicación y, si dice que sí, el locke es tuyo y lo administras tú.
          </p>
          {esperando ? (
            <p className="mt-3 text-xs text-amber-300">
              <Icono emoji="⏳" /> Ya tienes una petición esperando respuesta.
            </p>
          ) : (
            <a href="#pedir" className="btn-ghost btn-sm mt-4">
              Rellenar la petición ↓
            </a>
          )}
        </Camino>
        )}

        <Camino numero="03" emoji="👁" titulo="Solo mirar">
          <p>
            Si quieres seguir un locke sin jugarlo, pide a quien lo organiza
            acceso de <strong className="text-slate-200">espectador</strong>: lo
            verás entero sin poder tocar nada.
          </p>
        </Camino>
      </div>

      {/* Quien puede montarlo no tiene que pedirlo */}
      {organiza ? null : (
        <div id="pedir" className="mt-6 scroll-mt-6">
          <LockeEnSolitarioForm puedeCrearDirecto={false} abierto={!esperando} explicado />
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
          Mientras tanto
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Atajo href="/perfil" emoji="👤" titulo="Tu perfil">
            Ponte foto y color: es como te verán en la tabla.
          </Atajo>
          <Atajo href="/guia" emoji="❓" titulo="Guía de uso">
            Cómo funciona todo, con fotos de cada pantalla.
          </Atajo>
          {deAntes > 0 ? (
            <Atajo href="/palmares" emoji="👑" titulo="Tu palmarés">
              Los lockes que jugaste antes de la aplicación.
            </Atajo>
          ) : (
            <Atajo href="/competiciones" emoji="🗂️" titulo="Ediciones">
              Tus peticiones y, cuando las haya, tus ediciones.
            </Atajo>
          )}
        </div>
      </section>
    </>
  );
}

/** Una forma de entrar en un locke, con su número grande de marcador */
function Camino({
  numero,
  emoji,
  titulo,
  destacado = false,
  children,
}: {
  numero: string;
  emoji: string;
  titulo: string;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={
        destacado
          ? "card relative overflow-hidden border-brand-400/40 bg-brand-600/[0.08]"
          : "card relative overflow-hidden"
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1 -top-3 text-7xl font-black text-white/[0.04] tabular-nums"
      >
        {numero}
      </span>
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        <Icono emoji={emoji} className="text-brand-300" /> {titulo}
      </h2>
      <div className="mt-2 text-sm text-slate-400">{children}</div>
    </section>
  );
}

/** Un enlace de "mientras tanto" */
function Atajo({
  href,
  emoji,
  titulo,
  children,
}: {
  href: string;
  emoji: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card-tight flex items-start gap-3 transition hover:border-brand-500/40"
    >
      <Icono emoji={emoji} tamano={20} className="mt-0.5 shrink-0 text-brand-300" />
      <span className="min-w-0">
        <span className="block font-semibold text-white">{titulo}</span>
        <span className="block text-xs text-slate-500">{children}</span>
      </span>
    </Link>
  );
}
