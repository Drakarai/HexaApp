"use client";

import { CarouselBackdrop, ImageCarousel } from "@/components/image-carousel";
import { cx } from "@/lib/utils";

/**
 * La parte visual de un level cap: la imagen grande con el nivel encima y el
 * fondo difuminado de la tarjeta. Van en el mismo componente para que ambos
 * cambien de imagen a la vez cuando hay varias.
 */
export function LevelCapArt({
  images,
  cap,
  label,
  allCleared,
}: {
  images: string[];
  cap: number;
  label: string;
  allCleared: boolean;
}) {
  if (!images.length) {
    return (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600/20 text-2xl font-black text-brand-400 ring-1 ring-brand-500/30">
        {cap}
      </span>
    );
  }

  return (
    <>
      {/* Las propias imágenes, muy difuminadas, hacen de fondo de la tarjeta */}
      <CarouselBackdrop
        images={images}
        className="absolute -right-10 -top-10 -z-10 h-48 w-48 opacity-[0.13] blur-[2px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
      />

      <span className="relative shrink-0">
        <span
          className={cx(
            "block h-16 w-16 overflow-hidden rounded-2xl bg-ink-850 ring-1",
            allCleared ? "ring-emerald-400/40" : "ring-white/10",
          )}
        >
          <ImageCarousel
            images={images}
            alt={label}
            className="h-full w-full"
            imageClassName="object-contain p-1"
          />
        </span>

        {/* Con imagen, el nivel se queda como chapita en la esquina */}
        <span className="absolute -bottom-1.5 -right-1.5 rounded-lg bg-brand-600 px-1.5 py-0.5 text-xs font-black text-white shadow-lg shadow-black/40 ring-1 ring-brand-400/40">
          {cap}
        </span>

        {/* Con varias, unos puntitos discretos indican cuántas hay */}
        {images.length > 1 ? (
          <span className="absolute -top-1.5 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-ink-950/80 px-1.5 py-0.5 ring-1 ring-white/10">
            {images.map((_, index) => (
              <span
                key={index}
                className="h-1 w-1 rounded-full bg-slate-400/70"
                aria-hidden
              />
            ))}
          </span>
        ) : null}
      </span>
    </>
  );
}
