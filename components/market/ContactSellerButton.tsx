"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { openConversationAction } from "@/lib/actions/market-messages";

/** « Envoyer un message » : ouvre la conversation avec la boutique (compte acheteur requis). */
export function ContactSellerButton({ shopId, listingId, orderId, className }: { shopId: string; listingId?: string; orderId?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await openConversationAction(shopId);
          if (result.needsLogin) return router.push(`/marche/compte?suite=${encodeURIComponent(pathname)}`);
          if (!result.id) return;
          const params = new URLSearchParams();
          if (listingId) params.set("produit", listingId);
          if (orderId) params.set("commande", orderId);
          router.push(`/marche/messages/${result.id}${params.size ? `?${params}` : ""}`);
        })
      }
      className={
        className ??
        "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-zindo-green-600 px-4 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50"
      }
    >
      <MessageSquare className="h-4 w-4" /> {pending ? "Ouverture…" : "Envoyer un message"}
    </button>
  );
}
