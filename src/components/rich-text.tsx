import { Fragment } from "react";
import { trozosDeLinea } from "@/lib/texto-en-linea";

/**
 * Render muy ligero de texto: líneas que empiezan por "- " se agrupan en una
 * lista, **negrita** se marca en negrita, [texto](https://…) y las direcciones
 * pegadas tal cual son enlaces, y el resto son párrafos.
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
                  <EnLinea text={item} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index}>
            <EnLinea text={block.content} />
          </p>
        ),
      )}
    </div>
  );
}

function EnLinea({ text }: { text: string }) {
  return (
    <>
      {trozosDeLinea(text).map((trozo, index) =>
        trozo.tipo === "negrita" ? (
          <strong key={index} className="font-semibold text-white">
            {trozo.texto}
          </strong>
        ) : trozo.tipo === "enlace" ? (
          // Fuera de la app, en otra pestaña: quien lee la regla no pierde la página
          <a
            key={index}
            href={trozo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words font-medium text-brand-400 underline decoration-brand-400/40 underline-offset-2 hover:decoration-brand-400"
          >
            {trozo.texto}
          </a>
        ) : (
          <Fragment key={index}>{trozo.texto}</Fragment>
        ),
      )}
    </>
  );
}
