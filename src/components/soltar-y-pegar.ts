"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Subir imágenes **pegándolas** (Ctrl+V de una captura de pantalla) o
 * **arrastrándolas** encima del campo, además del botón de siempre. Es sobre
 * todo para el ordenador: quien administra sube casi todas las imágenes y lo
 * normal es tenerlas en el portapapeles o en el escritorio.
 *
 * Pegar no va a ningún campo en concreto: el navegador lo manda a la página.
 * Por eso todos los campos de imagen montados se apuntan aquí y la imagen va
 * al que toque, por este orden: el que tiene el ratón encima, el que tiene el
 * foco, el último que se tocó y, si en la pantalla solo hay uno, ese. Si no
 * queda claro cuál, no se pega en ninguno (mejor nada que en el que no era).
 */

type Registro = {
  nodo: () => HTMLElement | null;
  recibir: (archivos: File[]) => void;
  encima: boolean;
};

const registrados = new Set<Registro>();
let ultimo: Registro | null = null;
let escuchando = false;

function visible(registro: Registro) {
  const nodo = registro.nodo();
  // Uno plegado dentro de un <details> cerrado o en una pestaña oculta no cuenta
  return Boolean(nodo && nodo.getClientRects().length);
}

function alPegar(evento: ClipboardEvent) {
  const imagenes = Array.from(evento.clipboardData?.files ?? []).filter((f) =>
    f.type.startsWith("image/"),
  );
  // Sin imagen en el portapapeles es un pegado de texto normal: ni se toca
  if (!imagenes.length) return;

  const candidatos = [...registrados].filter(visible);
  const destino =
    candidatos.find((r) => r.encima) ??
    candidatos.find((r) => r.nodo()?.contains(document.activeElement)) ??
    (ultimo && candidatos.includes(ultimo) ? ultimo : null) ??
    (candidatos.length === 1 ? candidatos[0] : null);
  if (!destino) return;

  evento.preventDefault();
  destino.recibir(imagenes);
}

export function useSoltarYPegar(recibir: (archivos: File[]) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const recibirRef = useRef(recibir);
  useEffect(() => {
    recibirRef.current = recibir;
  });
  const registro = useRef<Registro>({
    nodo: () => ref.current,
    recibir: (archivos) => recibirRef.current(archivos),
    encima: false,
  });

  useEffect(() => {
    const yo = registro.current;
    registrados.add(yo);
    if (!escuchando) {
      document.addEventListener("paste", alPegar);
      escuchando = true;
    }
    return () => {
      registrados.delete(yo);
      if (ultimo === yo) ultimo = null;
    };
  }, []);

  const props = {
    ref,
    onPointerEnter: () => {
      registro.current.encima = true;
    },
    onPointerLeave: () => {
      registro.current.encima = false;
    },
    onPointerDown: () => {
      ultimo = registro.current;
    },
    onFocus: () => {
      ultimo = registro.current;
    },
    onDragOver: (evento: React.DragEvent) => {
      if (!Array.from(evento.dataTransfer.types).includes("Files")) return;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "copy";
      setArrastrando(true);
    },
    onDragLeave: (evento: React.DragEvent) => {
      // Al pasar por encima de un hijo también salta: solo cuenta salir del todo
      if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
        setArrastrando(false);
      }
    },
    onDrop: (evento: React.DragEvent) => {
      setArrastrando(false);
      const imagenes = Array.from(evento.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!imagenes.length) return;
      evento.preventDefault();
      ultimo = registro.current;
      recibirRef.current(imagenes);
    },
  };

  return { props, arrastrando };
}

/** El aviso de que se puede pegar o arrastrar, y solo con ratón, que es donde se hace */
export const PISTA_DE_PEGAR = "También puedes pegarla (Ctrl+V) o arrastrarla aquí.";
export const SOLO_CON_RATON = "hidden [@media(pointer:fine)]:block";
