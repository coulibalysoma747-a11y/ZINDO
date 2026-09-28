"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Package, Paperclip, Send, X } from "lucide-react";
import { uploadImageDirect } from "@/components/ui/direct-upload";
import { createBuyerImageUploadAction, sendBuyerMessageAction, sendSellerMessageAction } from "@/lib/actions/market-messages";

export type ChatMessage = {
  id: string;
  sender: "BUYER" | "SELLER";
  body: string | null;
  photoUrl: string | null;
  createdAt: string;
  listing: { productId: string; name: string; photoUrl: string | null; price: number } | null;
  order: { number: string; total: number; status: string } | null;
};

const REFRESH_MS = 8000;
const money = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} FCFA`;
const time = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Fil de discussion du Marché, côté acheteur (me = BUYER) ou vendeur (me = SELLER).
 * Actualisé automatiquement ; une fiche produit ou une commande peut être jointe au
 * premier message (lien « Contacter le vendeur » depuis un produit ou une commande).
 */
export function ChatThread({
  conversationId,
  me,
  messages,
  attachment,
  orderHrefPrefix,
}: {
  conversationId: string;
  me: "BUYER" | "SELLER";
  messages: ChatMessage[];
  attachment?: { listingId?: string; orderId?: string; label: string } | null;
  orderHrefPrefix?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [joined, setJoined] = useState(attachment ?? null);
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      setPhotoUrl(await uploadImageDirect(file, "messages", me === "BUYER" ? createBuyerImageUploadAction : undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de la photo");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!body.trim() && !photoUrl && !joined) return;
    const input = { conversationId, body: body.trim() || undefined, photoUrl: photoUrl ?? undefined, listingId: joined?.listingId, orderId: joined?.orderId };
    startTransition(async () => {
      const result = me === "BUYER" ? await sendBuyerMessageAction(input) : await sendSellerMessageAction(input);
      if (result.error) return setError(result.error);
      setBody("");
      setPhotoUrl(null);
      setJoined(null);
      setError(undefined);
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Écrivez votre premier message.</p>}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-br-md bg-zindo-green-600 text-white" : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-200"}`}>
                {m.listing && (
                  <Link href={`/marche/produit/${m.listing.productId}`} target="_blank" className={`flex items-center gap-2 rounded-xl p-2 ${mine ? "bg-white/15" : "bg-zinc-50 ring-1 ring-zinc-200"}`}>
                    {m.listing.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.listing.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.listing.name}</span>
                      <span className="text-xs opacity-80">{money(m.listing.price)}</span>
                    </span>
                  </Link>
                )}
                {m.order && (
                  <div className={`flex items-center gap-2 rounded-xl p-2 ${mine ? "bg-white/15" : "bg-zinc-50 ring-1 ring-zinc-200"}`}>
                    <Package className="h-5 w-5 shrink-0" />
                    <span>
                      {orderHrefPrefix ? (
                        <Link href={`${orderHrefPrefix}${m.order.number}`} className="font-semibold underline">
                          Commande {m.order.number}
                        </Link>
                      ) : (
                        <span className="font-semibold">Commande {m.order.number}</span>
                      )}
                      <span className="block text-xs opacity-80">{money(m.order.total)}</span>
                    </span>
                  </div>
                )}
                {m.photoUrl && (
                  <a href={m.photoUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.photoUrl} alt="Photo jointe" className="max-h-64 rounded-xl object-cover" />
                  </a>
                )}
                {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                <p className={`text-right text-[10px] ${mine ? "text-white/70" : "text-zinc-400"}`}>{time(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <div className="space-y-2 border-t border-zinc-200 p-3">
        {(joined || photoUrl) && (
          <div className="flex flex-wrap gap-2">
            {joined && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                <Paperclip className="h-3.5 w-3.5" /> {joined.label}
                <button type="button" aria-label="Retirer la pièce jointe" onClick={() => setJoined(null)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {photoUrl && (
              <span className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button type="button" aria-label="Retirer la photo" onClick={() => setPhotoUrl(null)} className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-900 p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 text-zinc-600 hover:bg-zinc-50 ${uploading ? "opacity-50" : ""}`} aria-label="Joindre une photo">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickPhoto} disabled={uploading} />
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={uploading ? "Envoi de la photo…" : "Votre message…"}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || uploading || (!body.trim() && !photoUrl && !joined)}
            aria-label="Envoyer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zindo-green-600 text-white disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
