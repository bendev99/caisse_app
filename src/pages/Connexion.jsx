import { useState } from "react";

const Connexion = ({ setupRequired, onAuthenticated }) => {
  const [nom, setNom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = setupRequired
        ? await window.api.setupAdmin({ nom, identifiant, motDePasse })
        : await window.api.login({ identifiant, motDePasse });
      onAuthenticated(user);
    } catch (requestError) {
      setError(requestError.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <section className="form-card">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-800">
            {setupRequired ? "Créer le compte administrateur" : "Connexion"}
          </h1>
          <p className="text-sm text-gray-500">
            {setupRequired
              ? "Ce compte sera le premier administrateur de votre caisse."
              : "Connectez-vous pour accéder à votre caisse."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {setupRequired && (
            <div className="flex flex-col gap-1">
              <label htmlFor="nom" className="text-gray-600">
                Nom complet
              </label>
              <input
                id="nom"
                autoComplete="name"
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                className="input"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="identifiant" className="text-gray-600">
              Identifiant
            </label>
            <input
              id="identifiant"
              autoComplete="username"
              value={identifiant}
              onChange={(event) => setIdentifiant(event.target.value)}
              className="input"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="mot-de-passe" className="text-gray-600">
              Mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete={setupRequired ? "new-password" : "current-password"}
              minLength={setupRequired ? 8 : undefined}
              value={motDePasse}
              onChange={(event) => setMotDePasse(event.target.value)}
              className="input"
              required
            />
            {setupRequired && (
              <span className="text-xs text-gray-500">
                8 caractères minimum.
              </span>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn w-full" disabled={loading}>
            {loading
              ? "Veuillez patienter…"
              : setupRequired
                ? "Créer le compte"
                : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default Connexion;
