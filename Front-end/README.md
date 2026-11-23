# Shift Handover Management System

The React application is in `Front-end/`; the PHP/MySQL API is in the repository-root `backend/` directory. The frontend API target is selected by its Vite environment file. The backend reads business records from its configured database and this package does not seed users or operational data.

## Stack

- React + TypeScript + Vite
- Tailwind CSS, React Router, TanStack Query
- PHP 8+ + PDO + MySQL API

## Architecture

`Component -> Query Hook -> Service -> PHP REST API`

Configure the API with `VITE_API_BASE_URL` in `Front-end/.env.local`; it is unset by default. See `../backend/docs/INSTALLATION.md` before configuring a local or hosted API.

## Main folders

- `src/types/`: frontend domain types
- `src/services/`: API abstraction and notification adapter
- `src/hooks/`: query hooks and session authentication
- `src/pages/`: route-level features

Operational records are loaded from the PHP API. The frontend has no mock-record fallback; API failures are shown as errors and empty database results use empty states.

## Routes

`/login`, `/forgot-password`, `/dashboard`, `/shifts`, `/shifts/:id`, `/handovers`, `/handovers/create`, `/handovers/:id`, `/tasks`, `/tasks/:id`, `/incidents`, `/incidents/:id`, `/notifications`, `/settings`, `/users`, `/reports`, `/audit-log`.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` only after the API is configured. A missing API configuration intentionally displays a connection error instead of falling back to fabricated records.

## Notes

- User roles and authentication are supplied by the backend.
- Password recovery does not send email; account recovery requires an administrator until email delivery is configured.
- See the backend API reference and testing checklist for current endpoint coverage and deployment limitations.
