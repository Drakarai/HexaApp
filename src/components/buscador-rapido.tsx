"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { buscadorAction, type CosaBuscable } from "@/app/actions/buscador";
import { cx } from "@/lib/utils";
import { Icono } from "@/components/icono";
import { SpritePokemon } from "@/components/sprite-pokemon";

type Pantalla = { href: string; label: string; icon: string };
type Resultado = { clave: string; texto: string; detalle?: string; href: string; icono: string; pokemonId?: number | null };

const GRUPOS: { tipo: CosaBuscable["tipo"] | "pantalla"; titulo: string; icono: string }[] = [
  { tipo: "pantalla", titulo: "Pantallas", icono: "" },
  { tipo: "jugador", titulo: "Jugadores", icono: "👤" },
  { tipo: "pokemon", titulo: "Pokémon", icono: "📦" },
  { tipo: "ruta", titulo: "Rutas de tu mapa", icono: "📍" },
  { tipo: "baja", titulo: "Cementerio", icono: "🪦" },
];
const POR_GRUPO = 6;

/** Sin tildes ni mayúsculas: «pegaso» encuentra «Pegaso» y «leon» a «León» */
const plano = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * El **buscador rápido** del ordenador: Ctrl+K (o ⌘K) desde cualquier pantalla
 * y se salta a una pantalla, a un jugador, a una ruta de tu mapa, a un pokémon
 * de tu caja o al cementerio sin pasar por los menús. Se maneja con el teclado:
 * flechas para elegir, Enter para ir y Escape para cerrar.
 *
 * Las pantallas son las del menú, que ya sabe cuáles te tocan; lo demás se pide
 * al servidor al abrirlo (`buscadorAction`), con la privacidad de siempre.
 */
export function BuscadorRapido({ pantallas }: { pantallas: Pantalla[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [cosas, setCosas] = useState<CosaBuscable[] | null>(null);
  const [elegido, setElegido] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);

  // El atajo vale en toda la aplicación
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierto((antes) => !antes);
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, []);

  // Al abrir: a escribir, y lo del locke recién pedido (puede haber cambiado desde la última vez)
  useEffect(() => {
    if (!abierto) return;
    setTexto("");
    setElegido(0);
    entrada.current?.focus();
    let vigente = true;
    buscadorAction()
      .then((r) => vigente && setCosas(r))
      .catch(() => vigente && setCosas([]));
    return () => {
      vigente = false;
    };
  }, [abierto]);

  const resultados = useMemo(() => {
    const aguja = plano(texto.trim());
    const todas: (Resultado & { tipo: string })[] = [
      ...pantallas.map((p) => ({ clave: `p-${p.href}`, tipo: "pantalla", texto: p.label, href: p.href, icono: p.icon })),
      ...(cosas ?? []).map((c, i) => ({
        clave: `${c.tipo}-${i}`,
        tipo: c.tipo,
        texto: c.texto,
        detalle: c.detalle,
        href: c.href,
        icono: GRUPOS.find((g) => g.tipo === c.tipo)?.icono ?? "",
        pokemonId: c.pokemonId,
      })),
    ];
    return GRUPOS.flatMap((grupo) => {
      const delGrupo = todas.filter((r) => r.tipo === grupo.tipo);
      // Sin escribir nada solo salen las pantallas: lo demás es demasiado para una lista
      if (!aguja) return grupo.tipo === "pantalla" ? [{ grupo, items: delGrupo }] : [];
      const encontrados = delGrupo
        .map((r) => ({ r, donde: plano(`${r.texto} ${r.detalle ?? ""}`).indexOf(aguja) }))
        .filter((x) => x.donde >= 0)
        // Primero lo que empieza por lo escrito
        .sort((a, b) => Number(a.donde !== 0) - Number(b.donde !== 0) || a.r.texto.localeCompare(b.r.texto))
        .slice(0, POR_GRUPO)
        .map((x) => x.r);
      return encontrados.length ? [{ grupo, items: encontrados }] : [];
    });
  }, [texto, cosas, pantallas]);

  const planos = resultados.flatMap((g) => g.items);

  function ir(resultado: Resultado | undefined) {
    if (!resultado) return;
    setAbierto(false);
    router.push(resultado.href);
  }

  function alTeclearDentro(evento: React.KeyboardEvent) {
    if (evento.key === "Escape") setAbierto(false);
    else if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      const paso = evento.key === "ArrowDown" ? 1 : -1;
      const siguiente = (elegido + paso + planos.length) % Math.max(planos.length, 1);
      setElegido(siguiente);
      lista.current?.querySelector(`[data-indice="${siguiente}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      ir(planos[elegido]);
    }
  }

  let indice = -1;
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-slate-200"
      >
        <Icono emoji="🔍" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border border-white/15 px-1.5 text-[10px] text-slate-500">Ctrl K</kbd>
      </button>

      {abierto
        ? createPortal(
            <div
              className="fixed inset-0 z-[85] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
              onClick={() => setAbierto(false)}
            >
              <div
                role="dialog"
                aria-label="Buscador rápido"
                className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl"
                onClick={(evento) => evento.stopPropagation()}
                onKeyDown={alTeclearDentro}
              >
                <div className="flex items-center gap-2 border-b border-white/10 px-4">
                  <span className="text-slate-500">
                    <Icono emoji="🔍" />
                  </span>
                  <input
                    ref={entrada}
                    value={texto}
                    onChange={(evento) => {
                      setTexto(evento.target.value);
                      setElegido(0);
                    }}
                    placeholder="Una pantalla, un jugador, una ruta, un pokémon…"
                    className="w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-500"
                    aria-label="Buscar"
                  />
                  <kbd className="rounded border border-white/15 px-1.5 text-[10px] text-slate-500">Esc</kbd>
                </div>

                <ul ref={lista} className="max-h-[55vh] overflow-y-auto p-2">
                  {resultados.map(({ grupo, items }) => (
                    <li key={grupo.tipo}>
                      <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {grupo.titulo}
                      </p>
                      <ul>
                        {items.map((r) => {
                          indice += 1;
                          const i = indice;
                          return (
                            <li key={r.clave}>
                              <button
                                type="button"
                                data-indice={i}
                                onMouseEnter={() => setElegido(i)}
                                onClick={() => ir(r)}
                                className={cx(
                                  "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition",
                                  i === elegido ? "bg-brand-600/25 text-white" : "text-slate-300",
                                )}
                              >
                                {r.pokemonId ? (
                                  <SpritePokemon src={null} pokemonId={r.pokemonId} alt="" className="h-7 w-7 shrink-0 object-contain" />
                                ) : (
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400">
                                    <Icono emoji={r.icono} />
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 truncate">
                                  {r.texto}
                                  {r.detalle ? <span className="text-slate-500"> · {r.detalle}</span> : null}
                                </span>
                                {i === elegido ? <span className="text-xs text-slate-500">↵</span> : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                  {!planos.length ? (
                    <li className="px-3 py-6 text-center text-sm text-slate-500">
                      {cosas === null && texto ? "Buscando…" : "Nada se llama así."}
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
