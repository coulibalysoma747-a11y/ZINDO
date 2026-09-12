"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { setUserPermissionAction, resetUserPermissionsAction } from "@/lib/actions/super-admin";
import type { Role } from "@prisma/client";

type Override = { permission: string; allowed: boolean };

export function UserModulesPanel({
  userId,
  modules,
  userOverrides,
  roleOverrides,
  globalOverrides,
  defaultPermissions,
}: {
  userId: string;
  role: Role;
  modules: { label: string; permission: string }[];
  userOverrides: Override[];
  roleOverrides: Override[];
  globalOverrides: Override[];
  defaultPermissions: readonly string[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function isOverridden(permission: string) {
    return userOverrides.some((o) => o.permission === permission);
  }

  function isAllowed(permission: string) {
    const userOverride = userOverrides.find((o) => o.permission === permission);
    if (userOverride) return userOverride.allowed;
    const roleOverride = roleOverrides.find((o) => o.permission === permission);
    if (roleOverride) return roleOverride.allowed;
    const globalOverride = globalOverrides.find((o) => o.permission === permission);
    if (globalOverride) return globalOverride.allowed;
    return defaultPermissions.includes(permission);
  }

  const hasAnyOverride = userOverrides.length > 0;

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2 font-medium">Module</th>
            <th className="py-2 text-center font-medium">Accès pour ce compte</th>
            <th className="py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {modules.map((m) => {
            const overridden = isOverridden(m.permission);
            return (
              <tr key={m.permission}>
                <td className="py-2 text-zinc-700">{m.label}</td>
                <td className="py-2 text-center">
                  <input
                    type="checkbox"
                    disabled={pending}
                    checked={isAllowed(m.permission)}
                    onChange={(e) =>
                      startTransition(async () => {
                        await setUserPermissionAction(userId, m.permission, e.target.checked);
                        router.refresh();
                      })
                    }
                    className="h-4 w-4 rounded accent-zindo-orange-500 disabled:opacity-50"
                  />
                </td>
                <td className="py-2 text-right">
                  {overridden && (
                    <span className="rounded-full bg-zindo-orange-50 px-2 py-0.5 text-[11px] font-medium text-zindo-orange-600">
                      Personnalisé
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        type="button"
        disabled={pending || !hasAnyOverride}
        onClick={() =>
          startTransition(async () => {
            await resetUserPermissionsAction(userId);
            router.refresh();
          })
        }
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser (suivre le rôle par défaut)
      </button>
    </div>
  );
}
