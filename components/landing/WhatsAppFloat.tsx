import { MessageCircle } from "lucide-react";

export function WhatsAppFloat({ href, compact = false }: { href: string; compact?: boolean }) {
  if (compact) {
    // Bulle ronde discrète (nouvelle page d'accueil).
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Nous écrire sur WhatsApp"
        title="Une question ? Écrivez-nous sur WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Nous écrire sur WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#1ebe5b]"
    >
      <MessageCircle className="h-5 w-5" />
      WhatsApp
    </a>
  );
}
