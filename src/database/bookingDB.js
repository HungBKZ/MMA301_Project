import * as SQLite from "expo-sqlite";
// ticketDB helpers will be used to seed tickets after bookings
import { initTicketsTable, seedDefaultTickets } from "./ticketDB";

const db = SQLite.openDatabaseSync("moviesApp.db");

// Initialize bookings table
export const initBookingsTable = () => {
    try {
        db.execSync(`
			CREATE TABLE IF NOT EXISTS bookings (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				booking_code TEXT NOT NULL UNIQUE,
				user_id INTEGER NULL,
				showtime_id INTEGER NOT NULL,
				status TEXT NOT NULL DEFAULT 'PENDING',
				total_amount INTEGER NOT NULL DEFAULT 0,
				discount_amount INTEGER NOT NULL DEFAULT 0,
				final_amount INTEGER NOT NULL DEFAULT 0,
				payment_method TEXT NOT NULL DEFAULT 'NONE',
				payment_reference TEXT NULL,
				hold_expires_at DATETIME NULL,
				notes TEXT NULL,
				created_at DATETIME DEFAULT (datetime('now')),
				updated_at DATETIME DEFAULT (datetime('now')),
				FOREIGN KEY(showtime_id) REFERENCES showtimes(id)
			);
		`);
        console.log("✅ bookings table initialized");
        return true;
    } catch (error) {
        console.error("❌ Error initBookingsTable:", error);
        return false;
    }
};

// CRUD for bookings
export const getAllBookings = () => {
    try {
        return db.getAllSync("SELECT * FROM bookings ORDER BY id DESC");
    } catch (error) {
        console.error("❌ Error getAllBookings:", error);
        return [];
    }
};

export const getBookingById = (id) => {
    try {
        return db.getFirstSync("SELECT * FROM bookings WHERE id = ?", [id]) || null;
    } catch (error) {
        console.error("❌ Error getBookingById:", error);
        return null;
    }
};

export const getBookingsByShowtimeId = (showtimeId) => {
    try {
        return db.getAllSync("SELECT * FROM bookings WHERE showtime_id = ? ORDER BY id", [showtimeId]);
    } catch (error) {
        console.error("❌ Error getBookingsByShowtimeId:", error);
        return [];
    }
};

export const addBooking = (booking_code, user_id, showtime_id, status = 'PENDING', total_amount = 0, discount_amount = 0, final_amount = 0, payment_method = 'NONE', payment_reference = null, hold_expires_at = null, notes = null) => {
    try {
        const res = db.runSync(
            "INSERT INTO bookings (booking_code, user_id, showtime_id, status, total_amount, discount_amount, final_amount, payment_method, payment_reference, hold_expires_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [booking_code, user_id, showtime_id, status, total_amount, discount_amount, final_amount, payment_method, payment_reference, hold_expires_at, notes]
        );
        return { success: true, id: res.lastInsertRowId };
    } catch (error) {
        console.error("❌ Error addBooking:", error);
        return { success: false, error };
    }
};

export const updateBooking = (id, fields = {}) => {
    try {
        const {
            booking_code,
            user_id,
            showtime_id,
            status,
            total_amount,
            discount_amount,
            final_amount,
            payment_method,
            payment_reference,
            hold_expires_at,
            notes,
        } = fields;
        const res = db.runSync(
            "UPDATE bookings SET booking_code = ?, user_id = ?, showtime_id = ?, status = ?, total_amount = ?, discount_amount = ?, final_amount = ?, payment_method = ?, payment_reference = ?, hold_expires_at = ?, notes = ?, updated_at = (datetime('now')) WHERE id = ?",
            [booking_code, user_id, showtime_id, status, total_amount, discount_amount, final_amount, payment_method, payment_reference, hold_expires_at, notes, id]
        );
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error updateBooking:", error);
        return { success: false, error };
    }
};

export const deleteBooking = (id) => {
    try {
        const res = db.runSync("DELETE FROM bookings WHERE id = ?", [id]);
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error deleteBooking:", error);
        return { success: false, error };
    }
};

// Seed helper + default bookings sample
export const seedBookings = (bookings = []) => {
    try {
        db.execSync("BEGIN TRANSACTION;");
        bookings.forEach((b) => {
            try {
                db.runSync(
                    "INSERT OR IGNORE INTO bookings (id, booking_code, user_id, showtime_id, status, total_amount, discount_amount, final_amount, payment_method, payment_reference, hold_expires_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [b.id || null, b.booking_code, b.user_id, b.showtime_id, b.status || 'PENDING', b.total_amount || 0, b.discount_amount || 0, b.final_amount || 0, b.payment_method || 'NONE', b.payment_reference || null, b.hold_expires_at || null, b.notes || null]
                );
            } catch (e) {
                // ignore
            }
        });
        db.execSync("COMMIT;");
        return true;
    } catch (error) {
        try { db.execSync("ROLLBACK;"); } catch (e) {}
        console.error("❌ Error seedBookings:", error);
        return false;
    }
};

export const defaultBookings = [
    { id: 1, booking_code: 'BK-20251111-0001', user_id: null, showtime_id: 1, status: 'PAID', total_amount: 270000, discount_amount: 0, final_amount: 270000, payment_method: 'CARD', payment_reference: 'TXN-STRIPE-001', hold_expires_at: null, notes: '3 vé Dune 10:00' },
    { id: 2, booking_code: 'BK-20251111-0002', user_id: null, showtime_id: 2, status: 'PAID', total_amount: 180000, discount_amount: 0, final_amount: 180000, payment_method: 'CARD', payment_reference: 'TXN-STRIPE-002', hold_expires_at: null, notes: '2 vé Dune 14:30' },
    { id: 3, booking_code: 'BK-20251220-0001', user_id: null, showtime_id: 5, status: 'AWAITING_PAYMENT', total_amount: 240000, discount_amount: 0, final_amount: 240000, payment_method: 'NONE', payment_reference: null, hold_expires_at: '2025-12-20 17:00:00', notes: 'Giữ chỗ 2 vé Avatar 18:00' },
    { id: 4, booking_code: 'BK-20240811-0001', user_id: null, showtime_id: 7, status: 'PAID', total_amount: 240000, discount_amount: 0, final_amount: 240000, payment_method: 'CASH', payment_reference: null, hold_expires_at: null, notes: '2 vé TDK 20:00' }
];

export const seedDefaultBookings = () => {
    try {
        return seedBookings(defaultBookings);
    } catch (error) {
        console.error('❌ Error seedDefaultBookings:', error);
        return false;
    }
};

// Convenience: seed bookings then tickets (ensures FK order)
export const seedBookingsAndTickets = () => {
    try {
        // Ensure bookings and tickets tables exist
        initBookingsTable();
        initTicketsTable();

        const okBookings = seedDefaultBookings();
        const okTickets = seedDefaultTickets();

        return !!(okBookings && okTickets);
    } catch (error) {
        console.error("❌ Error seedBookingsAndTickets:", error);
        return false;
    }
};


export default {
    initBookingsTable,
    getAllBookings,
    getBookingById,
    getBookingsByShowtimeId,
    addBooking,
    updateBooking,
    deleteBooking,
    seedBookings,
    defaultBookings,
    seedDefaultBookings,
    seedBookingsAndTickets,
};
