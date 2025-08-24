CREATE DATABASE IF NOT EXISTS mural_emaus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mural_emaus;

CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NULL,
  caption VARCHAR(255) NULL,
  file_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (room_id),
  INDEX idx_created (created_at)
);
