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

    // 4. Bảng SHOWTIMES (Lịch chiếu phim)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS showtimes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER NOT NULL,
        cinema_id INTEGER NOT NULL,
        screen_number INTEGER,
        show_date TEXT NOT NULL,
        show_time TEXT NOT NULL,
        price REAL DEFAULT 0,
        available_seats INTEGER DEFAULT 0,
        total_seats INTEGER DEFAULT 0,
        language TEXT DEFAULT 'Vietnamese',
        subtitle TEXT DEFAULT 'Vietnamese',
        created_at DATETIME DEFAULT (datetime('now')),
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
        FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON DELETE CASCADE
      );
    `);

    console.log("✅ Database initialized successfully (movies, cinemas, showtimes)");

    // Migration: Thêm duration_minutes và cập nhật status nếu chưa có
    migrateDatabase();
    await initAccountsTable();
    migrateAccountTable();
    await seedAdminAccount();
    seedCinemasCanTho(); // Tạo dữ liệu rạp Cần Thơ
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
    db.runSync("DELETE FROM movies");
    console.log("✅ All movies deleted");
    return true;
  } catch (error) {
    console.error("❌ Error deleteAllMovies:", error);
    return false;
  }
};

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

// ============================================
// SHOWTIMES CRUD OPERATIONS
// ============================================

// Thêm lịch chiếu mới
export const addShowtime = (movieId, cinemaId, screenNumber, showDate, showTime, price = 0, availableSeats = 0, totalSeats = 0, language = "Vietnamese", subtitle = "Vietnamese") => {
  try {
    const result = db.runSync(
      `INSERT INTO showtimes (movie_id, cinema_id, screen_number, show_date, show_time, price, available_seats, total_seats, language, subtitle)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [movieId, cinemaId, screenNumber, showDate, showTime, price, availableSeats, totalSeats, language, subtitle]
    );
    console.log("✅ Showtime added with ID:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("❌ Error addShowtime:", error);
    return null;
  }
};

// Lấy tất cả lịch chiếu
export const getAllShowtimes = () => {
  try {
    return db.getAllSync(`
      SELECT s.*, m.title as movie_title, c.name as cinema_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN cinemas c ON s.cinema_id = c.id
      ORDER BY s.show_date DESC, s.show_time DESC
    `);
  } catch (error) {
    console.error("❌ Error getAllShowtimes:", error);
    return [];
  }
};

// Lấy lịch chiếu theo phim
export const getShowtimesByMovie = (movieId) => {
  try {
    return db.getAllSync(`
      SELECT s.*, c.name as cinema_name, c.address as cinema_address
      FROM showtimes s
      JOIN cinemas c ON s.cinema_id = c.id
      WHERE s.movie_id = ?
      ORDER BY s.show_date, s.show_time
    `, [movieId]);
  } catch (error) {
    console.error("❌ Error getShowtimesByMovie:", error);
    return [];
  }
};

// Lấy lịch chiếu theo rạp
export const getShowtimesByCinema = (cinemaId) => {
  try {
    return db.getAllSync(`
      SELECT s.*, m.title as movie_title, m.poster_uri
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      WHERE s.cinema_id = ?
      ORDER BY s.show_date, s.show_time
    `, [cinemaId]);
  } catch (error) {
    console.error("❌ Error getShowtimesByCinema:", error);
    return [];
  }
};

// Lấy lịch chiếu theo ngày
export const getShowtimesByDate = (date) => {
  try {
    return db.getAllSync(`
      SELECT s.*, m.title as movie_title, c.name as cinema_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN cinemas c ON s.cinema_id = c.id
      WHERE s.show_date = ?
      ORDER BY s.show_time
    `, [date]);
  } catch (error) {
    console.error("❌ Error getShowtimesByDate:", error);
    return [];
  }
};

// Cập nhật số ghế còn trống
export const updateShowtimeSeats = (showtimeId, availableSeats) => {
  try {
    const result = db.runSync(
      "UPDATE showtimes SET available_seats = ? WHERE id = ?",
      [availableSeats, showtimeId]
    );
    console.log("✅ Showtime seats updated");
    return result.changes > 0;
  } catch (error) {
    console.error("❌ Error updateShowtimeSeats:", error);
    return false;
  }
};

// Xóa lịch chiếu
export const deleteShowtime = (id) => {
  try {
    const result = db.runSync("DELETE FROM showtimes WHERE id = ?", [id]);
    console.log("✅ Showtime deleted");
    return result.changes > 0;
  } catch (error) {
    console.error("❌ Error deleteShowtime:", error);
    return false;
  }
};

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
