const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getAuthState: () => ipcRenderer.invoke("get-auth-state"),
  setupAdmin: (user) => ipcRenderer.invoke("setup-admin", user),
  login: (credentials) => ipcRenderer.invoke("login", credentials),
  logout: () => ipcRenderer.invoke("logout"),

  getUtilisateurs: () => ipcRenderer.invoke("get-utilisateurs"),
  addUtilisateur: (user) => ipcRenderer.invoke("add-utilisateur", user),
  updateUtilisateur: (user) => ipcRenderer.invoke("update-utilisateur", user),
  deleteUtilisateur: (id) => ipcRenderer.invoke("delete-utilisateur", id),

  getProduits: () => ipcRenderer.invoke("get-produits"),
  getProduit: (id) => ipcRenderer.invoke("get-produit", id),
  addProduit: (produit) => ipcRenderer.invoke("add-produit", produit),
  updateProduit: (produit) => ipcRenderer.invoke("update-produit", produit),
  deleteProduit: (id) => ipcRenderer.invoke("delete-produit", id),

  getVentes: () => ipcRenderer.invoke("get-ventes"),
  getVente: (id) => ipcRenderer.invoke("get-vente", id),
  getCommandesEnAttente: () => ipcRenderer.invoke("get-commandes-en-attente"),
  getCommande: (id) => ipcRenderer.invoke("get-commande", id),
  createCommande: (commande) => ipcRenderer.invoke("create-commande", commande),
  updateCommande: (commande) => ipcRenderer.invoke("update-commande", commande),
  cancelCommande: (id) => ipcRenderer.invoke("cancel-commande", id),
  encaisserCommande: (id, paiement) =>
    ipcRenderer.invoke("encaisser-commande", { id, paiement }),

  getUnites: () => ipcRenderer.invoke("get-unites"),
  getUnite: (id) => ipcRenderer.invoke("get-unite", id),
  addUnite: (unite) => ipcRenderer.invoke("add-unite", unite),
  updateUnite: (unite) => ipcRenderer.invoke("update-unite", unite),
  deleteUnite: (id) => ipcRenderer.invoke("delete-unite", id),

  printInvoice: (data) => ipcRenderer.invoke("print-invoice", data),
});
