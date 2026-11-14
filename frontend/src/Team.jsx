import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Btn, Card, Pill, fmt, fmtDate } from "./ui.jsx";

const FILTERS = [["all", "All"], ["booked", "Booked"], ["not_booked", "Not booked"], ["completed", "Completed"]];

export default function Team({ user }) {
  const [data, setData] = useState({ counts: {}, students: [] });
  const [f, setF] = useState("all");
  const [err, setErr] = useState("");
  const load = () => api("/team/students", { user }).then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [user]);

  const nullify = async (s) => {
    const reason = window.prompt(`Why is ${s.name}'s badge being nullified?`);
    if (!reason) return;
    try { await api(`/team/students/${s.id}/nullify`, { method: "POST", user, body: { reason } }); load(); }
    catch (e) { setErr(e.message); }
  };
  const rows = data.students.filter((s) => f === "all" || s.group === f);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Eligible students</h2>
      {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <div className="grid grid-cols-3 gap-3">
        {[["Booked", data.counts.booked], ["Not booked yet", data.counts.not_booked], ["Completed", data.counts.completed]].map(([l, n]) => (
          <Card key={l} className="text-center"><p className="text-2xl font-bold">{n ?? 0}</p><p className="text-xs text-slate-500">{l}</p></Card>
        ))}
      </div>
      <div className="flex gap-2">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className={`rounded-full px-3 py-1 text-sm ring-1 ${f === k ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white ring-slate-300"}`}>{l}</button>
        ))}
      </div>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Student</th><th>Status</th><th>Interview</th><th>Attempts</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td><Pill state={s.state} /></td>
                <td className="text-slate-600">
                  {s.start_time ? `${fmt(s.start_time)} · ${s.interviewer_name}` :
                   s.retake_after && !s.can_book ? `Retake from ${fmtDate(s.retake_after)}` : "—"}
                </td>
                <td>{s.attempts}</td>
                <td className="pr-3 text-right">{s.state === "PASSED" && <Btn kind="danger" onClick={() => nullify(s)}>Nullify badge</Btn>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
