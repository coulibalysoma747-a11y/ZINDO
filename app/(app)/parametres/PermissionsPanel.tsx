"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS } from "@/lib/permissions";
import { togglePermissionAction } from "@/lib/actions/settings";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "VENDEUR", "GESTIONNAIRE_STOCK"];

export function PermissionsPanel({
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
      <Table className="min-w-[600px]">
        <TableHead>
          <TableRow interactive={false}>
            <TableHeaderCell className="normal-case tracking-normal">Permission</TableHeaderCell>
            {ROLES.map((r) => (
              <TableHeaderCell key={r} align="center" className="normal-case tracking-normal">
                {ROLE_LABELS[r]}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.values(PERMISSIONS).map((permission) => (
            <TableRow key={permission}>
              <TableCell className="text-zinc-700 dark:text-slate-300">{PERMISSION_LABELS[permission] ?? permission}</TableCell>
              {ROLES.map((role) => (
                <TableCell key={role} align="center">
                  <input
                    type="checkbox"
                    disabled={pending || role === "ADMIN"}
                    checked={role === "ADMIN" ? true : isAllowed(role, permission)}
                    onChange={(e) =>
                      startTransition(async () => {
                        await togglePermissionAction(role, permission, e.target.checked);
                        router.refresh();
                      })
                    }
                    className="h-4 w-4 rounded accent-zindo-green-500 disabled:opacity-50"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-zinc-400">
        L&apos;administrateur dispose toujours de toutes les permissions.
      </p>
    </div>
  );
}
