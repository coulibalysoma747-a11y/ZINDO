"use client";

import { LogIn } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { impersonateUserAction } from "@/lib/actions/impersonation";

export function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  return (
    <ConfirmButton
      variant="secondary"
      label={
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
          <LogIn className="h-3.5 w-3.5" /> Se connecter en tant que
        </span>
      }
      confirmTitle="Se connecter en tant que ce commerçant"
      confirmMessage={`Vous allez accéder à ZINDO exactement comme ${userName}, sans connaître son mot de passe. Cette action est journalisée. Vous pourrez revenir à la console admin à tout moment via le bandeau affiché en haut de l'écran.`}
      action={async () => {
        await impersonateUserAction(userId);
        return undefined;
      }}
    />
  );
}
