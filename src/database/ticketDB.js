import { db } from "./connection";

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

// Seed helper: insert an array of ticket objects (idempotent via INSERT OR IGNORE on UNIQUE(showtime_id, seat_id))
export const seedTickets = (tickets = []) => {
    try {
        db.execSync("BEGIN TRANSACTION;");
        tickets.forEach(t => {
            try {
                db.runSync(
                    "INSERT OR IGNORE INTO tickets (id, showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        t.id || null,
                        t.showtime_id,
                        t.seat_id,
                        t.booking_id ?? null,
                        t.user_id ?? null,
                        t.price_paid,
                        t.status || 'HELD',
                        t.hold_expires_at || null,
                        t.qr_code || null,
                        t.checked_in_at || null,
                    ]
                );
            } catch (e) {
                // ignore individual insert errors
            }
        });
        db.execSync("COMMIT;");
        return true;
    } catch (error) {
        try { db.execSync("ROLLBACK;"); } catch (e) {}
        console.error("❌ Error seedTickets:", error);
        return false;
    }
};

// Sample data requested (matches SQL seed)
export const defaultTickets = [
    // Booking 1: showtime 1 (room 1), seats A1(1), A2(2), B1(7)
    { id: 1, showtime_id: 1, seat_id: 1, booking_id: 1, user_id: null, price_paid: 90000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20251111-0001-A1', checked_in_at: null },
    { id: 2, showtime_id: 1, seat_id: 2, booking_id: 1, user_id: null, price_paid: 90000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20251111-0001-A2', checked_in_at: null },
    { id: 3, showtime_id: 1, seat_id: 7, booking_id: 1, user_id: null, price_paid: 90000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20251111-0001-B1', checked_in_at: null },
    // Booking 2: showtime 2 (room 3), seats A1(37), C1(49)
    { id: 4, showtime_id: 2, seat_id: 37, booking_id: 2, user_id: null, price_paid: 90000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20251111-0002-A1', checked_in_at: null },
    { id: 5, showtime_id: 2, seat_id: 49, booking_id: 2, user_id: null, price_paid: 90000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20251111-0002-C1', checked_in_at: null },
    // Booking 3: showtime 5 (room 4), seats A1(55), A2(56) held
    { id: 6, showtime_id: 5, seat_id: 55, booking_id: 3, user_id: null, price_paid: 120000, status: 'HELD', hold_expires_at: '2025-12-20 17:00:00', qr_code: 'QR-BK-20251220-0001-A1', checked_in_at: null },
    { id: 7, showtime_id: 5, seat_id: 56, booking_id: 3, user_id: null, price_paid: 120000, status: 'HELD', hold_expires_at: '2025-12-20 17:00:00', qr_code: 'QR-BK-20251220-0001-A2', checked_in_at: null },
    // Booking 4: showtime 7 (room 4), seats B3(63), B4(64)
    { id: 8, showtime_id: 7, seat_id: 63, booking_id: 4, user_id: null, price_paid: 120000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20240811-0001-B3', checked_in_at: '2024-08-11 19:50:00' },
    { id: 9, showtime_id: 7, seat_id: 64, booking_id: 4, user_id: null, price_paid: 120000, status: 'PAID', hold_expires_at: null, qr_code: 'QR-BK-20240811-0001-B4', checked_in_at: '2024-08-11 19:51:00' },
];

export const seedDefaultTickets = () => {
    try {
        return seedTickets(defaultTickets);
    } catch (error) {
        console.error('❌ Error seedDefaultTickets:', error);
        return false;
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
    seedTickets,
    defaultTickets,
    seedDefaultTickets,
};
