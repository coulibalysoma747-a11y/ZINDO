"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { respondToTicketAction } from "@/lib/actions/support-admin";
import type { SupportTicketStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: SupportTicketStatus; label: string }[] = [
  { value: "OUVERT", label: "Ouverte" },
  { value: "EN_COURS", label: "En cours" },
  { value: "RESOLU", label: "Résolue" },
];

export function TicketReplyForm({
  ticketId,
  currentStatus,
  currentResponse,
}: {
  ticketId: string;
  currentStatus: SupportTicketStatus;
  currentResponse: string | null;
}) {
  const [response, setResponse] = useState(currentResponse ?? "");
  const [status, setStatus] = useState<SupportTicketStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-3">
      <Textarea
        rows={2}
        placeholder="Répondre au commerçant..."
        value={response}
        onChange={(e) => setResponse(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SupportTicketStatus)}
          className="w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await respondToTicketAction(ticketId, response, status);
              setMessage(result.success ?? result.error ?? null);
              router.refresh();
            })
          }
        >
          {pending ? "Envoi..." : "Enregistrer"}
        </Button>
      </div>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}
