"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS } from "@/lib/permissions";
import { setGlobalPermissionAction } from "@/lib/actions/super-admin";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "VENDEUR", "GESTIONNAIRE_STOCK"];

export function GlobalPermissionsPanel({
  overrides,
}: {
  overrides: { role: Role; permission: string; allowed: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function isAllowed(role: Role, permission: string) {
    const override = overrides.find((o) => o.role === role && o.permission === permission);
    if (override) return override.allowed;
    return (DEFAULT_ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2 font-medium">Permission</th>
            {ROLES.map((r) => (
              <th key={r} className="py-2 text-center font-medium">
                {ROLE_LABELS[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {Object.values(PERMISSIONS).map((permission) => (
            <tr key={permission}>
              <td className="py-2 text-zinc-700">{PERMISSION_LABELS[permission] ?? permission}</td>
              {ROLES.map((role) => (
                <td key={role} className="py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={pending || role === "ADMIN"}
                    checked={role === "ADMIN" ? true : isAllowed(role, permission)}
                    onChange={(e) =>
                      startTransition(async () => {
                        await setGlobalPermissionAction(role, permission, e.target.checked);
                        router.refresh();
                      })
                    }
                    className="h-4 w-4 rounded accent-zindo-orange-500 disabled:opacity-50"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-zinc-400">
        L&apos;administrateur (rôle ADMIN) dispose toujours de toutes les permissions dans chaque commerce.
      </p>
    </div>
  );
}
