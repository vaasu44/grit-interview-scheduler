import { useEffect, useState } from "react";
import { api } from "./api.js";

const ROLES = [
  { key: "student", label: "Student", icon: "🎓", hint: "Book your interview" },
  {
    key: "interviewer",
    label: "Interviewer",
    icon: "🧑‍💼",
    hint: "Manage availability",
  },
  {
    key: "team",
    label: "Interview team",
    icon: "📋",
    hint: "Track all students",
  },
];
const FEATURES = [
  "Students book an interview slot in under a minute",
  "Interviewers set availability and record outcomes",
  "The team sees who has booked and who hasn't",
];

export default function Login({ users, onLogin }) {
  const [role, setRole] = useState("student");
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("form");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  const list = users.filter((u) => u.role === role);
  useEffect(() => {
    setUserId("");
  }, [role]);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendOtp = async () => {
    setErr("");
    if (!userId) return setErr("Please select your name.");
    if (!/^[6-9]\d{9}$/.test(phone))
      return setErr("Enter a valid 10-digit mobile number.");
    setBusy(true);
    try {
      const r = await api("/auth/send-otp", {
        method: "POST",
        body: { user_id: +userId, phone },
      });
      setDemoOtp(r.demo_otp || "");
      setOtp("");
      setStage("otp");
      setWait(30);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setErr("");
    if (otp.length !== 6) return setErr("Enter the 6-digit OTP.");
    setBusy(true);
    try {
      const r = await api("/auth/verify-otp", {
        method: "POST",
        body: { user_id: +userId, phone, code: otp },
      });
      onLogin(r.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* left: intro */}
      <section className="flex flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-8 text-white md:p-14">
        <span className="w-fit rounded-lg bg-white/15 px-3 py-1 text-sm font-semibold tracking-widest">
          GRIT
        </span>
        <div className="my-10">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            GRIT · Interviews
          </h1>
          <p className="mt-4 max-w-md text-indigo-100">
            Clear your skills, book a live interview and earn your Track Badge.
            One place for students, interviewers and the interview team.
          </p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-indigo-200">
          Skill contests → Interview → Track Badge
        </p>
      </section>

      {/* right: sign in */}
      <section className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {stage === "form" ? "Sign in" : "Verify your number"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {stage === "form"
              ? "Choose who you are, then confirm with an OTP."
              : `We sent a 6-digit OTP to +91 ${phone}`}
          </p>

          {err && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {stage === "form" ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  I am a
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRole(r.key)}
                      className={`rounded-xl p-3 text-center ring-1 transition ${role === r.key ? "bg-indigo-50 ring-2 ring-indigo-500" : "ring-slate-200 hover:bg-slate-50"}`}
                    >
                      <span className="text-2xl">{r.icon}</span>
                      <span className="mt-1 block text-sm font-medium">
                        {r.label}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {r.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Your name
                </label>
                <select
                  className={input}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">Select your name</option>
                  {list.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mobile number
                </label>
                <div className="flex gap-2">
                  <span className="flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                    +91
                  </span>
                  <input
                    className={input}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
              </div>
              <button
                onClick={sendOtp}
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send OTP"}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {demoOtp && (
                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Demo mode: no SMS is sent. Your OTP is{" "}
                  <b className="tracking-widest">{demoOtp}</b>
                </div>
              )}
              <input
                className={`${input} text-center text-2xl tracking-[0.5em]`}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
              <button
                onClick={verify}
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy ? "Verifying…" : "Verify & continue"}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  className="text-slate-500 hover:text-slate-800"
                  onClick={() => {
                    setStage("form");
                    setErr("");
                  }}
                >
                  ← Change number
                </button>
                <button
                  className="font-medium text-indigo-600 disabled:text-slate-400"
                  disabled={wait > 0 || busy}
                  onClick={sendOtp}
                >
                  {wait > 0 ? `Resend in ${wait}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
