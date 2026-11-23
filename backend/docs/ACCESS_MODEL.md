# Verified account and access model

This model reflects the existing `users.role` enum and endpoint behavior. It does not assert the organization's formal job titles or shareholder structure.

## Existing user fields

`users` contains `id`, `full_name`, unique `email`, `password_hash`, `role`, `department`, `is_active`, `created_at`, and `updated_at`. The role enum is `ADMINISTRATOR`, `SUPERVISOR`, `OUTGOING_STAFF`, and `INCOMING_STAFF`. There is no separate account type, team foreign key, pending/suspended status, invitation, or password reset token.

The API reports status as `ACTIVE` or `DEACTIVATED`, and returns permission identifiers and a default route after session authentication. It never treats a form selection as proof of a real-world job or ownership relationship.

## Permission matrix

| Capability | Administrator | Supervisor | Outgoing staff | Incoming staff |
|---|---:|---:|---:|---:|
| Dashboard | Yes | Yes | Yes, scoped totals/records | Yes, scoped totals/records |
| View shifts | All | All | Assigned shifts | Assigned shifts |
| Manage shift schedule | No API write endpoint | No API write endpoint | No | No |
| View handovers | All | All | Participant records | Participant records |
| Create/edit handover | Assigned outgoing flow; admin/supervisor override | Assigned flow/override | Own outgoing draft | No create |
| Submit/acknowledge handover | Admin/supervisor override | Admin/supervisor override | Submit own outgoing handover | Acknowledge assigned incoming handover |
| View tasks | All | All | Assigned/shift scoped | Assigned/shift scoped |
| Create/update tasks | Create and manage | Create and manage | Update own status | Update own status |
| View incidents | All | All | Reported/shift scoped | Reported/shift scoped |
| Report/update incidents | Report and manage | Report and manage | Report only | Report only |
| Notifications | Own only | Own only | Own only | Own only |
| View user directory | Yes | Yes | No | No |
| Create/update users | Yes | No | No | No |
| Assign roles/status | Yes, except self-change/self-deactivation and last active administrator | No | No | No |
| Audit log | Organization-wide | Organization-wide | Own actor entries through API; UI not shown | Own actor entries through API; UI not shown |
| Reports/settings | Unavailable | Unavailable | Unavailable | Unavailable |

The PHP API remains authoritative. Frontend navigation uses the permission list returned by `/auth/me`, but every protected API handler checks the session, role, ownership, or record scope independently.

## Registration and password policy

Public requests are accepted at `POST /auth/register`, but this does not create or activate an account. The applicant supplies a name, email, optional department, and password; the API stores only a password hash and creates a `PENDING` row in `registration_requests`. Duplicate account and pending-request responses are intentionally generic. Applicants cannot choose a role. An administrator reviews pending requests at `/registration-requests`, assigns an existing role and department, and approves or rejects. Approval creates an active user; either decision clears the stored request password hash. Apply `database/migrations/001_registration_requests.sql` once before deploying the updated API. The migration is additive and does not alter existing user or operational records.

Administrators create accounts via `POST /users`. Passwords are stored using PHP `password_hash()`; users can change their password through `/auth/password` after confirming their current password. Password recovery is not available; users who lose access must contact an operations administrator.

No migration is required for these changes. No database contents or production records were read or altered during implementation. Account categories, official org roles, shareholder/ownership data, approval requirements, and supervisor team scope remain unverified business decisions.
