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

/**
 * Bip d'erreur (deux notes graves et descendantes), bien distinct du bip
 * d'ajout : produit refusé à la caisse, par exemple en rupture de stock.
 */
export function playErrorSound() {
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

    [
      { frequency: 440, start: 0 },
      { frequency: 294, start: 0.16 },
    ].forEach(({ frequency, start }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.14);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + 0.14);
    });
  } catch {
    // Le son n'est qu'un confort — jamais bloquant.
  }
}

/**
 * Bip d'avertissement (deux notes moyennes identiques), entre le bip d'ajout
 * et le bip d'erreur : le produit est ajouté mais le stock ne suffit pas
 * (flag bips_scan).
 */
export function playWarningSound() {
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

    [0, 0.14].forEach((start) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.1);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + start);
      oscillator.stop(ctx.currentTime + start + 0.1);
    });
  } catch {
    // Le son n'est qu'un confort — jamais bloquant.
  }
}

/** Vibration du téléphone (sans effet sur ordinateur ni sur iPhone, qui ne la permet pas aux pages web). */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Confort seulement.
  }
}
