// ============================================
// DATABASE SKELETON – MOVIE MANAGEMENT APP
// ============================================
// Mục tiêu: Hoàn thiện các hàm SQLite cho bảng movies theo yêu cầu đồ án
// Làm theo từng TODO. Ước lượng thời gian: 15–25 phút (Core), +15 phút (Advanced)

import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store"; // Dùng để import trong authService
import { seedDefaultShowtimes, initShowtimesTable, isShowtimeSeeded, getAllShowtimes, ensureShowtimesSeeded, getShowtimesCount } from "./showtimeDB";
import { seedDefaultSeats, initSeatsTable } from "./seatDB";
import { seedBookingsAndTickets } from "./bookingDB";
import { seedDefaultRooms, initRoomsTable } from "./roomDB";

// ============================================
// STEP 0: Open database connection
// ============================================
const db = SQLite.openDatabaseSync("moviesApp.db");
import { initAccountsTable, seedAdminAccount, migrateAccountTable } from "./accountDB";


// ============================================
// STEP 1: Initialize Database (Create Tables)
// ============================================
export const initDatabase = async () => {
  try {
    // 1. Bảng MOVIES
    db.execSync(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        release_year INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'COMING_SOON' CHECK(status IN ('COMING_SOON', 'SHOWING', 'ENDED')),
        poster_uri TEXT
      );
    `);

    // 2. Bảng account (SỬ DỤNG PASSWORD PLAIN TEXT - THEO YÊU CẦU)
//     db.execSync(`
//       CREATE TABLE IF NOT EXISTS account (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         email TEXT NOT NULL UNIQUE,
//         password TEXT,             
//         name TEXT,
//         avatar_uri TEXT,
//         role TEXT DEFAULT 'User', 
//         oauth_provider TEXT,
//         oauth_id TEXT,
//         oauth_profile TEXT,
//         created_at DATETIME DEFAULT (datetime('now'))
//       );
//     `);

    // Bảng wishlist (phim yêu thích)
    db.execSync(`
       CREATE TABLE IF NOT EXISTS wishlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT (datetime('now')),
        UNIQUE(user_id, movie_id),
        FOREIGN KEY(user_id) REFERENCES account(id),
        FOREIGN KEY(movie_id) REFERENCES movies(id)
      );
    `);
    console.log("✅ Database initialized successfully (including account table)");
    // 3. Bảng CINEMAS (Rạp chiếu phim)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS cinemas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT,
        opening_hours TEXT,
        website TEXT,
        total_screens INTEGER DEFAULT 0,
        facilities TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);

    // 5. Bảng collections (bộ sưu tập cá nhân)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now')),
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES account(id) ON DELETE CASCADE
      );
    `);

    // 6. Bảng collection_items (phim trong bộ sưu tập)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS collection_items (
        collection_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT (datetime('now')),
        PRIMARY KEY (collection_id, movie_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
      );
    `);

    // 7. Bảng reviews (đánh giá phim)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now')),
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES account(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Database initialized successfully (movies, account, cinemas)");

    // Migration: Thêm duration_minutes và cập nhật status nếu chưa có
    migrateDatabase();

    // Khởi tạo các bảng phụ thuộc (rooms, seats, showtimes) trước khi seed
    initRoomsTable();
    initSeatsTable();
    initShowtimesTable();

    seedAdminAccount(); // Tạo tài khoản admin mặc định sau khi tạo bảng
    await initAccountsTable();
    migrateAccountTable();
    await seedAdminAccount();    
    seedCinemasCanTho(); // Tạo dữ liệu rạp Cần Thơ
    seedDefaultRooms(); // Tạo dữ liệu phòng chiếu mặc định
    seedDefaultSeats(); // Tạo dữ liệu ghế ngồi mặc định
    // Seed phim mẫu để đảm bảo các movie_id trong defaultShowtimes tồn tại
    // Chỉ seed showtimes nếu bảng trống
    ensureShowtimesSeeded();
    // In ra console nếu có dữ liệu suất chiếu
    try {
      const stCount = getShowtimesCount();
      if (stCount > 0) {
        console.log(`🎬 Showtimes available: ${stCount}`);
        const sample = (getAllShowtimes() || []).slice(0, 5);
        console.log("📋 Sample showtimes (first 5):", sample);
      } else {
        console.log("ℹ️ No showtimes found in table.");
      }
    } catch (e) {
      console.warn("⚠️ Could not read showtimes for logging:", e);
    }
    // Seed bookings và tickets theo đúng thứ tự và đảm bảo bảng tồn tại
    try {
      const ok = seedBookingsAndTickets();
      console.log(ok ? "✅ Seeded default bookings and tickets" : "⚠️ Failed to seed bookings/tickets");
    } catch (e) {
      console.error("❌ Error seeding bookings/tickets:", e);
    }
  } catch (error) {
    console.error("❌ Error initializing database:", error);
  }
};

// ============================================
// DATABASE MIGRATION
// ============================================
const migrateDatabase = () => {
  try {
    // Kiểm tra xem cột duration_minutes đã tồn tại chưa
    const tableInfo = db.getAllSync("PRAGMA table_info(movies)");
    const hasDuration = tableInfo.some(col => col.name === "duration_minutes");

    if (!hasDuration) {
      console.log("🔄 Migrating database: Adding duration_minutes column...");
      db.execSync("ALTER TABLE movies ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 120");
      console.log("✅ Added duration_minutes column");
    }

    // Cập nhật các giá trị status cũ sang format mới
    console.log("🔄 Updating status values to new format...");
    db.execSync(`
      UPDATE movies 
      SET status = CASE 
        WHEN status = 'To Watch' THEN 'COMING_SOON'
        WHEN status = 'Watching' THEN 'SHOWING'
        WHEN status = 'Watched' THEN 'ENDED'
        WHEN status IN ('COMING_SOON', 'SHOWING', 'ENDED') THEN status
        ELSE 'COMING_SOON'
      END
      WHERE status NOT IN ('COMING_SOON', 'SHOWING', 'ENDED')
    `);
    console.log("✅ Database migration completed");

    // Ensure collections table and required columns exist
    try {
      db.execSync(`CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now')),
        UNIQUE(user_id, name)
      )`);
      const collectionsInfo = db.getAllSync("PRAGMA table_info(collections)");
      const hasUserIdCol = collectionsInfo.some(col => col.name === "user_id");
      const hasNameCol = collectionsInfo.some(col => col.name === "name");
      const hasCreatedAtCol = collectionsInfo.some(col => col.name === "created_at");
      if (!hasUserIdCol) {
        console.log("🔄 Migrating: Adding collections.user_id");
        db.execSync("ALTER TABLE collections ADD COLUMN user_id INTEGER");
      }
      if (!hasNameCol) {
        console.log("🔄 Migrating: Adding collections.name");
        db.execSync("ALTER TABLE collections ADD COLUMN name TEXT");
      }
      if (!hasCreatedAtCol) {
        console.log("🔄 Migrating: Adding collections.created_at");
        db.execSync("ALTER TABLE collections ADD COLUMN created_at DATETIME DEFAULT (datetime('now'))");
      }
    } catch (e) {
      console.error("❌ Migration error (collections):", e);
    }

    // Ensure collection_items table exists
    try {
      db.execSync(`CREATE TABLE IF NOT EXISTS collection_items (
        collection_id INTEGER NOT NULL,
        movie_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT (datetime('now')),
        PRIMARY KEY (collection_id, movie_id)
      )`);
      const ciInfo = db.getAllSync("PRAGMA table_info(collection_items)");
      const hasCollectionId = ciInfo.some(col => col.name === "collection_id");
      const hasMovieId = ciInfo.some(col => col.name === "movie_id");
      const hasAddedAt = ciInfo.some(col => col.name === "added_at");
      if (!hasCollectionId) {
        console.log("🔄 Migrating: Adding collection_items.collection_id");
        db.execSync("ALTER TABLE collection_items ADD COLUMN collection_id INTEGER");
      }
      if (!hasMovieId) {
        console.log("🔄 Migrating: Adding collection_items.movie_id");
        db.execSync("ALTER TABLE collection_items ADD COLUMN movie_id INTEGER");
      }
      if (!hasAddedAt) {
        console.log("🔄 Migrating: Adding collection_items.added_at");
        db.execSync("ALTER TABLE collection_items ADD COLUMN added_at DATETIME DEFAULT (datetime('now'))");
      }
    } catch (e) {
      console.error("❌ Migration error (collection_items):", e);
    }

    // Ensure reviews table exists
    try {
      db.execSync(`CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        created_at DATETIME DEFAULT (datetime('now'))
      )`);
      const rvInfo = db.getAllSync("PRAGMA table_info(reviews)");
      const cols = ["movie_id", "user_id", "content", "status", "created_at"];
      cols.forEach((c) => {
        const exists = rvInfo.some(col => col.name === c);
        if (!exists) {
          console.log(`🔄 Migrating: Adding reviews.${c}`);
          if (c === "status") {
            db.execSync("ALTER TABLE reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
          } else if (c === "created_at") {
            db.execSync("ALTER TABLE reviews ADD COLUMN created_at DATETIME DEFAULT (datetime('now'))");
          } else if (c === "content") {
            db.execSync("ALTER TABLE reviews ADD COLUMN content TEXT");
          } else {
            db.execSync(`ALTER TABLE reviews ADD COLUMN ${c} INTEGER`);
          }
        }
      });
    } catch (e) {
      console.error("❌ Migration error (reviews):", e);
    }
  } catch (error) {
    console.error("❌ Error migrating database:", error);
  }
};

// ============================================
// STEP 2: Core CRUD + Queries
// ============================================

// 2.1 Get all movies (ORDER BY id DESC)
export const getAllMovies = () => {
  try {
    const allRows = db.getAllSync("SELECT * FROM movies ORDER BY id DESC");
    return allRows;
  } catch (error) {
    console.error("❌ Error getAllMovies:", error);
    return [];
  }
};

// 2.2 Add a movie
export const addMovie = (
  title,
  category,
  releaseYear,
  durationMinutes = 120,
  status = "COMING_SOON",
  posterUri = null
) => {
  try {
    const result = db.runSync(
      "INSERT INTO movies (title, category, release_year, duration_minutes, status, poster_uri) VALUES (?, ?, ?, ?, ?, ?)",
      [title, category, releaseYear, durationMinutes, status, posterUri]
    );
    console.log("✅ Movie added with ID:", result.lastInsertRowId);
    return true;
  } catch (error) {
    console.error("❌ Error addMovie:", error);
    return false;
  }
};

// 2.3 Delete by id
export const deleteMovie = (id) => {
  try {
    const result = db.runSync("DELETE FROM movies WHERE id = ?", [id]);
    console.log("✅ Movie deleted, rows affected:", result.changes);
    return true;
  } catch (error) {
    console.error("❌ Error deleteMovie:", error);
    return false;
  }
};

// 2.4 Update movie fields
export const updateMovie = (
  id,
  title,
  category,
  releaseYear,
  durationMinutes,
  status,
  posterUri
) => {
  try {
    const result = db.runSync(
      "UPDATE movies SET title = ?, category = ?, release_year = ?, duration_minutes = ?, status = ?, poster_uri = ? WHERE id = ?",
      [title, category, releaseYear, durationMinutes, status, posterUri, id]
    );
    console.log("✅ Movie updated, rows affected:", result.changes);
    return true;
  } catch (error) {
    console.error("❌ Error updateMovie:", error);
    return false;
  }
};

// 2.5 Update only status
export const updateMovieStatus = (id, newStatus) => {
  try {
    const result = db.runSync("UPDATE movies SET status = ? WHERE id = ?", [
      newStatus,
      id,
    ]);
    console.log("✅ Status updated, rows affected:", result.changes);
    return true;
  } catch (error) {
    console.error("❌ Error updateMovieStatus:", error);
    return false;
  }
};

// 2.6 Get movie by id
export const getMovieById = (id) => {
  try {
    const movie = db.getFirstSync("SELECT * FROM movies WHERE id = ?", [id]);
    return movie;
  } catch (error) {
    console.error("❌ Error getMovieById:", error);
    return null;
  }
};

// 2.7 Search by title OR category (LIKE)
export const searchMovies = (searchQuery) => {
  try {
    const query = `%${searchQuery}%`;
    const results = db.getAllSync(
      "SELECT * FROM movies WHERE title LIKE ? OR category LIKE ? ORDER BY release_year DESC",
      [query, query]
    );
    return results;
  } catch (error) {
    console.error("❌ Error searchMovies:", error);
    return [];
  }
};

// 2.8 Filter by year and/or status and/or category (dynamic WHERE)
export const filterMovies = (year = null, status = null, category = null) => {
  try {
    let query = "SELECT * FROM movies WHERE 1=1";
    const params = [];
    if (year) {
      query += " AND release_year = ?";
      params.push(year);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    query += " ORDER BY release_year DESC";
    const results = db.getAllSync(query, params);
    return results;
  } catch (error) {
    console.error("❌ Error filterMovies:", error);
    return [];
  }
};

// ============================================
// STEP 3: Reports & Stats (Advanced)
// ============================================

// 3.0 Get all unique categories (for filter dropdown)
export const getAllCategories = () => {
  try {
    const results = db.getAllSync(`
      SELECT DISTINCT category
      FROM movies
      ORDER BY category ASC
    `);
    return results.map(row => row.category);
  } catch (error) {
    console.error("❌ Error getAllCategories:", error);
    return [];
  }
};

// 3.1 Count movies by category (GROUP BY)
export const getMovieCountByCategory = () => {
  try {
    const results = db.getAllSync(`
      SELECT category, COUNT(*) AS total_movies
      FROM movies
      GROUP BY category
      ORDER BY total_movies DESC
    `);
    return results;
  } catch (error) {
    console.error("❌ Error getMovieCountByCategory:", error);
    return [];
  }
};

// 3.2 Abnormally high Favorite years (> average*1.3)
export const getAbnormallyHighFavoriteYears = () => {
  try {
    const results = db.getAllSync(`
      SELECT release_year, COUNT(*) AS favorite_count
      FROM movies
      WHERE status = 'Favorite'
      GROUP BY release_year
      HAVING favorite_count > (
        SELECT AVG(count_per_year) * 1.3 FROM (
          SELECT COUNT(*) AS count_per_year
          FROM movies
          WHERE status = 'Favorite'
          GROUP BY release_year
        )
      )
      ORDER BY favorite_count DESC
    `);
    return results;
  } catch (error) {
    console.error("❌ Error getAbnormallyHighFavoriteYears:", error);
    return [];
  }
};

// 3.3 Get movies by status
export const getMoviesByStatus = (status) => {
  try {
    const results = db.getAllSync(
      "SELECT * FROM movies WHERE status = ? ORDER BY release_year DESC",
      [status]
    );
    return results;
  } catch (error) {
    console.error("❌ Error getMoviesByStatus:", error);
    return [];
  }
};

// 3.4 Overall stats (counts per status)
export const getMovieStats = () => {
  try {
    const total =
      db.getFirstSync("SELECT COUNT(*) as count FROM movies")?.count || 0;
    const watched =
      db.getFirstSync("SELECT COUNT(*) as count FROM movies WHERE status = ?", [
        "Watched",
      ])?.count || 0;
    const toWatch =
      db.getFirstSync("SELECT COUNT(*) as count FROM movies WHERE status = ?", [
        "To Watch",
      ])?.count || 0;
    const favorite =
      db.getFirstSync("SELECT COUNT(*) as count FROM movies WHERE status = ?", [
        "Favorite",
      ])?.count || 0;
    return { total, watched, toWatch, favorite };
  } catch (error) {
    console.error("❌ Error getMovieStats:", error);
    return { total: 0, watched: 0, toWatch: 0, favorite: 0 };
  }
};

// ============================================
// STEP 4: Data Export/Import (Advanced)
// ============================================

// 4.1 Export all data (reuse getAllMovies)
export const exportMoviesData = () => {
  try {
    return getAllMovies();
  } catch (error) {
    console.error("❌ Error exportMoviesData:", error);
    return [];
  }
};

// 4.2 Import from JSON (skip or overwrite duplicates)
export const importMoviesData = (moviesData, overwrite = false) => {
  let success = 1,
    failed = 0,
    skipped = 0;
  try {
    moviesData.forEach((movie) => {
      try {
        const existing = movie.id ? getMovieById(movie.id) : null;
        if (existing) {
          if (overwrite) {
            const updated = updateMovie(
              movie.id,
              movie.title,
              movie.category,
              movie.release_year,
              movie.duration_minutes || 120,
              movie.status,
              movie.poster_uri
            );
            if (updated) success++;
            else failed++;
          } else {
            skipped++;
          }
        } else {
          const added = addMovie(
            movie.title,
            movie.category,
            movie.release_year,
            movie.duration_minutes || 120,
            movie.status,
            movie.poster_uri
          );
          if (added) success++;
          else failed++;
        }
      } catch (err) {
        console.error("❌ Error importing movie:", err);
        failed++;
      }
    });
    return { success, failed, skipped };
  } catch (error) {
    console.error("❌ Error importMoviesData:", error);
    return { success, failed, skipped };
  }
};

// 4.3 Delete all (testing helper)
export const deleteAllMovies = () => {
  try {
    db.runSync("DROP TABLE IF EXISTS movies");
    console.log("✅ All movies deleted");
    return true;
  } catch (error) {
    console.error("❌ Error deleteAllMovies:", error);
    return false;
  }
};

// ============================================
// COLLECTIONS – UC-24/25/26
// ============================================

export const createCollection = (userId, name) => {
  try {
    const result = db.runSync(
      "INSERT INTO collections (user_id, name) VALUES (?, ?)",
      [userId, name.trim()]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("❌ Error createCollection:", error);
    return { success: false, error };
  }
};

export const getCollectionsByUser = (userId) => {
  try {
    return db.getAllSync(
      "SELECT * FROM collections WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
  } catch (error) {
    console.error("❌ Error getCollectionsByUser:", error);
    return [];
  }
};

export const renameCollection = (collectionId, newName) => {
  try {
    const res = db.runSync(
      "UPDATE collections SET name = ? WHERE id = ?",
      [newName.trim(), collectionId]
    );
    return res.changes > 0;
  } catch (error) {
    console.error("❌ Error renameCollection:", error);
    return false;
  }
};

export const deleteCollectionById = (collectionId) => {
  try {
    const res = db.runSync("DELETE FROM collections WHERE id = ?", [collectionId]);
    return res.changes > 0;
  } catch (error) {
    console.error("❌ Error deleteCollectionById:", error);
    return false;
  }
};

export const addMovieToCollection = (collectionId, movieId) => {
  try {
    db.runSync(
      "INSERT OR IGNORE INTO collection_items (collection_id, movie_id) VALUES (?, ?)",
      [collectionId, movieId]
    );
    return true;
  } catch (error) {
    console.error("❌ Error addMovieToCollection:", error);
    return false;
  }
};

export const removeMovieFromCollection = (collectionId, movieId) => {
  try {
    const res = db.runSync(
      "DELETE FROM collection_items WHERE collection_id = ? AND movie_id = ?",
      [collectionId, movieId]
    );
    return res.changes > 0;
  } catch (error) {
    console.error("❌ Error removeMovieFromCollection:", error);
    return false;
  }
};

export const getCollectionMovies = (collectionId) => {
  try {
    return db.getAllSync(
      `SELECT m.*
       FROM collection_items ci
       JOIN movies m ON m.id = ci.movie_id
       WHERE ci.collection_id = ?
       ORDER BY m.title ASC`,
      [collectionId]
    );
  } catch (error) {
    console.error("❌ Error getCollectionMovies:", error);
    return [];
  }
};

// ============================================
// REVIEWS – UC-29 Moderation
// ============================================

export const addReview = (movieId, userId, content) => {
  try {
    const result = db.runSync(
      "INSERT INTO reviews (movie_id, user_id, content) VALUES (?, ?, ?)",
      [movieId, userId, content.trim()]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("❌ Error addReview:", error);
    return { success: false, error };
  }
};

export const getReviewsByMovie = (movieId) => {
  try {
    return db.getAllSync(
      `SELECT r.*, a.name, a.avatar_uri
        FROM reviews r 
        LEFT JOIN account a ON r.user_id = a.id 
        WHERE r.movie_id = ? 
        ORDER BY r.created_at DESC`, [movieId]
    );
  } catch (error) {
    console.error("❌ Error getReviewsByMovie:", error);
    return [];
  }
};

export const getUserReviewByUserId = (userId, movieId) => {
  try {
    return db.getFirstSync(
      `SELECT r.*, a.name, a.avatar_uri
       FROM reviews r 
       LEFT JOIN account a ON r.user_id = a.id 
       WHERE r.user_id = ? AND r.movie_id = ?`,
      [userId, movieId]
    );
  } catch (error) {
    console.error("❌ Error getUserReviewForMovie:", error);
    return null;
  }
};

export const deleteReview = (reviewId) => {
  try {
    db.runSync("DELETE FROM reviews WHERE id = ?", [reviewId]);
    return { success: true };
  } catch (error) {
    console.error("❌ Error deleteReview:", error);
    return { success: false, error };
  }
};

export const updateReview = (reviewId, content) => {
  try {
    db.runSync(
      "UPDATE reviews SET content = ? WHERE id = ?",
      [content.trim(), reviewId]
    );
    return { success: true };
  } catch (error) {
    console.error("❌ Error updateReview:", error);
    return { success: false, error };
  }
};






export const addToWishlist = async (userId, movieId) => {
  try {
    db.runSync(
      "INSERT INTO wishlist (user_id, movie_id) VALUES (?, ?)",
      [userId, movieId]
    );
    console.log("✅ Added to wishlist successfully");
  } catch (error) {
    console.error("❌ Error addToWishlist:", error);
  }
};

export const getWishlistByAccount = (userId) => {
  try {
    const wishlist = db.getAllSync(
      "SELECT * FROM wishlist WHERE user_id = ?",
      [userId]
    );
    return wishlist || [];
  } catch (error) {
    console.error("❌ Error getWishlistByAccount:", error);
  }
}

// Force reset và seed lại cinemas
export const resetAndSeedCinemas = () => {
  try {
    console.log("🔄 Resetting cinemas table...");
    db.runSync("DELETE FROM cinemas");
    console.log("✅ Cleared all cinemas");
    seedCinemasCanTho();
  } catch (error) {
    console.error("❌ Error resetting cinemas:", error);
  }
};

// Seed cinemas data cho Cần Thơ
export const seedCinemasCanTho = () => {
  try {
    const existingCinemas = db.getAllSync("SELECT COUNT(*) as count FROM cinemas");
    console.log("🔍 Checking existing cinemas:", existingCinemas);

    if (existingCinemas[0].count > 0) {
      console.log("✅ Cinemas already seeded, count:", existingCinemas[0].count);
      return;
    }

    console.log("🌱 Starting to seed cinemas for Cần Thơ...");

    // Dựa vào ảnh Google Maps của bạn
    const cinemas = [
      {
        name: "Lotte Cinema Ninh Kiều",
        address: "Tầng 3 TTTM Lotte Mart, 84 Đ. Mậu Thân, Ninh Kiều, Cần Thơ",
        latitude: 10.0340,
        longitude: 105.7680,
        phone: "0292 3696 898",
        openingHours: "9:00 - 23:00",
        website: "https://www.lottecinemavn.com",
        totalScreens: 6,
        facilities: "3D, 4DX, Dolby Atmos"
      },
      {
        name: "CGV Vincom Xuân Khánh",
        address: "209 Đ. 30 Tháng 4, Xuân Khánh, Ninh Kiều, Cần Thơ",
        latitude: 10.0365,
        longitude: 105.7590,
        phone: "1900 6017",
        openingHours: "8:00 - 24:00",
        website: "https://www.cgv.vn",
        totalScreens: 5,
        facilities: "3D, IMAX, Sweetbox"
      },
      {
        name: "CGV Sense City Cần Thơ",
        address: "Sense City, 1 Đ. Hoà Bình, An Hòa, Ninh Kiều, Cần Thơ",
        latitude: 10.0450,
        longitude: 105.7620,
        phone: "1900 6017",
        openingHours: "8:00 - 24:00",
        website: "https://www.cgv.vn",
        totalScreens: 7,
        facilities: "3D, 4DX, ScreenX, Sweetbox"
      },
      {
        name: "CGV Vincom Hùng Vương",
        address: "Vincom Plaza Hùng Vương, Hùng Vương, An Hòa, Ninh Kiều, Cần Thơ",
        latitude: 10.0420,
        longitude: 105.7720,
        phone: "1900 6017",
        openingHours: "8:00 - 24:00",
        website: "https://www.cgv.vn",
        totalScreens: 5,
        facilities: "3D, Sweetbox, Gold Class"
      },
      {
        name: "Lotte Cinema Cần Thơ Cái Răng",
        address: "TTTM Sense Market, Cái Răng, Cần Thơ",
        latitude: 10.0290,
        longitude: 105.7850,
        phone: "0292 3696 888",
        openingHours: "9:00 - 23:00",
        website: "https://www.lottecinemavn.com",
        totalScreens: 4,
        facilities: "3D, Dolby Atmos"
      },
      {
        name: "Mega GS Cinemas Cần Thơ",
        address: "Vincom Plaza Xuân Khánh, Ninh Kiều, Cần Thơ",
        latitude: 10.0380,
        longitude: 105.7600,
        phone: "1900 2099",
        openingHours: "9:00 - 23:30",
        website: "https://www.megagscinemas.vn",
        totalScreens: 5,
        facilities: "3D, 4K Digital"
      }
    ];

    // Insert trực tiếp vào database
    cinemas.forEach((cinema, index) => {
      console.log(`🎬 Adding cinema ${index + 1}:`, cinema.name);
      try {
        const result = db.runSync(
          `INSERT INTO cinemas (name, address, latitude, longitude, phone, opening_hours, website, total_screens, facilities) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cinema.name, cinema.address, cinema.latitude, cinema.longitude, cinema.phone, cinema.openingHours, cinema.website, cinema.totalScreens, cinema.facilities]
        );
        console.log(`   ✅ Added with ID: ${result.lastInsertRowId}`);
      } catch (err) {
        console.error(`   ❌ Error adding ${cinema.name}:`, err);
      }
    });

    console.log("✅ Seeded 6 cinemas in Cần Thơ");
  } catch (error) {
    console.error("❌ Error seeding cinemas:", error);
  }
};

// ============================================
// CINEMAS CRUD OPERATIONS
// ============================================

// Thêm rạp mới
export const addCinema = (name, address, latitude, longitude, phone = null, openingHours = null, website = null, totalScreens = 0, facilities = null) => {
  try {
    const result = db.runSync(
      `INSERT INTO cinemas (name, address, latitude, longitude, phone, opening_hours, website, total_screens, facilities) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, address, latitude, longitude, phone, openingHours, website, totalScreens, facilities]
    );
    console.log("✅ Cinema added with ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Error addCinema:", error);
    return null;
  }
};

// Lấy tất cả rạp
export const getAllCinemas = () => {
  try {
    return db.getAllSync("SELECT * FROM cinemas ORDER BY name");
  } catch (error) {
    console.error("❌ Error getAllCinemas:", error);
    return [];
  }
};

// Lấy rạp theo ID
export const getCinemaById = (id) => {
  try {
    return db.getFirstSync("SELECT * FROM cinemas WHERE id = ?", [id]);
  } catch (error) {
    console.error("❌ Error getCinemaById:", error);
    return null;
  }
};

// Tìm rạp gần vị trí (trong bán kính km)
export const findNearbyCinemas = (latitude, longitude, radiusKm = 10) => {
  try {
    // Haversine formula approximation trong SQLite
    // 111.045 km = 1 degree latitude
    const allCinemas = db.getAllSync("SELECT * FROM cinemas");

    return allCinemas
      .map(cinema => {
        const latDiff = cinema.latitude - latitude;
        const lonDiff = cinema.longitude - longitude;
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111.045;
        return { ...cinema, distance };
      })
      .filter(cinema => cinema.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error("❌ Error findNearbyCinemas:", error);
    return [];
  }
};

// Cập nhật rạp
export const updateCinema = (id, name, address, latitude, longitude, phone, openingHours, website, totalScreens, facilities) => {
  try {
    const result = db.runSync(
      `UPDATE cinemas 
       SET name = ?, address = ?, latitude = ?, longitude = ?, phone = ?, 
           opening_hours = ?, website = ?, total_screens = ?, facilities = ?
       WHERE id = ?`,
      [name, address, latitude, longitude, phone, openingHours, website, totalScreens, facilities, id]
    );
    console.log("✅ Cinema updated, rows affected:", result.changes);
    return result.changes > 0;
  } catch (error) {
    console.error("❌ Error updateCinema:", error);
    return false;
  }
};

// Xóa rạp
export const deleteCinema = (id) => {
  try {
    const result = db.runSync("DELETE FROM cinemas WHERE id = ?", [id]);
    console.log("✅ Cinema deleted, rows affected:", result.changes);
    return result.changes > 0;
  } catch (error) {
    console.error("❌ Error deleteCinema:", error);
    return false;
  }
};

// Xóa mục yêu thích theo ID
export const removeFromWishlistById = (wishlistId) => {
  try {
    const result = db.runSync("DELETE FROM wishlist WHERE id = ?", [wishlistId]);
    return result.changes > 0;
  } catch (error) {
    console.error("❌ Error removeFromWishlistById:", error);
    return false;
  }
};
// // Lấy lịch chiếu theo ngày
// export const getShowtimesByDate = (date) => {
//   try {
//     return db.getAllSync(`
//       SELECT s.*, m.title as movie_title, c.name as cinema_name
//       FROM showtimes s
//       JOIN movies m ON s.movie_id = m.id
//       JOIN cinemas c ON s.cinema_id = c.id
//       WHERE s.show_date = ?
//       ORDER BY s.show_time
//     `, [date]);
//   } catch (error) {
//     console.error("❌ Error getShowtimesByDate:", error);
//     return [];
//   }
// };

// // Cập nhật số ghế còn trống
// export const updateShowtimeSeats = (showtimeId, availableSeats) => {
//   try {
//     const result = db.runSync(
//       "UPDATE showtimes SET available_seats = ? WHERE id = ?",
//       [availableSeats, showtimeId]
//     );
//     console.log("✅ Showtime seats updated");
//     return result.changes > 0;
//   } catch (error) {
//     console.error("❌ Error updateShowtimeSeats:", error);
//     return false;
//   }
// };

// // Xóa lịch chiếu
// export const deleteShowtime = (id) => {
//   try {
//     const result = db.runSync("DELETE FROM showtimes WHERE id = ?", [id]);
//     console.log("✅ Showtime deleted");
//     return result.changes > 0;
//   } catch (error) {
//     console.error("❌ Error deleteShowtime:", error);
//     return false;
//   }
// };

// Seed dữ liệu mẫu cho cinemas
export const seedSampleCinemas = () => {
  const sampleCinemas = [
    {
      name: "CGV Vincom Center",
      address: "72 Lê Thánh Tôn, Quận 1, TP.HCM",
      latitude: 10.7769,
      longitude: 106.7009,
      phone: "1900 6017",
      openingHours: "8:00 - 23:00",
      website: "https://www.cgv.vn",
      totalScreens: 8,
      facilities: "IMAX, 4DX, Parking, Food Court"
    },
    {
      name: "Lotte Cinema Diamond",
      address: "34 Lê Duẩn, Quận 1, TP.HCM",
      latitude: 10.7823,
      longitude: 106.6991,
      phone: "1900 5454",
      openingHours: "8:30 - 23:30",
      website: "https://www.lottecinemavn.com",
      totalScreens: 12,
      facilities: "4K, Dolby Atmos, Parking"
    },
    {
      name: "Galaxy Cinema Nguyễn Du",
      address: "116 Nguyễn Du, Quận 1, TP.HCM",
      latitude: 10.7792,
      longitude: 106.6945,
      phone: "1900 2224",
      openingHours: "9:00 - 23:00",
      website: "https://www.galaxycine.vn",
      totalScreens: 6,
      facilities: "Screenx, Parking, Snack Bar"
    }
  ];

  try {
    const existingCinemas = getAllCinemas();
    if (existingCinemas.length === 0) {
      sampleCinemas.forEach(cinema => {
        addCinema(
          cinema.name,
          cinema.address,
          cinema.latitude,
          cinema.longitude,
          cinema.phone,
          cinema.openingHours,
          cinema.website,
          cinema.totalScreens,
          cinema.facilities
        );
      });
      console.log("✅ Sample cinemas seeded");
    }
  } catch (error) {
    console.error("❌ Error seeding cinemas:", error);
  }
};



// ============================================
// STEP 5: Auto-init on import
// ============================================

(async () => {
  await initDatabase();
  seedSampleCinemas();
})();


// ============================================
// OPTIONAL TESTS (commented out)
// ============================================
/*
console.log('--- Quick DB smoke test ---');
initDatabase();
addMovie('Inception', 'Science Fiction', 2010, 'Watched');
console.log('All:', getAllMovies());
*/
