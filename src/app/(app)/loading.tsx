/**
 * Lo que se ve **mientras llega la pantalla nueva** al cambiar de sección.
 *
 * Antes, al tocar una pestaña, la de antes se quedaba quieta hasta que la base
 * de datos contestaba —en Neon, por internet, se nota—, y parecía que no se
 * había tocado nada. Con esto el cambio es instantáneo: sale al momento la
 * forma de una página (título, cifras, una tarjeta con filas) en gris, y se
 * rellena cuando llegan los datos. El menú y la cabecera no se mueven, porque
 * son del layout y no de la página.
 *
 * Es una sola para todas las secciones: la forma es la de casi todas, y una
 * por pantalla sería mucho que mantener para lo poco que se ve.
 */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* El título y su renglón de explicación */}
      <div className="mb-6">
        <Bloque className="h-9 w-56 sm:h-11 sm:w-72" />
        <Bloque className="mt-3 h-3.5 w-full max-w-md" />
        <Bloque className="mt-2 h-3.5 w-2/3 max-w-xs" />
      </div>

      {/* Una fila de cifras, como las tarjetas del resumen */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card-tight">
            <Bloque className="h-2.5 w-16" />
            <Bloque className="mt-3 h-7 w-20" />
            <Bloque className="mt-2 h-2.5 w-24" />
          </div>
        ))}
      </div>

      {/* Y una tarjeta con filas, que es la forma de las listas y las tablas */}
      <div className="card mt-6">
        <Bloque className="mb-5 h-5 w-40" />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bloque className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Bloque className="h-3.5" style={{ width: `${70 - i * 8}%` }} />
                <Bloque className="mt-2 h-2.5 w-24" />
              </div>
              <Bloque className="h-5 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Un trozo de esqueleto. Late despacio, salvo a quien pide menos movimiento. */
function Bloque({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      // El redondeo por defecto solo si no trae el suyo: si no, pisaba al de
      // las fotos, que tienen que salir redondas
      className={`${className.includes("rounded-") ? "" : "rounded-md "}bg-white/[0.06] motion-safe:animate-pulse ${className}`}
      style={style}
    />
  );
}
