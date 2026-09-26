"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Receipt, type ReceiptData, type ReceiptStyle, type ReceiptWidth } from "@/components/sales/Receipt";
import { generateQrDataUrlInBrowser } from "@/lib/qrcode-client";

const WIDTH_OPTIONS: { value: ReceiptWidth; label: string }[] = [
  { value: "58mm", label: "58 mm" },
  { value: "80mm", label: "80 mm" },
  { value: "A4", label: "A4" },
];

const STYLE_OPTIONS: { value: ReceiptStyle; label: string }[] = [
  { value: "classique", label: "Classique" },
  { value: "moderne", label: "Moderne" },
  { value: "compact", label: "Compact" },
];

// Vente fictive, uniquement pour l'aperçu : rien n'est enregistré.
const SAMPLE_ITEMS = [
  { name: "Article exemple A", quantity: 2, unitPrice: 2500, total: 5000 },
  { name: "Article exemple B", quantity: 1, unitPrice: 3500, total: 3500 },
  { name: "Article exemple C", quantity: 3, unitPrice: 1500, total: 4500 },
];

function str(form: FormData, key: string): string | null {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Aperçu du ticket de caisse depuis les Paramètres, construit à partir des
 * valeurs du formulaire « Commerce » au moment du clic — y compris celles
 * pas encore enregistrées — pour voir l'effet d'un réglage avant de valider.
 */
export function TicketPreviewButton({
  formId,
  cashierName,
  savedLogoUrl,
}: {
  formId: string;
  cashierName: string;
  savedLogoUrl: string | null;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [width, setWidth] = useState<ReceiptWidth>("80mm");
  const [style, setStyle] = useState<ReceiptStyle>("classique");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data || qrCodeDataUrl) return;
    generateQrDataUrlInBrowser("ZINDO — ticket d'exemple (aperçu)")
      .then(setQrCodeDataUrl)
      .catch(() => {});
  }, [data, qrCodeDataUrl]);

  // Libère l'URL temporaire d'un logo choisi mais pas encore enregistré.
  useEffect(() => {
    const logoUrl = data?.logoUrl;
    return () => {
      if (logoUrl?.startsWith("blob:")) URL.revokeObjectURL(logoUrl);
    };
  }, [data?.logoUrl]);

  function open() {
    const el = document.getElementById(formId);
    if (!(el instanceof HTMLFormElement)) return;
    const form = new FormData(el);

    const logoFile = form.get("logo");
    const logoUrl =
      form.get("removeLogo") === "true"
        ? null
        : logoFile instanceof File && logoFile.size > 0
          ? URL.createObjectURL(logoFile)
          : savedLogoUrl;

    const subtotal = SAMPLE_ITEMS.reduce((sum, item) => sum + item.total, 0);
    const discount = 500;
    const total = subtotal - discount;
    const amountPaid = 15000;
    const ticketWidth = str(form, "ticketWidth");

    setWidth(ticketWidth === "58mm" || ticketWidth === "A4" ? ticketWidth : "80mm");
    setData({
      businessName: str(form, "name") ?? "Mon commerce",
      businessPhone: str(form, "phone"),
      businessAddress: str(form, "address"),
      logoUrl,
      ticketNumber: "ZND-EXEMPLE",
      date: new Date(),
      cashierName,
      customerName: "Client exemple",
      items: SAMPLE_ITEMS,
      subtotal,
      discount,
      total,
      paymentMethodLabel: "Espèces",
      amountPaid,
      change: amountPaid - total,
      footerMessage: str(form, "ticketFooter"),
      currency: str(form, "currency") ?? "XOF",
      qrCodeSize: Number(form.get("qrCodeSize")) || 0,
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={open}>
        <Eye className="h-4 w-4" /> Aperçu du ticket
      </Button>
      <Modal open={!!data} onClose={() => setData(null)} title="Aperçu du ticket de caisse">
        {data && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                {WIDTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWidth(opt.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      width === opt.value ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStyle(opt.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      style === opt.value ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <Receipt data={{ ...data, qrCodeDataUrl }} width={width} style={style} />
            </div>
            <p className="text-xs text-zinc-500">
              Vente fictive, rien n&apos;est enregistré. Les modifications non enregistrées du formulaire sont prises
              en compte : pensez à cliquer sur « Enregistrer » pour les appliquer à vos vrais tickets.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
