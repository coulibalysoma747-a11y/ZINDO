"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Phone,
  Store,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import {
  getAdminSaspayPayments,
  manuallyValidateSaspayPaymentAction,
  syncSaspayPaymentAction,
  AdminSaspayPayment,
} from "@/lib/actions/admin-saspay";

export default function AdminSaspayPage() {
  const [payments, setPayments] = useState<AdminSaspayPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadData() {
    setLoading(true);
    getAdminSaspayPayments()
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalCollected = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const paidCount = payments.filter((p) => p.status === "PAID").length;

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.businessName.toLowerCase().includes(search.toLowerCase()) ||
      (p.businessPhone && p.businessPhone.includes(search)) ||
      p.saspayId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleManualValidate(id: string, name: string) {
    if (!confirm(`Confirmez-vous avoir reçu le paiement pour "${name}" ? L'abonnement sera activé immédiatement.`)) {
      return;
    }

    startTransition(async () => {
      const res = await manuallyValidateSaspayPaymentAction({
        paymentId: id,
        paymentMethod: "VALIDÉ PAR CRÉATEUR (Orange/Moov/Espèces)",
      });
      if (res.error) {
        setActionMessage({ text: res.error, error: true });
      } else {
        setActionMessage({ text: `Paiement pour ${name} validé et abonnement activé !` });
        loadData();
      }
    });
  }

  function handleSync(id: string) {
    startTransition(async () => {
      const res = await syncSaspayPaymentAction(id);
      if (res.error) {
        setActionMessage({ text: res.error, error: true });
      } else {
        setActionMessage({ text: `Vérification terminée. Statut : ${res.status}` });
        loadData();
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Console Créateur — Paiements SasPay</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des encaissements abonnements et validation manuelle.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading || isPending}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            actionMessage.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Encaissé</span>
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {totalCollected.toLocaleString("fr-FR")} FCFA
          </p>
          <p className="text-xs text-gray-400 mt-1">{paidCount} paiement(s) confirmé(s)</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">En Attente</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">À suivre ou valider</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Taux de Succès</span>
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0} %
          </p>
          <p className="text-xs text-gray-400 mt-1">{payments.length} tentative(s)</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par commerçant, téléphone ou réf..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {["ALL", "PENDING", "PAID", "FAILED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                statusFilter === tab
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {tab === "ALL" && "Tous"}
              {tab === "PENDING" && "En attente"}
              {tab === "PAID" && "Payés"}
              {tab === "FAILED" && "Échoués"}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            Aucun paiement trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Commerçant</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Moyen</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <Store className="w-4 h-4 text-gray-400" />
                        {item.businessName}
                      </div>
                      {item.businessPhone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {item.businessPhone}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Réf : {item.saspayId.slice(0, 18)}...
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-gray-900">
                      {item.amount.toLocaleString("fr-FR")} FCFA
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-600">
                      {item.paymentMethod || "SasPay"}
                    </td>

                    <td className="py-3 px-4">
                      {item.status === "PAID" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Payé
                        </span>
                      )}
                      {item.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </span>
                      )}
                      {item.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Échoué
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {item.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => handleSync(item.id)}
                            disabled={isPending}
                            className="px-2.5 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Vérifier
                          </button>
                          <button
                            onClick={() => handleManualValidate(item.id, item.businessName)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm"
                          >
                            Valider manuellement
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Validé ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
