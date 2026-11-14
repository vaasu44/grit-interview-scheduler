export const fmt = (s) =>
  new Date(s).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fmtDay = (s) =>
  new Date(s).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
export const fmtTime = (s) => new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDate = (s) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const PILL = {
  NOT_ELIGIBLE: ["Skills pending", "bg-slate-200 text-slate-700"],
  ELIGIBLE: ["Eligible, not booked", "bg-blue-100 text-blue-700"],
  BOOKED: ["Interview booked", "bg-amber-100 text-amber-800"],
  PASSED: ["Passed", "bg-green-100 text-green-700"],
  FAILED: ["Not cleared", "bg-red-100 text-red-700"],
  RETAKE_LATER: ["Retake later", "bg-orange-100 text-orange-700"],
  NO_SHOW: ["No-show", "bg-red-100 text-red-700"],
  BADGE_NULLIFIED: ["Badge nullified", "bg-rose-200 text-rose-800"],
  OPEN: ["Open", "bg-blue-100 text-blue-700"],
  BLOCKED: ["Blocked", "bg-slate-200 text-slate-600"],
};
export function Pill({ state }) {
  const [label, cls] = PILL[state] || [state, "bg-slate-100"];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>
);

export const Btn = ({ kind = "primary", className = "", ...p }) => {
  const k = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
    danger: "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50",
  }[kind];
  return <button {...p} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${k} ${className}`} />;
};
