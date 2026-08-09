"use client";

import { useRef, useTransition } from "react";
import { selectCompetitionAction } from "@/app/actions/competitions";

type Option = { id: string; name: string; status: string };

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
        {competitions.map((competition) => (
          <option key={competition.id} value={competition.id}>
            {competition.name}
            {competition.status === "ARCHIVED" ? " (archivada)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
