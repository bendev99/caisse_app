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

  getUnites: () => ipcRenderer.invoke("get-unites"),
  getUnite: (id) => ipcRenderer.invoke("get-unite", id),
  addUnite: (unite) => ipcRenderer.invoke("add-unite", unite),
  updateUnite: (unite) => ipcRenderer.invoke("update-unite", unite),
  deleteUnite: (id) => ipcRenderer.invoke("delete-unite", id),

  printInvoice: (data) => ipcRenderer.invoke("print-invoice", data),
});
