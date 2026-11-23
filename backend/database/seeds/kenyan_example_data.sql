-- OPTIONAL, FICTIONAL DEVELOPMENT SAMPLE DATA ONLY.
-- Never run this against production. It creates inactive accounts with an
-- unusable password marker; no sample account can sign in.
-- Safe to re-run for these sample emails and sample shift/handover/task titles.

SET NAMES utf8mb4;

-- Upgrade rows from the earlier example.com seed. The conditions deliberately
-- restrict these updates to the matching inactive, password-disabled samples.
UPDATE users SET email = 'alvin.majawa@nextlinksolutions.co.ke'
WHERE email = 'alvin.majawa@example.com' AND full_name = 'Alvin Majawa'
  AND role = 'INCOMING_STAFF' AND is_active = 0 AND password_hash = '!SEED_ONLY_DISABLED!'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'alvin.majawa@nextlinksolutions.co.ke');

UPDATE users SET email = 'william.katam@nextlinksolutions.co.ke'
WHERE email = 'william.katam@example.com' AND full_name = 'William Katam'
  AND role = 'OUTGOING_STAFF' AND is_active = 0 AND password_hash = '!SEED_ONLY_DISABLED!'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'william.katam@nextlinksolutions.co.ke');

UPDATE users SET email = 'saleem.hakeem@nextlinksolutions.co.ke'
WHERE email = 'saleem.hakeem@example.com' AND full_name = 'Saleem Wisdom Hakeem'
  AND role = 'SUPERVISOR' AND is_active = 0 AND password_hash = '!SEED_ONLY_DISABLED!'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'saleem.hakeem@nextlinksolutions.co.ke');

UPDATE users SET email = 'grace.wanjiku@nextlinksolutions.co.ke'
WHERE email = 'grace.wanjiku@example.com' AND full_name = 'Grace Wanjiku'
  AND role = 'ADMINISTRATOR' AND is_active = 0 AND password_hash = '!SEED_ONLY_DISABLED!'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'grace.wanjiku@nextlinksolutions.co.ke');

INSERT INTO users (full_name, email, password_hash, role, department, is_active)
SELECT 'Alvin Majawa', 'alvin.majawa@nextlinksolutions.co.ke', '!SEED_ONLY_DISABLED!', 'INCOMING_STAFF', 'Nairobi Service Desk', 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alvin.majawa@nextlinksolutions.co.ke');

INSERT INTO users (full_name, email, password_hash, role, department, is_active)
SELECT 'William Katam', 'william.katam@nextlinksolutions.co.ke', '!SEED_ONLY_DISABLED!', 'OUTGOING_STAFF', 'Mombasa Distribution Operations', 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'william.katam@nextlinksolutions.co.ke');

INSERT INTO users (full_name, email, password_hash, role, department, is_active)
SELECT 'Saleem Wisdom Hakeem', 'saleem.hakeem@nextlinksolutions.co.ke', '!SEED_ONLY_DISABLED!', 'SUPERVISOR', 'Kisumu Fleet and Logistics', 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'saleem.hakeem@nextlinksolutions.co.ke');

INSERT INTO users (full_name, email, password_hash, role, department, is_active)
SELECT 'Grace Wanjiku', 'grace.wanjiku@nextlinksolutions.co.ke', '!SEED_ONLY_DISABLED!', 'ADMINISTRATOR', 'Nairobi Operations Administration', 0
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'grace.wanjiku@nextlinksolutions.co.ke');

SELECT id INTO @salim_example_incoming_id FROM users WHERE email = 'alvin.majawa@nextlinksolutions.co.ke' LIMIT 1;
SELECT id INTO @salim_example_outgoing_id FROM users WHERE email = 'william.katam@nextlinksolutions.co.ke' LIMIT 1;
SELECT id INTO @salim_example_supervisor_id FROM users WHERE email = 'saleem.hakeem@nextlinksolutions.co.ke' LIMIT 1;
SELECT id INTO @salim_example_admin_id FROM users WHERE email = 'grace.wanjiku@nextlinksolutions.co.ke' LIMIT 1;

INSERT INTO shifts (name, start_time, end_time, shift_date, team, status, supervisor_id, outgoing_staff_id, incoming_staff_id)
SELECT 'Example Nairobi to Mombasa Operations Handover', '08:00:00', '17:00:00', CURDATE(), 'Kenya Regional Operations', 'SCHEDULED', @salim_example_supervisor_id, @salim_example_outgoing_id, @salim_example_incoming_id
WHERE NOT EXISTS (
  SELECT 1 FROM shifts
  WHERE name = 'Example Nairobi to Mombasa Operations Handover'
    AND shift_date = CURDATE()
    AND team = 'Kenya Regional Operations'
);

SELECT id INTO @salim_example_shift_id FROM shifts
WHERE name = 'Example Nairobi to Mombasa Operations Handover'
  AND shift_date = CURDATE()
  AND team = 'Kenya Regional Operations'
LIMIT 1;

INSERT INTO handovers (shift_id, outgoing_staff_id, incoming_staff_id, handover_date, priority, status, summary, additional_notes, created_by, submitted_at)
SELECT @salim_example_shift_id, @salim_example_outgoing_id, @salim_example_incoming_id, CURDATE(), 'MEDIUM', 'SUBMITTED',
       'SAMPLE ONLY: Review the Nairobi service desk queue and confirm the Mombasa delivery schedule.',
       'Fictional example record for development. Confirm all operational details with real staff.',
       @salim_example_outgoing_id, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM handovers
  WHERE shift_id = @salim_example_shift_id
    AND summary LIKE 'SAMPLE ONLY: Review the Nairobi service desk queue%'
);

SELECT id INTO @salim_example_handover_id FROM handovers
WHERE shift_id = @salim_example_shift_id
  AND summary LIKE 'SAMPLE ONLY: Review the Nairobi service desk queue%'
LIMIT 1;

INSERT INTO tasks (title, description, priority, status, assignee_id, due_date, shift_id, handover_id)
SELECT 'SAMPLE ONLY: Confirm regional delivery schedule',
       'Check the fictional handover schedule and record any delays for the incoming team.',
       'MEDIUM', 'PENDING', @salim_example_incoming_id, DATE_ADD(NOW(), INTERVAL 1 DAY), @salim_example_shift_id, @salim_example_handover_id
WHERE NOT EXISTS (
  SELECT 1 FROM tasks
  WHERE shift_id = @salim_example_shift_id
    AND title = 'SAMPLE ONLY: Confirm regional delivery schedule'
);

SELECT id INTO @salim_example_task_id FROM tasks
WHERE shift_id = @salim_example_shift_id
  AND title = 'SAMPLE ONLY: Confirm regional delivery schedule'
LIMIT 1;

INSERT IGNORE INTO handover_tasks (handover_id, task_id, relation)
VALUES (@salim_example_handover_id, @salim_example_task_id, 'PENDING');

INSERT INTO incidents (title, category, description, severity, status, shift_id, reported_by_id, resolution)
SELECT 'SAMPLE ONLY: Delivery schedule variance', 'Logistics',
       'Fictional example: one regional delivery is awaiting a revised arrival estimate.',
       'LOW', 'REPORTED', @salim_example_shift_id, @salim_example_outgoing_id, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM incidents
  WHERE shift_id = @salim_example_shift_id
    AND title = 'SAMPLE ONLY: Delivery schedule variance'
);

SELECT id INTO @salim_example_incident_id FROM incidents
WHERE shift_id = @salim_example_shift_id
  AND title = 'SAMPLE ONLY: Delivery schedule variance'
LIMIT 1;

INSERT IGNORE INTO handover_incidents (handover_id, incident_id)
VALUES (@salim_example_handover_id, @salim_example_incident_id);

INSERT INTO notifications (user_id, type, title, message, related_entity_id, is_read)
SELECT @salim_example_incoming_id, 'HANDOVER', 'Sample handover ready for review',
       'Fictional development record: review the example handover and its pending task.',
       @salim_example_handover_id, 0
WHERE NOT EXISTS (
  SELECT 1 FROM notifications
  WHERE user_id = @salim_example_incoming_id
    AND related_entity_id = @salim_example_handover_id
    AND title = 'Sample handover ready for review'
);

INSERT INTO audit_log (actor_id, action, target_type, target_id, details)
SELECT @salim_example_admin_id, 'SAMPLE_DATA_CREATED', 'SHIFT', @salim_example_shift_id,
       'Fictional development sample only; this is not a real operational event.'
WHERE NOT EXISTS (
  SELECT 1 FROM audit_log
  WHERE actor_id = @salim_example_admin_id
    AND action = 'SAMPLE_DATA_CREATED'
    AND target_type = 'SHIFT'
    AND target_id = @salim_example_shift_id
    AND details = 'Fictional development sample only; this is not a real operational event.'
);
