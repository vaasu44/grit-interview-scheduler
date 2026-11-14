"""Demo data. Run: python seed.py   (after running schema.sql)"""
from datetime import datetime, timedelta, date
from main import tx

now = datetime.now().replace(minute=0, second=0, microsecond=0)

with tx() as cur:
    cur.execute("INSERT INTO tracks (id,name) VALUES (1,'Full-Stack Track')")
    people = [
        (1, "Ravi (Interview Team)", "ravi@grit.dev", "team"),
        (2, "Priya Interviewer", "priya@grit.dev", "interviewer"),
        (3, "Karthik Interviewer", "karthik@grit.dev", "interviewer"),
        (4, "Aarav Sharma", "aarav@niat.dev", "student"),    # eligible, not booked
        (5, "Meera Nair", "meera@niat.dev", "student"),      # booked (slot already started)
        (6, "Rohan Gupta", "rohan@niat.dev", "student"),     # passed
        (7, "Sneha Reddy", "sneha@niat.dev", "student"),     # retake later (cooldown running)
        (8, "Kabir Singh", "kabir@niat.dev", "student"),     # failed, cooldown over
        (9, "Diya Patel", "diya@niat.dev", "student"),       # not eligible
        (10, "Ishaan Rao", "ishaan@niat.dev", "student"),    # badge nullified
        (11, "Tara Menon", "tara@niat.dev", "student"),      # eligible, not booked
    ]
    cur.executemany("INSERT INTO users (id,name,email,role) VALUES (%s,%s,%s,%s)", people)
    cur.executemany("INSERT INTO student_tracks (student_id,track_id,eligible,badge_status,nullified_reason) "
                    "VALUES (%s,1,%s,%s,%s)",
                    [(4, 1, "NONE", None), (5, 1, "NONE", None), (6, 1, "EARNED", None), (7, 1, "NONE", None),
                     (8, 1, "NONE", None), (9, 0, "NONE", None), (10, 1, "NULLIFIED", "Malpractice flagged in a skill contest"),
                     (11, 1, "NONE", None)])

    def slot(interviewer, start, status):
        cur.execute("INSERT INTO slots (interviewer_id,start_time,end_time,status) VALUES (%s,%s,%s,%s)",
                    (interviewer, start, start + timedelta(minutes=30), status))
        return cur.lastrowid

    def interview(student, slot_id, status, attempt=1, notes=None, retake=None):
        cur.execute("""INSERT INTO interviews (student_id,track_id,slot_id,attempt_no,status,notes,retake_after,meeting_link)
                       VALUES (%s,1,%s,%s,%s,%s,%s,'https://meet.example.com/demo')""",
                    (student, slot_id, attempt, status, notes, retake))

    interview(5, slot(2, now - timedelta(hours=1), "BOOKED"), "BOOKED")
    interview(6, slot(2, now - timedelta(days=3), "BOOKED"), "PASSED")
    interview(7, slot(3, now - timedelta(days=2), "BOOKED"), "RETAKE_LATER",
              notes="Solid API design, but revise database indexing and error handling.",
              retake=date.today() + timedelta(days=5))
    interview(8, slot(3, now - timedelta(days=20), "BOOKED"), "FAILED",
              notes="Could not explain the code submitted in the contest.", retake=date.today() - timedelta(days=6))
    interview(10, slot(2, now - timedelta(days=9), "BOOKED"), "PASSED")

    # open availability for the next 3 days, 10:00-13:00 for both interviewers
    for d in (1, 2, 3):
        base = (now + timedelta(days=d)).replace(hour=10)
        for who in (2, 3):
            for k in range(6):
                slot(who, base + timedelta(minutes=30 * k), "OPEN")
print("Seeded. Users: 1=team, 2-3=interviewers, 4-11=students")
