import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const ProduitForm = ({ produit, onSuccess, onCancel }) => {
  const isEdit = Boolean(produit?.id);

  const [nomProduit, setNomProduit] = useState("");
  const [prixProduit, setPrixProduit] = useState("");
  const [formError, setFormError] = useState("");

  // Synchronisation PROPS → STATE
  useEffect(() => {
    if (isEdit) {
      setNomProduit(produit.nom || "");
      setPrixProduit(produit.prix ?? "");
    } else {
      setNomProduit("");
      setPrixProduit("");
    }

    setFormError("");
  }, [produit, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const data = {
      nom: nomProduit.trim(),
      prix: Number(prixProduit),
    };

    try {
      if (isEdit) {
        await window.api.updateProduit({ id: produit.id, ...data });
        toast.success("Menu modifié avec succès.");
      } else {
        await window.api.addProduit(data);
        toast.success("Menu ajouté avec succès.");
      }
      await onSuccess();
    } catch (error) {
      setFormError(error.message || "Impossible d’enregistrer le menu.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="form-card"
      >
        <h2 id="product-form-title" className="text-xl font-semibold">
          {isEdit ? "Modifier le menu" : "Ajouter un menu"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mx-5">
          <div className="space-y-3">
            <div>
              <label htmlFor="product-name" className="text-gray-600 mx-1">
                Nom du menu
              </label>
              <input
                id="product-name"
                type="text"
                placeholder="Ex. : Menu du jour, Café..."
                value={nomProduit}
                onChange={(e) => setNomProduit(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="product-price" className="text-gray-600 mx-1">
                Prix (Ar)
              </label>
              <input
                id="product-price"
                type="number"
                min={0}
                step="any"
                placeholder="Ex : 5000"
                value={prixProduit}
                onChange={(e) => setPrixProduit(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-red-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3 justify-center mt-3 mx-10">
            <button type="submit" className="btn w-full">
              {isEdit ? "Modifier" : "Ajouter"}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="btn w-full bg-red-300 hover:bg-red-400"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProduitForm;
