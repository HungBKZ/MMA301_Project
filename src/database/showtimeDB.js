import { db } from "./connection";

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

// =============================
// Utilities: time and validation
// =============================

// Parse 'YYYY-MM-DD HH:mm:ss' to a JS Date in local time
const parseSqliteDateTime = (str) => {
    if (!str || typeof str !== 'string') return null;
    const [datePart, timePart] = str.split(' ');
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split('-').map((v) => parseInt(v, 10));
    const [hh, mm, ss] = timePart.split(':').map((v) => parseInt(v, 10));
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, 0);
};

// Format JS Date to 'YYYY-MM-DD HH:mm:ss'
const formatSqliteDateTime = (date) => {
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};

// Get movie duration + 20 minute buffer (in minutes)
export const getBufferedMovieDurationMinutes = (movieId) => {
    try {
        const row = db.getFirstSync("SELECT duration_minutes FROM movies WHERE id = ?", [movieId]);
        const base = row?.duration_minutes ? Number(row.duration_minutes) : null;
        if (!base || isNaN(base) || base <= 0) return null;
        return base + 20; // add 20 minutes buffer
    } catch (e) {
        console.error("❌ Error getBufferedMovieDurationMinutes:", e);
        return null;
    }
};

// Calculate end_time string from movieId and start_time string
export const calculateEndTimeForShow = (movieId, startTime) => {
    const dur = getBufferedMovieDurationMinutes(movieId);
    if (dur == null) return null;
    const start = parseSqliteDateTime(startTime);
    if (!start) return null;
    const end = new Date(start.getTime() + dur * 60 * 1000);
    return formatSqliteDateTime(end);
};

// Verify room belongs to cinema (if cinemaId provided)
export const validateRoomCinema = (roomId, cinemaId) => {
    try {
        if (!cinemaId) return { ok: true };
        const room = db.getFirstSync("SELECT cinema_id FROM rooms WHERE id = ?", [roomId]);
        if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
        if (Number(room.cinema_id) !== Number(cinemaId)) return { ok: false, reason: "ROOM_NOT_IN_CINEMA" };
        return { ok: true };
    } catch (e) {
        console.error("❌ Error validateRoomCinema:", e);
        return { ok: false, reason: "INTERNAL" };
    }
};

// Check time conflicts within the same room with required 30-minute gap
// Returns conflicting rows if any
export const findShowtimeConflicts = (roomId, startTime, endTime, excludeId = null) => {
    try {
        const start = parseSqliteDateTime(startTime);
        const end = parseSqliteDateTime(endTime);
        if (!start || !end) return [];
        // Apply 30 minute gap window
        const startMinus = formatSqliteDateTime(new Date(start.getTime() - 30 * 60 * 1000));
        const endPlus = formatSqliteDateTime(new Date(end.getTime() + 30 * 60 * 1000));

        // Conflict when: existing.start_time < proposed_end_plus AND existing.end_time > proposed_start_minus
        const params = [roomId, endPlus, startMinus];
        let sql = `SELECT * FROM showtimes WHERE room_id = ? AND start_time < ? AND end_time > ?`;
        if (excludeId != null) {
            sql += ` AND id != ?`;
            params.push(excludeId);
        }
        const rows = db.getAllSync(sql, params);
        return rows || [];
    } catch (e) {
        console.error("❌ Error findShowtimeConflicts:", e);
        return [{ id: -1, error: true }];
    }
};

// High-level validator: compute end_time and validate constraints
export const validateShowtimeInput = ({ movieId, roomId, startTime, basePrice, cinemaId = null, excludeId = null }) => {
    if (!movieId || !roomId || !startTime || !basePrice) {
        return { ok: false, code: "MISSING_FIELDS" };
    }
    if (Number(basePrice) <= 0) {
        return { ok: false, code: "INVALID_PRICE" };
    }
    const endTime = calculateEndTimeForShow(movieId, startTime);
    if (!endTime) {
        return { ok: false, code: "INVALID_MOVIE_OR_START_TIME" };
    }
    // Check room exists and (optionally) belongs to cinema
    const room = db.getFirstSync("SELECT id, cinema_id, is_active FROM rooms WHERE id = ?", [roomId]);
    if (!room) return { ok: false, code: "ROOM_NOT_FOUND" };
    if (room.is_active === 0) return { ok: false, code: "ROOM_INACTIVE" };
    const roomCinemaCheck = validateRoomCinema(roomId, cinemaId);
    if (!roomCinemaCheck.ok) return { ok: false, code: roomCinemaCheck.reason };

    // Check duplicate unique combo early
    try {
        const dup = db.getFirstSync(
            "SELECT * FROM showtimes WHERE movie_id = ? AND room_id = ? AND start_time = ?" + (excludeId ? " AND id != ?" : ""),
            excludeId ? [movieId, roomId, startTime, excludeId] : [movieId, roomId, startTime]
        );
        if (dup) {
            // Also propose a suggestion past the conflicting end_time + 30 minutes
            const suggest = suggestNextAvailableStartTime(roomId, movieId, startTime, excludeId);
            return { ok: false, code: "DUPLICATE_SHOWTIME", conflicts: [dup], suggestion: suggest };
        }
    } catch (e) {
        // ignore
    }

    // Check conflicts with 30-minute gap
    const conflicts = findShowtimeConflicts(roomId, startTime, endTime, excludeId);
    if (Array.isArray(conflicts) && conflicts.length > 0) {
        // If the array contains a marker error object, treat as internal error
        const hasMarker = conflicts.some((c) => c && c.error);
        if (hasMarker) return { ok: false, code: "INTERNAL" };
        const suggestion = suggestNextAvailableStartTime(roomId, movieId, startTime, excludeId);
        return { ok: false, code: "CONFLICT_30_MIN", conflicts, suggestion };
    }

    return { ok: true, endTime };
};

// Compute the next available start_time that satisfies 30-min gap in the given room for the given movie duration.
// It iteratively advances to the end of the latest conflicting show + 30 minutes until no conflicts remain.
export const suggestNextAvailableStartTime = (roomId, movieId, startTime, excludeId = null) => {
    try {
        const dur = getBufferedMovieDurationMinutes(movieId);
        if (dur == null) return null;
        let candidate = parseSqliteDateTime(startTime);
        if (!candidate) return null;

        // Safety cap to prevent infinite loop
        const maxIterations = 20;
        let i = 0;
        while (i < maxIterations) {
            const candStart = formatSqliteDateTime(candidate);
            const candEnd = formatSqliteDateTime(new Date(candidate.getTime() + dur * 60 * 1000));
            const conflicts = findShowtimeConflicts(roomId, candStart, candEnd, excludeId);
            if (!Array.isArray(conflicts) || conflicts.length === 0) {
                return candStart;
            }
            // Move candidate to the latest (end_time + 30m) among the conflicts
            let latest = candidate;
            conflicts.forEach((c) => {
                if (c && c.end_time) {
                    const end = parseSqliteDateTime(String(c.end_time));
                    if (end && end.getTime() > latest.getTime()) {
                        latest = end;
                    }
                }
            });
            candidate = new Date(latest.getTime() + 30 * 60 * 1000);
            i += 1;
        }
        // Fallback: return original proposed time if too many iterations
        return startTime;
    } catch (e) {
        return null;
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

// Convenience: list showtimes for a given cinema (via rooms)
export const getShowtimesByCinemaId = (cinemaId) => {
    try {
        return db.getAllSync(
            `SELECT s.* FROM showtimes s
             JOIN rooms r ON r.id = s.room_id
             WHERE r.cinema_id = ?
             ORDER BY s.start_time ASC`,
            [cinemaId]
        );
    } catch (error) {
        console.error("❌ Error getShowtimesByCinemaId:", error);
        return [];
    }
};

// Convenience: list showtimes by date (YYYY-MM-DD), optional cinema filter
export const getShowtimesByDate = (dateStr, cinemaId = null) => {
    try {
        if (cinemaId) {
            return db.getAllSync(
                `SELECT s.* FROM showtimes s
                 JOIN rooms r ON r.id = s.room_id
                 WHERE DATE(s.start_time) = ? AND r.cinema_id = ?
                 ORDER BY s.start_time ASC`,
                [dateStr, cinemaId]
            );
        }
        return db.getAllSync(
            `SELECT * FROM showtimes WHERE DATE(start_time) = ? ORDER BY start_time ASC`,
            [dateStr]
        );
    } catch (error) {
        console.error("❌ Error getShowtimesByDate:", error);
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

// High-level: update showtime with validations and auto end_time
export const updateShowtimeWithValidation = (id, { movieId, roomId, cinemaId = null, startTime, basePrice, status = 'SCHEDULED' }) => {
    try {
        const check = validateShowtimeInput({ movieId, roomId, startTime, basePrice, cinemaId, excludeId: id });
        if (!check.ok) return { success: false, code: check.code, conflicts: check.conflicts };
        const res = updateShowtime(id, {
            movie_id: movieId,
            room_id: roomId,
            start_time: startTime,
            end_time: check.endTime,
            base_price: basePrice,
            status,
        });
        return res;
    } catch (e) {
        console.error("❌ Error updateShowtimeWithValidation:", e);
        return { success: false, error: e };
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

// High-level: create showtime with validations and auto end_time
export const createShowtimeWithValidation = ({ movieId, roomId, cinemaId = null, startTime, basePrice, status = 'SCHEDULED' }) => {
    try {
        const check = validateShowtimeInput({ movieId, roomId, startTime, basePrice, cinemaId });
        if (!check.ok) return { success: false, code: check.code, conflicts: check.conflicts };
        const res = addShowtime(movieId, roomId, startTime, check.endTime, basePrice, status);
        return res;
    } catch (e) {
        console.error("❌ Error createShowtimeWithValidation:", e);
        return { success: false, error: e };
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
    getBufferedMovieDurationMinutes,
    calculateEndTimeForShow,
    validateRoomCinema,
    findShowtimeConflicts,
    validateShowtimeInput,
    suggestNextAvailableStartTime,
    getAllShowtimes,
    getShowtimeById,
    getShowtimesByMovieId,
    getShowtimesByRoomId,
    getShowtimesByCinemaId,
    getShowtimesByDate,
    addShowtime,
    createShowtimeWithValidation,
    updateShowtime,
    updateShowtimeWithValidation,
    deleteShowtime,
    seedShowtimes,
    getShowtimesCount,
    isShowtimeSeeded,
    defaultShowtimes,
    seedDefaultShowtimes,
    ensureShowtimesSeeded,
    dropShowtimesTable,
};
