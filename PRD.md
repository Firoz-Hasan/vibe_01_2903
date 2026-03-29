Product Requirements Document — Vibe Registration & Auth Demo

Date: 2026-03-30
Author: Project scaffold (generated)

## 1. Overview
A lightweight registration and authentication demo for "Vibe": a static front-end (registration, login, home) with a Node/Express backend and PostgreSQL persistence. The docs and code live in the workspace root and `backend/`.

Purpose: provide a small, production-proximate reference implementation showing end-to-end account creation, secure password storage, JWT-based authentication, and a simple protected profile (home) page. It is suitable for learning, prototyping, or bootstrapping a larger app.

Primary artifacts in this repo:
- Frontend: `registration.html` (prefillable), `login.html`, `home.html`, `styles.css`, `script.js`, `login_script.js`.
- Backend: `backend/server.js`, `backend/db.js`, `backend/package.json`, `backend/migrate.sql`.
- Dev/Infra: `docker-compose.yml`, `backend/Dockerfile`, `.dockerignore`.

## 2. Goals
- Allow a user to register with typical fields (full name, email, username, password, dob, country) from a web form.
- Validate inputs client- and server-side; present clear error messages.
- Store user accounts in PostgreSQL with secure password hashing (bcrypt).
- Provide a login flow returning a JWT token and a protected `/api/me` endpoint.
- Ship a reproducible local dev environment using Docker Compose (Postgres + Node).

## 3. Scope — MVP
Included (in this project):
- Registration page with client-side validation and password strength meter
- Backend REST endpoints: POST `/api/register`, POST `/api/login`, GET `/api/me`
- Postgres persistence for `users` table (migration script in `backend/migrate.sql`)
- Docker Compose to start Postgres + backend; backend serves frontend files
- Login page that stores JWT token in `localStorage` and a `home.html` that calls `/api/me`

Excluded / out of scope (for MVP):
- Email verification and password reset flows
- Rate limiting, CAPTCHAs, and aggressive security hardening
- Production-grade session/cookie management (JWT in localStorage is demo-only)

## 4. Personas
- Developer: wants to run the demo locally, explore the code, and extend it.
- QA/Tester: wants deterministic flows to validate registration/login and DB persistence.
- Product stakeholder: wants to confirm the basic UX and data model.

## 5. User stories
1. As a new user, I can register with my full name, email, username, password, DOB and country so I can create an account.
   - Acceptance: Submitting valid form output creates a row in `users` table, returns 201 and a token; frontend redirects to login.
2. As a returning user, I can login with my email or username and password so I can access my profile.
   - Acceptance: Successful login returns a JWT token, stored in `localStorage`, and redirects to `home.html` which displays my profile.
3. As a developer, I can run the system locally with Docker Compose so I can test end-to-end.
   - Acceptance: `docker compose up --build` brings up Postgres and backend; `curl /api/health` returns `{ok:true}` and `db-check` returns OK.

## 6. Functional requirements
- Frontend validation must block weak passwords and show clear messages in a global banner and inline field errors.
- Backend must validate required fields, ensure unique email & username, and return meaningful HTTP error codes (400, 409, 401, 500).
- Passwords must be hashed with bcrypt before storing.
- JWT should be signed with an environment-provided `JWT_SECRET` and expire (current code uses 7 days).
- The `users` table schema must include: id (serial PK), full_name, email (unique), username (unique), password_hash, dob, country, created_at.

## 7. Non-functional requirements
- Dev reproducibility: Docker Compose must successfully create DB and run migration via `backend/migrate.sql` (mounted into Postgres init).
- Performance: Not targeted for high scale; acceptable latency for demo flows.
- Security: Demonstrate password hashing; include notes for production: HTTPS, secure cookie usage, CSRF mitigation, rate-limiting, and avoid storing JWT in localStorage in production.

## 8. API contract
All requests/response bodies are JSON where applicable.

POST /api/register
- Request: { fullName, email, username, password, dob (YYYY-MM-DD)?, country? }
- Response: 201 { user: { id, full_name, email, username, dob, country, created_at }, token }
- Errors: 400 missing/invalid; 409 conflict; 500 server error

POST /api/login
- Request: { identifier, password } // identifier = email or username
- Response: 200 { user: { id, full_name, email, username }, token }
- Errors: 400 missing; 401 invalid credentials; 500 server error

GET /api/me
- Auth: Authorization: Bearer <token>
- Response: 200 { user: { id, full_name, email, username, dob, country, created_at } }
- Errors: 401 missing/invalid token; 404 not found; 500 server error

Additional dev endpoint: GET /api/db-check — returns {ok:true} when DB connection succeeds.

## 9. Data model
SQL in `backend/migrate.sql` creates `users` table:
- id SERIAL PRIMARY KEY
- full_name VARCHAR(255) NOT NULL
- email VARCHAR(255) NOT NULL UNIQUE
- username VARCHAR(100) NOT NULL UNIQUE
- password_hash VARCHAR(255) NOT NULL
- dob DATE
- country VARCHAR(100)
- created_at TIMESTAMP DEFAULT now()

## 10. UX flows (happy path)
- Register flow: `registration.html` -> client validation -> POST /api/register -> on success store token (optional) and redirect to login page.
- Login flow: `login.html` -> client POST /api/login -> on success store token in `localStorage` and redirect to `home.html`.
- Home flow: `home.html` reads `vibe_token` from `localStorage`, calls `/api/me` and displays profile or redirects to login if unauthenticated.

## 11. Edge cases & error handling
- Duplicate email/username -> 409 returned, frontend shows global error.
- Weak password -> client-side blocked; server also checks length >= 8.
- Backend unreachable -> frontend falls back to localStorage demo for registration (only for UI demo) and shows a message.
- Existing DB without init scripts -> `relation "users" does not exist` error; run migration manually or re-initialize DB.

## 12. QA and test plan
Manual tests:
- Register with invalid input (missing fields, weak password) – expect client-side errors and no network request
- Register valid user through UI – expect redirect and DB row visible via psql
- Login with email & username – expect token and redirect to home with profile
- Attempt login with bad creds – expect 401 and visible UI error
- Restart containers and validate migration logic/DB persistence

Automated tests (recommended next steps):
- Unit tests for server validation (Jest + supertest)
- Integration tests: start a test Postgres (or use sqlite for integration), run server, run registration/login flows

## 13. Dev & run instructions (quick)
Prereqs: Docker Desktop (or Node + Postgres locally)

Docker (recommended)
- From repo root:
  docker compose up --build -d
- Confirm backend started:
  docker compose logs --tail=100 backend
- Health checks:
  curl http://localhost:3000/api/health
  curl http://localhost:3000/api/db-check
- UI: http://localhost:3000/registration.html, http://localhost:3000/login.html

Local Node/Postgres
- cd backend
- cp .env.example .env and edit DATABASE_URL
- psql "$DATABASE_URL" -f migrate.sql
- npm install
- npm run dev

## 14. Milestones and tasks
M1 (done): Static UI (registration/login/home), basic JS validation
M2 (done): Express backend, Postgres persistence, docker-compose
M3 (now): QA fixups (bcrypt build issues resolved, validation messaging improvements)
M4 (next): Add unit/integration tests and DB migration tooling (e.g., node-pg-migrate or prisma)
M5 (future): Email verification flow and secure session handling (httpOnly cookies)

## 15. Risks & mitigation
- Native modules (bcrypt) causing image crashes: mitigate by excluding host `node_modules` from build and running `npm install` inside the image (added `.dockerignore`). Or use a pure JS password hashing library or precompile on build.
- Storing JWT in localStorage: mitigate by moving to secure httpOnly cookies.
- Docker/host inconsistencies: provide `docker-compose` development bind mounts for faster iteration and explicit rebuild instructions.

## 16. Next steps (recommended)
- Add automated tests for server endpoints and validation.
- Harden security for production: HTTPS, CSRF protection, rate-limiting, secret management.
- Add e2e test (Cypress) to validate registration -> login -> home flow.
- Add documentation in `README.md` summarizing PRD and run steps (shortened) and add a CONTRIBUTING.md.

---
Notes: This PRD is tailored to the current repository state (files listed above). If you want the document saved as a different filename or extended into a more formal spec (with UI mockups or sequence diagrams), I can add them next. 
