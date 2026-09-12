import { AlertTriangle, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Insight } from "@/lib/actions/insights";

const ICONS: Record<Insight["icon"], React.ComponentType<{ className?: string }>> = {
  warning: AlertTriangle,
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  bulb: Lightbulb,
};

const TONE_CLASSES: Record<Insight["tone"], string> = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const ICON_CLASSES: Record<Insight["tone"], string> = {
  danger: "text-red-600",
  warning: "text-amber-600",
  success: "text-emerald-600",
  info: "text-blue-600",
};

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = ICONS[insight.icon];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border p-4", TONE_CLASSES[insight.tone])}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_CLASSES[insight.tone])} />
      <p className="text-sm leading-relaxed">{insight.message}</p>
    </div>
  );
}
