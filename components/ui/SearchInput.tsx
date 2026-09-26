import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Champ de recherche bien visible (caisse, liste des produits) : plus haut
 * qu'un champ ordinaire, bordure et fond aux couleurs ZINDO (vert), loupe
 * verte, pour qu'on le repère au premier coup d'œil. Le fond redevient
 * blanc pendant la frappe, pour une lecture nette.
 */
export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zindo-green-600 dark:text-zindo-green-400" />
      <input
        type="search"
        {...props}
        className="h-12 w-full rounded-xl border-2 border-zindo-green-500 bg-zindo-green-100 pl-11 pr-4 text-[15px] font-medium text-zinc-900 shadow-sm shadow-zindo-green-900/10 outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:font-normal placeholder:text-zindo-green-800/70 hover:border-zindo-green-600 focus:border-zindo-green-600 focus:bg-white focus:ring-4 focus:ring-zindo-green-500/20 dark:border-zindo-green-500 dark:bg-zindo-green-500/10 dark:placeholder:text-zindo-green-300/70 dark:focus:bg-slate-900"
      />
    </div>
  );
}
