import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, MessageCircle } from "lucide-react";
import type { FirstStep } from "@/lib/first-steps";

export function FirstStepsCard({ steps }: { steps: FirstStep[] }) {
  const required = steps.filter((s) => !s.optional);
  const doneCount = required.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <section className="rounded-2xl border border-zindo-green-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zindo-green-600">Premiers pas</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900">Bien démarrer avec ZINDO</h2>
          <p className="text-sm text-zinc-500">
            {doneCount} étape{doneCount > 1 ? "s" : ""} sur {required.length} terminée{doneCount > 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="https://wa.me/22604059929?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20pour%20d%C3%A9marrer%20sur%20ZINDO"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-zindo-green-500 hover:text-zindo-green-700"
        >
          <MessageCircle className="h-4 w-4" /> Besoin d&apos;aide ?
        </a>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-zindo-green-500" style={{ width: `${(doneCount / required.length) * 100}%` }} />
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((s) => (
          <li
            key={s.key}
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              s === next ? "border-zindo-green-300 bg-zindo-green-50/60" : "border-zinc-200"
            }`}
          >
            <div className="flex gap-3">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300" />
              )}
              <div>
                <p className={`font-semibold ${s.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
                  {s.title}
                  {s.optional && <span className="ml-1.5 text-xs font-normal text-zinc-400">(facultatif)</span>}
                </p>
                {!s.done && <p className="mt-0.5 text-sm text-zinc-500">{s.text}</p>}
              </div>
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${
                  s === next
                    ? "bg-zindo-green-600 text-white hover:bg-zindo-green-700"
                    : "border border-zinc-200 text-zinc-700 hover:border-zinc-300"
                }`}
              >
                {s.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
