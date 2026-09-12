"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export type ActionState = { error?: string; success?: string } | undefined;

const THEMES = ["LIGHT", "DARK", "SYSTEM"] as const;
export type ThemePreference = (typeof THEMES)[number];

export async function setThemeAction(theme: ThemePreference) {
  const user = await requireUser();
  if (!THEMES.includes(theme)) return { error: "Thème invalide" };

  await prisma.user.update({ where: { id: user.id }, data: { theme } });
  revalidatePath("/", "layout");
  return { success: "Thème mis à jour" };
}

const TICKET_WIDTHS = ["58mm", "80mm", "A4"] as const;

export async function setPosSettingsAction(input: {
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
}) {
  const user = await requireUser();
  if (input.printerTicketWidth && !TICKET_WIDTHS.includes(input.printerTicketWidth as (typeof TICKET_WIDTHS)[number])) {
    return { error: "Format de ticket invalide" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      autoPrintReceipt: input.autoPrintReceipt,
      printerTicketWidth: input.printerTicketWidth,
    },
  });

  revalidatePath("/ventes");
  return { success: "Paramètres de caisse mis à jour" };
}
