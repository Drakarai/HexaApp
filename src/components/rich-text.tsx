import { Fragment } from "react";

/**
 * Render muy ligero de texto: líneas que empiezan por "- " se agrupan en una
 * lista, **negrita** se marca en negrita y el resto son párrafos.
 * Es intencionadamente limitado — no interpreta HTML, así que no hay riesgo
 * de inyección desde el texto que escriben los administradores.
 */
export function RichText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<
    { type: "p"; content: string } | { type: "ul"; items: string[] }
  > = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^[-*•]\s+/.test(line)) {
      const item = line.replace(/^[-*•]\s+/, "");
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else {
      blocks.push({ type: "p", content: line });
    }
  }

  if (!blocks.length) {
    return <p className="text-sm text-slate-500">Sin contenido.</p>;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-300">
      {blocks.map((block, index) =>
        block.type === "ul" ? (
          <ul key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>
                  <Bold text={item} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            <Bold text={block.content} />
          </p>
        ),
      )}
    </div>
  );
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
