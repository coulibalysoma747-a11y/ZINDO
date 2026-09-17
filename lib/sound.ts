let audioContext: AudioContext | null = null;

/**
 * Petit bip de confirmation à l'ajout d'un produit au panier — généré à la
 * volée (Web Audio API), sans fichier audio à charger. Jamais bloquant : une
 * erreur (politique autoplay du navigateur, contexte non supporté...) est
 * simplement ignorée, le produit reste ajouté au panier quoi qu'il arrive.
 */
export function playAddToCartSound() {
  if (typeof window === "undefined") return;
  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audioContext = new Ctor();
    }
    const ctx = audioContext;
    if (ctx.state === "suspended") ctx.resume();

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {
    // Le son n'est qu'un confort — jamais bloquant.
  }
}
