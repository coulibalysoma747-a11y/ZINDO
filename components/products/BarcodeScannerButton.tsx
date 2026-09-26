"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Scan par caméra : l'API native BarcodeDetector quand le navigateur la
// fournit (Android, Mac). Elle n'existe PAS sur Windows (Chrome, Edge,
// application ZINDO pour PC) ni sur Firefox : on charge alors, à la demande,
// le lecteur ZXing (paquet barcode-detector, même interface). Son moteur
// .wasm est servi depuis public/vendor/zxing/ — jamais depuis Internet —
// pour que le scan marche aussi hors ligne. En cas de mise à jour du paquet
// (version figée dans package.json), recopier
// node_modules/zxing-wasm/dist/reader/zxing_reader.wasm à cet endroit.
const FORMATS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"];

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => Detector;
  }
}

async function createDetector(): Promise<Detector> {
  if (typeof window !== "undefined" && window.BarcodeDetector) {
    return new window.BarcodeDetector({ formats: FORMATS });
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith(".wasm") ? `/vendor/zxing/${path}` : prefix + path,
    },
  });
  return new BarcodeDetector({ formats: FORMATS as never });
}

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    (async () => {
      setStarting(true);
      let detector: Detector;
      try {
        detector = await createDetector();
      } catch {
        if (active) setError("Le lecteur de codes-barres n'a pas pu démarrer. Saisissez le code à la main.");
        setStarting(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setError("Aucune caméra accessible sur cet appareil. Saisissez le code à la main ou utilisez une douchette USB.");
        setStarting(false);
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        if (active) setError("Impossible d'accéder à la caméra. Vérifiez qu'elle est branchée et autorisée pour ZINDO.");
        setStarting(false);
        return;
      }
      if (!active) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setStarting(false);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      // Le lecteur ZXing est plus lent que l'API native : une analyse toutes
      // les 150 ms suffit et laisse l'ordinateur respirer.
      const scan = async () => {
        if (!active || !videoRef.current) return;
        try {
          if (videoRef.current.readyState >= 2) {
            const codes = await detector.detect(videoRef.current);
            if (active && codes.length > 0) {
              onDetected(codes[0].rawValue);
              close();
              return;
            }
          }
        } catch {
          // continuer malgré une erreur ponctuelle de détection
        }
        if (active) setTimeout(scan, 150);
      };
      scan();
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
    setError(null);
    setStarting(false);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" /> Scanner
      </Button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <button onClick={close} aria-label="Fermer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
            <X className="h-5 w-5" />
          </button>
          {error ? (
            <div className="max-w-sm rounded-xl bg-white p-5 text-center">
              <p className="text-sm text-zinc-700">{error}</p>
              <Button className="mt-4" onClick={close}>
                Fermer
              </Button>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="max-h-[70vh] w-full max-w-md rounded-lg" muted playsInline />
              <p className="mt-4 text-sm text-white/70">
                {starting ? "Démarrage de la caméra…" : "Placez le code-barres devant la caméra"}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
