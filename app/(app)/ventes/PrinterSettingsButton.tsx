"use client";

import { useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/Input";
import { setPosSettingsAction } from "@/lib/actions/preferences";

const WIDTH_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Format du commerce (par défaut)" },
  { value: "58mm", label: "Thermique 58 mm" },
  { value: "80mm", label: "Thermique 80 mm" },
  { value: "A4", label: "A4 (imprimante classique)" },
];

export function PrinterSettingsButton({
  autoPrintReceipt,
  printerTicketWidth,
  onPrinterWidthChange,
}: {
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
  onPrinterWidthChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    const next = value || null;
    onPrinterWidthChange(next);
    startTransition(async () => {
      await setPosSettingsAction({ autoPrintReceipt, printerTicketWidth: next });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Configurer l'imprimante"
        title="Configurer l'imprimante"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <Printer className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Configurer l'imprimante">
        <div className="mb-4 flex items-center justify-center rounded-xl bg-zinc-50 py-6 dark:bg-slate-800">
          <Printer className="h-14 w-14 text-zinc-400" strokeWidth={1.25} />
        </div>
        <Field
          label="Format d'impression de ce poste"
          htmlFor="printerWidth"
          hint="Utile si cette caisse utilise une imprimante différente de celle configurée dans les Paramètres du commerce."
        >
          <Select
            id="printerWidth"
            value={printerTicketWidth ?? ""}
            disabled={pending}
            onChange={(e) => handleChange(e.target.value)}
          >
            {WIDTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </>
  );
}
