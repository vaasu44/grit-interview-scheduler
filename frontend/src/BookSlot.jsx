import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Btn, Card, fmtDay, fmtTime } from "./ui.jsx";

export default function BookSlot({ user, onDone }) {
  const [slots, setSlots] = useState([]);
  const [pick, setPick] = useState(null);
  const [err, setErr] = useState("");
  const load = () => api("/slots/available", { user }).then(setSlots).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [user]);

  const days = slots.reduce((a, s) => { const k = fmtDay(s.start_time); (a[k] = a[k] || []).push(s); return a; }, {});
  const confirm = async () => {
    try { await api("/interviews", { method: "POST", user, body: { slot_id: pick.id } }); onDone(); }
    catch (e) { setErr(e.message); setPick(null); load(); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose an interview slot</h2>
      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      {Object.keys(days).length === 0 && <Card>No open slots right now. Please check back soon.</Card>}
      {Object.entries(days).map(([day, list]) => (
        <Card key={day}>
          <p className="mb-3 font-medium">{day}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((s) => (
              <button key={s.id} onClick={() => setPick(s)}
                className={`rounded-lg px-3 py-2 text-sm ring-1 ${pick?.id === s.id ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white ring-slate-300 hover:bg-slate-50"}`}>
                {fmtTime(s.start_time)}<span className="block text-[10px] opacity-70">{s.interviewer_name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </Card>
      ))}
      {pick && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white shadow-lg">
          <span className="text-sm">{fmtDay(pick.start_time)}, {fmtTime(pick.start_time)} with {pick.interviewer_name}</span>
          <Btn onClick={confirm}>Confirm booking</Btn>
        </div>
      )}
    </div>
  );
}
