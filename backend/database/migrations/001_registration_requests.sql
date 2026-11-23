-- Additive migration for administrator-reviewed account requests.
-- Apply once to the existing application database; do not re-import schema.sql.
CREATE TABLE registration_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  department VARCHAR(120) NOT NULL DEFAULT '',
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  pending_email VARCHAR(254) GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN email ELSE NULL END) PERSISTENT,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_registration_requests_status_created (status, created_at),
  KEY ix_registration_requests_email_status (email, status),
  UNIQUE KEY uq_registration_requests_pending_email (pending_email),
  CONSTRAINT fk_registration_requests_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
