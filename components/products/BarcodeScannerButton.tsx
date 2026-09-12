"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Utilise l'API native BarcodeDetector (Chrome/Edge/Android).
// Si non supportée, on affiche un message invitant à la saisie manuelle —
// tous les produits ZINDO ne sont pas obligés d'avoir un code-barres.
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !window.BarcodeDetector) {
      setSupported(false);
      return;
    }
    setSupported(true);
    let active = true;
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        const scan = async () => {
          if (!active || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              close();
              return;
            }
          } catch {
            // continuer la boucle malgré une erreur ponctuelle de détection
          }
          requestAnimationFrame(scan);
        };
        requestAnimationFrame(scan);
      })
      .catch(() => setError("Impossible d'accéder à la caméra"));

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
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" /> Scanner
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <button onClick={close} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
            <X className="h-5 w-5" />
          </button>
          {supported ? (
            <>
              <video ref={videoRef} className="max-h-[70vh] w-full max-w-md rounded-lg" muted playsInline />
              <p className="mt-4 text-sm text-white/70">
                {error ?? "Placez le code-barres devant la caméra"}
              </p>
            </>
          ) : (
            <div className="max-w-sm rounded-lg bg-white p-5 text-center">
              <p className="text-sm text-zinc-700">
                Le scan par caméra n&apos;est pas pris en charge par ce navigateur. Saisissez le
                code-barres manuellement, ou utilisez un lecteur de codes-barres USB branché à
                l&apos;ordinateur (il se comporte comme un clavier).
              </p>
              <Button className="mt-4" onClick={close}>
                Fermer
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
