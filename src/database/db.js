// ============================================
// DATABASE SKELETON – MOVIE MANAGEMENT APP
// ============================================
// Mục tiêu: Hoàn thiện các hàm SQLite cho bảng movies theo yêu cầu đồ án
// Làm theo từng TODO. Ước lượng thời gian: 15–25 phút (Core), +15 phút (Advanced)

import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store"; // Dùng để import trong authService

// ============================================
// STEP 0: Open database connection
// ============================================
const db = SQLite.openDatabaseSync("moviesApp.db");

// ============================================
// STEP 1: Initialize Database (Create Tables)
// ============================================
export const initDatabase = () => {
  try {
    // 1. Bảng MOVIES
    db.execSync(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        release_year INTEGER NOT NULL,
        status TEXT DEFAULT 'To Watch',
        poster_uri TEXT
      );
    `);

    // 2. Bảng account (SỬ DỤNG PASSWORD PLAIN TEXT - THEO YÊU CẦU)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT,             
        name TEXT,
        avatar_uri TEXT,
        role TEXT DEFAULT 'User', 
        oauth_provider TEXT,
        oauth_id TEXT,
        oauth_profile TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      );
    `);

    console.log("✅ Database initialized successfully (including account table)");
    seedAdminAccount(); // Tạo tài khoản admin mặc định sau khi tạo bảng
  } catch (error) {
    console.error("❌ Error initializing database:", error);
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
  status = "To Watch",
  posterUri = null
) => {
  try {
    const result = db.runSync(
      "INSERT INTO movies (title, category, release_year, status, poster_uri) VALUES (?, ?, ?, ?, ?)",
      [title, category, releaseYear, status, posterUri]
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
  status,
  posterUri
) => {
  try {
    const result = db.runSync(
      "UPDATE movies SET title = ?, category = ?, release_year = ?, status = ?, poster_uri = ? WHERE id = ?",
      [title, category, releaseYear, status, posterUri, id]
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
  let success = 0,
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
    db.runSync("DELETE FROM movies");
    console.log("✅ All movies deleted");
    return true;
  } catch (error) {
    console.error("❌ Error deleteAllMovies:", error);
    return false;
  }
};


// ============================================
// ACCOUNT HELPER FUNCTIONS (No hashing)
// ============================================

export const addUser = (email, password, name, avatar_uri, role = "user") => {
  try {
    const result = db.runSync(
      "INSERT INTO account (email, password, name, avatar_uri, role) VALUES (?, ?, ?, ?, ?)",
      [email, password, name, avatar_uri, role]
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error) {
    console.error("❌ Error addUser:", error);
    return { success: false, error };
  }
};

export const getUserByEmail = (email) => {
  try {
    const user = db.getFirstSync("SELECT * FROM account WHERE email = ?", [email]);
    return user || null;
  } catch (error) {
    console.error("❌ Error getUserByEmail:", error);
    return null;
  }
};

export const getUserById = (id) => {
  try {
    const user = db.getFirstSync("SELECT * FROM account WHERE id = ?", [id]);
    return user || null;
  } catch (error) {
    console.error("❌ Error getUserById:", error);
    return null;
  }
};

export const updateUserProfile = (id, { name, avatar_uri, email }) => {
  try {
    // COALESCE(?, column_name) cho phép truyền null để giữ nguyên giá trị cũ
    db.runSync(
      "UPDATE account SET name = COALESCE(?, name), avatar_uri = COALESCE(?, avatar_uri), email = COALESCE(?, email) WHERE id = ?",
      [name, avatar_uri, email, id]
    );
    return true;
  } catch (error) {
    console.error("❌ Error updateUserProfile:", error);
    return false;
  }
};

// Cập nhật mật khẩu (plain text)
export const updateUserPassword = (id, newPassword) => {
  try {
    db.runSync("UPDATE account SET password = ? WHERE id = ?", [newPassword, id]);
    return true;
  } catch (error) {
    console.error("❌ Error updateUserPassword:", error);
    return false;
  }
};

// Tạo/cập nhật user OAuth
export const upsertOAuthUser = (provider, oauthId, email, name = null, avatarUri = null) => {
  try {
    // 1. Tìm theo OAuth ID
    let existing = db.getFirstSync(
      "SELECT * FROM account WHERE oauth_provider = ? AND oauth_id = ?",
      [provider, oauthId]
    );
    let created = false;

    if (existing) {
      // Update
      db.runSync(
        "UPDATE account SET name = COALESCE(?, name), avatar_uri = COALESCE(?, avatar_uri) WHERE id = ?",
        [name, avatarUri, existing.id]
      );
      return { success: true, id: existing.id, created: false };
    } 
    
    // 2. Nếu chưa có, tạo mới
    const result = db.runSync(
      "INSERT INTO account (email, password, name, avatar_uri, role, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [email, null, name, avatarUri, "User", provider, oauthId]
    );
    return { success: true, id: result.lastInsertRowId, created: true };
    
  } catch (error) {
    console.error("❌ Error upsertOAuthUser:", error);
    return { success: false, error };
  }
};

export const seedAdminAccount = () => {
  const adminEmail = "admin@admin.com";
  const admin = getUserByEmail(adminEmail);
  if (!admin) {
    addUser(adminEmail, "admin123", "Super Admin", null, "admin"); // Mật khẩu plain text
    console.log("✅ Admin account seeded: admin@admin.com / admin123");
  }
};


// ============================================
// STEP 5: Auto-init on import
// ============================================

initDatabase();

// ============================================
// OPTIONAL TESTS (commented out)
// ============================================
/*
console.log('--- Quick DB smoke test ---');
initDatabase();
addMovie('Inception', 'Science Fiction', 2010, 'Watched');
console.log('All:', getAllMovies());
*/
