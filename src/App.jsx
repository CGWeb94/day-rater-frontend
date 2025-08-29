import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const API = import.meta.env.VITE_API_URL;

function todayLocalISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [text, setText] = useState("");
  const [score, setScore] = useState(50);
  const [date, setDate] = useState(todayLocalISO());
  const [loading, setLoading] = useState(false); // für Daten laden
  const [globalLoading, setGlobalLoading] = useState(true); // Overlay

  const [started, setStarted] = useState(false);

  // --- Auth state ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setGlobalLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // --- Load entries + stats ---
  async function load() {
    if (!user) return;
    setLoading(true);
    setGlobalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API}/entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntries(data.entries || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  // --- Auth helpers ---
  async function signUp() {
    const email = prompt("Email:");
    const password = prompt("Passwort:");
    if (!email || !password) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Check deine Emails zum Bestätigen!");
  }

  async function signIn() {
    const email = prompt("Email:");
    const password = prompt("Passwort:");
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // --- Save entry ---
  async function saveEntry() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, score: Number(score), text }),
      });
      if (!res.ok) {
        const err = await res.json();
        return alert(err.error || "Fehler beim Speichern");
      }
      setText("");
      setScore(50);
      setDate(todayLocalISO());
      await load();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern");
    }
  }

  // --- Delete entry ---
  async function deleteEntry(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch(`${API}/entries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Löschen");
    }
  }

  // --- Chart data ---
  const chartData = useMemo(() => {
    const copy = [...entries].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id - b.id
    );
    return copy.map((e) => ({ date: e.date, score: e.score }));
  }, [entries]);

  // --- Loader Overlay ---
  if (globalLoading) {
    return (
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(255,255,255,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontFamily: "system-ui, sans-serif", zIndex: 9999
      }}>
        ⏳ Lade...
      </div>
    );
  }

  // --- Render ---
  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <h1>Bitte einloggen</h1>
        <button onClick={signUp} style={{ margin: 8, padding: "10px 20px" }}>Signup</button>
        <button onClick={signIn} style={{ margin: 8, padding: "10px 20px" }}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <button onClick={signOut} style={{ marginBottom: 16 }}>Logout</button>

      {!started && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", textAlign: "center" }}>
          <h1>Hi {user.email} 👋</h1>
          <button onClick={() => setStarted(true)}>Tracken</button>
        </div>
      )}

      {started && (
        <>
          <h1>🌞 Day Rater</h1>
          <p style={{ opacity: 0.8 }}>Jeden Tag zwischen <b>1–100</b> bewerten + Notiz festhalten.</p>

          <section style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
            <label>
              Datum<br />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayLocalISO()} />
            </label>

            <label>
              Score: <b>{score}</b>
              <input type="range" min="1" max="100" value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: "100%" }} />
              <input type="number" min="1" max="100" value={score} onChange={(e) => setScore(Number(e.target.value))} />
            </label>

            <label>
              Notiz<br />
              <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Wie war dein Tag?" style={{ width: "100%" }} />
            </label>

            <button onClick={saveEntry} style={{ padding: "10px 14px", cursor: "pointer" }}>Speichern</button>
          </section>

          <hr style={{ margin: "24px 0" }} />

          <section>
            <h2>Verlauf</h2>
            {loading ? <p>Lade…</p> : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {stats && <p style={{ marginTop: 8 }}>Einträge: <b>{stats.count || 0}</b> · Durchschnitt: <b>{stats.avg ?? "-"}</b> · Min: <b>{stats.min ?? "-"}</b> · Max: <b>{stats.max ?? "-"}</b></p>}
          </section>

          <hr style={{ margin: "24px 0" }} />

          <section>
            <h2>Letzte Einträge</h2>
            {!entries.length && <p>Noch keine Einträge 🙃</p>}
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
              {entries.map(e => (
                <li key={e.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <b>{e.date.slice(0, 10)}</b> — {e.score}/100
                      {e.text && <div style={{ opacity: 0.85, marginTop: 4 }}>{e.text}</div>}
                    </div>
                    <button onClick={() => deleteEntry(e.id)} style={{ cursor: "pointer" }}>Löschen</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
