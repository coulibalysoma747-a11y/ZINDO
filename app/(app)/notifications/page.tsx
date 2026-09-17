import Link from "next/link";
import { AlertTriangle, PackageX, ClipboardList, CreditCard, Info, Bell } from "lucide-react";
import { getNotificationsAction } from "@/lib/actions/notifications";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { NotificationRow } from "./NotificationRow";

const TYPE_ICONS = {
  STOCK_FAIBLE: AlertTriangle,
  RUPTURE_STOCK: PackageX,
  INVENTAIRE_NECESSAIRE: ClipboardList,
  CREDIT_ECHU: CreditCard,
  INFO: Info,
} as const;

const TYPE_TONES = {
  STOCK_FAIBLE: "text-amber-600 bg-amber-50",
  RUPTURE_STOCK: "text-red-600 bg-red-50",
  INVENTAIRE_NECESSAIRE: "text-blue-600 bg-blue-50",
  CREDIT_ECHU: "text-red-600 bg-red-50",
  INFO: "text-zinc-600 bg-zinc-100",
} as const;

export default async function NotificationsPage() {
  const notifications = await getNotificationsAction();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Notifications</h1>
            <p className="text-sm text-zinc-500">Alertes de stock, crédits échus et inventaire.</p>
          </div>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est à jour"}
          </h2>
        </CardHeader>
        {notifications.length === 0 ? (
          <CardBody>
            <EmptyState title="Aucune notification" description="Vous serez alerté ici en cas de stock bas, rupture, crédit échu ou inventaire à faire." />
          </CardBody>
        ) : (
          <CardBody className="space-y-2">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type];
              const tone = TYPE_TONES[n.type];
              const content = (
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                    n.read ? "border-zinc-100 bg-white" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? "font-medium text-zinc-700" : "font-semibold text-zinc-900"}`}>{n.title}</p>
                    <p className="text-sm text-zinc-500">{n.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(new Date(n.createdAt))}</p>
                  </div>
                  {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zindo-green-500" />}
                </div>
              );
              return (
                <NotificationRow key={n.id} id={n.id} read={n.read}>
                  {n.link ? <Link href={n.link}>{content}</Link> : content}
                </NotificationRow>
              );
            })}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
