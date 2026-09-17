"use client";

import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/lib/actions/notifications";

export function NotificationRow({ id, read, children }: { id: string; read: boolean; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div
      onClick={() => {
        if (!read) {
          markNotificationReadAction(id).then(() => router.refresh());
        }
      }}
      className="cursor-pointer"
    >
      {children}
    </div>
  );
}
