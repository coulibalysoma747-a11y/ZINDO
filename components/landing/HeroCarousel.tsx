"use client";

import { useEffect, useState } from "react";

// Real merchant photography keeps the hero focused on the people using ZINDO.
const SLIDES = [
  "/photos/rue-commercante-ouagadougou.webp",
  "/photos/commercante-boutique.webp",
  "/photos/pharmacie-rayons.webp",
];
const INTERVAL_MS = 5000;

export function HeroCarousel({ children }: { children: React.ReactNode }) {
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const slides = SLIDES.filter((s) => !missing.has(s));

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides.length ? index % slides.length : -1;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-zindo-ink-900">
      {SLIDES.map((src) =>
        missing.has(src) ? null : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden
            onError={() => setMissing((m) => new Set(m).add(src))}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${slides[current] === src ? "opacity-100" : "opacity-0"}`}
          />
        ),
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-zindo-ink-900 via-zindo-ink-900/70 to-zindo-ink-900/40" />
      <div className="relative px-6 py-16 sm:px-12 sm:py-24">{children}</div>
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
