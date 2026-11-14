import { useState } from "react";
import StudentHome from "./StudentHome.jsx";
import { Btn, Card, Pill, fmtDate } from "./ui.jsx";

const day = (n) => new Date(Date.now() + n * 864e5).toISOString();
const base = {
  student_name: "Aarav Sharma",
  track_name: "Full-Stack Track",
  track_id: 1,
};
const who = "Priya Interviewer";
const slot = day(1);

const FX = {
  BOOKED: {
    ...base,
    state: "BOOKED",
    can_book: false,
    attempts: 0,
    interview: {
      id: 1,
      interviewer_name: who,
      start_time: slot,
      meeting_link: "#",
    },
  },
  PASSED: {
    ...base,
    state: "PASSED",
    can_book: false,
    attempts: 1,
    interview: { interviewer_name: who, start_time: slot },
  },
  RETAKE_LATER: {
    ...base,
    state: "RETAKE_LATER",
    can_book: false,
    attempts: 1,
    retake_after: day(7),
    interview: {
      interviewer_name: who,
      start_time: slot,
      notes:
        "Solid API design, but revise database indexing and error handling.",
    },
  },
  FAILED: {
    ...base,
    state: "FAILED",
    can_book: false,
    attempts: 1,
    retake_after: day(14),
    interview: {
      interviewer_name: who,
      start_time: slot,
      notes: "Could not explain the code submitted in the contest.",
    },
  },
  BADGE_NULLIFIED: {
    ...base,
    state: "BADGE_NULLIFIED",
    can_book: false,
    attempts: 1,
    reason: "Malpractice flagged in a skill contest",
  },
};
const OPTIONS = [
  ["PASSED", "Pass"],
  ["RETAKE_LATER", "Retake later"],
  ["FAILED", "Fail"],
  ["BADGE_NULLIFIED", "Nullified later"],
];

const Label = ({ children }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
    {children}
  </p>
);

function TeamRow({ s }) {
  const note =
    s.state === "BOOKED"
      ? "Interview booked for tomorrow"
      : s.retake_after
        ? `Retake from ${fmtDate(s.retake_after)}`
        : s.state === "PASSED"
          ? "Badge earned"
          : "Badge removed";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="font-medium">Aarav Sharma</span>
      <Pill state={s.state} />
      <span className="text-slate-500">{note}</span>
      <span className="text-slate-500">Attempts: {s.attempts}</span>
      {s.state === "PASSED" && (
        <Btn kind="danger" disabled>
          Nullify badge
        </Btn>
      )}
    </div>
  );
}

function InterviewerRow({ s }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="w-16 font-medium">10:00 am</span>
        <span>Aarav Sharma</span>
        <Pill state={s.state} />
      </div>
      {s.state === "BOOKED" ? (
        <div className="flex gap-2">
          <Btn kind="ghost" disabled>
            Record outcome
          </Btn>
          <Btn kind="danger" disabled>
            Cancel
          </Btn>
        </div>
      ) : (
        <span className="text-xs text-slate-500">Outcome recorded</span>
      )}
    </div>
  );
}

export default function BeforeAfter({ onClose }) {
  const [after, setAfter] = useState("PASSED");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4">
      <div className="mx-auto max-w-5xl rounded-2xl bg-slate-100 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Before / after the interview result
            </h2>
            <p className="text-sm text-slate-500">
              The same screens, before the result and after it. Pick an outcome.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Close ✕
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {OPTIONS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setAfter(k)}
              className={`rounded-full px-3 py-1 text-sm ring-1 ${after === k ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white ring-slate-300"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <Label>1. Student home</Label>
        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Before: interview booked</p>
            <StudentHome status={FX.BOOKED} readOnly />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">
              After: {OPTIONS.find((o) => o[0] === after)[1].toLowerCase()}
            </p>
            <StudentHome status={FX[after]} readOnly />
          </div>
        </div>

        <Label>2. Interview team dashboard</Label>
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Card>
            <p className="mb-2 text-xs text-slate-500">Before</p>
            <TeamRow s={FX.BOOKED} />
          </Card>
          <Card>
            <p className="mb-2 text-xs text-slate-500">After</p>
            <TeamRow s={FX[after]} />
          </Card>
        </div>

        <Label>3. Interviewer daily schedule</Label>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <p className="mb-2 text-xs text-slate-500">Before</p>
            <InterviewerRow s={FX.BOOKED} />
          </Card>
          <Card>
            <p className="mb-2 text-xs text-slate-500">After</p>
            <InterviewerRow s={FX[after]} />
          </Card>
        </div>
      </div>
    </div>
  );
}
