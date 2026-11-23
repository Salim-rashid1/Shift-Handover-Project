# API reference

Base path: `/api/v1`. All requests and responses use JSON. Authentication is a server-side PHP session cookie; frontend requests must include credentials. IDs are numeric database IDs serialized as strings. Lists are capped at 250 records (notifications/audit at 100). Errors have `error` and `details`; validation errors use HTTP 422, unauthenticated 401, forbidden 403, missing record/route 404, and invalid state transition 409.

| Method | Path | Access | Behavior |
|---|---|---|---|
| GET | `/health` | Public | Executes `SELECT 1`; returns generic 500 if DB is unavailable |
| POST | `/auth/login` | Public | `{email,password,role}`; requires the selected portal role to match the active account, verifies password hash, rotates session ID. The role field remains optional for older API clients. |
| POST | `/auth/logout` | Public | Invalidates the session |
| GET | `/auth/me` | Session | Current safe user profile |
| GET | `/dashboard` | Session | Live operational counts and recent records |
| GET | `/users`, `/users/{id}` | Admin/supervisor | Safe user fields and permissions; no password hashes |
| GET | `/directory` | Session | Minimal names/roles/departments scoped to operational records visible to staff; management roles receive all references |
| POST | `/users` | Administrator | `{fullName,email,password,role,department}`; hashes a 12+ character password and uses the existing role enum |
| PATCH | `/users/{id}` | Administrator | Update `{fullName,email,department}` |
| PATCH | `/users/{id}/role` | Administrator | `{role}`; self-change and removal of the last active administrator are rejected |
| PATCH | `/users/{id}/status` | Administrator | `{isActive:boolean}`; self-deactivation and deactivation of the last active administrator are rejected |
| POST | `/auth/password` | Session | `{currentPassword,newPassword}`; verifies and updates the password hash |
| POST | `/auth/register` | Public | `{fullName,email,password,passwordConfirmation,department}`; stores a pending request and hash only; no role is accepted; returns generic 202 response |
| GET | `/registration-requests` | Administrator | Lists pending requests without password hashes |
| PATCH | `/registration-requests/{id}` | Administrator | Approve with `{decision:"APPROVE",role,department}` or reject with `{decision:"REJECT"}`; approval creates the account transactionally |
| GET | `/shifts`, `/shifts/{id}` | Session | Shift list/detail |
| GET | `/handovers`, `/handovers/{id}` | Session | Handover list/detail including linked IDs |
| POST | `/handovers` | Session | Create a draft for an assigned outgoing shift |
| PATCH | `/handovers/{id}` | Owner/admin/supervisor | Edit summary/notes/priority while draft |
| POST | `/handovers/{id}/submit` | Outgoing staff/admin/supervisor | Submit draft, notify incoming staff, audit event |
| POST | `/handovers/{id}/acknowledge` | Incoming staff/admin/supervisor | Acknowledge submitted record, notify outgoing staff, audit event |
| GET | `/tasks`, `/tasks/{id}` | Session | Task list/detail |
| POST | `/tasks` | Admin/supervisor | Create validated task; alert on critical/carry-forward task |
| PATCH | `/tasks/{id}` | Assignee/admin/supervisor | Update status; admins/supervisors may change task fields. Carry-forward uses `{ "status":"CARRIED_FORWARD", "shiftId":"destination-id" }` and moves the same task row, preserving its existing handover links. The task remains assigned to its current assignee; confirm that business rule before production use. |
| GET | `/incidents`, `/incidents/{id}` | Session | Incident list/detail |
| POST | `/incidents` | Session | Report incident; notify supervisors/admins and audit |
| PATCH | `/incidents/{id}` | Admin/supervisor | Update status/resolution; notify/audit escalation |
| GET | `/notifications` | Session | Current user's private notifications only |
| POST | `/notifications/{id}/read` | Owner | Mark one notification read |
| POST | `/notifications/read-all` | Session | Mark current user's notifications read |
| GET | `/activity` | Admin/supervisor | Recent audit entries |

State-changing requests require the exact `Origin` configured in `config/app.php`. Browser requests include it automatically; non-browser checks must send the same origin explicitly.

Example login: `curl -i -c cookies.txt -H "Origin: http://localhost:5173" -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"..."}' https://api.example.com/api/v1/auth/login`

Example authenticated request: `curl -b cookies.txt https://api.example.com/api/v1/shifts`.

Account requests use the additive `registration_requests` table from `database/migrations/001_registration_requests.sql`; existing user roles and the operational schema are unchanged. Password recovery is not available. See `ACCESS_MODEL.md` for the verified permission matrix and policy limits.

Expected response shapes follow the frontend types in `Front-end/src/types/index.ts`. Completed/cancelled tasks and closed incidents are terminal in the API; admins/supervisors can resolve or escalate non-closed incidents. Non-admin/supervisor list/detail records are scoped to assigned shifts, handover participants, task assignee/shift, or incident reporter/shift; unauthorized details return 404. Audit history is fully visible to admin/supervisors and limited to the current actor for staff roles. Dashboard metric counts are organization-wide totals, while its recent record lists use the role-scoped visibility rules. User provisioning and profile/role/status management are administrator-only. The backend does not send reset email, expose admin shift CRUD, or provide report exports because those workflows are not implemented.
