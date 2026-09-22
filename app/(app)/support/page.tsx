import { MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { getNavItemsAvailability } from "@/lib/nav-server";
import { getCurrentLocation } from "@/lib/location";
import { isAssistantConfigured } from "@/lib/ai/deepseek";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { SupportForm } from "./SupportForm";
import { ModulesGuide } from "./ModulesGuide";
import { HelpChat } from "./HelpChat";

const SUPPORT_WHATSAPP_DISPLAY = "+226 04 05 99 29";
const SUPPORT_WHATSAPP_LINK = "https://wa.me/22604059929";

const STATUS_LABELS = {
  OUVERT: "Ouverte",
  EN_COURS: "En cours",
  RESOLU: "Résolue",
} as const;

const STATUS_TONE = {
  OUVERT: "amber",
  EN_COURS: "blue",
  RESOLU: "emerald",
} as const;

type TicketRow = {
  id: string;
  subject: string;
  message: string;
  pageUrl: string | null;
  status: keyof typeof STATUS_LABELS;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

export default async function SupportPage() {
  const user = await requireUser();
  const currentLocation = await getCurrentLocation(user.businessId);

  const [{ data }, availability] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(
        "id, subject, message, pageUrl:page_url, status, response, respondedAt:responded_at, createdAt:created_at, user:users(firstName:first_name, lastName:last_name)"
      )
      .eq("business_id", user.businessId)
      .order("created_at", { ascending: false })
      .limit(100),
    getNavItemsAvailability(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
  ]);
  const tickets = (data ?? []) as unknown as TicketRow[];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Aide &amp; support</h1>
        <p className="text-sm text-zinc-500">
          Un problème avec votre compte ou une page de ZINDO ? Décrivez-le ci-dessous — le support peut
          consulter votre commerce à distance pour vous aider.
        </p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-500/10">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Besoin d&apos;une réponse rapide ?
              </p>
              <p className="text-sm text-zinc-700">Écrivez au support ZINDO sur WhatsApp</p>
            </div>
          </div>
          <a
            href={SUPPORT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {SUPPORT_WHATSAPP_DISPLAY}
          </a>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Assistant d&apos;aide</h2>
        </CardHeader>
        <CardBody>
          <HelpChat configured={isAssistantConfigured()} />
        </CardBody>
      </Card>

      <ModulesGuide availability={availability} />

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Nouvelle demande</h2>
        </CardHeader>
        <CardBody>
          <SupportForm />
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 font-semibold text-zinc-900">Vos demandes</h2>
        {tickets.length === 0 ? (
          <EmptyState title="Aucune demande envoyée pour le moment" />
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900">{t.subject}</p>
                      <p className="text-xs text-zinc-400">
                        {t.user.firstName} {t.user.lastName} — {formatDateTime(new Date(t.createdAt))}
                        {t.pageUrl ? ` — ${t.pageUrl}` : ""}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                  </div>
                  <p className="text-sm text-zinc-600">{t.message}</p>
                  {t.response && (
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Réponse du support{t.respondedAt ? ` · ${formatDateTime(new Date(t.respondedAt))}` : ""}
                      </p>
                      <p className="mt-1">{t.response}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
