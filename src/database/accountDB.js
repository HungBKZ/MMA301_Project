import { db } from "./connection";
import * as Crypto from "expo-crypto";

// Initialize account table
export const initAccountsTable = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        name TEXT,
        avatar_uri TEXT,
        role TEXT DEFAULT 'User',
        oauth_provider TEXT,
        oauth_id TEXT,
        oauth_profile TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);
    console.log("✅ account table initialized");
    return true;
  } catch (error) {
    console.error("❌ Error initAccountsTable:", error);
    return false;
  }
};

export const migrateAccountTable = () => {
  try {
    const info = db.getAllSync("PRAGMA table_info(account)");
    const columns = info.map(col => col.name);

    if (!columns.includes("phone")) {
      db.execSync("ALTER TABLE account ADD COLUMN phone TEXT");
      console.log("✅ Added phone column to account");
    }
    if (!columns.includes("date_of_birth")) {
      db.execSync("ALTER TABLE account ADD COLUMN date_of_birth TEXT");
      console.log("✅ Added date_of_birth column to account");
    }
    if (!columns.includes("gender")) {
      db.execSync("ALTER TABLE account ADD COLUMN gender TEXT");
      console.log("✅ Added gender column to account");
    }
  } catch (e) {
    console.error("❌ Error migrating account table:", e);
  }
};

// helper: MD5 hash (async)
const md5Hash = async (value) => {
  if (value === null || value === undefined) return null;
  try {
    return await Crypto.digestStringAsync("MD5", String(value));
  } catch (e) {
    console.error("❌ Error computing MD5:", e);
    return null;
  }
};

// --- CRUD + Auth helpers ---

// add user (hashes password with MD5)
export const addUser = async (email, password, name = null, avatar_uri = null, role = "User", phone = null, date_of_birth = null, gender = null) => {
  try {
    const hashed = password ? await md5Hash(password) : null;
    const res = db.runSync(
      "INSERT INTO account (email, password, name, avatar_uri, role, phone, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [email, hashed, name, avatar_uri, role, phone, date_of_birth, gender]
    );
    return { success: true, id: res.lastInsertRowId };
  } catch (error) {
    console.error("❌ Error addUser:", error);
    return { success: false, error };
  }
};

// get user (sync)
export const getUserByEmail = (email) => {
  try {
    const user = db.getFirstSync("SELECT * FROM account WHERE email = ?", [email]);
    return user || null;
  } catch (error) {
    console.error("❌ Error getUserByEmail:", error);
    return null;
  }
};

export const getUserById = (id) => {
  try {
    const user = db.getFirstSync("SELECT * FROM account WHERE id = ?", [id]);
    return user || null;
  } catch (error) {
    console.error("❌ Error getUserById:", error);
    return null;
  }
};

// authenticate: hash incoming password and compare
export const authenticate = async (email, password) => {
  try {
    const user = getUserByEmail(email);
    if (!user) return { success: false, error: "NO_USER" };
    const hashed = await md5Hash(password || "");
    if (hashed !== user.password) return { success: false, error: "INVALID_CREDENTIALS" };
    return { success: true, user };
  } catch (error) {
    console.error("❌ Error authenticate:", error);
    return { success: false, error };
  }
};

// update profile (sync)
export const updateUserProfile = (id, { name, avatar_uri, email, phone, date_of_birth, gender }) => {
  try {
    db.runSync(
      "UPDATE account SET name = COALESCE(?, name), avatar_uri = COALESCE(?, avatar_uri), email = COALESCE(?, email), phone = COALESCE(?, phone), date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender) WHERE id = ?",
      [name, avatar_uri, email, phone, date_of_birth, gender, id]
    );
    return true;
  } catch (error) {
    console.error("❌ Error updateUserProfile:", error);
    return false;
  }
};

// change password (hashes new password)
export const updateUserPassword = async (id, newPassword) => {
  try {
    const hashed = await md5Hash(newPassword);
    db.runSync("UPDATE account SET password = ? WHERE id = ?", [hashed, id]);
    return true;
  } catch (error) {
    console.error("❌ Error updateUserPassword:", error);
    return false;
  }
};

// upsert OAuth user (no password)
export const upsertOAuthUser = (provider, oauthId, email, name = null, avatarUri = null) => {
  try {
    const existing = db.getFirstSync(
      "SELECT * FROM account WHERE oauth_provider = ? AND oauth_id = ?",
      [provider, oauthId]
    );
    if (existing) {
      db.runSync(
        "UPDATE account SET name = COALESCE(?, name), avatar_uri = COALESCE(?, avatar_uri) WHERE id = ?",
        [name, avatarUri, existing.id]
      );
      return { success: true, id: existing.id, created: false };
    }
    const res = db.runSync(
      "INSERT INTO account (email, password, name, avatar_uri, role, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [email, null, name, avatarUri, "User", provider, oauthId]
    );
    return { success: true, id: res.lastInsertRowId, created: true };
  } catch (error) {
    console.error("❌ Error upsertOAuthUser:", error);
    return { success: false, error };
  }
};

export const seedAdminAccount = async () => {
  const adminEmail = "admin@gmail.com";
  const admin = getUserByEmail(adminEmail);
  if (!admin) {
    const res = await addUser(
      adminEmail,
      "admin123",
      "Super Admin",
      null,
      "admin",
      "0123456789",           // phone
      "1990-01-01",           // date_of_birth
      "male"                  // gender
    );
    if (res.success) {
      console.log("✅ Admin account seeded: admin@gmail.com / admin123");
    } else {
      console.error("❌ Error seeding admin:", res.error);
    }
  }
};
