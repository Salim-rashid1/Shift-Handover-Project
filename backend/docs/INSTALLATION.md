# Local build and manual server installation

This package contains a PHP 8+ / MariaDB API for the existing React frontend. No deployment or database connection was performed during implementation. The supplied schema is already imported in the intended database; do not import it again during this setup.

Required PHP extensions: `pdo` and `pdo_mysql`. The API uses PHP sessions and should be served over HTTPS in production.

## cPanel upload layout

Use the existing project root in cPanel: the directory that currently contains `config/`, `database/`, `docs/`, `public/`, and `tests/`. Call this directory `R`; do not create another `backend/` folder. Set the API subdomain `api.salim.kbworks.co.ke` document root to `R/public`.

```text
R/                                      project root; outside the document root
  config/
    app.php
    database.php
  database/                             existing files; do not upload schema.sql
  docs/                                 local project files; not web-accessible
  tests/                                local project files; not web-accessible
  public/                               cPanel document root
    index.php
    .htaccess
```

Upload `backend/config/app.php`, `backend/config/database.php`, `backend/public/index.php`, and `backend/public/.htaccess` to the matching paths under `R`. The entry point loads the PHP config files from `R/config/`. No `.env` file, environment-variable override, or dotenv package is used at runtime. In cPanel, enter the production database password only in the `password` value in `R/config/database.php`; do not commit or share that value. Do not upload the full SQL schema, `dev-router.php`, `.env.example`, `.env.test.example`, `backend/tests/`, documentation, or frontend files to the document root. Do not delete duplicate-looking server folders as part of this deployment; this package targets the single authoritative local `backend/` source tree.

### Install the account-request feature

Before replacing `R/public/index.php`, back up the current file and the database. Upload `backend/database/migrations/001_registration_requests.sql` to a private location, then run it once against the existing application database in phpMyAdmin. This is an additive table migration; do not re-import `schema.sql`. Confirm it succeeds before uploading the updated `public/index.php`, which uses the new table. If this migration has already been applied, do not run it again; the `CREATE TABLE` is intentionally explicit so duplicate-table errors are a clear signal to stop and inspect.

If cPanel cannot set the document root to `R/public`, stop before making the project root web-accessible. The current source has no project-root front controller or root `.htaccess` that safely routes requests and blocks the private sibling folders. Ask the host to enable a subdirectory document root or a private configuration layout instead.

## Configure database and CORS

1. The intended database already exists: host `localhost`, database `kamuzu_salim`, user `kamuzu_salizo`. Confirm cPanel has granted this user privileges on that database.
2. Set the current database-user password privately in the `password` entry returned by `database_config()` in `R/config/database.php`. The local source intentionally leaves it empty. Set the exact frontend origin in `R/config/app.php`; the current development origin is `http://localhost:5173`. Never commit or share the real password.
3. `backend/database/schema.sql` is a local reference only. Do not upload, re-import, or modify the existing database schema. The API expects the existing tables and does not require a schema migration.
4. Privately confirm an active `ADMINISTRATOR` account already exists; this project did not connect to inspect database records. Once an administrator can sign in, manage accounts and review pending account requests in the Users page. A public request does not create an account or allow applicants to choose a role. If no administrator exists, use a separately reviewed, hosting-approved bootstrap procedure; do not create a public bootstrap route or insert plaintext passwords.
5. Enable HTTPS. Session cookies are HttpOnly, use SameSite=None for the configured local frontend, and are Secure when PHP sees HTTPS enabled. For a hosted frontend, change the CORS origin in `config/app.php` to its exact origin. Use SameSite=None for cross-site frontend/API deployments and SameSite=Lax when they are same-site; confirm HTTPS is visible to PHP.
6. In `Front-end/.env.local`, set `VITE_API_BASE_URL=https://api.salim.kbworks.co.ke/api/v1`. The frontend accepts either this full API prefix or only the API origin. Leave it unset for an unconfigured local frontend. This setting does not deploy or alter production configuration.

## Local test setup (isolated database only)

For local runtime checks, use a separate disposable database and account. Point `backend/config/database.php` at that test database and enter only its local password before starting PHP. Do not use production credentials or database data. From the repository root run `php -S 127.0.0.1:8000 -t backend/public backend/dev-router.php`. In `Front-end/.env.local`, use `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`, then run the frontend locally. `dev-router.php` is only for PHP's built-in development server and is not part of the hosting upload package. The current environment has no PHP CLI; the installed MySQL service refused a local TCP connection, so this procedure has not been executed.

## Smoke test

Open `https://api.salim.kbworks.co.ke/api/v1/health`; expected response is `200` JSON `{"status":"ok","database":"ok",...}`. This performs `SELECT 1` using the configured PDO connection. If the API starts but its database connection fails, it returns a generic `500` without credentials. Confirm CORS in browser developer tools from the configured frontend origin. Use the examples in `API_REFERENCE.md` to test sign-in and each module.

Apache `mod_rewrite` is used by `R/public/.htaccess`. If unavailable, ask the host to enable an equivalent rewrite rule; the frontend expects the `/api/v1` prefix. Ensure PHP has PDO MySQL enabled. Set the document root to `R/public`; do not enable directory listings.

## Common failures

- `404`: check the API subdomain document root, rewrite support, and `/api/v1` prefix.
- `500`: inspect hosting PHP logs privately; the API intentionally returns a generic error. Never publish logs.
- `401`: credentials are invalid, the account is inactive, or the session cookie is not reaching the API.
- Browser CORS error: exact origin mismatch, missing HTTPS, or host does not permit credentialed CORS. Wildcard origins are not supported.
- Database connection failure: check host, port, database name, grants, and PDO MySQL extension; do not paste credentials into issue reports.
- Login rate limiting: this package does not implement durable rate limiting. Configure a host/WAF rate limit on `POST /api/v1/auth/login` before public use.

This API package contains no seed users or operational records. The frontend reads users, shifts, handovers, tasks, incidents, notifications, and activity from the configured database through the API. Confirm existing records in phpMyAdmin; no test credentials are supplied.

The carry-forward action retains the current task assignee while moving the same task row to the selected shift. Confirm that assignment policy with operations before production use; the database and current UI do not define automatic reassignment to the next shift's incoming staff.
