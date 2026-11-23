-- OPTIONAL SAMPLE WORK ONLY. Not loaded by the application and not executed.
-- Target is strictly the existing active user id=1 / alvinmajawa1@gmail.com.
-- Creates a clearly labeled sample shift, handover, tasks, and notification
-- for today. It does not create/activate users or fabricate attendance records.
-- Review in phpMyAdmin and use only in a non-production database.

SET NAMES utf8mb4;
SET @alvin_id := (SELECT id FROM users
                  WHERE id = 1 AND email = 'alvinmajawa1@gmail.com' AND is_active = 1
                  LIMIT 1);
SET @alvin_role := (SELECT role FROM users WHERE id = @alvin_id LIMIT 1);
SET @new_shift_date := DATE(UTC_TIMESTAMP() + INTERVAL 3 HOUR);

-- Use only the dedicated sample shift; never attach sample tasks to real shifts.
SET @work_shift_id := (
  SELECT id FROM shifts
  WHERE name = 'SAMPLE: Alvin Majawa Operations Shift'
    AND team = 'Nairobi Operations'
    AND (outgoing_staff_id = @alvin_id OR incoming_staff_id = @alvin_id)
  ORDER BY shift_date DESC
  LIMIT 1
);

-- Otherwise create today's sample shift when users with the needed roles exist.
SET @supervisor_id := (
  SELECT id FROM users
  WHERE role IN ('SUPERVISOR', 'ADMINISTRATOR')
  ORDER BY is_active DESC, (role = 'SUPERVISOR') DESC, id
  LIMIT 1
);
SET @outgoing_id := IF(@alvin_role = 'OUTGOING_STAFF', @alvin_id, (
  SELECT id FROM users WHERE role = 'OUTGOING_STAFF'
  ORDER BY is_active DESC, id LIMIT 1
));
SET @incoming_id := IF(@alvin_role = 'INCOMING_STAFF', @alvin_id, (
  SELECT id FROM users WHERE role = 'INCOMING_STAFF'
  ORDER BY is_active DESC, id LIMIT 1
));

INSERT INTO shifts
  (name, start_time, end_time, shift_date, team, status, supervisor_id, outgoing_staff_id, incoming_staff_id)
SELECT 'SAMPLE: Alvin Majawa Operations Shift', '08:00:00', '17:00:00', @new_shift_date,
       'Nairobi Operations', 'SCHEDULED', @supervisor_id, @outgoing_id, @incoming_id
WHERE @alvin_id IS NOT NULL
  AND @work_shift_id IS NULL
  AND @supervisor_id IS NOT NULL
  AND @outgoing_id IS NOT NULL
  AND @incoming_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM shifts
    WHERE name = 'SAMPLE: Alvin Majawa Operations Shift'
      AND team = 'Nairobi Operations'
      AND (outgoing_staff_id = @alvin_id OR incoming_staff_id = @alvin_id)
  );

SET @work_shift_id := COALESCE(@work_shift_id, (
  SELECT id FROM shifts
  WHERE name = 'SAMPLE: Alvin Majawa Operations Shift'
    AND team = 'Nairobi Operations'
    AND (outgoing_staff_id = @alvin_id OR incoming_staff_id = @alvin_id)
  ORDER BY shift_date DESC
  LIMIT 1
));

-- Add a submitted example handover addressed to Alvin as incoming staff.
INSERT INTO handovers
  (shift_id, outgoing_staff_id, incoming_staff_id, handover_date, priority, status,
   summary, additional_notes, created_by, submitted_at)
SELECT @work_shift_id, @outgoing_id, @incoming_id, @new_shift_date, 'MEDIUM', 'SUBMITTED',
       'SAMPLE: Review the operations queue and confirm open work for the next shift.',
       'Example record only; verify operational details with the assigned team.',
       @outgoing_id, NOW()
WHERE @alvin_id IS NOT NULL AND @work_shift_id IS NOT NULL AND @incoming_id = @alvin_id
  AND NOT EXISTS (
    SELECT 1 FROM handovers
    WHERE shift_id = @work_shift_id
      AND incoming_staff_id = @alvin_id
      AND summary = 'SAMPLE: Review the operations queue and confirm open work for the next shift.'
  );

SET @work_handover_id := (
  SELECT id FROM handovers
  WHERE shift_id = @work_shift_id
    AND incoming_staff_id = @alvin_id
    AND summary = 'SAMPLE: Review the operations queue and confirm open work for the next shift.'
  LIMIT 1
);

INSERT INTO tasks (title, description, priority, status, assignee_id, due_date, shift_id, handover_id)
SELECT 'SAMPLE: Review the operations handover queue',
       'Example assignment: review open handover notes and record items that need supervisor follow-up.',
       'MEDIUM', 'PENDING', @alvin_id, DATE_ADD(@new_shift_date, INTERVAL 17 HOUR), @work_shift_id, @work_handover_id
WHERE @alvin_id IS NOT NULL AND @work_shift_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id
      AND title = 'SAMPLE: Review the operations handover queue'
  );
SET @sample_task_1 := (SELECT id FROM tasks WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id AND title = 'SAMPLE: Review the operations handover queue' LIMIT 1);
INSERT IGNORE INTO handover_tasks (handover_id, task_id, relation)
SELECT @work_handover_id, @sample_task_1, 'PENDING'
WHERE @work_handover_id IS NOT NULL AND @sample_task_1 IS NOT NULL;

INSERT INTO tasks (title, description, priority, status, assignee_id, due_date, shift_id, handover_id)
SELECT 'SAMPLE: Verify the daily operations checklist',
       'Example assignment: confirm checklist items with the supervisor and note any pending work for the next shift.',
       'LOW', 'PENDING', @alvin_id, DATE_ADD(@new_shift_date, INTERVAL 17 HOUR), @work_shift_id, @work_handover_id
WHERE @alvin_id IS NOT NULL AND @work_shift_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id
      AND title = 'SAMPLE: Verify the daily operations checklist'
  );
SET @sample_task_2 := (SELECT id FROM tasks WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id AND title = 'SAMPLE: Verify the daily operations checklist' LIMIT 1);
INSERT IGNORE INTO handover_tasks (handover_id, task_id, relation)
SELECT @work_handover_id, @sample_task_2, 'PENDING'
WHERE @work_handover_id IS NOT NULL AND @sample_task_2 IS NOT NULL;

INSERT INTO tasks (title, description, priority, status, assignee_id, due_date, shift_id, handover_id)
SELECT 'SAMPLE: Prepare a summary for the incoming team',
       'Example assignment: document completed work, open items, and suggested next steps before handover.',
       'MEDIUM', 'PENDING', @alvin_id, DATE_ADD(@new_shift_date, INTERVAL 17 HOUR), @work_shift_id, @work_handover_id
WHERE @alvin_id IS NOT NULL AND @work_shift_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks
    WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id
      AND title = 'SAMPLE: Prepare a summary for the incoming team'
  );
SET @sample_task_3 := (SELECT id FROM tasks WHERE shift_id = @work_shift_id AND assignee_id = @alvin_id AND title = 'SAMPLE: Prepare a summary for the incoming team' LIMIT 1);
INSERT IGNORE INTO handover_tasks (handover_id, task_id, relation)
SELECT @work_handover_id, @sample_task_3, 'PENDING'
WHERE @work_handover_id IS NOT NULL AND @sample_task_3 IS NOT NULL;

INSERT INTO notifications (user_id, type, title, message, related_entity_id, is_read)
SELECT @alvin_id, 'HANDOVER', 'Sample handover ready for review',
       'A clearly marked sample handover and three example tasks are available for today.',
       @work_handover_id, 0
WHERE @alvin_id IS NOT NULL AND @work_handover_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = @alvin_id AND type = 'HANDOVER'
      AND related_entity_id = @work_handover_id
      AND title = 'Sample handover ready for review'
  );

SELECT t.id, t.title, t.status, t.priority, t.due_date, s.name AS shift_name, u.full_name, u.email
FROM tasks t
JOIN shifts s ON s.id = t.shift_id
JOIN users u ON u.id = t.assignee_id
WHERE t.assignee_id = @alvin_id
  AND t.shift_id = @work_shift_id
  AND t.title LIKE 'SAMPLE:%'
ORDER BY t.id;
