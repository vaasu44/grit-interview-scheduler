# GRIT Interview Scheduler (React + Tailwind, FastAPI, MySQL)

## 1. Database
```bash
mysql -u root -p < backend/schema.sql
```
## 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
export DB_USER=root DB_PASSWORD=yourpass              # Windows: set DB_USER=root
python seed.py                                        # demo data (run once after schema.sql)
uvicorn main:app --reload --port 8000
```
Swagger UI: http://localhost:8000/docs (click Authorize is not needed; add header `X-User-Id`).

## 3. Frontend
```bash
cd frontend && npm install && npm run dev            # http://localhost:5173
```
Use the "Demo login" dropdown: Aarav (eligible), Meera (booked), Rohan (passed), Sneha (retake later), Kabir (failed, can rebook), Diya (not eligible), Ishaan (nullified); interviewers Priya / Karthik; Ravi = interview team.

## 4. Postman
Import `postman/GRIT.postman_collection.json`, then run the collection **in order** (Runner). It books a slot as Aarav (id 4), checks double-booking/403/409/422 cases, records an outcome as the interviewer, and nullifies a badge. Re-seed to rerun: `mysql < schema.sql && python seed.py`.
Header on every call: `X-User-Id: <user id>` (1 team, 2-3 interviewers, 4-11 students).

## 5. Loom outline (4-5 min)
1. Problem and who the 3 users are (30s). 2. State table: why state is derived, not stored (60s). 3. Demo: Aarav books, Priya records outcome, Aarav's home changes (90s). 4. Team dashboard: booked vs not booked (30s). 5. Before/After tab (30s). 6. Edge cases: double-booking lock, cooldown, nullification (45s). 7. What I'd build next: notifications, audit log, SSO (15s).
