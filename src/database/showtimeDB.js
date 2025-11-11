import { db } from "./db";

// Initialize showtimes table
export const initShowtimesTable = () => {
    try {
        db.execSync(`
      CREATE TABLE IF NOT EXISTS showtimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        base_price INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now')),
        FOREIGN KEY(movie_id) REFERENCES movies(id),
        FOREIGN KEY(room_id) REFERENCES rooms(id)
      );
    `);
        // Ensure unique constraint to prevent duplicate showtimes for same movie/room/start_time
        try {
            const indexes = db.getAllSync("PRAGMA index_list(showtimes)");
            const hasIdx = Array.isArray(indexes) && indexes.some(ix => ix.name === 'idx_showtimes_unique');
            if (!hasIdx) {
                db.runSync("CREATE UNIQUE INDEX idx_showtimes_unique ON showtimes (movie_id, room_id, start_time)");
            }
        } catch (e) {
            console.warn("⚠️ Could not ensure unique index for showtimes:", e);
        }
        console.log("✅ showtimes table initialized");
        return true;
    } catch (error) {
        console.error("❌ Error initShowtimesTable:", error);
        return false;
    }
};

// CRUD functions for showtimes
export const getAllShowtimes = () => {
    try {
        return db.getAllSync("SELECT * FROM showtimes ORDER BY id DESC");
    } catch (error) {
        console.error("❌ Error getAllShowtimes:", error);
        return [];
    }
};

export const getShowtimeById = (id) => {
    try {
        return db.getFirstSync("SELECT * FROM showtimes WHERE id = ?", [id]) || null;
    } catch (error) {
        console.error("❌ Error getShowtimeById:", error);
        return null;
    }
};

export const getShowtimesByMovieId = (movieId) => {
    try {
        return db.getAllSync("SELECT * FROM showtimes WHERE movie_id = ?", [movieId]);
    } catch (error) {
        console.error("❌ Error getShowtimesByMovieId:", error);
        return [];
    }
};

export const getShowtimesByRoomId = (roomId) => {
    try {
        return db.getAllSync("SELECT * FROM showtimes WHERE room_id = ?", [roomId]);
    } catch (error) {
        console.error("❌ Error getShowtimesByRoomId:", error);
        return [];
    }
};

export const addShowtime = (movieId, roomId, startTime, endTime, basePrice, status = 'SCHEDULED') => {
    try {
        const res = db.runSync(
            "INSERT INTO showtimes (movie_id, room_id, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?)",
            [movieId, roomId, startTime, endTime, basePrice, status]
        );
        return { success: true, id: res.lastInsertRowId };
    } catch (error) {
        console.error("❌ Error addShowtime:", error);
        return { success: false, error };
    }
};

export const updateShowtime = (id, { movie_id, room_id, start_time, end_time, base_price, status }) => {
    try {
        const res = db.runSync(
            "UPDATE showtimes SET movie_id = ?, room_id = ?, start_time = ?, end_time = ?, base_price = ?, status = ?, updated_at = (datetime('now')) WHERE id = ?",
            [movie_id, room_id, start_time, end_time, base_price, status, id]
        );
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error updateShowtime:", error);
        return { success: false, error };
    }
};

export const deleteShowtime = (id) => {
    try {
        const res = db.runSync("DELETE FROM showtimes WHERE id = ?", [id]);
        return { success: true, changes: res.changes };
    } catch (error) {
        console.error("❌ Error deleteShowtime:", error);
        return { success: false, error };
    }
};

// Utility: count showtimes
export const getShowtimesCount = () => {
    try {
        const row = db.getFirstSync("SELECT COUNT(*) AS count FROM showtimes");
        return row?.count || 0;
    } catch (error) {
        console.error("❌ Error getShowtimesCount:", error);
        return 0;
    }
};

// Utility: whether any showtime exists
export const isShowtimeSeeded = () => {
    return getShowtimesCount() > 0;
};

// Seed helper: insert array of showtime objects using INSERT OR IGNORE
export const seedShowtimes = (showtimes = []) => {
    try {
        db.execSync("BEGIN TRANSACTION;");
        showtimes.forEach((s) => {
            try {
                db.runSync(
                    "INSERT OR IGNORE INTO showtimes (id, movie_id, room_id, start_time, end_time, base_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [s.id || null, s.movie_id, s.room_id, s.start_time, s.end_time, s.base_price, s.status || 'SCHEDULED']
                );
            } catch (e) {
                // ignore individual insert errors
            }
        });
        db.execSync("COMMIT;");
        return true;
    } catch (error) {
        try { db.execSync("ROLLBACK;"); } catch (e) { }
        console.error("❌ Error seedShowtimes:", error);
        return false;
    }
};

// Default sample showtimes (from your SQL sample)
export const defaultShowtimes = [
    // 2025-11-11
    { movie_id: 1, room_id: 3, start_time: '2025-11-11 12:00:00', end_time: '2025-11-11 14:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 5, start_time: '2025-11-11 18:00:00', end_time: '2025-11-11 20:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 2, start_time: '2025-11-11 09:00:00', end_time: '2025-11-11 11:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 5, start_time: '2025-11-11 15:00:00', end_time: '2025-11-11 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 1, start_time: '2025-11-11 21:00:00', end_time: '2025-11-11 23:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 4, start_time: '2025-11-11 12:00:00', end_time: '2025-11-11 14:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 6, start_time: '2025-11-11 18:00:00', end_time: '2025-11-11 20:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 1, start_time: '2025-11-11 18:00:00', end_time: '2025-11-11 20:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 4, start_time: '2025-11-11 09:00:00', end_time: '2025-11-11 11:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 3, start_time: '2025-11-11 21:00:00', end_time: '2025-11-11 23:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 6, start_time: '2025-11-11 12:00:00', end_time: '2025-11-11 14:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 2, start_time: '2025-11-11 18:00:00', end_time: '2025-11-11 20:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 6, start_time: '2025-11-11 09:00:00', end_time: '2025-11-11 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 2, start_time: '2025-11-11 15:00:00', end_time: '2025-11-11 17:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 4, start_time: '2025-11-11 21:00:00', end_time: '2025-11-11 23:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 1, start_time: '2025-11-11 12:00:00', end_time: '2025-11-11 14:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 2, start_time: '2025-11-11 12:00:00', end_time: '2025-11-11 14:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 4, start_time: '2025-11-11 18:00:00', end_time: '2025-11-11 20:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-12
    { movie_id: 1, room_id: 5, start_time: '2025-11-12 15:00:00', end_time: '2025-11-12 17:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 1, start_time: '2025-11-12 21:00:00', end_time: '2025-11-12 23:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 4, start_time: '2025-11-12 12:00:00', end_time: '2025-11-12 14:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 6, start_time: '2025-11-12 18:00:00', end_time: '2025-11-12 20:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 1, start_time: '2025-11-12 18:00:00', end_time: '2025-11-12 20:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 4, start_time: '2025-11-12 09:00:00', end_time: '2025-11-12 11:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 3, start_time: '2025-11-12 21:00:00', end_time: '2025-11-12 23:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 6, start_time: '2025-11-12 12:00:00', end_time: '2025-11-12 14:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 2, start_time: '2025-11-12 18:00:00', end_time: '2025-11-12 20:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 6, start_time: '2025-11-12 09:00:00', end_time: '2025-11-12 11:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 2, start_time: '2025-11-12 15:00:00', end_time: '2025-11-12 17:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 4, start_time: '2025-11-12 21:00:00', end_time: '2025-11-12 23:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 1, start_time: '2025-11-12 12:00:00', end_time: '2025-11-12 14:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 2, start_time: '2025-11-12 12:00:00', end_time: '2025-11-12 14:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 4, start_time: '2025-11-12 18:00:00', end_time: '2025-11-12 20:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 4, start_time: '2025-11-12 15:00:00', end_time: '2025-11-12 17:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 6, start_time: '2025-11-12 21:00:00', end_time: '2025-11-12 23:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 3, start_time: '2025-11-12 12:00:00', end_time: '2025-11-12 14:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-13
    { movie_id: 1, room_id: 1, start_time: '2025-11-13 18:00:00', end_time: '2025-11-13 20:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 4, start_time: '2025-11-13 09:00:00', end_time: '2025-11-13 11:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 3, start_time: '2025-11-13 21:00:00', end_time: '2025-11-13 23:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 6, start_time: '2025-11-13 12:00:00', end_time: '2025-11-13 14:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 2, start_time: '2025-11-13 18:00:00', end_time: '2025-11-13 20:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 6, start_time: '2025-11-13 09:00:00', end_time: '2025-11-13 11:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 2, start_time: '2025-11-13 15:00:00', end_time: '2025-11-13 17:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 4, start_time: '2025-11-13 21:00:00', end_time: '2025-11-13 23:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 1, start_time: '2025-11-13 12:00:00', end_time: '2025-11-13 14:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 2, start_time: '2025-11-13 12:00:00', end_time: '2025-11-13 14:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 4, start_time: '2025-11-13 18:00:00', end_time: '2025-11-13 20:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 4, start_time: '2025-11-13 15:00:00', end_time: '2025-11-13 17:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 6, start_time: '2025-11-13 21:00:00', end_time: '2025-11-13 23:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 3, start_time: '2025-11-13 12:00:00', end_time: '2025-11-13 14:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 6, start_time: '2025-11-13 18:00:00', end_time: '2025-11-13 20:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 3, start_time: '2025-11-13 09:00:00', end_time: '2025-11-13 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 5, start_time: '2025-11-13 15:00:00', end_time: '2025-11-13 17:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 1, start_time: '2025-11-13 21:00:00', end_time: '2025-11-13 23:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-14
    { movie_id: 1, room_id: 3, start_time: '2025-11-14 21:00:00', end_time: '2025-11-14 23:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 6, start_time: '2025-11-14 12:00:00', end_time: '2025-11-14 14:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 2, start_time: '2025-11-14 18:00:00', end_time: '2025-11-14 20:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 6, start_time: '2025-11-14 09:00:00', end_time: '2025-11-14 11:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 2, start_time: '2025-11-14 15:00:00', end_time: '2025-11-14 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 4, start_time: '2025-11-14 21:00:00', end_time: '2025-11-14 23:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 1, start_time: '2025-11-14 12:00:00', end_time: '2025-11-14 14:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 2, start_time: '2025-11-14 12:00:00', end_time: '2025-11-14 14:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 4, start_time: '2025-11-14 18:00:00', end_time: '2025-11-14 20:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 4, start_time: '2025-11-14 15:00:00', end_time: '2025-11-14 17:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 6, start_time: '2025-11-14 21:00:00', end_time: '2025-11-14 23:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 3, start_time: '2025-11-14 12:00:00', end_time: '2025-11-14 14:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 6, start_time: '2025-11-14 18:00:00', end_time: '2025-11-14 20:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 3, start_time: '2025-11-14 09:00:00', end_time: '2025-11-14 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 5, start_time: '2025-11-14 15:00:00', end_time: '2025-11-14 17:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 1, start_time: '2025-11-14 21:00:00', end_time: '2025-11-14 23:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 2, start_time: '2025-11-14 21:00:00', end_time: '2025-11-14 23:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 5, start_time: '2025-11-14 12:00:00', end_time: '2025-11-14 14:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-15
    { movie_id: 1, room_id: 6, start_time: '2025-11-15 09:00:00', end_time: '2025-11-15 11:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 2, start_time: '2025-11-15 15:00:00', end_time: '2025-11-15 17:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 4, start_time: '2025-11-15 21:00:00', end_time: '2025-11-15 23:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 1, start_time: '2025-11-15 12:00:00', end_time: '2025-11-15 14:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 2, start_time: '2025-11-15 12:00:00', end_time: '2025-11-15 14:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 4, start_time: '2025-11-15 18:00:00', end_time: '2025-11-15 20:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 4, start_time: '2025-11-15 15:00:00', end_time: '2025-11-15 17:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 6, start_time: '2025-11-15 21:00:00', end_time: '2025-11-15 23:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 3, start_time: '2025-11-15 12:00:00', end_time: '2025-11-15 14:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 6, start_time: '2025-11-15 18:00:00', end_time: '2025-11-15 20:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 3, start_time: '2025-11-15 09:00:00', end_time: '2025-11-15 11:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 5, start_time: '2025-11-15 15:00:00', end_time: '2025-11-15 17:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 1, start_time: '2025-11-15 21:00:00', end_time: '2025-11-15 23:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 2, start_time: '2025-11-15 21:00:00', end_time: '2025-11-15 23:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 5, start_time: '2025-11-15 12:00:00', end_time: '2025-11-15 14:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 5, start_time: '2025-11-15 09:00:00', end_time: '2025-11-15 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 1, start_time: '2025-11-15 15:00:00', end_time: '2025-11-15 17:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 3, start_time: '2025-11-15 21:00:00', end_time: '2025-11-15 23:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-16
    { movie_id: 1, room_id: 2, start_time: '2025-11-16 12:00:00', end_time: '2025-11-16 14:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 4, start_time: '2025-11-16 18:00:00', end_time: '2025-11-16 20:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 4, start_time: '2025-11-16 15:00:00', end_time: '2025-11-16 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 6, start_time: '2025-11-16 21:00:00', end_time: '2025-11-16 23:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 3, start_time: '2025-11-16 12:00:00', end_time: '2025-11-16 14:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 6, start_time: '2025-11-16 18:00:00', end_time: '2025-11-16 20:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 3, start_time: '2025-11-16 09:00:00', end_time: '2025-11-16 11:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 5, start_time: '2025-11-16 15:00:00', end_time: '2025-11-16 17:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 1, start_time: '2025-11-16 21:00:00', end_time: '2025-11-16 23:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 2, start_time: '2025-11-16 21:00:00', end_time: '2025-11-16 23:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 5, start_time: '2025-11-16 12:00:00', end_time: '2025-11-16 14:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 5, start_time: '2025-11-16 09:00:00', end_time: '2025-11-16 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 1, start_time: '2025-11-16 15:00:00', end_time: '2025-11-16 17:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 3, start_time: '2025-11-16 21:00:00', end_time: '2025-11-16 23:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 1, start_time: '2025-11-16 12:00:00', end_time: '2025-11-16 14:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 3, start_time: '2025-11-16 18:00:00', end_time: '2025-11-16 20:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 6, start_time: '2025-11-16 09:00:00', end_time: '2025-11-16 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 2, start_time: '2025-11-16 15:00:00', end_time: '2025-11-16 17:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-17
    { movie_id: 1, room_id: 4, start_time: '2025-11-17 15:00:00', end_time: '2025-11-17 17:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 6, start_time: '2025-11-17 21:00:00', end_time: '2025-11-17 23:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 3, start_time: '2025-11-17 12:00:00', end_time: '2025-11-17 14:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 6, start_time: '2025-11-17 18:00:00', end_time: '2025-11-17 20:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 3, start_time: '2025-11-17 09:00:00', end_time: '2025-11-17 11:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 5, start_time: '2025-11-17 15:00:00', end_time: '2025-11-17 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 1, start_time: '2025-11-17 21:00:00', end_time: '2025-11-17 23:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 2, start_time: '2025-11-17 21:00:00', end_time: '2025-11-17 23:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 5, start_time: '2025-11-17 12:00:00', end_time: '2025-11-17 14:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 5, start_time: '2025-11-17 09:00:00', end_time: '2025-11-17 11:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 1, start_time: '2025-11-17 15:00:00', end_time: '2025-11-17 17:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 3, start_time: '2025-11-17 21:00:00', end_time: '2025-11-17 23:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 1, start_time: '2025-11-17 12:00:00', end_time: '2025-11-17 14:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 3, start_time: '2025-11-17 18:00:00', end_time: '2025-11-17 20:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 6, start_time: '2025-11-17 09:00:00', end_time: '2025-11-17 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 2, start_time: '2025-11-17 15:00:00', end_time: '2025-11-17 17:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 3, start_time: '2025-11-17 15:00:00', end_time: '2025-11-17 17:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 5, start_time: '2025-11-17 21:00:00', end_time: '2025-11-17 23:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-18
    { movie_id: 1, room_id: 6, start_time: '2025-11-18 18:00:00', end_time: '2025-11-18 20:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 3, start_time: '2025-11-18 09:00:00', end_time: '2025-11-18 11:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 5, start_time: '2025-11-18 15:00:00', end_time: '2025-11-18 17:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 1, start_time: '2025-11-18 21:00:00', end_time: '2025-11-18 23:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 2, start_time: '2025-11-18 21:00:00', end_time: '2025-11-18 23:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 5, start_time: '2025-11-18 12:00:00', end_time: '2025-11-18 14:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 5, start_time: '2025-11-18 09:00:00', end_time: '2025-11-18 11:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 1, start_time: '2025-11-18 15:00:00', end_time: '2025-11-18 17:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 3, start_time: '2025-11-18 21:00:00', end_time: '2025-11-18 23:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 1, start_time: '2025-11-18 12:00:00', end_time: '2025-11-18 14:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 3, start_time: '2025-11-18 18:00:00', end_time: '2025-11-18 20:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 6, start_time: '2025-11-18 09:00:00', end_time: '2025-11-18 11:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 2, start_time: '2025-11-18 15:00:00', end_time: '2025-11-18 17:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 3, start_time: '2025-11-18 15:00:00', end_time: '2025-11-18 17:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 5, start_time: '2025-11-18 21:00:00', end_time: '2025-11-18 23:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 5, start_time: '2025-11-18 18:00:00', end_time: '2025-11-18 20:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 2, start_time: '2025-11-18 09:00:00', end_time: '2025-11-18 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 4, start_time: '2025-11-18 15:00:00', end_time: '2025-11-18 17:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-19
    { movie_id: 1, room_id: 2, start_time: '2025-11-19 21:00:00', end_time: '2025-11-19 23:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 5, start_time: '2025-11-19 12:00:00', end_time: '2025-11-19 14:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 5, start_time: '2025-11-19 09:00:00', end_time: '2025-11-19 11:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 1, start_time: '2025-11-19 15:00:00', end_time: '2025-11-19 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 3, start_time: '2025-11-19 21:00:00', end_time: '2025-11-19 23:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 1, start_time: '2025-11-19 12:00:00', end_time: '2025-11-19 14:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 3, start_time: '2025-11-19 18:00:00', end_time: '2025-11-19 20:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 6, start_time: '2025-11-19 09:00:00', end_time: '2025-11-19 11:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 2, start_time: '2025-11-19 15:00:00', end_time: '2025-11-19 17:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 3, start_time: '2025-11-19 15:00:00', end_time: '2025-11-19 17:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 5, start_time: '2025-11-19 21:00:00', end_time: '2025-11-19 23:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 5, start_time: '2025-11-19 18:00:00', end_time: '2025-11-19 20:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 2, start_time: '2025-11-19 09:00:00', end_time: '2025-11-19 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 4, start_time: '2025-11-19 15:00:00', end_time: '2025-11-19 17:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 5, start_time: '2025-11-19 18:00:00', end_time: '2025-11-19 20:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 2, start_time: '2025-11-19 09:00:00', end_time: '2025-11-19 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 4, start_time: '2025-11-19 15:00:00', end_time: '2025-11-19 17:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-20
    { movie_id: 1, room_id: 5, start_time: '2025-11-20 09:00:00', end_time: '2025-11-20 11:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 1, start_time: '2025-11-20 15:00:00', end_time: '2025-11-20 17:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 3, start_time: '2025-11-20 21:00:00', end_time: '2025-11-20 23:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 1, start_time: '2025-11-20 12:00:00', end_time: '2025-11-20 14:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 3, start_time: '2025-11-20 18:00:00', end_time: '2025-11-20 20:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 6, start_time: '2025-11-20 09:00:00', end_time: '2025-11-20 11:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 2, start_time: '2025-11-20 15:00:00', end_time: '2025-11-20 17:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 3, start_time: '2025-11-20 21:00:00', end_time: '2025-11-20 23:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 5, start_time: '2025-11-20 12:00:00', end_time: '2025-11-20 14:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 5, start_time: '2025-11-20 18:00:00', end_time: '2025-11-20 20:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 2, start_time: '2025-11-20 09:00:00', end_time: '2025-11-20 11:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 4, start_time: '2025-11-20 15:00:00', end_time: '2025-11-20 17:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 1, start_time: '2025-11-20 21:00:00', end_time: '2025-11-20 23:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 4, start_time: '2025-11-20 12:00:00', end_time: '2025-11-20 14:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 6, start_time: '2025-11-20 18:00:00', end_time: '2025-11-20 20:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 3, start_time: '2025-11-20 09:00:00', end_time: '2025-11-20 11:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 4, start_time: '2025-11-20 09:00:00', end_time: '2025-11-20 11:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 6, start_time: '2025-11-20 15:00:00', end_time: '2025-11-20 17:00:00', base_price: 120000, status: 'SCHEDULED' },

    // 2025-11-21
    { movie_id: 1, room_id: 1, start_time: '2025-11-21 12:00:00', end_time: '2025-11-21 14:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 3, start_time: '2025-11-21 18:00:00', end_time: '2025-11-21 20:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 6, start_time: '2025-11-21 09:00:00', end_time: '2025-11-21 11:08:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 1, room_id: 2, start_time: '2025-11-21 15:00:00', end_time: '2025-11-21 17:08:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 2, room_id: 3, start_time: '2025-11-21 15:00:00', end_time: '2025-11-21 17:35:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 2, room_id: 5, start_time: '2025-11-21 21:00:00', end_time: '2025-11-21 23:35:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 3, room_id: 5, start_time: '2025-11-21 18:00:00', end_time: '2025-11-21 20:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 2, start_time: '2025-11-21 09:00:00', end_time: '2025-11-21 11:22:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 3, room_id: 4, start_time: '2025-11-21 15:00:00', end_time: '2025-11-21 17:22:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 4, room_id: 1, start_time: '2025-11-21 21:00:00', end_time: '2025-11-21 23:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 4, start_time: '2025-11-21 12:00:00', end_time: '2025-11-21 14:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 6, start_time: '2025-11-21 18:00:00', end_time: '2025-11-21 20:16:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 4, room_id: 3, start_time: '2025-11-21 09:00:00', end_time: '2025-11-21 11:16:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 5, room_id: 4, start_time: '2025-11-21 09:00:00', end_time: '2025-11-21 11:30:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 5, room_id: 6, start_time: '2025-11-21 15:00:00', end_time: '2025-11-21 17:30:00', base_price: 120000, status: 'SCHEDULED' },

    { movie_id: 6, room_id: 6, start_time: '2025-11-21 12:00:00', end_time: '2025-11-21 14:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 2, start_time: '2025-11-21 18:00:00', end_time: '2025-11-21 20:00:00', base_price: 120000, status: 'SCHEDULED' },
    { movie_id: 6, room_id: 5, start_time: '2025-11-21 09:00:00', end_time: '2025-11-21 11:00:00', base_price: 120000, status: 'SCHEDULED' },
];


// Convenience: seed the default sample showtimes into the table
export const seedDefaultShowtimes = () => {
    try {
        return seedShowtimes(defaultShowtimes);
    } catch (error) {
        console.error('❌ Error seedDefaultShowtimes:', error);
        return false;
    }
};

// Ensure showtimes table has data (idempotent)
export const ensureShowtimesSeeded = () => {
    try {
        initShowtimesTable();
        const count = getShowtimesCount();
        if (count === 0) {
            console.log('🌱 Seeding default showtimes (table empty)');
            const ok = seedShowtimes(defaultShowtimes);
            if (ok) {
                console.log(`✅ Seeded ${defaultShowtimes.length} showtimes`);
            } else {
                console.warn('⚠️ Failed to seed default showtimes');
            }
        } else {
            console.log(`ℹ️ Showtimes already seeded (count=${count})`);
        }
        return true;
    } catch (error) {
        console.error('❌ Error ensureShowtimesSeeded:', error);
        return false;
    }
};

// Drop the showtimes table (and its unique index if present)
export const dropShowtimesTable = () => {
    try {
        db.execSync("BEGIN TRANSACTION;");
        try {
            // Drop index first (safe even if not exists)
            db.runSync("DROP INDEX IF EXISTS idx_showtimes_unique");
        } catch (e) {
            // ignore index drop errors
        }
        db.runSync("DROP TABLE IF EXISTS showtimes");
        db.execSync("COMMIT;");
        console.log("🗑️ Dropped table 'showtimes'");
        return true;
    } catch (error) {
        try { db.execSync("ROLLBACK;"); } catch (e) { }
        console.error("❌ Error dropShowtimesTable:", error);
        return false;
    }
};



export default {
    initShowtimesTable,
    getAllShowtimes,
    getShowtimeById,
    getShowtimesByMovieId,
    getShowtimesByRoomId,
    addShowtime,
    updateShowtime,
    deleteShowtime,
    seedShowtimes,
    getShowtimesCount,
    isShowtimeSeeded,
    defaultShowtimes,
    seedDefaultShowtimes,
    ensureShowtimesSeeded,
    dropShowtimesTable,
};
