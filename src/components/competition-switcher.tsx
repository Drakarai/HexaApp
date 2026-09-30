"use client";

import { useRef, useTransition } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  if (!competitions.length) return null;

  return (
    <form ref={formRef} action={selectCompetitionAction}>
      <label className="label" htmlFor="competition-switcher">
        Competición
      </label>
      <select
        id="competition-switcher"
        name="competitionId"
        className="input"
        defaultValue={currentId ?? ""}
        disabled={pending}
        onChange={() => {
          startTransition(() => formRef.current?.requestSubmit());
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
    </form>
  );
}
