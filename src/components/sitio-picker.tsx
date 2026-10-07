"use client";

import { useState } from "react";
import type { ZonaParaElegir } from "@/lib/mapas";
import { TIPOS_DE_ZONA } from "@/lib/zonas";

/**
 * Dónde pasó algo, elegido de las zonas del mapa de la región.
 *
 * Antes esto era un campo de texto libre y cada uno escribía lo que le salía
 * —"Ruta 32", "ruta 32", "la del pescador"—, así que no se podía contar nada.
 * Ahora se elige de la lista, y como no todo pasa en una zona del mapa (un
 * combate de jornada, un intercambio) queda **"Otro sitio"**, que abre el
 * campo de escribir de toda la vida.
 *
 * Va con un `<select>` de los de siempre y no con un buscador a medida a
 * propósito: en el móvil el desplegable nativo es una rueda grande, se puede
 * escribir para saltar, y no hay nada que se pueda romper.
 */

/** Valor del desplegable cuando se quiere escribir el sitio a mano */
const OTRO = "__otro__";

export function SitioPicker({
  zonas,
  defaultZoneId = null,
  defaultLocation = null,
  label = "Dónde",
  placeholder = "Combate contra Draka, intercambio…",
  onCambiar,
}: {
  zonas: ZonaParaElegir[];
  defaultZoneId?: string | null;
  defaultLocation?: string | null;
  label?: string;
  placeholder?: string;
  /**
   * Para quien no lo manda en un formulario (la ficha del Equipo y PC, que
   * va por la cola sin conexión): avisa de lo elegido cada vez que cambia.
   */
  onCambiar?: (sitio: { zoneId: string | null; location: string | null }) => void;
}) {
  /**
   * Se arranca en "otro" si ya había un sitio escrito y ninguna zona puesta:
   * así lo de antes sigue viéndose en vez de desaparecer al abrir la ficha.
   */
  const [elegido, setElegido] = useState<string>(
    defaultZoneId ?? (defaultLocation ? OTRO : ""),
  );
  const [escrito, setEscrito] = useState(defaultLocation ?? "");
  const avisar = (zona: string, texto: string) =>
    onCambiar?.({
      zoneId: zona && zona !== OTRO ? zona : null,
      location: !zonas.length || zona === OTRO ? texto.trim() || null : null,
    });

  /**
   * Cómo se reparten las opciones del desplegable.
   *
   * Con una sola región manda el **tipo** de sitio (Rutas, Ciudades, Cuevas…),
   * que es lo que ayuda a encontrar algo entre cincuenta. Cuando la edición
   * tiene dos —Johto y Kanto en la 2ª generación— manda la **región**: saber
   * en cuál estás importa más, y dentro de cada una las rutas ya salen
   * ordenadas por número.
   */
  const regiones = [...new Set(zonas.map((zona) => zona.region))];
  const porRegion = regiones.length > 1;

  const grupos = porRegion
    ? regiones.map((region) => ({
        nombre: region,
        zonas: zonas.filter((zona) => zona.region === region),
      }))
    : TIPOS_DE_ZONA.map((tipo) => ({
        nombre: tipo.nombre,
        zonas: zonas.filter((zona) => zona.kind === tipo.id),
      })).filter((grupo) => grupo.zonas.length);

  // Las de un tipo que ya no existe no se pueden quedar fuera de la lista
  const sueltas = porRegion
    ? []
    : zonas.filter(
        (zona) => !TIPOS_DE_ZONA.some((tipo) => tipo.id === zona.kind),
      );

  return (
    <div>
      <label className="label">{label}</label>
      {zonas.length ? (
        <select
          name="zoneId"
          className="input"
          value={elegido}
          onChange={(evento) => {
            setElegido(evento.target.value);
            avisar(evento.target.value, escrito);
          }}
        >
          <option value="">Sin especificar</option>
          {grupos.map((grupo) => (
            <optgroup key={grupo.nombre} label={grupo.nombre}>
              {grupo.zonas.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.label}
                </option>
              ))}
            </optgroup>
          ))}
          {sueltas.length ? (
            <optgroup label="Otras">
              {sueltas.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          <option value={OTRO}>Otro sitio (escribirlo)…</option>
        </select>
      ) : null}

      {/* El campo de texto sale cuando no hay mapa que ofrecer o cuando se ha
          elegido "Otro sitio". El `name` no cambia: el servidor se queda con
          la zona si viene, y si no, con lo escrito. */}
      {!zonas.length || elegido === OTRO ? (
        <input
          name="location"
          className={zonas.length ? "input mt-2" : "input"}
          value={escrito}
          onChange={(evento) => {
            setEscrito(evento.target.value);
            avisar(elegido, evento.target.value);
          }}
          maxLength={80}
          placeholder={placeholder}
        />
      ) : null}
    </div>
  );
}
