const reqbase = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");

const dbPath = path.join(__dirname, "dev.db");
const db = new reqbase(dbPath);

// ==============================
//      CREATION DES TABLES
// ==============================
db.exec(`
  CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    quantite INTEGER NOT NULL DEFAULT 0,
    prix REAL NOT NULL,
    unite TEXT NOT NULL DEFAULT 'pcs',
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
`);

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

const getProduit = (id) => {
  const req = db.prepare("SELECT * FROM produits WHERE id = ?");
  return req.get(id);
};

const addProduit = (nom, quantite, prix, unite = "pcs") => {
  const req = db.prepare(
    "INSERT INTO produits (nom, quantite, prix, unite) VALUES (?, ?, ?, ?)",
  );
  return req.run(nom, quantite, prix, unite);
};

const updateProduit = (id, nom, quantite, prix, unite) => {
  const req = db.prepare(
    "UPDATE produits SET nom = ?, quantite = ?, prix = ?, unite = ? WHERE id = ?",
  );
  return req.run(nom, quantite, prix, unite, id);
};

const deleteProduit = (id) => {
  const req = db.prepare("DELETE FROM produits WHERE id = ?");
  return req.run(id);
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

  // UNITES
  getUnites,
  getUnite,
  addUnite,
  updateUnite,
  deleteUnite,
};
