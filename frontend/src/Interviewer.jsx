import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { Btn, Card, Pill, fmtTime } from "./ui.jsx";

const today = () => new Date().toLocaleDateString("en-CA");

export default function Interviewer({ user }) {
  const [day, setDay] = useState(today());
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState({ ok: true, text: "" });
  const [form, setForm] = useState({ start: "10:00", end: "13:00" });
  const [open, setOpen] = useState(null);
  const [out, setOut] = useState({ outcome: "PASS", notes: "", retake_after: "" });

  const load = useCallback(() => api(`/interviewer/schedule?day=${day}`, { user }).then(setRows)
    .catch((e) => setMsg({ ok: false, text: e.message })), [day, user]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okText) => {
    try { await fn(); setMsg({ ok: true, text: okText }); setOpen(null); load(); }
    catch (e) { setMsg({ ok: false, text: e.message }); }
  };
  const addSlots = () => run(async () => {
    const r = await api("/interviewer/availability", { method: "POST", user, body: { day, ...form } });
    setMsg({ ok: true, text: `${r.created} new 30-min slots added` });
  }, "Availability updated");

  const booked = rows.filter((r) => r.interview_id).length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Daily schedule</h2>
          <p className="text-sm text-slate-500">{rows.length} slots · {booked} interviews booked</p>
        </div>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
      </div>
      {msg.text && <div className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <Card>
        <p className="mb-2 text-sm font-medium">Add availability for {day}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <span>to</span>
          <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="rounded-lg border px-2 py-1.5" />
          <Btn onClick={addSlots}>Add 30-min slots</Btn>
        </div>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && <Card>No slots on this day yet.</Card>}
        {rows.map((r) => (
          <Card key={r.slot_id} className="!p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="w-20 font-medium">{fmtTime(r.start_time)}</span>
                {r.interview_id ? (
                  <><span className="text-sm">{r.student_name}</span><Pill state={r.interview_status} /></>
                ) : <Pill state={r.slot_status} />}
              </div>
              <div className="flex gap-2">
                {r.slot_status === "OPEN" && <Btn kind="danger" onClick={() => run(() => api(`/interviewer/slots/${r.slot_id}`, { method: "DELETE", user }), "Slot removed")}>Remove</Btn>}
                {r.interview_status === "BOOKED" && (
                  <>
                    <Btn kind="ghost" onClick={() => setOpen(open === r.interview_id ? null : r.interview_id)}>Record outcome</Btn>
                    <Btn kind="danger" onClick={() => run(() => api(`/interviews/${r.interview_id}/cancel`, { method: "POST", user }), "Interview cancelled, student notified")}>Cancel</Btn>
                  </>
                )}
              </div>
            </div>
            {open === r.interview_id && (
              <div className="mt-3 space-y-2 border-t pt-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {[["PASS", "Pass"], ["FAIL", "Fail"], ["RETAKE_LATER", "Retake later"], ["NO_SHOW", "No-show"]].map(([v, l]) => (
                    <button key={v} onClick={() => setOut({ ...out, outcome: v })}
                      className={`rounded-lg px-3 py-1.5 ring-1 ${out.outcome === v ? "bg-indigo-600 text-white ring-indigo-600" : "ring-slate-300"}`}>{l}</button>
                  ))}
                </div>
                <textarea rows={2} placeholder="Feedback for the student (required for fail / retake)" value={out.notes}
                  onChange={(e) => setOut({ ...out, notes: e.target.value })} className="w-full rounded-lg border p-2" />
                {["FAIL", "RETAKE_LATER"].includes(out.outcome) && (
                  <label className="block text-xs text-slate-500">Can retake from (optional)
                    <input type="date" value={out.retake_after} onChange={(e) => setOut({ ...out, retake_after: e.target.value })} className="ml-2 rounded-lg border px-2 py-1" />
                  </label>
                )}
                <Btn onClick={() => run(() => api(`/interviews/${r.interview_id}/outcome`, { method: "POST", user,
                  body: { outcome: out.outcome, notes: out.notes || null, retake_after: out.retake_after || null } }), "Outcome saved")}>Save outcome</Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
