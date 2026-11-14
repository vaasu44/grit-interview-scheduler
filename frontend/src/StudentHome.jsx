import { studentMessage } from "./messages.js";
import { Btn, Card, fmt } from "./ui.jsx";

const TONE = {
  slate: "bg-slate-50 border-slate-200", blue: "bg-blue-50 border-blue-200", amber: "bg-amber-50 border-amber-200",
  green: "bg-green-50 border-green-200", orange: "bg-orange-50 border-orange-200", red: "bg-red-50 border-red-200",
  rose: "bg-rose-50 border-rose-200",
};
const STEPS = ["Skills cleared", "Interview booked", "Interview done", "Result"];
const DONE = { NOT_ELIGIBLE: 0, ELIGIBLE: 1, BOOKED: 2 }; // everything else = all 4

export default function StudentHome({ status: s, onBook, onCancel, readOnly }) {
  const m = studentMessage(s);
  const done = DONE[s.state] ?? 4;
  const i = s.interview;
  const linkLive = i && new Date(i.start_time) - Date.now() < 15 * 60000;
  const badge = s.state === "PASSED" ? "earned" : s.state === "BADGE_NULLIFIED" ? "nullified" : "locked";

  return (
    <div className="space-y-4">
      <Card>
        <ol className="flex items-center justify-between text-xs">
          {STEPS.map((x, n) => (
            <li key={x} className="flex flex-1 flex-col items-center gap-1">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold ${n < done ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>{n < done ? "✓" : n + 1}</span>
              <span className={n < done ? "text-slate-800" : "text-slate-400"}>{x}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className={`rounded-xl border p-5 ${TONE[m.tone]}`}>
        <h2 className="text-lg font-semibold text-slate-900">{m.title}</h2>
        <p className="mt-1 text-sm text-slate-700">{m.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {s.can_book && <Btn disabled={readOnly} onClick={onBook}>{s.state === "ELIGIBLE" ? "Book interview slot" : "Book your next attempt"}</Btn>}
          {s.state === "BOOKED" && (
            <>
              <Btn kind="danger" disabled={readOnly} onClick={() => onCancel(i.id)}>Cancel interview</Btn>
              {linkLive
                ? <a className="text-sm font-medium text-indigo-600 underline" href={i.meeting_link}>Join interview</a>
                : <span className="text-xs text-slate-500">Join link unlocks 15 min before ({fmt(i.start_time)})</span>}
            </>
          )}
          {["FAILED", "RETAKE_LATER", "NO_SHOW"].includes(s.state) && !s.can_book && (
            <span className="text-xs text-slate-500">Booking opens on your retake date</span>
          )}
        </div>
      </div>

      <Card className="flex items-center gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${badge === "earned" ? "bg-green-100" : badge === "nullified" ? "bg-rose-100" : "bg-slate-100 grayscale"}`}>🏅</div>
        <div>
          <p className="font-semibold text-slate-900">{s.track_name} Badge</p>
          <p className="text-sm text-slate-600">
            {badge === "earned" ? "Earned. Visible on your profile and to recruiters." :
             badge === "nullified" ? "Nullified due to a malpractice flag." :
             s.state === "NOT_ELIGIBLE" ? "Locked. Finish your skill contests first." : "Locked. Pass the interview to earn it."}
          </p>
        </div>
      </Card>
    </div>
  );
}
