"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

  await prisma.supportTicket.create({
    data: {
      businessId: user.businessId,
      userId: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      pageUrl: parsed.data.pageUrl,
    },
  });

  revalidatePath("/support");
  return { success: "Votre demande a été envoyée au support" };
}
