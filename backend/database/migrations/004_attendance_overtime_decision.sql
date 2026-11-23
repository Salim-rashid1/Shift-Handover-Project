-- Require an explicit overtime decision at the scheduled shift end.
-- Apply once after 003_attendance_geofence.sql.
ALTER TABLE attendance_records
  ADD COLUMN overtime_decision ENUM('PENDING','YES','NO') NOT NULL DEFAULT 'PENDING' AFTER check_out_distance_m,
  ADD COLUMN overtime_decided_at DATETIME NULL AFTER overtime_decision;
