"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { extendTrialAction } from "@/lib/actions/subscription-admin";

export function ExtendTrialButton({ businessId }: { businessId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await extendTrialAction(businessId, 7);
          router.refresh();
        })
      }
    >
      <Clock className="h-3.5 w-3.5" /> +7 jours d&apos;essai
    </Button>
  );
}
