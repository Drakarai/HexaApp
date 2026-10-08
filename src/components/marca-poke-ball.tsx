/**
 * La Poké Ball de marca de agua de las fichas de entrenador (Mi perfil y el
 * perfil de cada jugador): de adorno, en la esquina y casi transparente.
 */
export function MarcaPokeBall() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 text-white opacity-[0.06] sm:h-72 sm:w-72"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="8" />
      <path d="M4 50h30M66 50h30" stroke="currentColor" strokeWidth="8" />
      <circle cx="50" cy="50" r="13" fill="none" stroke="currentColor" strokeWidth="8" />
    </svg>
  );
}
