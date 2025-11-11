import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("moviesApp.db");

// Initialize tickets table
export const initTicketsTable = () => {
    try {
        db.execSync(`
			CREATE TABLE IF NOT EXISTS tickets (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				showtime_id INTEGER NOT NULL,
				seat_id INTEGER NOT NULL,
				booking_id INTEGER NULL,
				user_id INTEGER NULL,
				price_paid INTEGER NOT NULL,
				status TEXT NOT NULL DEFAULT 'HELD',
				hold_expires_at DATETIME NULL,
				qr_code TEXT NULL,
				checked_in_at DATETIME NULL,
				created_at DATETIME DEFAULT (datetime('now')),
				updated_at DATETIME DEFAULT (datetime('now')),
				UNIQUE(showtime_id, seat_id),
				FOREIGN KEY(showtime_id) REFERENCES showtimes(id),
				FOREIGN KEY(seat_id) REFERENCES seats(id),
				FOREIGN KEY(booking_id) REFERENCES bookings(id)
			);
		`);
        console.log("✅ tickets table initialized");
        return true;
    } catch (error) {
        console.error("❌ Error initTicketsTable:", error);
        return false;
    }
};

// CRUD for tickets
export const getAllTickets = () => {
    try {
        return db.getAllSync("SELECT * FROM tickets ORDER BY id DESC");
    } catch (error) {
        console.error("❌ Error getAllTickets:", error);
        return [];
    }
};

export const getTicketById = (id) => {
    try {
        return db.getFirstSync("SELECT * FROM tickets WHERE id = ?", [id]) || null;
    } catch (error) {
        console.error("❌ Error getTicketById:", error);
        return null;
    }
};

export const getTicketsByShowtimeId = (showtimeId) => {
    try {
        return db.getAllSync("SELECT * FROM tickets WHERE showtime_id = ? ORDER BY id", [showtimeId]);
    } catch (error) {
        console.error("❌ Error getTicketsByShowtimeId:", error);
        return [];
    }
};

export const getTicketsByBookingId = (bookingId) => {
    try {
        return db.getAllSync("SELECT * FROM tickets WHERE booking_id = ? ORDER BY id", [bookingId]);
    } catch (error) {
        console.error("❌ Error getTicketsByBookingId:", error);
        return [];
    }
};

export const addTicket = (showtime_id, seat_id, booking_id = null, user_id = null, price_paid, status = 'HELD', hold_expires_at = null, qr_code = null, checked_in_at = null) => {
    try {
        const res = db.runSync(
            "INSERT INTO tickets (showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at]
        );
        return { success: true, id: res.lastInsertRowId };
    } catch (error) {
        console.error("❌ Error addTicket:", error);
        return { success: false, error };
    }
};

export const updateTicket = (id, fields = {}) => {
    try {
        const { showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at } = fields;
        const res = db.runSync(
            "UPDATE tickets SET showtime_id = ?, seat_id = ?, booking_id = ?, user_id = ?, price_paid = ?, status = ?, hold_expires_at = ?, qr_code = ?, checked_in_at = ? , updated_at = (datetime('now')) WHERE id = ?",
            [showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at, id]
        );
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error updateTicket:", error);
        return { success: false, error };
    }
};

export const deleteTicket = (id) => {
    try {
        const res = db.runSync("DELETE FROM tickets WHERE id = ?", [id]);
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error deleteTicket:", error);
        return { success: false, error };
    }
};

export default {
    initTicketsTable,
    getAllTickets,
    getTicketById,
    getTicketsByShowtimeId,
    getTicketsByBookingId,
    addTicket,
    updateTicket,
    deleteTicket,
};
