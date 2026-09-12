"use client";

import { useRef, useState, useTransition } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { askAssistantAction, type ChatMessage } from "@/lib/actions/assistant";

const SUGGESTIONS = [
  "Quels sont mes produits les plus rentables ?",
  "Quels produits risquent la rupture de stock ?",
  "Qui me doit de l'argent ?",
  "Comment se comparent mes ventes ce mois-ci ?",
];

export function AssistantChat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  function send(question: string) {
    if (!question.trim() || pending) return;
    setError(null);
    const history = messages;
    const nextMessages: ChatMessage[] = [...history, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");

    startTransition(async () => {
      const result = await askAssistantAction(history, question);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Sparkles className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-zinc-900">Posez une question sur votre commerce</p>
              <p className="text-sm text-zinc-500">L&apos;assistant analyse vos données ZINDO en temps réel.</p>
            </div>
            {configured && (
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              </div>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-emerald-600 text-white"
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
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-700" />
            </div>
            L&apos;assistant analyse vos données...
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
          placeholder={configured ? "Posez votre question..." : "Assistant non configuré"}
          disabled={!configured || pending}
        />
        <Button type="submit" disabled={!configured || pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
