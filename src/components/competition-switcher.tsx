"use client";

import { useEffect, useState, useTransition } from "react";
import { selectCompetitionAction } from "@/app/actions/competitions";

type Option = { id: string; name: string; status: string; supervisando?: boolean };

function Opcion({ competition }: { competition: Option }) {
  return (
    <option value={competition.id}>
      {competition.name}
      {competition.status === "ARCHIVED" ? " (archivada)" : ""}
    </option>
  );
}

export function CompetitionSwitcher({
  competitions,
  currentId,
}: {
  competitions: Option[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  /**
   * Lo que enseña el selector, **atado al locke de verdad**, y la acción se
   * llama **directamente y no con un `<form>`**. Iba en un formulario, y desde
   * React 19 un formulario se vacía solo al terminar su acción: el selector
   * volvía a su opción de partida justo después de cambiar de locke. La
   * pantalla era de uno y el selector decía otro, y elegir ese «otro» no hacía
   * nada porque para el navegador ya estaba elegido.
   */
  const [elegido, setElegido] = useState(currentId ?? "");
  useEffect(() => setElegido(currentId ?? ""), [currentId]);

  if (!competitions.length) return null;

  return (
    <div>
      <label className="label" htmlFor="competition-switcher">
        Competición
      </label>
      <select
        id="competition-switcher"
        name="competitionId"
        className="input"
        value={elegido}
        disabled={pending}
        onChange={(evento) => {
          const id = evento.target.value;
          setElegido(id);
          const datos = new FormData();
          datos.set("competitionId", id);
          startTransition(() => selectCompetitionAction(datos));
        }}
      >
        {/* El que se está supervisando va aparte, para que se vea que no es tuyo */}
        {competitions.some((c) => c.supervisando) ? (
          <>
            <optgroup label="Tus lockes">
              {competitions
                .filter((c) => !c.supervisando)
                .map((competition) => (
                  <Opcion key={competition.id} competition={competition} />
                ))}
            </optgroup>
            <optgroup label="Supervisando">
              {competitions
                .filter((c) => c.supervisando)
                .map((competition) => (
                  <Opcion key={competition.id} competition={competition} />
                ))}
            </optgroup>
          </>
        ) : (
          competitions.map((competition) => (
            <Opcion key={competition.id} competition={competition} />
          ))
        )}
      </select>
    </div>
  );
}
