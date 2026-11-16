import { useCallback, useEffect, useState } from "react";
import { BiPrinter, BiX } from "react-icons/bi";

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} Ar`;

const formatDate = (value) => {
  if (!value) return "Date inconnue";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const Historique = () => {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState("");

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVentes(await window.api.getVentes());
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger les ventes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const openSale = async (id) => {
    setSelectedSaleId(id);
    setSelectedSale(null);
    setLoadingSale(true);
    setSaleError("");
    setPrintStatus("");
    try {
      setSelectedSale(await window.api.getVente(id));
    } catch (requestError) {
      setSaleError(requestError.message || "Impossible de charger cette facture.");
    } finally {
      setLoadingSale(false);
    }
  };

  const closeSale = () => {
    setSelectedSaleId(null);
    setSelectedSale(null);
    setSaleError("");
    setPrintStatus("");
  };

  const printSale = async () => {
    if (!selectedSale) return;
    setPrinting(true);
    setPrintStatus("");
    try {
      const result = await window.api.printInvoice({
        storeName: "FACTURE",
        ticketId: selectedSale.reference,
        cashierName: selectedSale.caissier,
        total: selectedSale.total,
        paymentMethod:
          selectedSale.mode_paiement === "especes" ? "Espèces" : "Mobile Money",
        amountPaid: selectedSale.montant_recu,
        change: selectedSale.monnaie_rendue,
        items: selectedSale.items.map((item) => ({
          name: item.nom_produit,
          qty: item.quantite,
          price: item.prix_unitaire,
        })),
      });
      setPrintStatus(
        result.success
          ? "Facture envoyée à l’imprimante."
          : `Impression impossible : ${result.error}`,
      );
    } catch (printError) {
      setPrintStatus(`Impression impossible : ${printError.message}`);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-8">
      <header className="mb-5 shrink-0">
        <h2 className="text-xl font-semibold text-slate-800">Ventes récentes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les 100 dernières factures encaissées. Cliquez sur une facture pour voir son bon.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={loadSales} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Chargement des ventes…</p>
        ) : ventes.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            Aucune vente enregistrée pour le moment.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Facture</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Caissier</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Articles</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Paiement</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventes.map((vente) => (
                <tr key={vente.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                    <button
                      type="button"
                      onClick={() => openSale(vente.id)}
                      className="text-teal-700 hover:underline"
                    >
                      {vente.reference}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(vente.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {vente.caissier}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {vente.nombre_lignes}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {vente.mode_paiement === "especes"
                      ? "Espèces"
                      : "Mobile Money"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-800">
                    {formatCurrency(vente.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedSaleId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-detail-title"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h3 id="sale-detail-title" className="text-xl font-bold text-slate-800">
                  Bon de commande
                </h3>
                {selectedSale && (
                  <p className="mt-1 text-sm text-slate-500">
                    Facture {selectedSale.reference} · {formatDate(selectedSale.created_at)}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Fermer le détail de la facture"
                onClick={closeSale}
                className="text-slate-400 hover:text-slate-700"
              >
                <BiX size={24} />
              </button>
            </header>

            {loadingSale ? (
              <p className="p-6 text-sm text-slate-500">Chargement du bon…</p>
            ) : saleError ? (
              <div className="space-y-3 p-6">
                <p role="alert" className="text-sm text-red-700">{saleError}</p>
                <button
                  type="button"
                  onClick={() => openSale(selectedSaleId)}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : selectedSale ? (
              <>
                <div className="grid shrink-0 grid-cols-2 gap-3 bg-slate-50 p-5 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Caissier</p>
                    <p className="font-medium text-slate-800">{selectedSale.caissier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paiement</p>
                    <p className="font-medium text-slate-800">
                      {selectedSale.mode_paiement === "especes"
                        ? "Espèces"
                        : "Mobile Money"}
                    </p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                  <div className="divide-y divide-slate-100">
                    {selectedSale.items.map((item, index) => (
                      <div
                        key={`${item.produit_id}-${index}`}
                        className="flex items-start justify-between gap-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{item.nom_produit}</p>
                          <p className="text-xs text-slate-500">
                            {item.quantite} × {formatCurrency(item.prix_unitaire)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-slate-800">
                          {formatCurrency(item.sous_total)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <footer className="shrink-0 space-y-3 border-t border-slate-100 p-5">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(selectedSale.total)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Montant reçu</span>
                      <span>{formatCurrency(selectedSale.montant_recu)}</span>
                    </div>
                    {selectedSale.mode_paiement === "especes" && (
                      <div className="flex justify-between text-slate-500">
                        <span>Monnaie rendue</span>
                        <span>{formatCurrency(selectedSale.monnaie_rendue)}</span>
                      </div>
                    )}
                  </div>
                  {printStatus && (
                    <p role="status" className="text-center text-sm text-slate-600">
                      {printStatus}
                    </p>
                  )}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeSale}
                      className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={printSale}
                      disabled={printing}
                      className="btn inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <BiPrinter size={18} />
                      {printing ? "Impression…" : "Imprimer"}
                    </button>
                  </div>
                </footer>
              </>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
};

export default Historique;
