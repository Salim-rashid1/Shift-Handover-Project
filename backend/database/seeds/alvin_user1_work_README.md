# Sample work for Alvin (user 1)

`alvin_user1_work.sql` is an optional MariaDB/MySQL seed for clearly labeled example work for today in the Africa/Nairobi time zone. It targets only active account `id = 1` with email `alvinmajawa1@gmail.com`; if that exact account is not active, it creates no records. It creates a dedicated sample shift, a submitted sample handover, three tasks, and a notification when users with the required team roles exist. It does not attach sample work to a real shift or create fake attendance/check-in records.

The tasks are marked `SAMPLE:` so they are distinguishable from real assignments. The script does not change the user account, credentials, or existing tasks. It is not run automatically and has not been executed. Review it and use it only in a disposable development/test database, not production.
