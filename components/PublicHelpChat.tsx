"use client";

import { useRef, useState, useTransition } from "react";
import { Bot, Send, HelpCircle, User, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { askPublicHelpAssistantAction, type ChatMessage } from "@/lib/actions/help-assistant";

const SUGGESTIONS = [
  "Comment fonctionne l'essai gratuit ?",
  "Est-ce que ZINDO marche sans connexion Internet ?",
  "ZINDO gère-t-elle la vente de motos ?",
  "Combien coûte ZINDO ?",
];

export function PublicHelpChat({ onClose }: { onClose?: () => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  function send(question: string) {
    if (!question.trim() || pending) return;
    setError(null);
    const history = messages;
    setMessages([...history, { role: "user", content: question }]);
    setInput("");

    startTransition(async () => {
      const result = await askPublicHelpAssistantAction(history, question);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }

  if (onClose) {
    return <ChatWidget messages={messages} input={input} setInput={setInput} error={error} pending={pending} send={send} bottomRef={bottomRef} onClose={onClose} />;
  }

  return (
    <div className="flex h-[440px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zindo-green-50">
              <HelpCircle className="h-6 w-6 text-zindo-green-600" />
            </div>
            <div>
              <p className="font-medium text-zindo-ink-900">Une question sur ZINDO ?</p>
              <p className="text-sm text-zinc-500">Posez-la avant même de créer votre compte.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:border-zindo-green-300 hover:bg-zindo-green-50 hover:text-zindo-green-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zindo-green-100">
                <HelpCircle className="h-3.5 w-3.5 text-zindo-green-700" />
              </div>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-zindo-green-600 text-white"
                  : "rounded-bl-sm bg-zinc-100 text-zinc-800"
              }`}
            >
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200">
                <User className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            )}
          </div>
        ))}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zindo-green-100">
              <HelpCircle className="h-3.5 w-3.5 animate-pulse text-zindo-green-700" />
            </div>
            L&apos;assistant réfléchit...
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-zinc-100 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question sur ZINDO..."
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/** Fenêtre de discussion de la bulle « Assistant » (page d'accueil), dans le style des messageries des grands sites. */
function ChatWidget({
  messages,
  input,
  setInput,
  error,
  pending,
  send,
  bottomRef,
  onClose,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  error: string | null;
  pending: boolean;
  send: (q: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="flex h-[min(580px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.35)] ring-1 ring-black/5">
      <div className="flex items-center gap-3 bg-gradient-to-br from-zindo-green-600 to-zindo-green-800 px-5 py-4 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Assistant ZINDO</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En ligne · répond en quelques secondes
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer l'assistant" className="rounded-full p-2 transition hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 px-4 py-5">
        <AssistantBubble>
          Bonjour ! Je suis l&apos;assistant ZINDO. Posez-moi vos questions sur la caisse, le stock, les tarifs ou l&apos;essai gratuit.
        </AssistantBubble>

        {messages.length === 0 && (
          <div className="flex flex-col items-end gap-2 pt-1">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-zindo-green-200 bg-white px-3.5 py-2 text-left text-[13px] font-medium text-zindo-green-800 transition hover:border-zindo-green-500 hover:bg-zindo-green-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <AssistantBubble key={i}>{withBold(m.content)}</AssistantBubble>
          ) : (
            <div key={i} className="flex justify-end">
              <p className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zindo-green-600 px-3.5 py-2.5 text-sm text-white">{m.content}</p>
            </div>
          )
        )}

        {pending && (
          <div className="flex items-end gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zindo-green-100 text-zindo-green-700">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 ring-1 ring-zinc-200" aria-label="L'assistant écrit">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-zinc-100 bg-white p-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-4 pr-1 focus-within:border-zindo-green-500 focus-within:bg-white">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez votre question…"
            disabled={pending}
            aria-label="Votre question"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zindo-green-600 text-white transition hover:bg-zindo-green-700 disabled:bg-zinc-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-400">Réponses générées par une IA. Pour un cas précis, écrivez-nous sur WhatsApp.</p>
      </form>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zindo-green-100 text-zindo-green-700">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <p className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-800 ring-1 ring-zinc-200">{children}</p>
    </div>
  );
}

/** Affiche le gras Markdown (**texte**) renvoyé par l'IA, sans astérisques visibles. */
function withBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-zinc-950">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}
