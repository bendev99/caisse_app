const { ipcMain } = require("electron");
const database = require("../db/database");

let activeUserId = null;

const registerHandlers = () => {
  const getActiveUser = () => {
    const user = activeUserId && database.getUserById(activeUserId);
    if (!user) {
      activeUserId = null;
      throw new Error("Veuillez vous connecter pour continuer.");
    }
    return user;
  };

  const requireAdmin = () => {
    const user = getActiveUser();
    if (user.role !== "admin") {
      throw new Error("Cette action est réservée à l’administrateur.");
    }
    return user;
  };

  // ====================
  //      AUTHENTIFICATION
  // ====================
  ipcMain.handle("get-auth-state", () => ({
    setupRequired: database.getUserCount() === 0,
    currentUser: activeUserId ? database.getUserById(activeUserId) || null : null,
  }));

  ipcMain.handle("setup-admin", (event, user) => {
    if (database.getUserCount() > 0) {
      throw new Error("Le compte administrateur initial a déjà été créé.");
    }
    const createdUser = database.addUser({ ...user, role: "admin" });
    activeUserId = createdUser.id;
    return createdUser;
  });

  ipcMain.handle("login", (event, { identifiant, motDePasse }) => {
    const user = database.getUserForLogin(identifiant);
    if (!database.verifyPassword(user, motDePasse)) {
      throw new Error("Identifiant ou mot de passe incorrect.");
    }
    activeUserId = user.id;
    return database.getUserById(user.id);
  });

  ipcMain.handle("logout", () => {
    activeUserId = null;
  });

  // ====================
  //      UTILISATEURS
  // ====================
  ipcMain.handle("get-utilisateurs", () => {
    requireAdmin();
    return database.getUsers();
  });

  ipcMain.handle("add-utilisateur", (event, user) => {
    requireAdmin();
    return database.addUser(user);
  });

  ipcMain.handle("update-utilisateur", (event, user) => {
    const currentUser = requireAdmin();
    if (Number(user.id) === currentUser.id && user.role !== "admin") {
      throw new Error("Vous ne pouvez pas retirer votre propre rôle administrateur.");
    }
    const targetUser = database.getUserById(user.id);
    if (targetUser?.role === "admin" && user.role !== "admin" && database.getAdminCount() <= 1) {
      throw new Error("Impossible de retirer le dernier administrateur.");
    }
    return database.updateUser(user);
  });

  ipcMain.handle("delete-utilisateur", (event, id) => {
    const currentUser = requireAdmin();
    const targetUser = database.getUserById(id);
    if (Number(id) === currentUser.id) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    }
    if (targetUser?.role === "admin" && database.getAdminCount() <= 1) {
      throw new Error("Impossible de supprimer le dernier administrateur.");
    }
    return database.deleteUser(id);
  });

  // ====================
  //      PRODUITS
  // ====================
  ipcMain.handle("get-produits", () => {
    getActiveUser();
    return database.getProduits();
  });

  ipcMain.handle("get-produit", (event, id) => {
    getActiveUser();
    return database.getProduit(id);
  });

  ipcMain.handle("add-produit", (event, produit) => {
    requireAdmin();
    const { nom, prix } = produit;
    database.addProduit(nom, prix);
  });

  ipcMain.handle("update-produit", (event, produit) => {
    requireAdmin();
    const { id, nom, prix } = produit;
    database.updateProduit(id, nom, prix);
  });

  ipcMain.handle("delete-produit", (event, id) => {
    requireAdmin();
    return database.deleteProduit(id);
  });

  // ====================
  //      VENTES
  // ====================
  ipcMain.handle("get-ventes", () => {
    getActiveUser();
    return database.getVentes();
  });

  ipcMain.handle("get-vente", (event, id) => {
    getActiveUser();
    const vente = database.getVente(id);
    if (!vente) throw new Error("Cette facture est introuvable.");
    return vente;
  });

  ipcMain.handle("get-commandes-en-attente", () => {
    getActiveUser();
    return database.getCommandesEnAttente();
  });

  ipcMain.handle("get-commande", (event, id) => {
    getActiveUser();
    const commande = database.getCommande(id);
    if (!commande || commande.statut !== "en_attente") {
      throw new Error("Cette commande n’est plus en attente.");
    }
    return commande;
  });

  ipcMain.handle("create-commande", (event, commande) => {
    const currentUser = getActiveUser();
    return database.createCommande(commande, currentUser.id);
  });

  ipcMain.handle("update-commande", (event, commande) => {
    getActiveUser();
    return database.updateCommande(commande);
  });

  ipcMain.handle("cancel-commande", (event, id) => {
    getActiveUser();
    return database.cancelCommande(id);
  });

  ipcMain.handle("encaisser-commande", (event, { id, paiement }) => {
    const currentUser = getActiveUser();
    return database.encaisserCommande(id, paiement, currentUser.id);
  });

  // ====================
  //      UNITES
  // ====================
  ipcMain.handle("get-unites", () => {
    getActiveUser();
    return database.getUnites();
  });

  ipcMain.handle("get-unite", (event, id) => {
    getActiveUser();
    return database.getUnite(id);
  });

  ipcMain.handle("add-unite", (event, unite) => {
    requireAdmin();
    const { label, value } = unite;
    database.addUnite(label, value);
  });

  ipcMain.handle("update-unite", (event, unite) => {
    requireAdmin();
    const { id, label, value } = unite;
    database.updateUnite(id, label, value);
  });

  ipcMain.handle("delete-unite", (event, id) => {
    requireAdmin();
    return database.deleteUnite(id);
  });

  // ====================
  //      IMPRESSION
  // ====================
  ipcMain.handle("print-invoice", async (event, invoiceData) => {
    getActiveUser();
    try {
      const escpos = require("escpos");
      escpos.USB = require("escpos-usb");

      const device = new escpos.USB();
      const printer = new escpos.Printer(device);
      const formatMoney = (value) =>
        Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

      // Ouverture USB
      await new Promise((resolve, reject) => {
        device.open((err) => (err ? reject(err) : resolve()));
      });

      console.log("✅ Connexion USB établie");

      // === Construction du ticket avec méthodes VALIDES ===

      // En-tête centré
      printer
        .align("ct")
        .font("a")
        .text(invoiceData.storeName || "MON MAGASIN")
        .text(`Ticket: ${invoiceData.ticketId || "N/A"}`)
        .text(`Date: ${new Date().toLocaleString()}`)
        .text(`Caissier: ${invoiceData.cashierName || "Inconnu"}`)
        .text(`Paiement: ${invoiceData.paymentMethod || "N/A"}`)
        .text("--------------------------------") // Séparateur manuel
        .control("LF") // Saut de ligne
        .align("lt")
        .font("b");

      // Articles (alignés à gauche)
      invoiceData.items?.forEach((item) => {
        const name = String(item.name).substring(0, 20).padEnd(20, " ");
        const qty = String(item.qty).padStart(3, " ");
        const total = (item.qty * item.price).toFixed(2).padStart(8, " ");
        printer.text(`${name} ${qty} ${total}`).control("LF");
      });

      // Total & pied de page
      printer
        .text("--------------------------------")
        .control("LF")
        .align("rt")
        .font("a")
        .size(1, 1)
        .text(`TOTAL: ${formatMoney(invoiceData.total)} Ar`)
        .size(0, 0)
        .control("LF");

      if (invoiceData.paymentMethod === "Espèces") {
        printer
          .align("rt")
          .text(`Reçu: ${formatMoney(invoiceData.amountPaid)} Ar`)
          .text(`Rendu: ${formatMoney(invoiceData.change)} Ar`)
          .control("LF");
      }

      printer
        .align("ct")
        .text("Merci de votre visite !")
        .control("LF")
        .control("LF") // Double saut avant coupe
        .cut() // Coupe le papier (flush le buffer)
        .close(); // Ferme la connexion USB

      return { success: true };
    } catch (err) {
      console.error("❌ Erreur impression:", err);
      return {
        success: false,
        error: err.message || "Échec de l'impression",
      };
    }
  });
};

module.exports = { registerHandlers };
