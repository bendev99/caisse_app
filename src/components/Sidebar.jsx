import { BiChevronRight, BiLogOut } from "react-icons/bi";
import { MENU } from "../utils/utils";

const Sidebar = ({ activePage, onNavigate, currentUser, onLogout }) => {
  const menu = currentUser.role === "admin"
    ? MENU
    : MENU.filter(({ id }) => id !== "settings");

  return (
    <div className="fixed top-0 left-0 h-full z-40 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden w-56">
      {/* Header */}
      <div className="flex flex-col items-center justify-center rounded-full w-35 h-35 bg-teal-500 mx-auto mt-5 m-2">
        <h1 className="font-bold text-center text-2xl text-teal-900">Votre</h1>
        <h1 className="font-bold text-center text-2xl text-white">Logo</h1>
      </div>

      {/* Menu list */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
        {menu.map(({ id, icon: Icon, title }) => {
          const isActive = activePage === id;

          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex gap-2 text-xl items-center cursor-pointer w-full p-2 rounded-lg transition-all duration-150 group ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon />
              <span className="font-medium whitespace-nowrap flex-1 text-left">
                {title}
              </span>
              {isActive && (
                <BiChevronRight size={16} className="flex justify-end" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-2 space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">{currentUser.nom}</p>
          <p className="text-xs text-slate-400">
            {currentUser.role === "admin" ? "Administrateur" : "Caissier"}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-red-900/40 hover:text-red-400 cursor-pointer transition-all"
        >
          <BiLogOut size={20} className="shrink-0 rotate-180" />
          <span className="text-sm font-medium whitespace-nowrap">
            Déconnexion
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
