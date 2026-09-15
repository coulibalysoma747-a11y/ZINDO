"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import {
  LayoutDashboard,
  Bot,
  ShoppingCart,
  History,
  Package,
  Tags,
  Boxes,
  ArrowLeftRight,
  ShoppingBag,
  Users,
  CreditCard,
  Truck,
  ClipboardList,
  Globe,
  BarChart3,
  Store,
  UserCog,
  Settings,
  Receipt,
  Wallet,
  FileText,
  LifeBuoy,
  ShoppingBasket,
  Crown,
} from "lucide-react";

export const NAV_ICONS: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  assistant: Bot,
  sales: ShoppingCart,
  invoices: FileText,
  products: Package,
  categories: Tags,
  stock: Boxes,
  transfers: ArrowLeftRight,
  purchases: ShoppingBag,
  expenses: Receipt,
  customers: Users,
  credits: CreditCard,
  suppliers: Truck,
  inventory: ClipboardList,
  history: History,
  "cash-sessions": Wallet,
  "history-global": Globe,
  reports: BarChart3,
  locations: Store,
  users: UserCog,
  settings: Settings,
  support: LifeBuoy,
  "online-store": ShoppingBasket,
  subscription: Crown,
};

export function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = NAV_ICONS[item.icon];
  // Le lien Support transporte la page courante avec lui : c'est le seul
  // moyen pour /support de savoir sur quel écran l'utilisateur se trouvait
  // réellement, puisque son propre usePathname() ne renverrait que "/support".
  const href =
    item.href === "/support" && pathname !== "/support"
      ? `/support?from=${encodeURIComponent(pathname)}`
      : item.href;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-zindo-green-600 to-zindo-green-500 text-white shadow-md shadow-zindo-green-800/25"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
            active ? "text-white" : "text-slate-400 group-hover:text-zindo-green-400"
          )}
        />
        <span>{item.label}</span>
      </div>
      {item.badge && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            active
              ? "bg-white/20 text-white"
              : "bg-zindo-green-500/20 text-zindo-green-400 group-hover:bg-zindo-green-500 group-hover:text-white"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
