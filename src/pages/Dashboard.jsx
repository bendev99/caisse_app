import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BiBox,
  BiCheckCircle,
  BiErrorCircle,
  BiMoney,
  BiRefresh,
  BiTimeFive,
} from "react-icons/bi";

const LOW_STOCK_THRESHOLD = 5;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });

const formatCurrency = (value) => `${formatNumber(value)} Ar`;

const StatCard = ({ title, value, caption, icon: Icon, color }) => (
  <article className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-start justify-between gap-4">
    <div className="space-y-2 min-w-0">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-800 break-words">{value}</p>
      <p className="text-xs text-slate-400">{caption}</p>
    </div>
    <span className={`shrink-0 rounded-xl p-3 ${color}`}>
      <Icon size={23} />
    </span>
  </article>
);

const Dashboard = ({ currentUser }) => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProduits(await window.api.getProduits());
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const stats = useMemo(() => {
    const lowStock = produits.filter(
      (produit) =>
        Number(produit.quantite) > 0 &&
        Number(produit.quantite) <= LOW_STOCK_THRESHOLD,
    );
    const outOfStock = produits.filter(
      (produit) => Number(produit.quantite) <= 0,
    );
    const stockValue = produits.reduce(
      (total, produit) =>
        total + Number(produit.quantite || 0) * Number(produit.prix || 0),
      0,
    );

    return { lowStock, outOfStock, stockValue };
  }, [produits]);

  const recentProducts = useMemo(
    () =>
      [...produits]
        .sort((a, b) =>
          String(b.created_at || "").localeCompare(String(a.created_at || "")),
        )
        .slice(0, 5),
    [produits],
  );

  const stockAlerts = useMemo(
    () =>
      [...stats.lowStock, ...stats.outOfStock]
        .sort((a, b) => Number(a.quantite) - Number(b.quantite))
        .slice(0, 5),
    [stats.lowStock, stats.outOfStock],
  );

  return (
    <section className="flex-1 min-h-0 overflow-y-auto p-5 md:p-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Vue d’ensemble</p>
          <h2 className="text-2xl font-bold text-slate-800">
            Bonjour{currentUser?.nom ? `, ${currentUser.nom}` : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Voici l’état actuel de votre stock.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <BiRefresh size={18} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadProducts}
            className="font-semibold underline"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Produits au catalogue"
          value={loading ? "…" : formatNumber(produits.length)}
          caption="Références enregistrées"
          icon={BiBox}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Stock faible"
          value={loading ? "…" : formatNumber(stats.lowStock.length)}
          caption={`Entre 1 et ${LOW_STOCK_THRESHOLD} unités`}
          icon={BiErrorCircle}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="En rupture"
          value={loading ? "…" : formatNumber(stats.outOfStock.length)}
          caption="Produits sans stock disponible"
          icon={BiCheckCircle}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          title="Valeur estimée du stock"
          value={loading ? "…" : formatCurrency(stats.stockValue)}
          caption="Quantité × prix unitaire"
          icon={BiMoney}
          color="bg-teal-50 text-teal-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <BiErrorCircle className="text-amber-600" size={20} />
            <h3 className="font-semibold text-slate-800">Stocks à surveiller</h3>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-slate-500">Chargement du stock…</p>
          ) : stockAlerts.length === 0 ? (
            <div className="flex items-center gap-3 p-5 text-sm text-slate-500">
              <BiCheckCircle className="text-teal-600" size={20} />
              Aucun produit en stock faible ou en rupture.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stockAlerts.map((produit) => {
                const isOutOfStock = Number(produit.quantite) <= 0;
                return (
                  <li
                    key={produit.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {produit.nom}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(produit.prix)} / {produit.unite}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        isOutOfStock
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isOutOfStock
                        ? "Rupture"
                        : `${formatNumber(produit.quantite)} ${produit.unite}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <BiTimeFive className="text-teal-600" size={20} />
            <h3 className="font-semibold text-slate-800">Derniers produits ajoutés</h3>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-slate-500">Chargement des produits…</p>
          ) : recentProducts.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              Aucun produit enregistré pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentProducts.map((produit) => (
                <li
                  key={produit.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {produit.nom}
                    </p>
                    <p className="text-xs text-slate-500">
                      {produit.created_at || "Date inconnue"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {formatCurrency(produit.prix)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
};

export default Dashboard;
