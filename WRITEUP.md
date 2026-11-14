# GRIT Interview Scheduler

An interview scheduling feature for GRIT, the NIAT skilling competition. Eligible students book a live interview slot, interviewers manage availability and record outcomes, and the interview team tracks who has booked and who hasn't.

**Stack:** React + Tailwind CSS (Vite) · Python + FastAPI · MySQL

## Features

- **Sign-in with mobile OTP:** choose a role (student, interviewer, interview team), pick your name, enter a mobile number and verify a 6-digit OTP.
- **Student:** home screen with a progress stepper, a status message, a badge card; book or cancel a slot.
- **Interviewer:** add availability as 30-minute slots, see the daily schedule, record an outcome (Pass, Fail, Retake later, No-show) or cancel.
- **Interview team:** dashboard of eligible students with Booked / Not booked / Completed counts and filters; nullify a badge after a malpractice flag.
- **Before / After:** a corner button (visible after sign-in) showing how the student home, team row and interviewer row change once a result is recorded.

## Key design idea

A student's state is **derived**, not stored. The backend computes it from two facts: eligibility and badge status (`student_tracks`) and the latest attempt (`interviews`). Every screen reads that one result, so they can't disagree.

States: `NOT_ELIGIBLE`, `ELIGIBLE`, `BOOKED`, `PASSED`, `FAILED`, `RETAKE_LATER`, `NO_SHOW`, `BADGE_NULLIFIED`.

## Project structure

```
grit/
├── README.md
├── WRITEUP.md
├── backend/
│   ├── main.py               API, business rules, MySQL access, OTP login
│   ├── schema.sql            database and tables
│   ├── migration_otp.sql     adds users.phone and the otps table
│   ├── seed.py               demo users, slots and interviews
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx           routing by role, Before / After button
│       ├── Login.jsx         landing page and OTP sign-in
│       ├── StudentHome.jsx, BookSlot.jsx
│       ├── Interviewer.jsx, Team.jsx
│       ├── Compare.jsx       Before / After pop-up
│       ├── messages.js       student messages for every state
│       ├── api.js, ui.jsx
└── postman/
    └── GRIT.postman_collection.json
```

## Run locally (Windows)

Requirements: Python 3.9+, Node 18+, MySQL running locally.

### 1. Database

From the `backend` folder:

```bat
mysql -u root -p < schema.sql
mysql -u root -p < migration_otp.sql
```

In PowerShell, `<` does not work. Use:

```powershell
Get-Content schema.sql | mysql -u root -p
Get-Content migration_otp.sql | mysql -u root -p
```

### 2. Backend

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set DB_USER=root
set DB_PASSWORD=yourpassword
python seed.py
uvicorn main:app --reload --port 8000
```

(PowerShell: `venv\Scripts\Activate.ps1` and `$env:DB_USER="root"; $env:DB_PASSWORD="yourpassword"`.)

Check: http://localhost:8000/api/health and the Swagger UI at http://localhost:8000/docs.

### 3. Frontend

```bat
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` calls to the backend on port 8000.

### Reset the demo data

Stop the backend, then run `schema.sql`, `migration_otp.sql` and `python seed.py` again.

## Signing in and demo profiles

Pick a role and a name, enter any valid 10-digit mobile number (starts with 6 to 9), and click **Send OTP**.

**Demo mode:** no SMS is sent. The OTP appears on the screen and in the backend terminal. A real SMS needs a provider (MSG91, Twilio and similar); plug it into `send_sms()` in `main.py`. Set `DEMO_OTP=0` to stop returning the OTP in the API response.

A profile's mobile number is saved on its first successful login, and later logins must use the same one. To clear saved numbers: `UPDATE users SET phone = NULL;`

| Profile                                | Role        | State to demo                   |
| -------------------------------------- | ----------- | ------------------------------- |
| Aarav Sharma                           | student     | Eligible, not booked            |
| Meera Nair                             | student     | Booked (slot already started)   |
| Rohan Gupta                            | student     | Passed, badge earned            |
| Sneha Reddy                            | student     | Retake later (cooldown running) |
| Kabir Singh                            | student     | Failed, can book again          |
| Diya Patel                             | student     | Not eligible yet                |
| Ishaan Rao                             | student     | Badge nullified                 |
| Tara Menon                             | student     | Eligible, not booked            |
| Priya Interviewer, Karthik Interviewer | interviewer | Own slots and outcomes          |
| Ravi (Interview Team)                  | team        | Dashboard                       |

## Suggested demo flow

1. Sign in as Aarav, book a slot, see "You're booked".
2. Sign in as the interviewer who owns that slot, open the daily schedule, record **Retake later** with feedback.
3. Sign in as Aarav again and see the retake message and date.
4. Sign in as Ravi, review the counts, nullify Rohan's badge.
5. Open **Before / After** and switch between outcomes.

## API overview

All endpoints except the login and user list expect an `X-User-Id` header (demo identification).

| Method and path                        | Who                  | Purpose                                          |
| -------------------------------------- | -------------------- | ------------------------------------------------ |
| `POST /api/auth/send-otp`              | anyone               | Create and send an OTP                           |
| `POST /api/auth/verify-otp`            | anyone               | Verify the OTP, return the profile               |
| `GET /api/users`                       | anyone               | List profiles for the sign-in page               |
| `GET /api/me/status`                   | student              | Derived state, interview and badge               |
| `GET /api/slots/available`             | student              | Open future slots                                |
| `POST /api/interviews`                 | student              | Book a slot                                      |
| `POST /api/interviews/{id}/cancel`     | student, interviewer | Cancel a booking                                 |
| `POST /api/interviewer/availability`   | interviewer          | Create 30-minute slots for a date                |
| `GET /api/interviewer/schedule?day=`   | interviewer          | Daily schedule with students                     |
| `DELETE /api/interviewer/slots/{id}`   | interviewer          | Remove an open slot                              |
| `POST /api/interviews/{id}/outcome`    | interviewer          | Record Pass, Fail, Retake later or No-show       |
| `GET /api/team/students`               | team                 | Eligible students with booking status and counts |
| `POST /api/team/students/{id}/nullify` | team                 | Nullify a badge                                  |

## Testing with Postman

Import `postman/GRIT.postman_collection.json` and run the collection in order with the Runner. It books a slot as Aarav, tries double booking, wrong-role and missing-feedback cases, records an outcome and nullifies a badge. Reset the data before running it again.

## Rules enforced by the backend

- Booking and cancelling need at least 2 hours before the start.
- The slot row and the student row are locked during booking, so two students can't take one slot and one student can't double-book.
- Fail and Retake later need written feedback.
- Cooldown before a new attempt: Fail 14 days, Retake later 7 days, No-show 3 days.
- A booked slot can't be removed; the interview must be cancelled first.
- Nullifying a badge cancels any upcoming booking and frees the slot.
- Roles are checked on every endpoint.
- OTP: 5-minute validity, single use, 5 wrong attempts, 30-second resend gap, stored as a SHA-256 hash.

## Environment variables (backend)

| Variable      | Default     | Purpose                                                    |
| ------------- | ----------- | ---------------------------------------------------------- |
| `DB_HOST`     | `localhost` | MySQL host                                                 |
| `DB_PORT`     | `3306`      | MySQL port                                                 |
| `DB_USER`     | `root`      | MySQL user                                                 |
| `DB_PASSWORD` | empty       | MySQL password                                             |
| `DB_NAME`     | `grit`      | Database name                                              |
| `DEMO_OTP`    | `1`         | `1` returns the OTP in the response (demo only)            |
| `STRICT_TIME` | `0`         | `1` allows recording an outcome only after the slot starts |

Frontend (when hosted): `VITE_API_URL` is the backend's public URL.

## Deployment notes

- Database: any hosted MySQL. Run `schema.sql`, `migration_otp.sql` and `seed.py` against it.
- Backend: build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Frontend: build `npm run build`, output `dist`, set `VITE_API_URL`.
