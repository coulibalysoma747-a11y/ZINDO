"use client";

import { useState } from "react";

// Vidéo de démonstration : déposez-la dans public/demo/zindo-demo.mp4
// (et optionnellement une miniature public/demo/zindo-demo.jpg).
// Tant que le fichier n'existe pas, la section ne s'affiche pas.
export function DemoVideo() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
          ZINDO en action
        </h2>
        <p className="mt-3 text-zinc-600">Découvrez en quelques minutes comment gérer votre commerce avec ZINDO.</p>
      </div>
      <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl bg-zindo-ink-900 shadow-xl">
        <video
          controls
          preload="metadata"
          playsInline
          poster="/demo/zindo-demo.jpg"
          className="aspect-video w-full"
          onError={() => setFailed(true)}
        >
          <source src="/demo/zindo-demo.mp4" type="video/mp4" onError={() => setFailed(true)} />
        </video>
      </div>
    </section>
  );
}
