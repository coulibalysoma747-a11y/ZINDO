"use client";

import { useActionState, useState, useTransition } from "react";
import { UploadCloud, Download } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { receiveFasoStockAction, sendToFasoStockAction } from "@/lib/actions/faso-stock-file";
import type { FasoReceiveResult } from "@/lib/faso-stock-file-sync";

const LAST_SEND_MESSAGES = {
  aucun: null,
  confirme: "Le dernier fichier envoyé a bien été pris en compte par FasoStock.",
  non_pris_en_compte:
    "Le dernier fichier envoyé n'a pas été pris en compte par FasoStock : ces changements seront remis dans le prochain envoi.",
  partiel:
    "FasoStock n'a pris en compte qu'une partie du dernier fichier : le reste sera remis dans le prochain envoi.",
} as const;

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "jamais";
}

export function FasoStockSyncPanel({ receivedAt, sentAt }: { receivedAt: string | null; sentAt: string | null }) {
  const [receiveState, receiveAction, receiving] = useActionState<FasoReceiveResult | undefined, FormData>(
    receiveFasoStockAction,
    undefined
  );
  const [sendMessage, setSendMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSending] = useTransition();

  const send = () =>
    startSending(async () => {
      const result = await sendToFasoStockAction();
      if (!result.success) {
        setSendMessage({ ok: false, text: result.error });
        return;
      }
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `zindo-vers-fasostock-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setSendMessage({
        ok: true,
        text: `Fichier téléchargé (${result.rows} produit(s)). Importez-le maintenant dans FasoStock (Produits → Importer).`,
      });
    });

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div>
            <h2 className="font-semibold text-zinc-900">1. Recevoir FasoStock</h2>
            <p className="text-sm text-zinc-500">
              Dans FasoStock, exportez le <strong>Stock</strong> en Excel, puis déposez le fichier ici tel quel. Seuls
              les changements faits dans FasoStock sont ajoutés : les ventes faites dans ZINDO sont conservées.
            </p>
            <p className="text-xs text-zinc-400">Dernière réception : {formatDate(receivedAt)}</p>
          </div>
          <form action={receiveAction} className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center hover:border-zindo-green-400">
              <UploadCloud className="h-7 w-7 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700">Choisir le fichier Excel de FasoStock</span>
              <input type="file" name="file" accept=".xlsx" required className="text-xs text-zinc-500" />
            </label>
            {receiveState && !receiveState.success && (
              <div className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <p>{receiveState.error}</p>
                {receiveState.rowErrors && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs">
                    {receiveState.rowErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {receiveState?.success && (
              <div className="space-y-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <p>
                  {receiveState.rows} produit(s) lus : {receiveState.stockChanged} stock(s) mis à jour,{" "}
                  {receiveState.productsCreated} produit(s) créé(s), {receiveState.catalogUpdated} fiche(s) modifiée(s).
                </p>
                {receiveState.firstTime && <p>Première synchro : le stock ZINDO a été aligné sur FasoStock.</p>}
                {LAST_SEND_MESSAGES[receiveState.lastSend] && <p>{LAST_SEND_MESSAGES[receiveState.lastSend]}</p>}
              </div>
            )}
            <Button type="submit" disabled={receiving}>
              {receiving ? "Réception en cours... (1 à 2 min)" : "Recevoir"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <h2 className="font-semibold text-zinc-900">2. Envoyer à FasoStock</h2>
            <p className="text-sm text-zinc-500">
              Téléchargez le fichier des changements faits dans ZINDO (ventes, entrées...), puis importez-le dans
              FasoStock. Faites-le juste après l&apos;étape 1.
            </p>
            <p className="text-xs text-zinc-400">Dernier envoi : {formatDate(sentAt)}</p>
          </div>
          {sendMessage && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${sendMessage.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {sendMessage.text}
            </p>
          )}
          <Button type="button" variant="secondary" onClick={send} disabled={sending}>
            <Download className="h-4 w-4" /> {sending ? "Préparation..." : "Télécharger le fichier pour FasoStock"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
