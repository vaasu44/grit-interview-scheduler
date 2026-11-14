import os
import hashlib
import re
import secrets
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from typing import Literal, Optional

import pymysql
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymysql.cursors import DictCursor
from pydantic import BaseModel

DB = dict(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "grit"),
    cursorclass=DictCursor,
)
MIN_LEAD = timedelta(hours=2)          # book / cancel at least 2h before start
SLOT_LEN = timedelta(minutes=30)
COOLDOWN_DAYS = {"FAILED": 14, "RETAKE_LATER": 7, "NO_SHOW": 3}
STRICT_TIME = os.getenv("STRICT_TIME", "0") == "1"   # 1 = outcome only after slot starts

REASONS = {
    "NOT_ELIGIBLE": "You haven't cleared all required skills yet.",
    "BOOKED": "You already have an interview booked.",
    "PASSED": "You've already earned this badge.",
    "BADGE_NULLIFIED": "Your badge was nullified. Please contact the GRIT team.",
    "FAILED": "You can book again once your cooldown ends.",
    "RETAKE_LATER": "You can book again once your cooldown ends.",
    "NO_SHOW": "You can book again once your cooldown ends.",
}

app = FastAPI(title="GRIT Interview Scheduler")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@contextmanager
def tx():
    conn = pymysql.connect(**DB)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def auth(cur, uid, roles):
    """Demo auth: X-User-Id header. Swap for JWT/SSO in production."""
    cur.execute("SELECT id,name,email,role FROM users WHERE id=%s", (uid,))
    u = cur.fetchone()
    if not u:
        raise HTTPException(401, "Unknown user")
    if u["role"] not in roles:
        raise HTTPException(403, f"Not allowed for role '{u['role']}'")
    return u


def student_state(cur, sid, track_id=1):
    """Single source of truth for where a student is in the journey."""
    cur.execute("SELECT name FROM tracks WHERE id=%s", (track_id,))
    t = cur.fetchone()
    out = {"track_id": track_id, "track_name": t["name"] if t else "Track", "state": "NOT_ELIGIBLE",
           "can_book": False, "interview": None, "retake_after": None, "attempts": 0,
           "last_cancelled_by": None}
    cur.execute("SELECT * FROM student_tracks WHERE student_id=%s AND track_id=%s", (sid, track_id))
    st = cur.fetchone()
    if not st or not st["eligible"]:
        return out
    if st["badge_status"] == "NULLIFIED":
        out.update(state="BADGE_NULLIFIED", reason=st["nullified_reason"])
        return out
    cur.execute("""SELECT COUNT(*) c FROM interviews WHERE student_id=%s AND track_id=%s
                   AND status IN ('PASSED','FAILED','RETAKE_LATER','NO_SHOW')""", (sid, track_id))
    out["attempts"] = cur.fetchone()["c"]
    cur.execute("""SELECT i.*, s.start_time, s.end_time, s.interviewer_id, u.name AS interviewer_name
                   FROM interviews i JOIN slots s ON s.id=i.slot_id JOIN users u ON u.id=s.interviewer_id
                   WHERE i.student_id=%s AND i.track_id=%s ORDER BY i.id DESC LIMIT 1""", (sid, track_id))
    last = cur.fetchone()
    if not last or last["status"] == "CANCELLED":
        out.update(state="ELIGIBLE", can_book=True, last_cancelled_by=last["cancelled_by"] if last else None)
        return out
    out.update(state=last["status"], interview=last)
    if last["status"] in ("FAILED", "RETAKE_LATER", "NO_SHOW"):
        ra = last["retake_after"]
        out["retake_after"] = ra
        out["can_book"] = ra is None or ra <= date.today()
    return out


# ---------------------------------------------------------------- general
@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/users")
def users():
    with tx() as cur:
        cur.execute("SELECT id,name,role FROM users ORDER BY role, id")
        return cur.fetchall()


# ---------------------------------------------------------------- student
@app.get("/api/me/status")
def my_status(x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["student"])
        s = student_state(cur, u["id"])
        s["student_name"] = u["name"]
        return s


@app.get("/api/slots/available")
def available_slots(x_user_id: int = Header(...)):
    with tx() as cur:
        auth(cur, x_user_id, ["student"])
        cur.execute("""SELECT s.id, s.start_time, s.end_time, u.name AS interviewer_name
                       FROM slots s JOIN users u ON u.id=s.interviewer_id
                       WHERE s.status='OPEN' AND s.start_time >= %s
                       ORDER BY s.start_time, u.name LIMIT 200""", (datetime.now() + MIN_LEAD,))
        return cur.fetchall()


class BookIn(BaseModel):
    slot_id: int
    track_id: int = 1


@app.post("/api/interviews", status_code=201)
def book(body: BookIn, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["student"])
        # lock the student's row so two parallel requests can't double-book
        cur.execute("SELECT 1 FROM student_tracks WHERE student_id=%s AND track_id=%s FOR UPDATE",
                    (u["id"], body.track_id))
        st = student_state(cur, u["id"], body.track_id)
        if not st["can_book"]:
            raise HTTPException(409, REASONS.get(st["state"], "You can't book right now."))
        # lock the slot so two students can't take the same one
        cur.execute("SELECT * FROM slots WHERE id=%s FOR UPDATE", (body.slot_id,))
        slot = cur.fetchone()
        if not slot or slot["status"] != "OPEN":
            raise HTTPException(409, "That slot was just taken. Please pick another.")
        if slot["start_time"] < datetime.now() + MIN_LEAD:
            raise HTTPException(409, "Slots must be booked at least 2 hours in advance.")
        cur.execute("""INSERT INTO interviews (student_id,track_id,slot_id,attempt_no,status,meeting_link)
                       VALUES (%s,%s,%s,%s,'BOOKED',%s)""",
                    (u["id"], body.track_id, slot["id"], st["attempts"] + 1,
                     f"https://meet.example.com/grit-{slot['id']}"))
        iid = cur.lastrowid
        cur.execute("UPDATE slots SET status='BOOKED' WHERE id=%s", (slot["id"],))
        return {"id": iid, "slot_id": slot["id"], "interviewer_id": slot["interviewer_id"],
                "start_time": slot["start_time"], "status": "BOOKED"}


@app.post("/api/interviews/{iid}/cancel")
def cancel(iid: int, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["student", "interviewer"])
        cur.execute("""SELECT i.*, s.start_time, s.interviewer_id FROM interviews i
                       JOIN slots s ON s.id=i.slot_id WHERE i.id=%s FOR UPDATE""", (iid,))
        i = cur.fetchone()
        if not i:
            raise HTTPException(404, "Interview not found")
        if i["status"] != "BOOKED":
            raise HTTPException(409, "Only booked interviews can be cancelled.")
        if u["role"] == "student":
            if i["student_id"] != u["id"]:
                raise HTTPException(403, "Not your interview")
            if i["start_time"] - datetime.now() < MIN_LEAD:
                raise HTTPException(409, "Too late to cancel (less than 2 hours to go).")
        elif i["interviewer_id"] != u["id"]:
            raise HTTPException(403, "Not your slot")
        cur.execute("UPDATE interviews SET status='CANCELLED', cancelled_by=%s WHERE id=%s", (u["role"], iid))
        # student cancel frees the slot; interviewer cancel blocks it (they're unavailable)
        cur.execute("UPDATE slots SET status=%s WHERE id=%s",
                    ("OPEN" if u["role"] == "student" else "BLOCKED", i["slot_id"]))
        return {"id": iid, "status": "CANCELLED"}


# ---------------------------------------------------------------- interviewer
class AvailIn(BaseModel):
    day: date
    start: str  # "HH:MM"
    end: str


@app.post("/api/interviewer/availability", status_code=201)
def add_availability(body: AvailIn, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["interviewer"])
        try:
            t = datetime.strptime(f"{body.day} {body.start}", "%Y-%m-%d %H:%M")
            end = datetime.strptime(f"{body.day} {body.end}", "%Y-%m-%d %H:%M")
        except ValueError:
            raise HTTPException(422, "Use HH:MM for start and end.")
        if end <= t or end - t > timedelta(hours=12):
            raise HTTPException(422, "End must be after start (max 12 hours).")
        created = 0
        while t + SLOT_LEN <= end:
            if t > datetime.now():
                cur.execute("INSERT IGNORE INTO slots (interviewer_id,start_time,end_time) VALUES (%s,%s,%s)",
                            (u["id"], t, t + SLOT_LEN))
                created += cur.rowcount
            t += SLOT_LEN
        return {"created": created}


@app.delete("/api/interviewer/slots/{slot_id}")
def delete_slot(slot_id: int, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["interviewer"])
        cur.execute("SELECT * FROM slots WHERE id=%s AND interviewer_id=%s FOR UPDATE", (slot_id, u["id"]))
        s = cur.fetchone()
        if not s:
            raise HTTPException(404, "Slot not found")
        if s["status"] == "BOOKED":
            raise HTTPException(409, "A student has booked this slot. Cancel the interview first.")
        cur.execute("DELETE FROM slots WHERE id=%s AND status<>'BOOKED'", (slot_id,))
        return {"deleted": slot_id}


@app.get("/api/interviewer/schedule")
def schedule(day: date, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["interviewer"])
        cur.execute("""SELECT s.id AS slot_id, s.start_time, s.end_time, s.status AS slot_status,
                              i.id AS interview_id, i.status AS interview_status, i.notes, i.meeting_link,
                              stu.id AS student_id, stu.name AS student_name
                       FROM slots s
                       LEFT JOIN interviews i ON i.slot_id=s.id AND i.status<>'CANCELLED'
                       LEFT JOIN users stu ON stu.id=i.student_id
                       WHERE s.interviewer_id=%s AND DATE(s.start_time)=%s
                       ORDER BY s.start_time""", (u["id"], day))
        return cur.fetchall()


class OutcomeIn(BaseModel):
    outcome: Literal["PASS", "FAIL", "RETAKE_LATER", "NO_SHOW"]
    notes: Optional[str] = None
    retake_after: Optional[date] = None


@app.post("/api/interviews/{iid}/outcome")
def record_outcome(iid: int, body: OutcomeIn, x_user_id: int = Header(...)):
    with tx() as cur:
        u = auth(cur, x_user_id, ["interviewer", "team"])
        cur.execute("""SELECT i.*, s.start_time, s.interviewer_id FROM interviews i
                       JOIN slots s ON s.id=i.slot_id WHERE i.id=%s FOR UPDATE""", (iid,))
        i = cur.fetchone()
        if not i:
            raise HTTPException(404, "Interview not found")
        if u["role"] == "interviewer" and i["interviewer_id"] != u["id"]:
            raise HTTPException(403, "This interview belongs to another interviewer.")
        if i["status"] != "BOOKED":
            raise HTTPException(409, f"Outcome already recorded ({i['status']}).")
        if STRICT_TIME and i["start_time"] > datetime.now():
            raise HTTPException(409, "You can record an outcome only after the interview starts.")
        if body.outcome in ("FAIL", "RETAKE_LATER") and not (body.notes or "").strip():
            raise HTTPException(422, "Add feedback for the student when the result is not a pass.")
        status = {"PASS": "PASSED", "FAIL": "FAILED", "RETAKE_LATER": "RETAKE_LATER", "NO_SHOW": "NO_SHOW"}[body.outcome]
        ra = None
        if status != "PASSED":
            ra = body.retake_after or date.today() + timedelta(days=COOLDOWN_DAYS[status])
        cur.execute("UPDATE interviews SET status=%s, notes=%s, retake_after=%s WHERE id=%s",
                    (status, body.notes, ra, iid))
        if status == "PASSED":
            cur.execute("""UPDATE student_tracks SET badge_status='EARNED'
                           WHERE student_id=%s AND track_id=%s AND badge_status<>'NULLIFIED'""",
                        (i["student_id"], i["track_id"]))
        return {"id": iid, "status": status, "retake_after": ra}


# ---------------------------------------------------------------- interview team
@app.get("/api/team/students")
def team_students(track_id: int = 1, x_user_id: int = Header(...)):
    with tx() as cur:
        auth(cur, x_user_id, ["team"])
        cur.execute("""SELECT u.id,u.name,u.email FROM student_tracks st JOIN users u ON u.id=st.student_id
                       WHERE st.track_id=%s AND st.eligible=1 ORDER BY u.name""", (track_id,))
        rows = []
        for stu in cur.fetchall():
            s = student_state(cur, stu["id"], track_id)
            i = s["interview"] or {}
            group = ("booked" if s["state"] == "BOOKED"
                     else "completed" if s["state"] in ("PASSED", "BADGE_NULLIFIED") else "not_booked")
            rows.append({**stu, "state": s["state"], "group": group, "can_book": s["can_book"],
                         "attempts": s["attempts"], "retake_after": s["retake_after"],
                         "start_time": i.get("start_time"), "interviewer_name": i.get("interviewer_name")})
        counts = {g: sum(1 for r in rows if r["group"] == g) for g in ("booked", "not_booked", "completed")}
        return {"counts": counts, "students": rows}


class NullifyIn(BaseModel):
    track_id: int = 1
    reason: str


@app.post("/api/team/students/{sid}/nullify")
def nullify(sid: int, body: NullifyIn, x_user_id: int = Header(...)):
    with tx() as cur:
        auth(cur, x_user_id, ["team"])
        cur.execute("""UPDATE student_tracks SET badge_status='NULLIFIED', nullified_reason=%s
                       WHERE student_id=%s AND track_id=%s""", (body.reason, sid, body.track_id))
        if cur.rowcount == 0:
            raise HTTPException(404, "Student/track not found (or already nullified)")
        # free any upcoming booking so the slot isn't wasted
        cur.execute("""SELECT i.id, i.slot_id FROM interviews i WHERE i.student_id=%s AND i.track_id=%s
                       AND i.status='BOOKED'""", (sid, body.track_id))
        for r in cur.fetchall():
            cur.execute("UPDATE interviews SET status='CANCELLED', cancelled_by='interviewer' WHERE id=%s", (r["id"],))
            cur.execute("UPDATE slots SET status='OPEN' WHERE id=%s", (r["slot_id"],))
        return {"student_id": sid, "badge_status": "NULLIFIED"}



# ---------------------------------------------------------------- login (mobile OTP)
DEMO_OTP = os.getenv("DEMO_OTP", "1") == "1"   # 1 = also return the OTP in the API response (demo only)
OTP_TTL = timedelta(minutes=5)
OTP_RESEND = timedelta(seconds=30)
OTP_MAX_TRIES = 5
PHONE_RE = re.compile(r"^[6-9]\d{9}$")


def _hash(user_id, phone, code):
    return hashlib.sha256(f"{user_id}:{phone}:{code}".encode()).hexdigest()


def send_sms(phone, text):
    """Plug a real provider here (MSG91 / Twilio / Fast2SMS). Demo: print to the server console."""
    print(f"\n[SMS to +91{phone}] {text}\n")


class SendOtpIn(BaseModel):
    user_id: int
    phone: str


class VerifyOtpIn(BaseModel):
    user_id: int
    phone: str
    code: str


@app.post("/api/auth/send-otp")
def send_otp(body: SendOtpIn):
    phone = body.phone.strip()
    if not PHONE_RE.match(phone):
        raise HTTPException(422, "Enter a valid 10-digit mobile number.")
    with tx() as cur:
        cur.execute("SELECT id,name,role,phone FROM users WHERE id=%s", (body.user_id,))
        u = cur.fetchone()
        if not u:
            raise HTTPException(404, "Profile not found.")
        if u["phone"] and u["phone"] != phone:
            raise HTTPException(403, f"This profile is registered with a number ending in {u['phone'][-4:]}.")
        cur.execute("SELECT created_at FROM otps WHERE user_id=%s ORDER BY id DESC LIMIT 1", (u["id"],))
        last = cur.fetchone()
        if last and datetime.now() - last["created_at"] < OTP_RESEND:
            raise HTTPException(429, "Please wait a few seconds before requesting another OTP.")
        code = f"{secrets.randbelow(1000000):06d}"
        now = datetime.now()
        cur.execute("INSERT INTO otps (user_id,phone,code_hash,expires_at,created_at) VALUES (%s,%s,%s,%s,%s)",
                    (u["id"], phone, _hash(u["id"], phone, code), now + OTP_TTL, now))
        send_sms(phone, f"Your GRIT Interviews OTP is {code}. It is valid for 5 minutes.")
        return {"sent": True, "expires_in": int(OTP_TTL.total_seconds()), "demo_otp": code if DEMO_OTP else None}


@app.post("/api/auth/verify-otp")
def verify_otp(body: VerifyOtpIn):
    phone, error, user = body.phone.strip(), None, None
    with tx() as cur:
        cur.execute("""SELECT * FROM otps WHERE user_id=%s AND phone=%s AND used=0
                       ORDER BY id DESC LIMIT 1 FOR UPDATE""", (body.user_id, phone))
        o = cur.fetchone()
        if not o or o["expires_at"] < datetime.now():
            error = (410, "This OTP has expired. Please request a new one.")
        elif o["attempts"] >= OTP_MAX_TRIES:
            error = (429, "Too many wrong attempts. Please request a new OTP.")
        elif o["code_hash"] != _hash(body.user_id, phone, body.code.strip()):
            cur.execute("UPDATE otps SET attempts=attempts+1 WHERE id=%s", (o["id"],))
            error = (400, "Incorrect OTP. Please try again.")
        else:
            cur.execute("UPDATE otps SET used=1 WHERE id=%s", (o["id"],))
            cur.execute("UPDATE users SET phone=%s WHERE id=%s", (phone, body.user_id))
            cur.execute("SELECT id,name,role FROM users WHERE id=%s", (body.user_id,))
            user = cur.fetchone()
    if error:   # raised after the block so the attempt counter is committed
        raise HTTPException(*error)
    return {"verified": True, "user": user}