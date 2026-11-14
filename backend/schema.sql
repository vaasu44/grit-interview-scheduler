CREATE DATABASE IF NOT EXISTS grit CHARACTER SET utf8mb4;
USE grit;
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS interviews, slots, student_tracks, tracks, users;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role ENUM('student','interviewer','team') NOT NULL
);

CREATE TABLE tracks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

-- one row per (student, track): eligibility comes from the skill contests, badge from the interview
CREATE TABLE student_tracks (
  student_id INT NOT NULL,
  track_id INT NOT NULL,
  eligible TINYINT(1) NOT NULL DEFAULT 0,
  badge_status ENUM('NONE','EARNED','NULLIFIED') NOT NULL DEFAULT 'NONE',
  nullified_reason VARCHAR(255) NULL,
  PRIMARY KEY (student_id, track_id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

-- 30-minute bookable units created from an interviewer's availability
CREATE TABLE slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  interviewer_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('OPEN','BOOKED','BLOCKED') NOT NULL DEFAULT 'OPEN',
  UNIQUE KEY uq_interviewer_start (interviewer_id, start_time),
  KEY idx_open (status, start_time),
  FOREIGN KEY (interviewer_id) REFERENCES users(id)
);

-- one row per attempt; history is never overwritten
CREATE TABLE interviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  track_id INT NOT NULL,
  slot_id INT NOT NULL,
  attempt_no INT NOT NULL DEFAULT 1,
  status ENUM('BOOKED','PASSED','FAILED','RETAKE_LATER','NO_SHOW','CANCELLED') NOT NULL DEFAULT 'BOOKED',
  notes TEXT NULL,
  retake_after DATE NULL,
  cancelled_by ENUM('student','interviewer') NULL,
  meeting_link VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_student_track (student_id, track_id),
  KEY idx_slot (slot_id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (slot_id) REFERENCES slots(id)
);
