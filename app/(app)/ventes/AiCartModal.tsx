"use client";

import { useRef, useState } from "react";
import { Sparkles, Mic, Camera, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { formatMoney } from "@/lib/format";
import { parseOrderTextAction, parseOrderImageAction, type AiCartLine } from "@/lib/actions/ai-cart";

// Web Speech API — dictée en français, non standard mais dispo sur les
// navigateurs Chromium (majoritaires sur Android, terrain visé). Absente
// ailleurs : le bouton micro se masque simplement, le texte/photo restent.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AiCartModal({
  open,
  onClose,
  locationId,
  currency,
  onAddLines,
}: {
  open: boolean;
  onClose: () => void;
  locationId: string;
  currency: string;
  onAddLines: (lines: { productId: string; name: string; unitPrice: number; quantity: number }[]) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<AiCartLine[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SpeechRecognitionCtor = getSpeechRecognition();

  function reset() {
    setText("");
    setLines(null);
    setError(null);
  }

  function toggleDictation() {
    if (!SpeechRecognitionCtor) return;
    if (listening) {
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results.map((r) => r[0]?.transcript ?? "").join(" ");
      setText((t) => (t ? `${t} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }

  function analyzeText() {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError(null);
    parseOrderTextAction(text, locationId)
      .then((result) => {
        if ("error" in result) setError(result.error);
        else setLines(result.lines);
      })
      .finally(() => setAnalyzing(false));
  }

  function analyzeImage(file: File) {
    setAnalyzing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      parseOrderImageAction(String(reader.result), locationId)
        .then((result) => {
          if ("error" in result) setError(result.error);
          else setLines(result.lines);
        })
        .finally(() => setAnalyzing(false));
    };
    reader.readAsDataURL(file);
  }

  function confirmAdd() {
    if (!lines) return;
    const toAdd = lines.filter((l) => l.productId).map((l) => ({
      productId: l.productId as string,
      name: l.productName as string,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
    }));
    onAddLines(toAdd);
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Panier IA"
    >
      <div className="space-y-4">
        {!lines && (
          <>
            <p className="text-sm text-zinc-500">
              Tapez, dictez ou photographiez la commande du client. Chaque ligne reste à confirmer avant d&apos;entrer
              dans le panier.
            </p>
            <Textarea
              rows={4}
              placeholder="Ex : 2 sacs de riz, 1 carton de savon, 3 bidons d'huile"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex gap-2">
              {SpeechRecognitionCtor && (
                <Button type="button" variant={listening ? "danger" : "outline"} onClick={toggleDictation}>
                  <Mic className="h-4 w-4" /> {listening ? "Arrêter" : "Dicter"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" /> Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) analyzeImage(file);
                  e.target.value = "";
                }}
              />
              <Button type="button" className="flex-1" disabled={analyzing || !text.trim()} onClick={analyzeText}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyser
              </Button>
            </div>
            {analyzing && <p className="text-center text-xs text-zinc-400">Lecture de la commande en cours...</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}

        {lines && (
          <>
            {lines.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun article reconnu dans cette commande.</p>
            ) : (
              <ul className="space-y-2">
                {lines.map((line, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2">
                    <ProductThumbnail photoUrl={line.photoUrl} name={line.productName ?? line.extractedName} size={32} />
                    <div className="min-w-0 flex-1">
                      {line.productId ? (
                        <p className="truncate text-sm font-medium text-zinc-900">{line.productName}</p>
                      ) : (
                        <p className="truncate text-sm font-medium text-red-600">« {line.extractedName} » — non trouvé</p>
                      )}
                      {line.productId && <p className="text-xs text-zinc-400">{formatMoney(line.unitPrice, currency)}</p>}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev ? prev.map((l, idx) => (idx === i ? { ...l, quantity: Number(e.target.value) || 1 } : l)) : prev
                        )
                      }
                      className="w-16"
                    />
                    <button
                      type="button"
                      onClick={() => setLines((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev))}
                      className="text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={reset}>
                Recommencer
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!lines.some((l) => l.productId)}
                onClick={confirmAdd}
              >
                Ajouter au panier
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
