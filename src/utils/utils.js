import {
  AiOutlineHome,
  AiOutlineHistory,
  AiOutlineSetting,
} from "react-icons/ai";

const MENU = [
  { id: "home", icon: AiOutlineHome, title: "Accueil" },
  { id: "history", icon: AiOutlineHistory, title: "Historique" },
  { id: "settings", icon: AiOutlineSetting, title: "Paramètres" },
];

const ProduitStatut = ({ p }) => {
  if (p.length > 2) {
    return "Disponible";
  }

  if (p.length <= 2) {
    return "Attention";
  }

  if (p.length <= 1) {
    return "Critique";
  }
  if (p.length === 0) {
    return "Rupture";
  }
};

export { MENU };
