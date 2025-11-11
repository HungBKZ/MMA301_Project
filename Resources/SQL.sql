-- ==============================
-- PHIÊN BẢN SQLITE (nguyên mẫu bạn cung cấp)
-- ==============================
-- Movies được thay mới

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  release_year INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'COMING_SOON' CHECK(status IN ('COMING_SOON', 'SHOWING', 'ENDED')),
  poster_uri TEXT
);

-- Ensure required 'cinemas' table exists for the SQLite schema where rooms.cinema_id references cinemas(id)
CREATE TABLE IF NOT EXISTS cinemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Các bảng còn lại (SQLite tương thích cơ bản, tùy bạn có chuyển toàn bộ hay không)
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cinema_id INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

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

CREATE TABLE IF NOT EXISTS showtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  base_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(movie_id) REFERENCES movies(id),
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(showtime_id) REFERENCES showtimes(id)
);

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(showtime_id, seat_id),
  FOREIGN KEY(showtime_id) REFERENCES showtimes(id),
  FOREIGN KEY(seat_id) REFERENCES seats(id),
  FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

-- ==============================
-- PHIÊN BẢN MYSQL (chuyển đổi tương đương)
-- ==============================
-- Lưu ý: Chỉ dùng phần này nếu bạn vẫn chạy MySQL
-- Bảng movies đã đổi cấu trúc theo yêu cầu (dùng INT + CHECK thay vì ENUM, TEXT dạng VARCHAR)
-- ==============================

-- DROP TABLE IF EXISTS tickets;
-- DROP TABLE IF EXISTS bookings;
-- DROP TABLE IF EXISTS showtimes;
-- DROP TABLE IF EXISTS seats;
-- DROP TABLE IF EXISTS rooms;
-- DROP TABLE IF EXISTS movies;

CREATE TABLE IF NOT EXISTS movies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  release_year INT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'COMING_SOON'
    CHECK (status IN ('COMING_SOON','SHOWING','ENDED')),
  poster_uri VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status (status),
  KEY idx_release_year (release_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id BIGINT UNSIGNED NOT NULL,
  row_label VARCHAR(10) NOT NULL,
  seat_number INT NOT NULL,
  seat_type ENUM('STANDARD','VIP','ACCESSIBLE') NOT NULL DEFAULT 'STANDARD',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uniq_seat (room_id, row_label, seat_number),
  KEY idx_room (room_id),
  CONSTRAINT fk_seats_room FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS showtimes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  movie_id INT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  base_price INT NOT NULL,
  status ENUM('SCHEDULED','CANCELED','FINISHED') NOT NULL DEFAULT 'SCHEDULED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_room_start (room_id, start_time),
  KEY idx_movie_start (movie_id, start_time),
  KEY idx_status (status),
  CONSTRAINT fk_showtimes_movie FOREIGN KEY (movie_id) REFERENCES movies(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_showtimes_room FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  showtime_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','AWAITING_PAYMENT','PAID','CANCELED','EXPIRED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  total_amount INT NOT NULL DEFAULT 0,
  discount_amount INT NOT NULL DEFAULT 0,
  final_amount INT NOT NULL DEFAULT 0,
  payment_method ENUM('NONE','CASH','CARD','EWALLET','BANK_TRANSFER') NOT NULL DEFAULT 'NONE',
  payment_reference VARCHAR(100) NULL,
  hold_expires_at DATETIME NULL,
  notes VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user (user_id),
  KEY idx_showtime (showtime_id),
  KEY idx_status (status),
  KEY idx_hold_expires_at (hold_expires_at),
  KEY idx_booking_id_showtime (id, showtime_id),
  CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  showtime_id BIGINT UNSIGNED NOT NULL,
  seat_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  price_paid INT NOT NULL,
  status ENUM('HELD','PAID','CANCELED','EXPIRED') NOT NULL DEFAULT 'HELD',
  hold_expires_at DATETIME NULL,
  qr_code VARCHAR(200) NULL,
  checked_in_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_showtime_seat (showtime_id, seat_id),
  KEY idx_showtime_status (showtime_id, status),
  KEY idx_booking (booking_id),
  KEY idx_hold_expires_at (hold_expires_at),
  CONSTRAINT fk_tickets_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_seat FOREIGN KEY (seat_id) REFERENCES seats(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tickets_booking_pair FOREIGN KEY (booking_id, showtime_id)
    REFERENCES bookings(id, showtime_id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data seed for SQLite schema
-- Includes: cinemas, movies, rooms, seats, showtimes, bookings, tickets
-- Assumptions:
-- - There are 3 cinemas with ids 1, 2, 3 as requested.
-- - 6 rooms distributed across the 3 cinemas (2 rooms per cinema).
-- - Every movie has at least one showtime.
-- - Past movies have FINISHED showtimes in the past; SHOWING are scheduled today; COMING_SOON are scheduled in the near future.
-- - A 15-minute cleaning/buffer time is included in end_time calculations.

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Cinemas (3 rạp: id 1,2,3)
INSERT INTO cinemas (id, code, name, address, is_active)
VALUES
  (1, 'CIN1', 'Rạp 1', '123 Đường A, TP.HCM', 1),
  (2, 'CIN2', 'Rạp 2', '456 Đường B, Hà Nội', 1),
  (3, 'CIN3', 'Rạp 3', '789 Đường C, Đà Nẵng', 1)
ON CONFLICT(id) DO NOTHING;

-- Movies (from provided JSON; ids kept to match references)
INSERT INTO movies (id, title, category, release_year, duration_minutes, status, poster_uri)
VALUES
  (1, 'Inception', 'Science Fiction', 2010, 148, 'ENDED', 'https://image.tmdb.org/t/p/w500/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg'),
  (2, 'The Dark Knight', 'Action', 2008, 152, 'ENDED', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg'),
  (3, 'Parasite', 'Drama', 2019, 132, 'ENDED', 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg'),
  (4, 'Interstellar', 'Science Fiction', 2014, 169, 'ENDED', 'https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg'),
  (5, 'La La Land', 'Romance', 2016, 128, 'ENDED', 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg'),
  (6, 'Avengers: Endgame', 'Action', 2019, 181, 'ENDED', 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg'),
  (7, 'Joker', 'Thriller', 2019, 122, 'ENDED', 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg'),
  (8, 'Spirited Away', 'Animation', 2001, 125, 'ENDED', 'https://image.tmdb.org/t/p/w500/oRvMaJOmapypFUcQqpgHMZA6qL9.jpg'),
  (9, 'The Godfather', 'Crime', 1972, 175, 'ENDED', 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg'),
  (10, 'Dune: Part Two', 'Science Fiction', 2024, 166, 'SHOWING', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
  (11, 'Deadpool 3', 'Action', 2025, 120, 'COMING_SOON', 'https://image.tmdb.org/t/p/w500/4yrOyO3N55XazHQXXYoqiiPQd40.jpg'),
  (12, 'Avatar 3', 'Science Fiction', 2025, 180, 'COMING_SOON', 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg')
ON CONFLICT(id) DO UPDATE SET
  title=excluded.title,
  category=excluded.category,
  release_year=excluded.release_year,
  duration_minutes=excluded.duration_minutes,
  status=excluded.status,
  poster_uri=excluded.poster_uri;

-- Rooms (6 rooms, distributed across 3 cinemas; explicit ids for referencing)
INSERT INTO rooms (id, cinema_id, code, name, is_active)
VALUES
  (1, 1, 'C1-ROOM1', 'Cinema 1 - Room 1', 1),
  (2, 1, 'C1-ROOM2', 'Cinema 1 - Room 2', 1),
  (3, 2, 'C2-ROOM1', 'Cinema 2 - Room 1', 1),
  (4, 2, 'C2-ROOM2', 'Cinema 2 - Room 2', 1),
  (5, 3, 'C3-ROOM1', 'Cinema 3 - Room 1', 1),
  (6, 3, 'C3-ROOM2', 'Cinema 3 - Room 2', 1)
ON CONFLICT(id) DO UPDATE SET
  cinema_id=excluded.cinema_id,
  code=excluded.code,
  name=excluded.name,
  is_active=excluded.is_active;

-- Seats
-- Seat layout per room: Rows A-C, seats 1..6 = 18 seats/room
-- Types: Row A = VIP, Row B = STANDARD, Row C seat 1 = ACCESSIBLE, others STANDARD
-- Explicit seat ids: room r has seat ids from base=(r-1)*18 + 1 to base+18
INSERT INTO seats (id, room_id, row_label, seat_number, seat_type, is_active) VALUES
-- Room 1 (ids 1..18)
(1,1,'A',1,'VIP',1),(2,1,'A',2,'VIP',1),(3,1,'A',3,'VIP',1),(4,1,'A',4,'VIP',1),(5,1,'A',5,'VIP',1),(6,1,'A',6,'VIP',1),
(7,1,'B',1,'STANDARD',1),(8,1,'B',2,'STANDARD',1),(9,1,'B',3,'STANDARD',1),(10,1,'B',4,'STANDARD',1),(11,1,'B',5,'STANDARD',1),(12,1,'B',6,'STANDARD',1),
(13,1,'C',1,'ACCESSIBLE',1),(14,1,'C',2,'STANDARD',1),(15,1,'C',3,'STANDARD',1),(16,1,'C',4,'STANDARD',1),(17,1,'C',5,'STANDARD',1),(18,1,'C',6,'STANDARD',1),
-- Room 2 (ids 19..36)
(19,2,'A',1,'VIP',1),(20,2,'A',2,'VIP',1),(21,2,'A',3,'VIP',1),(22,2,'A',4,'VIP',1),(23,2,'A',5,'VIP',1),(24,2,'A',6,'VIP',1),
(25,2,'B',1,'STANDARD',1),(26,2,'B',2,'STANDARD',1),(27,2,'B',3,'STANDARD',1),(28,2,'B',4,'STANDARD',1),(29,2,'B',5,'STANDARD',1),(30,2,'B',6,'STANDARD',1),
(31,2,'C',1,'ACCESSIBLE',1),(32,2,'C',2,'STANDARD',1),(33,2,'C',3,'STANDARD',1),(34,2,'C',4,'STANDARD',1),(35,2,'C',5,'STANDARD',1),(36,2,'C',6,'STANDARD',1),
-- Room 3 (ids 37..54)
(37,3,'A',1,'VIP',1),(38,3,'A',2,'VIP',1),(39,3,'A',3,'VIP',1),(40,3,'A',4,'VIP',1),(41,3,'A',5,'VIP',1),(42,3,'A',6,'VIP',1),
(43,3,'B',1,'STANDARD',1),(44,3,'B',2,'STANDARD',1),(45,3,'B',3,'STANDARD',1),(46,3,'B',4,'STANDARD',1),(47,3,'B',5,'STANDARD',1),(48,3,'B',6,'STANDARD',1),
(49,3,'C',1,'ACCESSIBLE',1),(50,3,'C',2,'STANDARD',1),(51,3,'C',3,'STANDARD',1),(52,3,'C',4,'STANDARD',1),(53,3,'C',5,'STANDARD',1),(54,3,'C',6,'STANDARD',1),
-- Room 4 (ids 55..72)
(55,4,'A',1,'VIP',1),(56,4,'A',2,'VIP',1),(57,4,'A',3,'VIP',1),(58,4,'A',4,'VIP',1),(59,4,'A',5,'VIP',1),(60,4,'A',6,'VIP',1),
(61,4,'B',1,'STANDARD',1),(62,4,'B',2,'STANDARD',1),(63,4,'B',3,'STANDARD',1),(64,4,'B',4,'STANDARD',1),(65,4,'B',5,'STANDARD',1),(66,4,'B',6,'STANDARD',1),
(67,4,'C',1,'ACCESSIBLE',1),(68,4,'C',2,'STANDARD',1),(69,4,'C',3,'STANDARD',1),(70,4,'C',4,'STANDARD',1),(71,4,'C',5,'STANDARD',1),(72,4,'C',6,'STANDARD',1),
-- Room 5 (ids 73..90)
(73,5,'A',1,'VIP',1),(74,5,'A',2,'VIP',1),(75,5,'A',3,'VIP',1),(76,5,'A',4,'VIP',1),(77,5,'A',5,'VIP',1),(78,5,'A',6,'VIP',1),
(79,5,'B',1,'STANDARD',1),(80,5,'B',2,'STANDARD',1),(81,5,'B',3,'STANDARD',1),(82,5,'B',4,'STANDARD',1),(83,5,'B',5,'STANDARD',1),(84,5,'B',6,'STANDARD',1),
(85,5,'C',1,'ACCESSIBLE',1),(86,5,'C',2,'STANDARD',1),(87,5,'C',3,'STANDARD',1),(88,5,'C',4,'STANDARD',1),(89,5,'C',5,'STANDARD',1),(90,5,'C',6,'STANDARD',1),
-- Room 6 (ids 91..108)
(91,6,'A',1,'VIP',1),(92,6,'A',2,'VIP',1),(93,6,'A',3,'VIP',1),(94,6,'A',4,'VIP',1),(95,6,'A',5,'VIP',1),(96,6,'A',6,'VIP',1),
(97,6,'B',1,'STANDARD',1),(98,6,'B',2,'STANDARD',1),(99,6,'B',3,'STANDARD',1),(100,6,'B',4,'STANDARD',1),(101,6,'B',5,'STANDARD',1),(102,6,'B',6,'STANDARD',1),
(103,6,'C',1,'ACCESSIBLE',1),(104,6,'C',2,'STANDARD',1),(105,6,'C',3,'STANDARD',1),(106,6,'C',4,'STANDARD',1),(107,6,'C',5,'STANDARD',1),(108,6,'C',6,'STANDARD',1)
ON CONFLICT(id) DO NOTHING;

-- Showtimes (explicit ids, base_price varies by room: rooms 1/3/5 = 90000, rooms 2/4/6 = 120000)
-- Current UTC: 2025-11-11 06:32:27
INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, base_price, status)
VALUES
-- SHOWING (today, scheduled)
(1, 10, 1, '2025-11-11 10:00:00', '2025-11-11 13:01:00', 90000, 'SCHEDULED'),
(2, 10, 3, '2025-11-11 14:30:00', '2025-11-11 17:31:00', 90000, 'SCHEDULED'),
(3, 10, 5, '2025-11-11 19:00:00', '2025-11-11 22:01:00', 90000, 'SCHEDULED'),
-- COMING_SOON (future)
(4, 11, 2, '2025-12-05 20:00:00', '2025-12-05 22:15:00', 120000, 'SCHEDULED'),
(5, 12, 4, '2025-12-20 18:00:00', '2025-12-20 21:15:00', 120000, 'SCHEDULED'),
-- ENDED (past; finished)
(6, 1,  2, '2024-08-10 20:00:00', '2024-08-10 22:43:00', 120000, 'FINISHED'),
(7, 2,  4, '2024-08-11 20:00:00', '2024-08-11 22:47:00', 120000, 'FINISHED'),
(8, 3,  6, '2024-08-12 19:00:00', '2024-08-12 21:27:00', 120000, 'FINISHED'),
(9, 4,  1, '2024-08-13 20:00:00', '2024-08-13 23:04:00', 90000,  'FINISHED'),
(10, 5, 3, '2024-08-14 17:00:00', '2024-08-14 19:23:00', 90000,  'FINISHED'),
(11, 6, 5, '2024-08-15 18:30:00', '2024-08-15 21:46:00', 90000,  'FINISHED'),
(12, 7, 2, '2024-08-16 21:00:00', '2024-08-16 23:17:00', 120000, 'FINISHED'),
(13, 8, 6, '2024-08-17 15:00:00', '2024-08-17 17:20:00', 120000, 'FINISHED'),
(14, 9, 4, '2024-08-18 19:00:00', '2024-08-18 22:10:00', 120000, 'FINISHED');

-- Bookings (sample)
INSERT INTO bookings (id, booking_code, user_id, showtime_id, status, total_amount, discount_amount, final_amount, payment_method, payment_reference, hold_expires_at, notes)
VALUES
-- Dune: Part Two (today, room 1) - Paid booking with 3 seats
(1, 'BK-20251111-0001', NULL, 1, 'PAID', 270000, 0, 270000, 'CARD', 'TXN-STRIPE-001', NULL, '3 vé Dune 10:00'),
-- Dune: Part Two (today, room 3) - Paid booking with 2 seats
(2, 'BK-20251111-0002', NULL, 2, 'PAID', 180000, 0, 180000, 'CARD', 'TXN-STRIPE-002', NULL, '2 vé Dune 14:30'),
-- Avatar 3 (coming soon, room 4) - Awaiting payment, seats held
(3, 'BK-20251220-0001', NULL, 5, 'AWAITING_PAYMENT', 240000, 0, 240000, 'NONE', NULL, '2025-12-20 17:00:00', 'Giữ chỗ 2 vé Avatar 18:00'),
-- The Dark Knight (past, room 4) - Paid booking with 2 seats
(4, 'BK-20240811-0001', NULL, 7, 'PAID', 240000, 0, 240000, 'CASH', NULL, NULL, '2 vé TDK 20:00');

-- Tickets (per booked seat; price_paid = showtime base_price)
-- Note: tickets.booking_id + tickets.showtime_id pair must match an existing booking row.
INSERT INTO tickets (id, showtime_id, seat_id, booking_id, user_id, price_paid, status, hold_expires_at, qr_code, checked_in_at)
VALUES
-- Booking 1: showtime 1 (room 1), seats A1(1), A2(2), B1(7)
(1, 1, 1, 1, NULL, 90000, 'PAID', NULL, 'QR-BK-20251111-0001-A1', NULL),
(2, 1, 2, 1, NULL, 90000, 'PAID', NULL, 'QR-BK-20251111-0001-A2', NULL),
(3, 1, 7, 1, NULL, 90000, 'PAID', NULL, 'QR-BK-20251111-0001-B1', NULL),

-- Booking 2: showtime 2 (room 3), seats A1(37), C1(49)
(4, 2, 37, 2, NULL, 90000, 'PAID', NULL, 'QR-BK-20251111-0002-A1', NULL),
(5, 2, 49, 2, NULL, 90000, 'PAID', NULL, 'QR-BK-20251111-0002-C1', NULL),

-- Booking 3: showtime 5 (room 4), seats A1(55), A2(56) held
(6, 5, 55, 3, NULL, 120000, 'HELD', '2025-12-20 17:00:00', 'QR-BK-20251220-0001-A1', NULL),
(7, 5, 56, 3, NULL, 120000, 'HELD', '2025-12-20 17:00:00', 'QR-BK-20251220-0001-A2', NULL),

-- Booking 4: showtime 7 (room 4), seats B3(63), B4(64)
(8, 7, 63, 4, NULL, 120000, 'PAID', NULL, 'QR-BK-20240811-0001-B3', '2024-08-11 19:50:00'),
(9, 7, 64, 4, NULL, 120000, 'PAID', NULL, 'QR-BK-20240811-0001-B4', '2024-08-11 19:51:00');

COMMIT;