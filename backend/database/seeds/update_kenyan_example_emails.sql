-- Optional email-only update for rows created by the earlier example.com seed.
-- The aliases are unverified and must be checked for ownership before use.
-- Review the two result sets first. This script is not run by the application.

SELECT id, full_name, email, role, is_active
FROM users
WHERE email IN (
  'alvin.majawa@example.com', 'william.katam@example.com',
  'saleem.hakeem@example.com', 'grace.wanjiku@example.com',
  'alvin.majawa@nextlinksolutions.co.ke', 'william.katam@nextlinksolutions.co.ke',
  'saleem.hakeem@nextlinksolutions.co.ke', 'grace.wanjiku@nextlinksolutions.co.ke'
)
ORDER BY email;

-- Each update affects only its matching disabled seed row, and is skipped if
-- the proposed address is already assigned to any account.
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

SELECT id, full_name, email, role, is_active
FROM users
WHERE full_name IN ('Alvin Majawa', 'William Katam', 'Saleem Wisdom Hakeem', 'Grace Wanjiku')
ORDER BY full_name;
