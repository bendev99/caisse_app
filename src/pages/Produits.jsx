import { useCallback, useEffect, useMemo, useState } from "react";
import { BiPlus, BiSearch } from "react-icons/bi";
import toast from "react-hot-toast";
import ProduitForm from "../components/ProduitForm";

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 2,
  })} Ar`;

const Produits = () => {
  const [produits, setProduits] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  const produitsFiltres = useMemo(() => {
    const query = recherche.trim().toLocaleLowerCase("fr");
    if (!query) return produits;
    return produits.filter((produit) =>
      produit.nom.toLocaleLowerCase("fr").includes(query),
    );
  }, [produits, recherche]);

  const openNewForm = () => {
    setSelectedProduct(null);
    setShowForm(true);
  };

  const openEditForm = (produit) => {
    setSelectedProduct(produit);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedProduct(null);
  };

  const handleSuccess = async () => {
    closeForm();
    await loadProducts();
  };

  const handleDelete = async (produit) => {
    if (!window.confirm(`Supprimer le menu « ${produit.nom} » ?`)) return;
    try {
      await window.api.deleteProduit(produit.id);
      toast.success("Menu supprimé.");
      await loadProducts();
    } catch (deleteError) {
      toast.error(deleteError.message || "Impossible de supprimer ce menu.");
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-8">
      <header className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Carte des menus</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ajoutez et gérez les menus proposés à la vente.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="btn inline-flex items-center gap-2"
        >
          <BiPlus size={20} />
          Ajouter un menu
        </button>
      </header>

      <div className="relative mb-4 max-w-md shrink-0">
        <BiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={19}
        />
        <input
          type="search"
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder="Rechercher dans la carte..."
          aria-label="Rechercher un menu"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={loadProducts} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Chargement du catalogue…</p>
        ) : produitsFiltres.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">
              {produits.length === 0
                ? "Aucun menu enregistré."
                : "Aucun menu ne correspond à la recherche."}
            </p>
            {produits.length === 0 && (
              <button
                type="button"
                onClick={openNewForm}
                className="mt-3 font-medium text-teal-700 hover:underline"
              >
                Ajouter le premier menu
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Nom du menu</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Prix</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produitsFiltres.map((produit) => (
                <tr key={produit.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                    {produit.nom}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatCurrency(produit.prix)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(produit)}
                        className="font-medium text-teal-700 hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(produit)}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ProduitForm
          produit={selectedProduct}
          onSuccess={handleSuccess}
          onCancel={closeForm}
        />
      )}
    </section>
  );
};

export default Produits;
