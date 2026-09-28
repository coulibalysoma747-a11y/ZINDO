import {
  Apple,
  Bike,
  Car,
  Cog,
  Laptop,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Wrench,
  BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";

/** Icône et couleur de chaque catégorie du Marché (clés : lib/market.ts). */
const ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  electronique: { icon: Laptop, tone: "bg-sky-100 text-sky-700" },
  telephones: { icon: Smartphone, tone: "bg-indigo-100 text-indigo-700" },
  mode: { icon: Shirt, tone: "bg-pink-100 text-pink-700" },
  alimentation: { icon: Apple, tone: "bg-orange-100 text-orange-700" },
  maison: { icon: Sofa, tone: "bg-amber-100 text-amber-800" },
  beaute: { icon: Sparkles, tone: "bg-fuchsia-100 text-fuchsia-700" },
  automobile: { icon: Car, tone: "bg-slate-200 text-slate-700" },
  moto: { icon: Bike, tone: "bg-red-100 text-red-700" },
  pieces: { icon: Cog, tone: "bg-zinc-200 text-zinc-700" },
  agriculture: { icon: Sprout, tone: "bg-lime-100 text-lime-800" },
  pro: { icon: BriefcaseBusiness, tone: "bg-teal-100 text-teal-700" },
  services: { icon: Wrench, tone: "bg-cyan-100 text-cyan-700" },
  autres: { icon: Package, tone: "bg-emerald-100 text-emerald-700" },
};

export function CategoryIcon({ category, size = 56 }: { category: string; size?: number }) {
  const { icon: Icon, tone } = ICONS[category] ?? ICONS.autres;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-2xl ${tone}`} style={{ width: size, height: size }}>
      <Icon style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={1.8} />
    </span>
  );
}
