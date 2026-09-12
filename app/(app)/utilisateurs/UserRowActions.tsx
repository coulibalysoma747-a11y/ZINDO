"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { toggleUserActiveAction, updateUserRoleAction } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/permissions";
import { ResetPasswordButton } from "./ResetPasswordButton";
import type { Role } from "@prisma/client";

export function UserRowActions({
  userId,
  userName,
  active,
}: {
  userId: string;
  userName: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <ResetPasswordButton userId={userId} userName={userName} />
      <select
        disabled={pending}
        defaultValue=""
        onChange={(e) => {
          const role = e.target.value as Role;
          if (!role) return;
          startTransition(async () => {
            await updateUserRoleAction(userId, role);
            router.refresh();
          });
        }}
        className="h-8 rounded-lg border border-zinc-200 px-2 text-xs text-zinc-600"
      >
        <option value="">Changer le rôle...</option>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ConfirmButton
        variant={active ? "danger" : "secondary"}
        label={
          <span
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            {active ? "Désactiver" : "Réactiver"}
          </span>
        }
        confirmTitle={active ? "Désactiver l'utilisateur" : "Réactiver l'utilisateur"}
        confirmMessage={
          active
            ? "L'utilisateur ne pourra plus se connecter à ZINDO."
            : "L'utilisateur pourra de nouveau se connecter à ZINDO."
        }
        action={() => toggleUserActiveAction(userId, !active)}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
