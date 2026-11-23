-- Attendance policy and per-shift attendance records.
-- Apply once after the core schema. Configure office coordinates in the admin UI.
CREATE TABLE attendance_settings (
  id TINYINT UNSIGNED NOT NULL,
  office_name VARCHAR(120) NOT NULL DEFAULT 'Main office',
  office_latitude DECIMAL(10,7) NULL,
  office_longitude DECIMAL(10,7) NULL,
  geofence_radius_m INT UNSIGNED NOT NULL DEFAULT 150,
  checkin_grace_minutes TINYINT UNSIGNED NOT NULL DEFAULT 15,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_attendance_settings_updater FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO attendance_settings (id) VALUES (1);

CREATE TABLE attendance_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shift_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  check_in_at DATETIME NULL,
  check_in_status ENUM('EARLY','ON_TIME','LATE') NULL,
  check_in_mode ENUM('AUTO','MANUAL') NULL,
  check_in_distance_m INT UNSIGNED NULL,
  check_out_at DATETIME NULL,
  check_out_status ENUM('EARLY','ON_TIME','LATE') NULL,
  check_out_mode ENUM('AUTO','MANUAL') NULL,
  check_out_distance_m INT UNSIGNED NULL,
  last_attempt_at DATETIME NULL,
  last_attempt_status VARCHAR(40) NULL,
  last_attempt_distance_m INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_shift_user (shift_id,user_id),
  KEY ix_attendance_user_date (user_id,check_in_at),
  KEY ix_attendance_checkin_status (check_in_status),
  CONSTRAINT fk_attendance_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
