import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Champ de recherche bien visible (caisse, liste des produits) : plus haut
 * qu'un champ ordinaire, bordure plus marquée, loupe verte et texte d'aide
 * plus foncé, pour qu'on le repère au premier coup d'œil.
 */
export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zindo-green-600 dark:text-zindo-green-400" />
      <input
        type="search"
        {...props}
        className="h-12 w-full rounded-xl border-2 border-zinc-300 bg-white pl-11 pr-4 text-[15px] text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-500 hover:border-zinc-400 focus:border-zindo-green-600 focus:ring-4 focus:ring-zindo-green-500/15 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-slate-500"
      />
    </div>
  );
}
