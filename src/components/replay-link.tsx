/**
 * El botón para ver la repetición de un combate. Solo aparece si un
 * administrador ha pegado el enlace: sin enlace no hay botón, que era la
 * condición.
 *
 * Se abre en otra pestaña porque lleva fuera de la aplicación —a Showdown, a un
 * vídeo—, y con `noreferrer` para no ir contando de dónde viene la gente.
 */
export function ReplayLink({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="chip shrink-0 border-brand-500/30 bg-brand-600/15 text-brand-200 transition hover:bg-brand-600/25"
    >
      <span aria-hidden>▶</span>
      Ver combate
    </a>
  );
}
