import { Package } from "lucide-react";
import { cn } from "@/lib/cn";

export function ProductThumbnail({
  photoUrl,
  name,
  size = 40,
  rounded = "rounded-lg",
  className,
}: {
  photoUrl?: string | null;
  name: string;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50",
        rounded,
        className
      )}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <Package className="text-zinc-300" style={{ width: size * 0.45, height: size * 0.45 }} />
      )}
    </div>
  );
}
