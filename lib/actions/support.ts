"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export type ActionState = { error?: string; success?: string } | undefined;

const ticketSchema = z.object({
  subject: z.string().min(1, "L'objet est requis"),
  message: z.string().min(10, "Décrivez le problème en quelques mots (10 caractères minimum)"),
  pageUrl: z.string().optional(),
});

export async function createSupportTicketAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = ticketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    pageUrl: formData.get("pageUrl") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { error } = await supabase.from("support_tickets").insert({
    business_id: user.businessId,
    user_id: user.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
    page_url: parsed.data.pageUrl ?? null,
  });
  if (error) {
    console.error("[createSupportTicketAction] Échec de la création :", error.message);
    return { error: "Impossible d'envoyer votre demande" };
  }

  revalidatePath("/support");
  return { success: "Votre demande a été envoyée au support" };
}
