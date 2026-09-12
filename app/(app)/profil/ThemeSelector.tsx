"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor } from "lucide-react";
import { setThemeAction, type ThemePreference } from "@/lib/actions/preferences";
import { applyTheme } from "@/lib/apply-theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "LIGHT", label: "Blanc", icon: Sun },
  { value: "DARK", label: "Noir", icon: Moon },
  { value: "SYSTEM", label: "Système", icon: Monitor },
];

export function ThemeSelector({ current }: { current: ThemePreference }) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setValue(opt.value);
                applyTheme(opt.value);
                await setThemeAction(opt.value);
                router.refresh();
              })
            }
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors disabled:opacity-60 ${
              active
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Icon className="h-5 w-5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
