--  -- MySQL 8.0+ / MariaDB 10.4+. Review against any existing server schema first.
SET NAMES utf8mb4;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF') NOT NULL,
  department VARCHAR(120) NOT NULL DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_users_email (email), KEY ix_users_role_active (role,is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE shifts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_date DATE NOT NULL,
  team VARCHAR(120) NOT NULL,
  status ENUM('SCHEDULED','ACTIVE','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  supervisor_id BIGINT UNSIGNED NOT NULL,
  outgoing_staff_id BIGINT UNSIGNED NOT NULL,
  incoming_staff_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_shifts_date_status (shift_date,status),
  CONSTRAINT fk_shifts_supervisor FOREIGN KEY (supervisor_id) REFERENCES users(id),
  CONSTRAINT fk_shifts_outgoing FOREIGN KEY (outgoing_staff_id) REFERENCES users(id),
  CONSTRAINT fk_shifts_incoming FOREIGN KEY (incoming_staff_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE handovers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shift_id BIGINT UNSIGNED NOT NULL,
  outgoing_staff_id BIGINT UNSIGNED NOT NULL,
  incoming_staff_id BIGINT UNSIGNED NOT NULL,
  handover_date DATE NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('DRAFT','SUBMITTED','DELIVERED','ACKNOWLEDGED','REQUIRES_ATTENTION','CLOSED') NOT NULL DEFAULT 'DRAFT',
  summary TEXT NOT NULL,
  additional_notes TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  submitted_at DATETIME NULL,
  acknowledged_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_handovers_status_date (status,handover_date), KEY ix_handovers_shift (shift_id),
  CONSTRAINT fk_handovers_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_handovers_outgoing FOREIGN KEY (outgoing_staff_id) REFERENCES users(id),
  CONSTRAINT fk_handovers_incoming FOREIGN KEY (incoming_staff_id) REFERENCES users(id),
  CONSTRAINT fk_handovers_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('PENDING','IN_PROGRESS','COMPLETED','BLOCKED','OVERDUE','CARRIED_FORWARD','CANCELLED') NOT NULL DEFAULT 'PENDING',
  assignee_id BIGINT UNSIGNED NOT NULL,
  due_date DATETIME NOT NULL,
  shift_id BIGINT UNSIGNED NOT NULL,
  handover_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_tasks_status_due (status,due_date), KEY ix_tasks_assignee (assignee_id), KEY ix_tasks_shift (shift_id),
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT fk_tasks_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_tasks_handover FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE incidents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  status ENUM('REPORTED','UNDER_REVIEW','ESCALATED','RESOLVED','CLOSED') NOT NULL DEFAULT 'REPORTED',
  shift_id BIGINT UNSIGNED NOT NULL,
  reported_by_id BIGINT UNSIGNED NOT NULL,
  resolution TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_incidents_severity_status (severity,status), KEY ix_incidents_shift (shift_id),
  CONSTRAINT fk_incidents_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  CONSTRAINT fk_incidents_reporter FOREIGN KEY (reported_by_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE handover_tasks (
  handover_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  relation ENUM('COMPLETED','PENDING') NOT NULL,
  PRIMARY KEY (handover_id,task_id), KEY ix_handover_tasks_task (task_id),
  CONSTRAINT fk_ht_handover FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ht_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE handover_incidents (
  handover_id BIGINT UNSIGNED NOT NULL,
  incident_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (handover_id,incident_id), KEY ix_handover_incidents_incident (incident_id),
  CONSTRAINT fk_hi_handover FOREIGN KEY (handover_id) REFERENCES handovers(id) ON DELETE CASCADE,
  CONSTRAINT fk_hi_incident FOREIGN KEY (incident_id) REFERENCES incidents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('HANDOVER','TASK','INCIDENT','SHIFT','SYSTEM') NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  related_entity_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_notifications_user_unread (user_id,is_read,created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  target_type ENUM('HANDOVER','TASK','INCIDENT','SHIFT','SYSTEM') NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY ix_audit_created (created_at), KEY ix_audit_target (target_type,target_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
