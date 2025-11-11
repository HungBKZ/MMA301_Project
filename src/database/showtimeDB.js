import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("moviesApp.db");

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
        return db.getAllSync("SELECT * FROM showtimes ORDER BY start_time DESC");
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
        return db.getAllSync("SELECT * FROM showtimes WHERE movie_id = ? ORDER BY start_time", [movieId]);
    } catch (error) {
        console.error("❌ Error getShowtimesByMovieId:", error);
        return [];
    }
};

export const getShowtimesByRoomId = (roomId) => {
    try {
        return db.getAllSync("SELECT * FROM showtimes WHERE room_id = ? ORDER BY start_time", [roomId]);
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
        try { db.execSync("ROLLBACK;"); } catch (e) {}
        console.error("❌ Error seedShowtimes:", error);
        return false;
    }
};

// Default sample showtimes (from your SQL sample)
export const defaultShowtimes = [
    { id: 1, movie_id: 10, room_id: 1, start_time: '2025-11-11 10:00:00', end_time: '2025-11-11 13:01:00', base_price: 90000, status: 'SCHEDULED' },
    { id: 2, movie_id: 10, room_id: 3, start_time: '2025-11-11 14:30:00', end_time: '2025-11-11 17:31:00', base_price: 90000, status: 'SCHEDULED' },
    { id: 3, movie_id: 10, room_id: 5, start_time: '2025-11-11 19:00:00', end_time: '2025-11-11 22:01:00', base_price: 90000, status: 'SCHEDULED' },
    { id: 4, movie_id: 11, room_id: 2, start_time: '2025-12-05 20:00:00', end_time: '2025-12-05 22:15:00', base_price: 120000, status: 'SCHEDULED' },
    { id: 5, movie_id: 12, room_id: 4, start_time: '2025-12-20 18:00:00', end_time: '2025-12-20 21:15:00', base_price: 120000, status: 'SCHEDULED' },
    { id: 6, movie_id: 1, room_id: 2, start_time: '2024-08-10 20:00:00', end_time: '2024-08-10 22:43:00', base_price: 120000, status: 'FINISHED' },
    { id: 7, movie_id: 2, room_id: 4, start_time: '2024-08-11 20:00:00', end_time: '2024-08-11 22:47:00', base_price: 120000, status: 'FINISHED' },
    { id: 8, movie_id: 3, room_id: 6, start_time: '2024-08-12 19:00:00', end_time: '2024-08-12 21:27:00', base_price: 120000, status: 'FINISHED' },
    { id: 9, movie_id: 4, room_id: 1, start_time: '2024-08-13 20:00:00', end_time: '2024-08-13 23:04:00', base_price: 90000, status: 'FINISHED' },
    { id: 10, movie_id: 5, room_id: 3, start_time: '2024-08-14 17:00:00', end_time: '2024-08-14 19:23:00', base_price: 90000, status: 'FINISHED' },
    { id: 11, movie_id: 6, room_id: 5, start_time: '2024-08-15 18:30:00', end_time: '2024-08-15 21:46:00', base_price: 90000, status: 'FINISHED' },
    { id: 12, movie_id: 7, room_id: 2, start_time: '2024-08-16 21:00:00', end_time: '2024-08-16 23:17:00', base_price: 120000, status: 'FINISHED' },
    { id: 13, movie_id: 8, room_id: 6, start_time: '2024-08-17 15:00:00', end_time: '2024-08-17 17:20:00', base_price: 120000, status: 'FINISHED' },
    { id: 14, movie_id: 9, room_id: 4, start_time: '2024-08-18 19:00:00', end_time: '2024-08-18 22:10:00', base_price: 120000, status: 'FINISHED' }
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
    defaultShowtimes,
    seedDefaultShowtimes,
};
