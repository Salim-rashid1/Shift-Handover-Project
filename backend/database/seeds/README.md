# Optional Kenyan example data

`kenyan_example_data.sql` contains fictional, clearly labeled development examples for the existing Salim schema. It is not loaded by the application. The earlier `example.com` version was shown in the supplied phpMyAdmin capture as successfully imported into `kamuzu_salim`; the revised seed and email update script in this folder have not been run.

Use it only in a separate local or disposable test database after taking a backup. Never run it against the live cPanel database. The sample users are all inactive (`is_active = 0`) and have an unusable password marker, so none can sign in. The name-based `@nextlinksolutions.co.ke` addresses were requested as examples and have not been verified as existing or authorized mailboxes; do not use them for contact or delivery until verified.

| Example person | Portal role | Example department |
| --- | --- | --- |
| Alvin Majawa | Incoming staff | Nairobi Service Desk |
| William Katam | Outgoing staff | Mombasa Distribution Operations |
| Saleem Wisdom Hakeem | Supervisor | Kisumu Fleet and Logistics |
| Grace Wanjiku | Administrator | Nairobi Operations Administration |

Sample email aliases in the same order are `alvin.majawa@nextlinksolutions.co.ke`, `william.katam@nextlinksolutions.co.ke`, `saleem.hakeem@nextlinksolutions.co.ke`, and `grace.wanjiku@nextlinksolutions.co.ke`.

The seed also creates a fictional shift, handover, pending task, reported low-severity incident, notification, and audit entry. The schema has no businesses or organizations table, so these illustrative Kenyan business contexts are represented in `department` and `team`; the script does not add tables or alter the schema.

This SQL is intended for MySQL/MariaDB and is idempotent for the sample emails and sample records it creates. Review it before use and apply it only to a disposable non-production database.
