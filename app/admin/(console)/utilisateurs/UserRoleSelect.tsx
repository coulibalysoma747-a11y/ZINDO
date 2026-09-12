"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { ROLE_LABELS } from "@/lib/permissions";
import { updateUserRoleAction } from "@/lib/actions/super-admin";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "VENDEUR", "GESTIONNAIRE_STOCK"];

export function UserRoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Select
      value={role}
      disabled={pending}
      className="h-8 py-0 text-xs"
      onChange={(e) =>
        startTransition(async () => {
          await updateUserRoleAction(userId, e.target.value as Role);
          router.refresh();
        })
      }
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}
