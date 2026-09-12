"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toggleProductActiveAction } from "@/lib/actions/products";

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleProductActiveAction(id, !active);
          router.refresh();
        })
      }
    >
      {active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
      {active ? "Archiver" : "Réactiver"}
    </Button>
  );
}
