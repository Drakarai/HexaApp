"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/utils";

export const CAROUSEL_INTERVAL = 4000;

/**
 * Índice que va rotando cada `intervalMs`. Con una sola imagen no hace nada,
 * se detiene cuando la pestaña no está a la vista, y respeta la opción del
 * sistema de reducir animaciones (se queda en la primera).
 */
export function useCarouselIndex(count: number, intervalMs = CAROUSEL_INTERVAL) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % count);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [count, intervalMs]);

  // Si se borran imágenes mientras rota, el índice podría quedarse fuera
  return count ? index % count : 0;
}

/** Imágenes apiladas que se funden entre sí. */
export function ImageCarousel({
  images,
  alt,
  className,
  imageClassName,
}: {
  images: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  const index = useCarouselIndex(images.length);
  if (!images.length) return null;

  return (
    <span className={cx("relative block", className)}>
      {images.map((image, position) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={position}
          src={image}
          alt={position === index ? alt : ""}
          loading={position === 0 ? "eager" : "lazy"}
          className={cx(
            "absolute inset-0 h-full w-full transition-opacity duration-1000",
            position === index ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      ))}
    </span>
  );
}

/**
 * La misma rotación, pero como fondo decorativo: se usa difuminada detrás de
 * las tarjetas, sincronizada con la imagen principal si comparten lista.
 */
export function CarouselBackdrop({
  images,
  className,
}: {
  images: string[];
  className?: string;
}) {
  const index = useCarouselIndex(images.length);
  if (!images.length) return null;

  return (
    <span aria-hidden className={cx("pointer-events-none block", className)}>
      {images.map((image, position) => (
        <span
          key={position}
          className={cx(
            "absolute inset-0 transition-opacity duration-1000",
            position === index ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundImage: `url(${JSON.stringify(image)})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      ))}
    </span>
  );
}
