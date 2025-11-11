import { db } from "./db";

// Initialize seats table
export const initSeatsTable = () => {
	try {
		db.execSync(`
			CREATE TABLE IF NOT EXISTS seats (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				room_id INTEGER NOT NULL,
				row_label TEXT NOT NULL,
				seat_number INTEGER NOT NULL,
				seat_type TEXT NOT NULL DEFAULT 'STANDARD',
				is_active INTEGER NOT NULL DEFAULT 1,
				UNIQUE(room_id, row_label, seat_number),
				FOREIGN KEY(room_id) REFERENCES rooms(id)
			);
		`);
		console.log("✅ seats table initialized");
		return true;
	} catch (error) {
		console.error("❌ Error initSeatsTable:", error);
		return false;
	}
};

// CRUD functions for seats
export const getAllSeats = () => {
	try {
		return db.getAllSync("SELECT * FROM seats ORDER BY id DESC");
	} catch (error) {
		console.error("❌ Error getAllSeats:", error);
		return [];
	}
};

export const getSeatById = (id) => {
	try {
		return db.getFirstSync("SELECT * FROM seats WHERE id = ?", [id]) || null;
	} catch (error) {
		console.error("❌ Error getSeatById:", error);
		return null;
	}
};

export const getSeatsByRoom = (roomId) => {
	try {
		return db.getAllSync("SELECT * FROM seats WHERE room_id = ? ORDER BY row_label, seat_number", [roomId]);
	} catch (error) {
		console.error("❌ Error getSeatsByRoom:", error);
		return [];
	}
};

export const addSeat = (roomId, rowLabel, seatNumber, seatType = 'STANDARD', isActive = 1) => {
	try {
		const res = db.runSync(
			"INSERT INTO seats (room_id, row_label, seat_number, seat_type, is_active) VALUES (?, ?, ?, ?, ?)",
			[roomId, rowLabel, seatNumber, seatType, isActive]
		);
		return { success: true, id: res.lastInsertRowId };
	} catch (error) {
		console.error("❌ Error addSeat:", error);
		return { success: false, error };
	}
};

export const updateSeat = (id, { room_id, row_label, seat_number, seat_type, is_active }) => {
	try {
		const res = db.runSync(
			"UPDATE seats SET room_id = ?, row_label = ?, seat_number = ?, seat_type = ?, is_active = ? WHERE id = ?",
			[room_id, row_label, seat_number, seat_type, is_active, id]
		);
		return { success: true, changes: res.changes };
	} catch (error) {
		console.error("❌ Error updateSeat:", error);
		return { success: false, error };
	}
};

export const deleteSeat = (id) => {
	try {
		const res = db.runSync("DELETE FROM seats WHERE id = ?", [id]);
		return { success: true, changes: res.changes };
	} catch (error) {
		console.error("❌ Error deleteSeat:", error);
		return { success: false, error };
	}
};

// Seed helper (optional) - inserts array of seats using INSERT OR IGNORE
export const seedSeats = (seats = []) => {
	try {
		db.execSync("BEGIN TRANSACTION;");
		seats.forEach((s) => {
			try {
				db.runSync(
					"INSERT OR IGNORE INTO seats (id, room_id, row_label, seat_number, seat_type, is_active) VALUES (?, ?, ?, ?, ?, ?)",
					[s.id || null, s.room_id, s.row_label, s.seat_number, s.seat_type || 'STANDARD', s.is_active ?? 1]
				);
			} catch (e) {
				// ignore individual errors
			}
		});
		db.execSync("COMMIT;");
		return true;
	} catch (error) {
		try { db.execSync("ROLLBACK;"); } catch (e) {}
		console.error("❌ Error seedSeats:", error);
		return false;
	}
};

// Generate default seats programmatically for rooms 1..6
export const generateDefaultSeats = (roomsCount = 6) => {
	const rows = ['A', 'B', 'C'];
	const seatsPerRow = 6;
	const result = [];
	for (let r = 1; r <= roomsCount; r++) {
		const baseId = (r - 1) * (rows.length * seatsPerRow);
		rows.forEach((rowLabel, rowIndex) => {
			for (let sn = 1; sn <= seatsPerRow; sn++) {
				const seatId = baseId + rowIndex * seatsPerRow + sn;
				let seatType = 'STANDARD';
				if (rowLabel === 'A') seatType = 'VIP';
				else if (rowLabel === 'C' && sn === 1) seatType = 'ACCESSIBLE';

				result.push({
					id: seatId,
					room_id: r,
					row_label: rowLabel,
					seat_number: sn,
					seat_type: seatType,
					is_active: 1,
				});
			}
		});
	}
	return result;
};

// Convenience: seed the default sample seats into the table (rooms 1..6)
export const seedDefaultSeats = (roomsCount = 6) => {
	try {
		const seats = generateDefaultSeats(roomsCount);
		return seedSeats(seats);
	} catch (error) {
		console.error('❌ Error seedDefaultSeats:', error);
		return false;
	}
};

