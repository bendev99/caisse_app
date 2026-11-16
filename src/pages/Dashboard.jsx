import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BiCart,
  BiCheckCircle,
  BiMinus,
  BiPlus,
  BiPrinter,
  BiSearch,
  BiTrash,
  BiX,
} from "react-icons/bi";
import toast from "react-hot-toast";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const formatCurrency = (value) => `${formatNumber(value)} Ar`;

const toCartItems = (commande) =>
  commande.items.map((item) => {
    return {
      id: item.produit_id,
      nom: item.nom_produit,
      prix: item.prix_unitaire,
      quantite: item.quantite,
    };
  });

const Dashboard = ({ currentUser }) => {
  const [produits, setProduits] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [commandeActive, setCommandeActive] = useState(null);
  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState(null);
  const [error, setError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [modePaiement, setModePaiement] = useState("especes");
  const [montantRecu, setMontantRecu] = useState("");
  const [mobileMoneyConfirme, setMobileMoneyConfirme] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [facture, setFacture] = useState(null);
  const [printStatus, setPrintStatus] = useState("");
  const [printing, setPrinting] = useState(false);

  const refreshPosData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [productRows, openOrders] = await Promise.all([
        window.api.getProduits(),
        window.api.getCommandesEnAttente(),
      ]);
      setProduits(productRows);
      setCommandes(openOrders);
      return productRows;
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger la caisse.");
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPosData(true);
  }, [refreshPosData]);

  const produitsFiltres = useMemo(() => {
    const query = recherche.trim().toLocaleLowerCase("fr");
    if (!query) return produits;
    return produits.filter((produit) =>
      produit.nom.toLocaleLowerCase("fr").includes(query),
    );
  }, [produits, recherche]);

  const total = useMemo(
    () =>
      Math.round(
        panier.reduce(
          (sum, item) => sum + Number(item.prix) * item.quantite,
          0,
        ) *
          100 +
          Number.EPSILON,
      ) / 100,
    [panier],
  );
  const nombreArticles = panier.reduce((sum, item) => sum + item.quantite, 0);
  const monnaieRendue =
    modePaiement === "especes"
      ? Math.max(0, Number(montantRecu || 0) - total)
      : 0;

  const appliquerCommande = (commande) => {
    setCommandeActive(commande);
    setPanier(toCartItems(commande));
    setOrderError("");
  };

  const chargerCommande = async (id) => {
    setLoadingOrderId(id);
    setOrderError("");
    try {
      const commande = await window.api.getCommande(id);
      appliquerCommande(commande);
    } catch (requestError) {
      setOrderError(requestError.message || "Impossible d’ouvrir cette commande.");
      await refreshPosData();
    } finally {
      setLoadingOrderId(null);
    }
  };

  const enregistrerArticles = async (items) => {
    if (savingOrder) return;
    setSavingOrder(true);
    setOrderError("");
    try {
      let commande;
      if (commandeActive) {
        commande = await window.api.updateCommande({
          id: commandeActive.id,
          items: items.map((item) => ({
            produitId: item.id,
            quantite: item.quantite,
          })),
        });
      } else {
        commande = await window.api.createCommande({
          items: items.map((item) => ({
            produitId: item.id,
            quantite: item.quantite,
          })),
        });
      }

      await refreshPosData();
      appliquerCommande(commande);
    } catch (requestError) {
      setOrderError(
        requestError.message || "Impossible d’enregistrer la commande.",
      );
    } finally {
      setSavingOrder(false);
    }
  };

  const nouvelleCommande = () => {
    setCommandeActive(null);
    setPanier([]);
    setOrderError("");
    setRecherche("");
  };

  const ajouterAuPanier = async (produit) => {
    const currentItem = panier.find((item) => item.id === produit.id);
    const nextItems = currentItem
      ? panier.map((item) =>
          item.id === produit.id
            ? { ...item, quantite: item.quantite + 1 }
            : item,
        )
      : [
          ...panier,
          {
            id: produit.id,
            nom: produit.nom,
            prix: produit.prix,
            quantite: 1,
          },
        ];
    await enregistrerArticles(nextItems);
  };

  const modifierQuantite = async (produitId, changement) => {
    const item = panier.find((product) => product.id === produitId);
    if (!item) return;
    const nouvelleQuantite = item.quantite + changement;
    const nextItems =
      nouvelleQuantite <= 0
        ? panier.filter((product) => product.id !== produitId)
        : panier.map((product) =>
            product.id === produitId
              ? { ...product, quantite: nouvelleQuantite }
              : product,
          );
    await enregistrerArticles(nextItems);
  };

  const imprimerAddition = async () => {
    try {
      const result = await window.api.printInvoice({
        storeName: "ADDITION — NON PAYÉE",
        ticketId: commandeActive.reference,
        cashierName:
          commandeActive.nom_caissier || commandeActive.caissier || currentUser?.nom,
        total,
        paymentMethod: "NON PAYÉ",
        items: panier.map((item) => ({
          name: item.nom,
          qty: item.quantite,
          price: item.prix,
        })),
      });
      if (result.success) toast.success("Addition envoyée à l’imprimante.");
      else toast.error(`Impression impossible : ${result.error}`);
    } catch (printError) {
      toast.error(`Impression impossible : ${printError.message}`);
    }
  };

  const annulerCommande = async () => {
    if (!commandeActive) return;
    if (!window.confirm(`Annuler la commande ${commandeActive.reference} ?`)) {
      return;
    }
    setSavingOrder(true);
    try {
      await window.api.cancelCommande(commandeActive.id);
      nouvelleCommande();
      await refreshPosData();
      toast.success("Commande annulée.");
    } catch (cancelError) {
      setOrderError(cancelError.message || "Impossible d’annuler la commande.");
    } finally {
      setSavingOrder(false);
    }
  };

  const ouvrirPaiement = () => {
    if (!commandeActive || panier.length === 0) return;
    setModePaiement("especes");
    setMontantRecu(String(total));
    setMobileMoneyConfirme(false);
    setPaymentError("");
    setShowPayment(true);
  };

  const encaisserCommande = async (event) => {
    event.preventDefault();
    if (!commandeActive) return;
    setPaymentError("");
    setProcessing(true);
    try {
      const vente = await window.api.encaisserCommande(commandeActive.id, {
        modePaiement,
        montantRecu: modePaiement === "especes" ? Number(montantRecu) : total,
        mobileMoneyConfirme,
      });
      setFacture(vente);
      setShowPayment(false);
      nouvelleCommande();
      setPrintStatus("");
      await refreshPosData();
    } catch (requestError) {
      setPaymentError(requestError.message || "L’encaissement a échoué.");
    } finally {
      setProcessing(false);
    }
  };

  const imprimerFacture = async () => {
    setPrinting(true);
    setPrintStatus("");
    try {
      const result = await window.api.printInvoice({
        storeName: "FACTURE",
        ticketId: facture.reference,
        cashierName: facture.caissier,
        total: facture.total,
        paymentMethod:
          facture.mode_paiement === "especes" ? "Espèces" : "Mobile Money",
        amountPaid: facture.montant_recu,
        change: facture.monnaie_rendue,
        items: facture.items.map((item) => ({
          name: item.nom_produit,
          qty: item.quantite,
          price: item.prix_unitaire,
        })),
      });
      setPrintStatus(
        result.success
          ? "Facture envoyée à l’imprimante."
          : `Vente enregistrée, mais impression impossible : ${result.error}`,
      );
    } catch (printError) {
      setPrintStatus(
        `Vente enregistrée, mais impression impossible : ${printError.message}`,
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Point de vente</h2>
          <p className="text-sm text-slate-500">
            Bonjour{currentUser?.nom ? `, ${currentUser.nom}` : ""} — vos
            commandes sont enregistrées automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={nouvelleCommande}
          disabled={savingOrder || processing}
          className="btn inline-flex items-center gap-2 disabled:opacity-50"
        >
          <BiPlus size={19} />
          Nouvelle commande
        </button>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] gap-4 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          <section className="shrink-0 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Commandes en attente ({commandes.length})
              </h3>
              {commandeActive && (
                <span className="text-xs text-teal-700">
                  Active : {commandeActive.reference}
                </span>
              )}
            </div>
            {commandes.length === 0 ? (
              <p className="text-sm text-slate-400">
                Aucune commande en attente. Ajoutez un produit pour démarrer.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {commandes.map((commande) => (
                  <button
                    key={commande.id}
                    type="button"
                    onClick={() => chargerCommande(commande.id)}
                    disabled={savingOrder || processing || loadingOrderId !== null}
                    className={`min-w-44 rounded-lg border px-3 py-2 text-left transition ${
                      commandeActive?.id === commande.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:border-teal-300"
                    }`}
                  >
                    <span className="block truncate text-xs font-semibold text-slate-700">
                      {loadingOrderId === commande.id
                        ? "Chargement…"
                        : commande.reference}
                    </span>
                    <span className="mt-1 flex justify-between gap-2 text-xs text-slate-500">
                      <span>{commande.nombre_lignes} article(s)</span>
                      <span>{formatCurrency(commande.total)}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      Caissier : {commande.nom_caissier || commande.caissier || "Inconnu"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div
              role="alert"
              className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => refreshPosData(true)}
                className="shrink-0 font-semibold underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {orderError && (
            <div role="alert" className="shrink-0 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {orderError}
            </div>
          )}

          <div className="relative shrink-0">
            <BiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un menu..."
              aria-label="Rechercher un menu"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="font-semibold text-slate-800">Carte des menus</h3>
              <span className="text-xs text-slate-500">
                {produitsFiltres.length} produit{produitsFiltres.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Chargement des produits…
                </p>
              ) : produitsFiltres.length === 0 ? (
                <div className="py-12 text-center">
                  <BiSearch className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="text-sm text-slate-500">
                    {produits.length === 0
                      ? "Aucun produit au catalogue."
                      : "Aucun résultat pour cette recherche."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {produitsFiltres.map((produit) => {
                    return (
                      <button
                        key={produit.id}
                        type="button"
                        onClick={() => ajouterAuPanier(produit)}
                        disabled={savingOrder || loading}
                        className="flex min-h-28 flex-col justify-between rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-400 hover:bg-teal-50/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                      >
                        <span className="line-clamp-2 text-sm font-semibold text-slate-800">
                          {produit.nom}
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-base font-bold text-teal-700">
                            {formatCurrency(produit.prix)}
                          </span>
                          <BiPlus className="text-teal-600" size={18} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </div>

        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <BiCart className="shrink-0 text-teal-600" size={20} />
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800">
                  {commandeActive
                    ? `Commande en cours (${nombreArticles} article${nombreArticles === 1 ? "" : "s"})`
                    : "Nouvelle commande"}
                </h3>
                {commandeActive && (
                  <>
                    <p className="truncate text-xs text-slate-500">
                      {commandeActive.reference} · enregistrée
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Caissier :{" "}
                      {commandeActive.nom_caissier ||
                        commandeActive.caissier ||
                        currentUser?.nom ||
                        "Inconnu"}
                    </p>
                  </>
                )}
              </div>
            </div>
            {commandeActive && panier.length > 0 && (
              <button
                type="button"
                onClick={() => enregistrerArticles([])}
                disabled={savingOrder}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {panier.length === 0 ? (
              <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 p-5 text-center text-slate-400">
                <BiCart size={32} />
                <p className="text-sm">La commande est vide.</p>
                <p className="text-xs">Sélectionnez des produits pour la composer.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 px-4">
                {panier.map((item) => (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {item.nom}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.prix)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Retirer ${item.nom} de la commande`}
                        disabled={savingOrder}
                        onClick={() =>
                          enregistrerArticles(
                            panier.filter((product) => product.id !== item.id),
                          )
                        }
                        className="text-slate-400 hover:text-red-600 disabled:opacity-40"
                      >
                        <BiTrash size={17} />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Diminuer la quantité de ${item.nom}`}
                          disabled={savingOrder}
                          onClick={() => modifierQuantite(item.id, -1)}
                          className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <BiMinus size={15} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-medium">
                          {item.quantite}
                        </span>
                        <button
                          type="button"
                          aria-label={`Augmenter la quantité de ${item.nom}`}
                          disabled={savingOrder}
                          onClick={() => modifierQuantite(item.id, 1)}
                          className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <BiPlus size={15} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(Number(item.prix) * item.quantite)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 p-4">
            <div className="flex items-center justify-between text-lg font-bold text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={imprimerAddition}
                disabled={!commandeActive || panier.length === 0 || savingOrder}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BiPrinter size={17} />
                Addition
              </button>
              <button
                type="button"
                onClick={annulerCommande}
                disabled={!commandeActive || savingOrder || processing}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-red-200 px-2 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BiX size={17} />
                Annuler
              </button>
            </div>
            <button
              type="button"
              onClick={ouvrirPaiement}
              disabled={
                !commandeActive ||
                panier.length === 0 ||
                savingOrder ||
                processing
              }
              className="btn w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              Encaisser
            </button>
          </div>
        </aside>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={encaisserCommande}
            className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Encaissement</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Commande {commandeActive?.reference} · total{" "}
                  <strong className="text-slate-800">{formatCurrency(total)}</strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setShowPayment(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <BiX size={24} />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-slate-700">
                Mode de paiement
              </legend>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="radio"
                  name="mode-paiement"
                  value="especes"
                  checked={modePaiement === "especes"}
                  onChange={() => setModePaiement("especes")}
                />
                <span className="text-sm">Espèces</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="radio"
                  name="mode-paiement"
                  value="mobile_money"
                  checked={modePaiement === "mobile_money"}
                  onChange={() => setModePaiement("mobile_money")}
                />
                <span className="text-sm">Mobile Money</span>
              </label>
            </fieldset>

            {modePaiement === "especes" ? (
              <div className="space-y-2">
                <label
                  htmlFor="montant-recu"
                  className="text-sm font-medium text-slate-700"
                >
                  Montant reçu (Ar)
                </label>
                <input
                  id="montant-recu"
                  type="number"
                  min={total}
                  step="any"
                  value={montantRecu}
                  onChange={(event) => setMontantRecu(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  required
                />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Monnaie à rendre</span>
                  <strong className="text-teal-700">
                    {formatCurrency(monnaieRendue)}
                  </strong>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={mobileMoneyConfirme}
                  onChange={(event) =>
                    setMobileMoneyConfirme(event.target.checked)
                  }
                  className="mt-0.5"
                  required
                />
                <span>Je confirme avoir reçu le paiement Mobile Money.</span>
              </label>
            )}

            {paymentError && (
              <p role="alert" className="text-sm text-red-600">
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={
                processing ||
                (modePaiement === "especes" && Number(montantRecu) < total)
              }
              className="btn w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Enregistrement…" : "Confirmer le paiement"}
            </button>
          </form>
        </div>
      )}

      {facture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-title"
            className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="text-center">
              <BiCheckCircle className="mx-auto mb-2 text-teal-600" size={40} />
              <h3 id="invoice-title" className="text-xl font-bold text-slate-800">
                Paiement reçu — facture
              </h3>
              <p className="mt-1 text-sm text-slate-500">{facture.reference}</p>
              <p className="mt-1 text-sm text-slate-500">
                Caissier : {facture.caissier || "Inconnu"}
              </p>
            </div>
            <div className="max-h-52 space-y-2 overflow-y-auto border-y border-dashed border-slate-200 py-3">
              {facture.items.map((item) => (
                <div
                  key={item.produit_id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span>
                    {item.quantite} × {item.nom_produit}
                  </span>
                  <span>{formatCurrency(item.sous_total)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total payé</span>
                <span>{formatCurrency(facture.total)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paiement</span>
                <span>
                  {facture.mode_paiement === "especes"
                    ? "Espèces"
                    : "Mobile Money"}
                </span>
              </div>
              {facture.mode_paiement === "especes" && (
                <div className="flex justify-between text-slate-500">
                  <span>Monnaie rendue</span>
                  <span>{formatCurrency(facture.monnaie_rendue)}</span>
                </div>
              )}
            </div>
            {printStatus && (
              <p
                role="status"
                className={`text-center text-sm ${
                  printStatus.startsWith("Facture envoyée")
                    ? "text-teal-700"
                    : "text-amber-700"
                }`}
              >
                {printStatus}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={imprimerFacture}
                disabled={printing}
                className="btn flex flex-1 items-center justify-center gap-2 disabled:opacity-60"
              >
                <BiPrinter size={18} />
                {printing ? "Impression…" : "Imprimer la facture"}
              </button>
              <button
                type="button"
                onClick={() => setFacture(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default Dashboard;
