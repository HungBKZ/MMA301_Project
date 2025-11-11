import { db } from "./connection";

// Initialize rooms table (SQLite compatible)
export const initRoomsTable = () => {
	try {
		db.execSync(`
			CREATE TABLE IF NOT EXISTS rooms (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				cinema_id INTEGER NOT NULL,
				code TEXT NOT NULL UNIQUE,
				name TEXT NOT NULL,
				is_active INTEGER NOT NULL DEFAULT 1,
				created_at DATETIME DEFAULT (datetime('now')),
				updated_at DATETIME DEFAULT (datetime('now')),
				FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON UPDATE CASCADE ON DELETE RESTRICT
			);
		`);
		console.log("✅ rooms table initialized");
		return true;
	} catch (error) {
		console.error("❌ Error initRoomsTable:", error);
		return false;
	}
};

// CRUD functions for rooms
export const getAllRooms = () => {
	try {
		const rows = db.getAllSync("SELECT * FROM rooms ORDER BY id DESC");
		return rows;
	} catch (error) {
		console.error("❌ Error getAllRooms:", error);
		return [];
	}
};

export const getRoomById = (id) => {
	try {
		const row = db.getFirstSync("SELECT * FROM rooms WHERE id = ?", [id]);
		return row || null;
	} catch (error) {
		console.error("❌ Error getRoomById:", error);
		return null;
	}
};

export const getRoomsByCinemaId = (cinemaId) => {
	try {
		const rows = db.getAllSync("SELECT * FROM rooms WHERE cinema_id = ? ORDER BY id", [cinemaId]);
		return rows;
	} catch (error) {
		console.error("❌ Error getRoomsByCinemaId:", error);
		return [];
	}
};

export const addRoom = (cinemaId, code, name, isActive = 1) => {
	try {
		const res = db.runSync(
			"INSERT INTO rooms (cinema_id, code, name, is_active) VALUES (?, ?, ?, ?)",
			[cinemaId, code, name, isActive]
		);
		console.log("✅ Room added with ID:", res.lastInsertRowId);
		return { success: true, id: res.lastInsertRowId };
	} catch (error) {
		console.error("❌ Error addRoom:", error);
		return { success: false, error };
	}
};

export const updateRoom = (id, { cinema_id, code, name, is_active }) => {
	try {
		const res = db.runSync(
			"UPDATE rooms SET cinema_id = ?, code = ?, name = ?, is_active = ?, updated_at = (datetime('now')) WHERE id = ?",
			[cinema_id, code, name, is_active, id]
		);
		console.log("✅ Room updated, rows affected:", res.changes);
		return { success: true, changes: res.changes };
	} catch (error) {
		console.error("❌ Error updateRoom:", error);
		return { success: false, error };
	}
};

export const deleteRoom = (id) => {
	try {
		const res = db.runSync("DELETE FROM rooms WHERE id = ?", [id]);
		console.log("✅ Room deleted, rows affected:", res.changes);
		return { success: true, changes: res.changes };
	} catch (error) {
		console.error("❌ Error deleteRoom:", error);
		return { success: false, error };
	}
};

// Optional helper: seed a small set of rooms if needed (no-op on conflict)
export const seedRooms = (rooms = []) => {
	try {
		db.execSync("BEGIN TRANSACTION;");
		rooms.forEach((r) => {
			try {
				db.runSync(
					"INSERT OR IGNORE INTO rooms (id, cinema_id, code, name, is_active) VALUES (?, ?, ?, ?, ?)",
					[r.id || null, r.cinema_id, r.code, r.name, r.is_active ?? 1]
				);
			} catch (e) {
				// ignore individual insert errors
			}
		});
		db.execSync("COMMIT;");
		return true;
	} catch (error) {
		try { db.execSync("ROLLBACK;"); } catch (e) {}
		console.error("❌ Error seedRooms:", error);
		return false;
	}
};

// Default sample rooms (from your SQL sample)
export const defaultRooms = [
	{ id: 1, cinema_id: 1, code: 'C1-ROOM1', name: 'Cinema 1 - Room 1', is_active: 1 },
	{ id: 2, cinema_id: 1, code: 'C1-ROOM2', name: 'Cinema 1 - Room 2', is_active: 1 },
	{ id: 3, cinema_id: 2, code: 'C2-ROOM1', name: 'Cinema 2 - Room 1', is_active: 1 },
	{ id: 4, cinema_id: 2, code: 'C2-ROOM2', name: 'Cinema 2 - Room 2', is_active: 1 },
	{ id: 5, cinema_id: 3, code: 'C3-ROOM1', name: 'Cinema 3 - Room 1', is_active: 1 },
	{ id: 6, cinema_id: 3, code: 'C3-ROOM2', name: 'Cinema 3 - Room 2', is_active: 1 }
];

// Convenience: seed the default sample rooms into the table
export const seedDefaultRooms = () => {
	try {
		return seedRooms(defaultRooms);
	} catch (error) {
		console.error('❌ Error seedDefaultRooms:', error);
		return false;
	}
};

