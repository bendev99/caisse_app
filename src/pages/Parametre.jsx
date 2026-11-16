import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptyForm = { nom: "", identifiant: "", motDePasse: "", role: "caissier" };

const Parametre = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await window.api.getUtilisateurs());
    } catch (error) {
      toast.error(error.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openNewForm = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setForm({
      nom: user.nom,
      identifiant: user.identifiant,
      motDePasse: "",
      role: user.role,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await window.api.updateUtilisateur({ ...form, id: editingUser.id });
        toast.success("Utilisateur modifié.");
      } else {
        await window.api.addUtilisateur(form);
        toast.success("Utilisateur ajouté.");
      }
      closeForm();
      await loadUsers();
    } catch (error) {
      const message = error.message?.includes("UNIQUE constraint failed")
        ? "Cet identifiant est déjà utilisé."
        : error.message || "Impossible d’enregistrer cet utilisateur.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer le compte de ${user.nom} ?`)) return;
    try {
      await window.api.deleteUtilisateur(user.id);
      toast.success("Utilisateur supprimé.");
      await loadUsers();
    } catch (error) {
      toast.error(error.message || "Impossible de supprimer cet utilisateur.");
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-6">
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Utilisateurs</h2>
          <p className="text-sm text-gray-500">
            Gérez les comptes et les accès à la caisse.
          </p>
        </div>
        <button type="button" onClick={openNewForm} className="btn">
          Ajouter un utilisateur
        </button>
      </header>

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="shrink-0 space-y-4 rounded-md bg-white p-5 shadow-md"
        >
          <h3 className="font-semibold">
            {editingUser ? "Modifier un utilisateur" : "Nouvel utilisateur"}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="user-name" className="text-sm text-gray-600">
                Nom complet
              </label>
              <input
                id="user-name"
                value={form.nom}
                onChange={(event) =>
                  setForm({ ...form, nom: event.target.value })
                }
                className="input"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="user-username" className="text-sm text-gray-600">
                Identifiant
              </label>
              <input
                id="user-username"
                autoComplete="username"
                value={form.identifiant}
                onChange={(event) =>
                  setForm({ ...form, identifiant: event.target.value })
                }
                className="input"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="user-password" className="text-sm text-gray-600">
                Mot de passe {editingUser ? "(laisser vide pour conserver)" : ""}
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.motDePasse}
                onChange={(event) =>
                  setForm({ ...form, motDePasse: event.target.value })
                }
                className="input"
                required={!editingUser}
              />
              <span className="text-xs text-gray-500">8 caractères minimum.</span>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="user-role" className="text-sm text-gray-600">
                Rôle
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value })
                }
                className="input bg-white"
              >
                <option value="caissier">Caissier</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="btn bg-gray-500 hover:bg-gray-600">
              Annuler
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Enregistrement…" : editingUser ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-md bg-white shadow-md">
        {loading ? (
          <p className="p-5 text-gray-500">Chargement des utilisateurs…</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-gray-500">Aucun utilisateur pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-gray-600">
              <tr>
                <th className="p-4 font-medium">Nom</th>
                <th className="p-4 font-medium">Identifiant</th>
                <th className="p-4 font-medium">Rôle</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="p-4">{user.nom}</td>
                  <td className="p-4">{user.identifiant}</td>
                  <td className="p-4">
                    {user.role === "admin" ? "Administrateur" : "Caissier"}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(user)}
                        className="text-teal-700 hover:underline"
                      >
                        Modifier
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default Parametre;
