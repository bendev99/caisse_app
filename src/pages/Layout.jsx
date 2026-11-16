import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import Sidebar from "../components/Sidebar";
import Historique from "./Historique";
import Parametre from "./Parametre";
import Connexion from "./Connexion";
import AppBar from "../components/AppBar";
import { BiHome } from "react-icons/bi";
import { AiOutlineHistory, AiOutlineSetting } from "react-icons/ai";
import toast from "react-hot-toast";

const Layout = () => {
  const [activeSide, setActiveSide] = useState("home");
  const [authState, setAuthState] = useState(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    window.api
      .getAuthState()
      .then(setAuthState)
      .catch((error) =>
        setAuthError(error.message || "Impossible de vérifier la connexion."),
      );
  }, []);

  const handleLogout = async () => {
    try {
      await window.api.logout();
      setActiveSide("home");
      setAuthState((state) => ({ ...state, currentUser: null }));
    } catch (error) {
      toast.error(error.message || "La déconnexion a échoué.");
    }
  };

  if (authError) {
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 text-red-700">
        {authError}
      </div>
    );
  }

  if (!authState) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement…
      </div>
    );
  }

  if (!authState.currentUser) {
    return (
      <Connexion
        setupRequired={authState.setupRequired}
        onAuthenticated={(currentUser) =>
          setAuthState({ setupRequired: false, currentUser })
        }
      />
    );
  }

  const currentUser = authState.currentUser;

  const renderPage = () => {
    switch (activeSide) {
      case "home":
        return <Dashboard currentUser={currentUser} />;
      case "history":
        return <Historique />;
      case "settings":
        return currentUser.role === "admin" ? (
          <Parametre currentUser={currentUser} />
        ) : (
          <Dashboard />
        );
      default:
        return <Dashboard />;
    }
  };

  const titlePage = () => {
    switch (activeSide) {
      case "home":
        return (
          <div className="flex gap-2 items-center">
            <BiHome size={24} />
            <h1>Tableau de bord</h1>
          </div>
        );
      case "history":
        return (
          <div className="flex gap-2 items-center">
            <AiOutlineHistory size={24} />
            <h1>Historique des commandes</h1>
          </div>
        );
      case "settings":
        return (
          <div className="flex gap-2 items-center">
            <AiOutlineSetting size={24} />
            <h1>Paramètres</h1>
          </div>
        );
      default:
        return (
          <div className="flex gap-2 items-center">
            <BiHome size={24} />
            <h1>Tableau de bord</h1>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen max-w-screen bg-gray-100">
    <Sidebar
      activePage={activeSide}
      onNavigate={setActiveSide}
      currentUser={currentUser}
      onLogout={handleLogout}
    />

      <main className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ml-56">
        <AppBar title={titlePage()} />
        {renderPage()}
      </main>
    </div>
  );
};

export default Layout;
