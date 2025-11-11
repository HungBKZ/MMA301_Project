import * as SQLite from "expo-sqlite";

// Single source of truth for DB connection to avoid circular imports
export const db = SQLite.openDatabaseSync("moviesApp.db");

export default db;
