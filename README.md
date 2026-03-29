Registration page — Vibe (static demo)

What I added
 - registration.html (and index.html) — the registration form UI (responsive, accessible basics)
- styles.css — simple modern styles
- script.js — client-side validation, password-strength meter, and a mock submit that stores users in localStorage

How to open
- Option A (quick): Open `registration.html` (or `index.html`) in your browser (double-click or File -> Open).
- Option B (recommended, avoids file:// restrictions): serve the folder with Python's simple server:

  python3 -m http.server 8000

  Then open http://localhost:8000 in your browser.

Notes and next steps you might want
- Wire to a backend endpoint (POST /api/register) instead of localStorage.
- Add stronger password rules or integrate a library like zxcvbn for scoring.
- Add server-side validation and user uniqueness checks.
- Add tests (unit tests for validation) if you plan to integrate into a larger app.

If you want, I can:
- Add a minimal Express server with a /register route and simple in-memory store.
- Convert this into a React/Vue component and add tests.
- Add ARIA improvements and keyboard-only flow tests.

Tell me which direction you want next and I'll implement it.

Backend and Docker
------------------

I added a minimal Express backend under `backend/` with endpoints:
- POST /api/register
- POST /api/login
- GET /api/me

To run locally (Node installed):

1. Install dependencies and start server

```bash
cd backend
npm install
npm run dev   # or npm start
```

2. Open the frontend served by backend:

  http://localhost:3000/  (serves `registration.html`)

Docker (recommended for a single-command dev setup)

1. Build and start services (Postgres + backend):

```bash
docker compose up --build
```

This starts Postgres (with migration applied) and the backend at http://localhost:3000. The backend will serve the frontend files so the site should work at the same origin.

Notes:
- The docker-compose uses a simple DB user/password (vibe/vibe_pass) and creates `vibe_db`.
- Change `JWT_SECRET` in `docker-compose.yml` or set env vars as appropriate.

Screenshots
-----------

Registration page (live at http://localhost:3000/registration.html):

![Registration](/assets/screenshots/registration.png)

Login page (live at http://localhost:3000/login.html):

![Login](/assets/screenshots/login.png)
