const reqbase = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const dbPath = path.join(__dirname, "dev.db");
const db = new reqbase(dbPath);
db.pragma("foreign_keys = ON");

// ==============================
//      CREATION DES TABLES
// ==============================
db.exec(`
  CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prix REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS unites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    identifiant TEXT NOT NULL COLLATE NOCASE UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    mot_de_passe_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'caissier')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS ventes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    utilisateur_id INTEGER,
    caissier TEXT NOT NULL,
    mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('especes', 'mobile_money')),
    total REAL NOT NULL,
    montant_recu REAL NOT NULL,
    monnaie_rendue REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS vente_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vente_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    nom_produit TEXT NOT NULL,
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire REAL NOT NULL,
    sous_total REAL NOT NULL,
    FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS commandes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    utilisateur_id INTEGER,
    caissier TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'payee', 'annulee')),
    vente_id INTEGER UNIQUE,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
    FOREIGN KEY (vente_id) REFERENCES ventes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS commande_lignes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    nom_produit TEXT NOT NULL,
    unite TEXT NOT NULL,
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire REAL NOT NULL,
    sous_total REAL NOT NULL,
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE
  );
`);

const productColumns = new Set(db.pragma("table_info(produits)").map(({ name }) => name));
for (const column of ["quantite", "unite"]) {
  if (productColumns.has(column)) {
    db.exec(`ALTER TABLE produits DROP COLUMN ${column}`);
  }
}

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => ({
  salt,
  hash: crypto.scryptSync(password, salt, 64).toString("hex"),
});

const validateUser = ({ nom, identifiant, motDePasse, role }, isNew = false) => {
  if (
    typeof nom !== "string" ||
    !nom.trim() ||
    typeof identifiant !== "string" ||
    !identifiant.trim()
  ) {
    throw new Error("Le nom et l’identifiant sont obligatoires.");
  }
  if (isNew && (typeof motDePasse !== "string" || motDePasse.length < 8)) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  if (
    motDePasse !== undefined &&
    motDePasse !== "" &&
    (typeof motDePasse !== "string" || motDePasse.length < 8)
  ) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  if (!["admin", "caissier"].includes(role)) {
    throw new Error("Le rôle sélectionné est invalide.");
  }
};

const getUserCount = () =>
  db.prepare("SELECT COUNT(*) AS count FROM utilisateurs").get().count;

const getUserById = (id) =>
  db
    .prepare("SELECT id, nom, identifiant, role, created_at FROM utilisateurs WHERE id = ?")
    .get(id);

const getUserForLogin = (identifiant) =>
  db.prepare("SELECT * FROM utilisateurs WHERE identifiant = ? COLLATE NOCASE").get(identifiant);

const getUsers = () =>
  db.prepare("SELECT id, nom, identifiant, role, created_at FROM utilisateurs ORDER BY nom COLLATE NOCASE").all();

const verifyPassword = (user, password) => {
  if (!user || typeof password !== "string") return false;
  const { hash } = hashPassword(password, user.mot_de_passe_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.mot_de_passe_hash, "hex"));
};

const addUser = ({ nom, identifiant, motDePasse, role }) => {
  validateUser({ nom, identifiant, motDePasse, role }, true);
  const { salt, hash } = hashPassword(motDePasse);
  const result = db
    .prepare(
      "INSERT INTO utilisateurs (nom, identifiant, mot_de_passe_hash, mot_de_passe_salt, role) VALUES (?, ?, ?, ?, ?)",
    )
    .run(nom.trim(), identifiant.trim(), hash, salt, role);
  return getUserById(result.lastInsertRowid);
};

const updateUser = ({ id, nom, identifiant, motDePasse, role }) => {
  validateUser({ nom, identifiant, motDePasse, role });
  if (motDePasse) {
    const { salt, hash } = hashPassword(motDePasse);
    db.prepare(
      "UPDATE utilisateurs SET nom = ?, identifiant = ?, mot_de_passe_hash = ?, mot_de_passe_salt = ?, role = ? WHERE id = ?",
    ).run(nom.trim(), identifiant.trim(), hash, salt, role, id);
  } else {
    db.prepare("UPDATE utilisateurs SET nom = ?, identifiant = ?, role = ? WHERE id = ?").run(
      nom.trim(),
      identifiant.trim(),
      role,
      id,
    );
  }
  return getUserById(id);
};

const deleteUser = (id) => db.prepare("DELETE FROM utilisateurs WHERE id = ?").run(id);
const getAdminCount = () =>
  db.prepare("SELECT COUNT(*) AS count FROM utilisateurs WHERE role = 'admin'").get().count;

// ====================
//      PRODUITS
// ====================
const getProduits = () => {
  const req = db.prepare("SELECT * FROM produits ORDER BY nom ASC");
  return req.all();
};

const validateProduit = ({ nom, prix }) => {
  const prixNombre = Number(prix);
  if (typeof nom !== "string" || !nom.trim()) {
    throw new Error("Le nom du produit est obligatoire.");
  }
  if (
    prix === "" ||
    prix === null ||
    prix === undefined ||
    !Number.isFinite(prixNombre) ||
    prixNombre < 0
  ) {
    throw new Error("Le prix doit être un nombre positif ou nul.");
  }
};

const getProduit = (id) => {
  const req = db.prepare("SELECT * FROM produits WHERE id = ?");
  return req.get(id);
};

const addProduit = (nom, prix) => {
  validateProduit({ nom, prix });
  const req = db.prepare(
    "INSERT INTO produits (nom, prix) VALUES (?, ?)",
  );
  return req.run(nom.trim(), Number(prix));
};

const updateProduit = (id, nom, prix) => {
  validateProduit({ nom, prix });
  const req = db.prepare(
    "UPDATE produits SET nom = ?, prix = ? WHERE id = ?",
  );
  return req.run(nom.trim(), Number(prix), id);
};

const deleteProduit = (id) => {
  const req = db.prepare("DELETE FROM produits WHERE id = ?");
  return req.run(id);
};

// ====================
//      VENTES
// ====================
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const aggregateCommandeItems = (items) => {
  if (!Array.isArray(items)) {
    throw new Error("Les articles de la commande sont invalides.");
  }
  const quantites = new Map();
  for (const item of items) {
    const produitId = Number(item?.produitId);
    const quantite = Number(item?.quantite);
    if (!Number.isSafeInteger(produitId) || produitId <= 0) {
      throw new Error("Un produit de la commande est invalide.");
    }
    if (!Number.isSafeInteger(quantite) || quantite <= 0) {
      throw new Error("Les quantités doivent être des nombres entiers positifs.");
    }
    const total = (quantites.get(produitId) || 0) + quantite;
    if (!Number.isSafeInteger(total)) {
      throw new Error("La quantité demandée est trop élevée.");
    }
    quantites.set(produitId, total);
  }
  return quantites;
};

const getCommande = (id) => {
  const commande = db
    .prepare(
      `SELECT commandes.id, commandes.reference, commandes.utilisateur_id,
              commandes.caissier, commandes.statut, commandes.vente_id,
              commandes.total, commandes.created_at, commandes.updated_at,
              COALESCE(utilisateurs.nom, commandes.caissier) AS nom_caissier
       FROM commandes
       LEFT JOIN utilisateurs ON utilisateurs.id = commandes.utilisateur_id
       WHERE commandes.id = ?`,
    )
    .get(id);
  if (!commande) return null;

  const items = db
    .prepare(
      `SELECT produit_id, nom_produit, unite, quantite, prix_unitaire, sous_total
       FROM commande_lignes WHERE commande_id = ? ORDER BY id`,
    )
    .all(id);
  return { ...commande, items };
};

const getCommandesEnAttente = () =>
  db
    .prepare(
      `SELECT commandes.id, commandes.reference, commandes.caissier,
              COALESCE(utilisateurs.nom, commandes.caissier) AS nom_caissier,
              commandes.total, commandes.created_at, commandes.updated_at,
              (SELECT COUNT(*) FROM commande_lignes
               WHERE commande_id = commandes.id) AS nombre_lignes
       FROM commandes
       LEFT JOIN utilisateurs ON utilisateurs.id = commandes.utilisateur_id
       WHERE commandes.statut = 'en_attente'
       ORDER BY commandes.updated_at DESC, commandes.id DESC`,
    )
    .all();

const createCommande = ({ items }, utilisateurId) => {
  const quantites = aggregateCommandeItems(items);
  if (quantites.size === 0) {
    throw new Error("Ajoutez au moins un produit à la commande.");
  }

  const transaction = db.transaction(() => {
    const caissier = db.prepare("SELECT nom FROM utilisateurs WHERE id = ?").get(utilisateurId);
    if (!caissier) throw new Error("Le compte caissier est introuvable.");

    const lignes = [];
    let total = 0;
    for (const [produitId, quantite] of quantites) {
      const produit = db.prepare("SELECT * FROM produits WHERE id = ?").get(produitId);
      if (!produit) throw new Error("Un produit de la commande n’existe plus.");

      const sousTotal = roundMoney(Number(produit.prix) * quantite);
      total = roundMoney(total + sousTotal);
      lignes.push({ produit, quantite, sousTotal });
    }

    const reference = `TKT-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const result = db
      .prepare(
        `INSERT INTO commandes (reference, utilisateur_id, caissier, total)
         VALUES (?, ?, ?, ?)`,
      )
      .run(reference, utilisateurId, caissier.nom, total);
    const insertItem = db.prepare(
      `INSERT INTO commande_lignes
        (commande_id, produit_id, nom_produit, unite, quantite, prix_unitaire, sous_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const { produit, quantite, sousTotal } of lignes) {
      insertItem.run(
        result.lastInsertRowid,
        produit.id,
        produit.nom,
        "",
        quantite,
        produit.prix,
        sousTotal,
      );
    }
    return getCommande(result.lastInsertRowid);
  });
  return transaction();
};

const updateCommande = ({ id, items }) => {
  const quantites = aggregateCommandeItems(items);
  const transaction = db.transaction(() => {
    const commande = db.prepare("SELECT * FROM commandes WHERE id = ?").get(id);
    if (!commande || commande.statut !== "en_attente") {
      throw new Error("Cette commande n’est plus en attente.");
    }

    const anciennesLignes = db
      .prepare("SELECT * FROM commande_lignes WHERE commande_id = ?")
      .all(id);
    const anciennesParProduit = new Map(
      anciennesLignes.map((ligne) => [ligne.produit_id, ligne]),
    );
    const nouvellesLignes = [];
    let total = 0;

    for (const [produitId, quantite] of quantites) {
      const produit = db.prepare("SELECT * FROM produits WHERE id = ?").get(produitId);
      const ancienneLigne = anciennesParProduit.get(produitId);
      if (!produit && !ancienneLigne) {
        throw new Error("Un produit de la commande n’existe plus.");
      }

      const nom = ancienneLigne?.nom_produit || produit.nom;
      const unite = ancienneLigne?.unite ?? "";
      const prix = Number(ancienneLigne?.prix_unitaire ?? produit.prix);
      const sousTotal = roundMoney(prix * quantite);
      total = roundMoney(total + sousTotal);
      nouvellesLignes.push({ produitId, nom, unite, quantite, prix, sousTotal });
    }

    db.prepare("DELETE FROM commande_lignes WHERE commande_id = ?").run(id);
    const insertItem = db.prepare(
      `INSERT INTO commande_lignes
        (commande_id, produit_id, nom_produit, unite, quantite, prix_unitaire, sous_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const ligne of nouvellesLignes) {
      insertItem.run(
        id,
        ligne.produitId,
        ligne.nom,
        ligne.unite,
        ligne.quantite,
        ligne.prix,
        ligne.sousTotal,
      );
    }
    db.prepare(
      "UPDATE commandes SET total = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    ).run(total, id);
    return getCommande(id);
  });
  return transaction();
};

const cancelCommande = (id) => {
  const result = db
    .prepare(
      `UPDATE commandes
       SET statut = 'annulee', updated_at = datetime('now', 'localtime')
       WHERE id = ? AND statut = 'en_attente'`,
    )
    .run(id);
  if (result.changes !== 1) {
    throw new Error("Cette commande n’est plus en attente.");
  }
  return result;
};

const getVente = (id) => {
  const vente = db
    .prepare(
      `SELECT ventes.id, ventes.reference, ventes.utilisateur_id,
              ventes.mode_paiement, ventes.total, ventes.montant_recu,
              ventes.monnaie_rendue, ventes.created_at,
              COALESCE(utilisateurs.nom, ventes.caissier) AS caissier
       FROM ventes
       LEFT JOIN utilisateurs ON utilisateurs.id = ventes.utilisateur_id
       WHERE ventes.id = ?`,
    )
    .get(id);
  if (!vente) return null;

  const lignes = db
    .prepare(
      `SELECT produit_id, nom_produit, quantite, prix_unitaire, sous_total
       FROM vente_lignes WHERE vente_id = ? ORDER BY id`,
    )
    .all(id);
  return { ...vente, items: lignes };
};

const getVentes = () =>
  db
    .prepare(
      `SELECT ventes.id, ventes.reference, ventes.mode_paiement, ventes.total,
              ventes.montant_recu, ventes.monnaie_rendue, ventes.created_at,
              COALESCE(utilisateurs.nom, ventes.caissier) AS caissier,
              (SELECT COUNT(*) FROM vente_lignes WHERE vente_id = ventes.id) AS nombre_lignes
       FROM ventes
       LEFT JOIN utilisateurs ON utilisateurs.id = ventes.utilisateur_id
       ORDER BY ventes.id DESC
       LIMIT 100`,
    )
    .all();

const encaisserCommande = (
  id,
  { modePaiement, montantRecu, mobileMoneyConfirme },
  utilisateurId,
) => {
  if (!["especes", "mobile_money"].includes(modePaiement)) {
    throw new Error("Le mode de paiement est invalide.");
  }
  if (modePaiement === "mobile_money" && mobileMoneyConfirme !== true) {
    throw new Error("Confirmez la réception du paiement Mobile Money.");
  }

  const transaction = db.transaction(() => {
    const commande = db.prepare("SELECT * FROM commandes WHERE id = ?").get(id);
    if (!commande || commande.statut !== "en_attente") {
      throw new Error("Cette commande n’est plus en attente.");
    }
    const lignes = db
      .prepare("SELECT * FROM commande_lignes WHERE commande_id = ? ORDER BY id")
      .all(id);
    if (lignes.length === 0) {
      throw new Error("Ajoutez au moins un produit à la commande.");
    }

    const total = roundMoney(
      lignes.reduce((sum, ligne) => sum + Number(ligne.sous_total), 0),
    );

    const recu =
      modePaiement === "especes"
        ? Number(montantRecu)
        : total;
    if (!Number.isFinite(recu) || recu < total) {
      throw new Error("Le montant reçu est inférieur au total à payer.");
    }

    const caissier = db.prepare("SELECT nom FROM utilisateurs WHERE id = ?").get(utilisateurId);
    if (!caissier) throw new Error("Le compte caissier est introuvable.");

    const reference = `FAC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const monnaieRendue = roundMoney(recu - total);
    const result = db
      .prepare(
        `INSERT INTO ventes
          (reference, utilisateur_id, caissier, mode_paiement, total, montant_recu, monnaie_rendue)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(reference, utilisateurId, caissier.nom, modePaiement, total, recu, monnaieRendue);

    const insertVenteLigne = db.prepare(
      `INSERT INTO vente_lignes
        (vente_id, produit_id, nom_produit, quantite, prix_unitaire, sous_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const ligne of lignes) {
      insertVenteLigne.run(
        result.lastInsertRowid,
        ligne.produit_id,
        ligne.nom_produit,
        ligne.quantite,
        ligne.prix_unitaire,
        ligne.sous_total,
      );
    }

    db.prepare(
      `UPDATE commandes
       SET statut = 'payee', vente_id = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`,
    ).run(result.lastInsertRowid, id);
    return getVente(result.lastInsertRowid);
  });

  return transaction();
};

// ====================
//      UNITES
// ====================
const getUnites = () => {
  const req = db.prepare("SELECT * FROM unites");
  return req.all();
};

const getUnite = (id) => {
  const req = db.prepare("SELECT * FROM unites WHERE id = ?");
  return req.get(id);
};

const addUnite = (label, value) => {
  const req = db.prepare("INSERT INTO unites (label, value) VALUES (?, ?)");
  return req.run(label, value);
};

const updateUnite = (id, label, value) => {
  const req = db.prepare("UPDATE unites SET label = ?, value = ? WHERE id = ?");
  return req.run(label, value, id);
};

const deleteUnite = (id) => {
  const req = db.prepare("DELETE FROM unites WHERE id = ?");
  return req.run(id);
};

module.exports = {
  // UTILISATEURS
  getUserCount,
  getUserById,
  getUserForLogin,
  getUsers,
  verifyPassword,
  addUser,
  updateUser,
  deleteUser,
  getAdminCount,

  // PRODUITS
  getProduits,
  getProduit,
  addProduit,
  updateProduit,
  deleteProduit,

  // COMMANDES
  getCommandesEnAttente,
  getCommande,
  createCommande,
  updateCommande,
  cancelCommande,
  encaisserCommande,

  // VENTES
  getVentes,
  getVente,

  // UNITES
  getUnites,
  getUnite,
  addUnite,
  updateUnite,
  deleteUnite,
};
