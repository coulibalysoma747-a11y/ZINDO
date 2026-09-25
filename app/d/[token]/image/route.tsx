/* eslint-disable @next/next/no-img-element -- rendu ImageResponse (satori), pas du DOM. */
import { ImageResponse } from "next/og";
import { loadPurchaseOrderDocument, verifyPurchaseOrderToken } from "@/lib/purchase-order-document";
import { isConfirmedOrder, purchaseOrderDisplayNumber } from "@/lib/purchase-orders";
import { formatMoney, formatLongDate } from "@/lib/format";
import { ZINDO_SITE, ZINDO_WHATSAPP } from "@/lib/referral";

/**
 * Demande de prix / bon de commande en image PNG, pour l'envoyer directement
 * dans WhatsApp (partage natif du téléphone) — même accès par lien signé que
 * la page /d/[token]. Mise en page simplifiée du document A4 : satori ne gère
 * que flexbox et des styles en ligne.
 */
const W = 1080;
const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#d4d4d8";
const GREEN = "#047857";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderId = verifyPurchaseOrderToken(decodeURIComponent(token));
  if (!orderId) return new Response("Lien invalide", { status: 404 });
  const data = await loadPurchaseOrderDocument(orderId);
  if (!data || data.order.status === "ANNULEE") return new Response("Document introuvable", { status: 404 });

  const { order, business, qrDataUrl } = data;
  const confirmed = isConfirmedOrder(order.status);
  // Espaces insécables fines de Intl (fr-FR) remplacées : absentes de la police intégrée.
  const money = (n: number) => formatMoney(n, business.currency).replace(/[\u202f\u00a0]/g, " ");
  const subtotal = order.items.reduce((s, i) => s + i.quantity * (i.unitPrice ?? 0), 0);
  const total = subtotal - (order.discount ?? 0) + (order.transportCost ?? 0);
  const blank = "..............";

  const cols = [
    { label: "Désignation", flex: 4, align: "flex-start" as const },
    { label: "Cartons", flex: 1.4, align: "center" as const },
    { label: "Unités", flex: 1.4, align: "center" as const },
    { label: "P.U.", flex: 1.8, align: "flex-end" as const },
    { label: "Total", flex: 2, align: "flex-end" as const },
  ];
  const rowHeight = 64;
  const height = 900 + order.items.length * rowHeight + (confirmed ? 120 : 60);

  const cell = (text: string, i: number, bold = false) => (
    <div
      key={i}
      style={{
        display: "flex",
        flex: cols[i].flex,
        justifyContent: cols[i].align,
        padding: "0 10px",
        fontSize: 22,
        color: text === blank ? LINE : INK,
        fontWeight: bold ? 700 : 400,
      }}
    >
      {text}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: W, height, background: "#fff", padding: 48, color: INK }}>
        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `4px solid ${INK}`, paddingBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {business.logoUrl && <img src={business.logoUrl} width={90} height={90} style={{ objectFit: "contain", marginRight: 18 }} alt="" />}
            <div style={{ display: "flex", flexDirection: "column", fontSize: 20, color: MUTED }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: INK }}>{business.name.toUpperCase()}</div>
              {business.address && <div style={{ display: "flex" }}>{business.address}</div>}
              {business.city && <div style={{ display: "flex" }}>{business.city}</div>}
              {business.phone && <div style={{ display: "flex" }}>Tél : {business.phone}</div>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 20 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{confirmed ? "BON DE COMMANDE" : "DEMANDE DE PRIX"}</div>
            <div style={{ display: "flex", fontSize: 24 }}>N° {purchaseOrderDisplayNumber(order.number, order.status)}</div>
            <div style={{ display: "flex", color: MUTED }}>
              Date : {formatLongDate(new Date(confirmed && order.confirmedAt ? order.confirmedAt : order.createdAt))}
            </div>
            {!confirmed && order.responseBy && (
              <div style={{ display: "flex", color: MUTED }}>Réponse souhaitée : {formatLongDate(new Date(order.responseBy))}</div>
            )}
          </div>
        </div>

        {/* Destinataire */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, border: `2px solid ${LINE}`, borderRadius: 12, padding: 18, fontSize: 20 }}>
          <div style={{ display: "flex", color: MUTED, fontSize: 18 }}>DESTINATAIRE</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>{order.supplier.company || order.supplier.name}</div>
          {order.supplier.phone && <div style={{ display: "flex" }}>Tél : {order.supplier.phone}</div>}
        </div>

        {/* Tableau */}
        <div style={{ display: "flex", marginTop: 28, background: INK, color: "#fff", padding: "14px 0" }}>
          {cols.map((c) => (
            <div key={c.label} style={{ display: "flex", flex: c.flex, justifyContent: c.align, padding: "0 10px", fontSize: 22, fontWeight: 700 }}>
              {c.label}
            </div>
          ))}
        </div>
        {order.items.map((item, idx) => {
          const upc = item.product.unitsPerCarton && item.product.unitsPerCarton > 1 ? item.product.unitsPerCarton : null;
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", height: rowHeight, borderBottom: `1px solid ${LINE}` }}>
              {cell(item.product.name, 0)}
              {cell(upc ? `${Math.floor(item.quantity / upc)} (×${upc})` : "—", 1)}
              {cell(`${item.quantity} ${item.product.unit}`, 2)}
              {cell(confirmed && item.unitPrice != null ? money(item.unitPrice) : blank, 3)}
              {cell(confirmed && item.unitPrice != null ? money(item.unitPrice * item.quantity) : blank, 4)}
            </div>
          );
        })}

        {/* Totaux */}
        <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-end", width: 440, marginTop: 18, fontSize: 22 }}>
          {confirmed && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Sous-total</span>
              <span>{money(subtotal)}</span>
            </div>
          )}
          {confirmed && order.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Remise</span>
              <span>−{money(order.discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Transport</span>
            <span style={{ color: confirmed ? INK : LINE }}>{confirmed ? money(order.transportCost ?? 0) : blank}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `3px solid ${INK}`, marginTop: 6, paddingTop: 6, fontSize: 26, fontWeight: 700 }}>
            <span>{confirmed ? "TOTAL À PAYER" : "TOTAL"}</span>
            <span style={{ color: confirmed ? INK : LINE }}>{confirmed ? money(total) : blank}</span>
          </div>
        </div>

        {/* Consigne / conditions */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, fontSize: 21 }}>
          {confirmed ? (
            <>
              <div style={{ display: "flex" }}>
                Livraison prévue : {order.expectedDeliveryDate ? formatLongDate(new Date(order.expectedDeliveryDate)) : "à convenir"}
              </div>
              <div style={{ display: "flex" }}>Paiement : {order.paymentTerms || "à convenir"}</div>
            </>
          ) : (
            <div style={{ display: "flex" }}>
              Merci de nous indiquer vos prix unitaires, les frais de transport et la disponibilité de chaque article.
            </div>
          )}
          {order.note && <div style={{ display: "flex", color: MUTED }}>Remarque : {order.note}</div>}
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 440 }}>
            {confirmed ? (
              <>
                <div style={{ display: "flex" }}>Le commerçant</div>
                <div style={{ display: "flex", borderBottom: `2px solid ${LINE}`, height: 70 }} />
              </>
            ) : (
              <>
                <div style={{ display: "flex" }}>Disponibilité / remarques du fournisseur :</div>
                <div style={{ display: "flex", borderBottom: `2px solid ${LINE}`, height: 40 }} />
                <div style={{ display: "flex", borderBottom: `2px solid ${LINE}`, height: 40 }} />
              </>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: 400 }}>
            <div style={{ display: "flex" }}>{confirmed ? "Le fournisseur (bon pour accord)" : "Cachet et signature du fournisseur"}</div>
            <div style={{ display: "flex", borderBottom: `2px solid ${LINE}`, height: 70 }} />
          </div>
        </div>

        {/* Bandeau ZINDO */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
            border: "2px solid #a7f3d0",
            background: "#ecfdf5",
            borderRadius: 16,
            padding: "18px 24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, fontSize: 20, color: "#3f3f46" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: GREEN }}>
              {confirmed ? "Bon créé avec ZINDO" : "Demande créée avec ZINDO"}
            </div>
            <div style={{ display: "flex" }}>Gérez votre stock, vos ventes et vos commandes depuis votre téléphone — même sans Internet.</div>
            <div style={{ display: "flex", color: INK }}>
              {ZINDO_SITE} · WhatsApp : {ZINDO_WHATSAPP}
            </div>
            <div style={{ display: "flex", color: GREEN, fontWeight: 700 }}>Scannez le code et essayez gratuitement →</div>
          </div>
          <img src={qrDataUrl} width={130} height={130} alt="" />
        </div>
      </div>
    ),
    { width: W, height }
  );
}
