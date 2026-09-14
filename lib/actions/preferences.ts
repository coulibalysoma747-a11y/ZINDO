"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";

export type ActionState = { error?: string; success?: string } | undefined;

const THEMES = ["LIGHT", "DARK", "SYSTEM"] as const;
export type ThemePreference = (typeof THEMES)[number];

export async function setThemeAction(theme: ThemePreference) {
  const user = await requireUser();
  if (!THEMES.includes(theme)) return { error: "Thème invalide" };

  const { error } = await supabase.from("users").update({ theme }).eq("id", user.id);
  if (error) {
    console.error("[setThemeAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le thème" };
  }

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

  const { error } = await supabase
    .from("users")
    .update({
      auto_print_receipt: input.autoPrintReceipt,
      printer_ticket_width: input.printerTicketWidth,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[setPosSettingsAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour les paramètres" };
  }

  revalidatePath("/ventes");
  return { success: "Paramètres de caisse mis à jour" };
}
