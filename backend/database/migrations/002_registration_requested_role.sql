-- Add requested portal selection to pending account requests.
-- Apply once after 001_registration_requests.sql. Administrators still assign the final role.
ALTER TABLE registration_requests
  ADD COLUMN requested_role ENUM('ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF')
  NOT NULL DEFAULT 'OUTGOING_STAFF' AFTER department;
