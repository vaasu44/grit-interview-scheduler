import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import Login from "./Login.jsx";
import StudentHome from "./StudentHome.jsx";
import BookSlot from "./BookSlot.jsx";
import Interviewer from "./Interviewer.jsx";
import Team from "./Team.jsx";
import BeforeAfter from "./Compare.jsx";

const TABS = {
  student: [
    ["home", "My interview"],
    ["book", "Book a slot"],
  ],
  interviewer: [["schedule", "Schedule & availability"]],
  team: [["team", "Dashboard"]],
};

export default function App() {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("");
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");
  const [showBA, setShowBA] = useState(false);

  useEffect(() => {
    api("/users")
      .then(setUsers)
      .catch((e) => setErr(e.message));
  }, []);

  const pick = (u) => {
    setUser(u);
    setTab(TABS[u.role][0][0]);
    setStatus(null);
    setErr("");
  };
  const logout = () => {
    setUser(null);
    setStatus(null);
    setErr("");
    setShowBA(false);
  };

  const loadStatus = useCallback(() => {
    if (user?.role === "student")
      api("/me/status", { user })
        .then(setStatus)
        .catch((e) => setErr(e.message));
  }, [user]);
  useEffect(() => {
    loadStatus();
  }, [loadStatus, tab]);

  const cancel = async (id) => {
    try {
      await api(`/interviews/${id}/cancel`, { method: "POST", user });
      loadStatus();
    } catch (e) {
      setErr(e.message);
    }
  };

  const content = !user ? (
    <Login users={users} onLogin={pick} />
  ) : (
    <div className="mx-auto max-w-4xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-indigo-700">GRIT · Interviews</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            {user.name}{" "}
            <span className="text-xs text-slate-400">({user.role})</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-white"
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="mb-4 flex gap-1 border-b">
        {TABS[user.role].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium ${tab === k ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500"}`}
          >
            {l}
          </button>
        ))}
      </nav>
      {err && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {tab === "home" && status && (
        <StudentHome
          status={status}
          onBook={() => setTab("book")}
          onCancel={cancel}
        />
      )}
      {tab === "book" && <BookSlot user={user} onDone={() => setTab("home")} />}
      {tab === "schedule" && <Interviewer user={user} />}
      {tab === "team" && <Team user={user} />}
    </div>
  );

  return (
    <>
      {content}
      {user && (
        <>
          <button
            onClick={() => setShowBA(true)}
            className="fixed bottom-5 right-5 z-40 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
          >
            Before / After
          </button>
          {showBA && <BeforeAfter onClose={() => setShowBA(false)} />}
        </>
      )}
    </>
  );
}
