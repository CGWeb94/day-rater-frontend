// client/src/App.jsx
import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const API = "https://day-rater-server.onrender.com";

function todayLocalISO() {
  const now = new Date();
  const offMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offMs).toISOString().slice(0, 10);
}

export default function App() {
  const [date, setDate] = useState(todayLocalISO());
  const [score, setScore] = useState(50);
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // 👇 Neu: State für Startscreen
  const [started, setStarted] = useState(false);

  async function load() {
    setLoading(true);
    const [eRes, sRes] = await Promise.all([
      fetch(`${API}/entries`),
      fetch(`${API}/stats`)
    ]);
    setEntries(await eRes.json());
    setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveEntry() {
    if (score < 1 || score > 100) return alert("Score muss 1–100 sein.");
    const res = await fetch(`${API}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, score: Number(score), text })
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Fehler beim Speichern");
    }
    setText("");
    setScore(50);
    setDate(todayLocalISO());
    await load();
  }

  async function deleteEntry(id) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    await fetch(`${API}/entries/${id}`, { method: "DELETE" });
    await load();
  }

  // Chart-Daten
  const chartData = useMemo(() => {
    const copy = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    return copy.map(e => ({ date: e.date, score: e.score }));
  }, [entries]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      {/* 👇 Startscreen */}
      {!started && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            textAlign: "center",
            transition: "opacity 0.6s ease",
            opacity: started ? 0 : 1
          }}
        >
          <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Hi Bea! 👋</h1>
          <button
            onClick={() => setStarted(true)}
            style={{
              padding: "12px 20px",
              fontSize: "1.1rem",
              borderRadius: "8px",
              cursor: "pointer",
              border: "none",
              background: "#007bff",
              color: "white",
              transition: "transform 0.2s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Tracken
          </button>
        </div>
      )}

      {/* 👇 Hauptinhalt erst nach Klick sichtbar */}
      <div style={{
        opacity: started ? 1 : 0,
        transition: "opacity 0.8s ease"
      }}>
        {started && (
          <>
            <h1>🌞 Day Rater</h1>
            <p style={{ opacity: 0.8 }}>
              Jeden Tag zwischen <b>1–100</b> bewerten + Notiz festhalten.
            </p>

            <section style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
              <label>
                Datum<br />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayLocalISO()}
                />
              </label>

              <label>
                Score: <b>{score}</b>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </label>

              <label>
                Notiz<br />
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Wie war dein Tag?"
                  style={{ width: "100%" }}
                />
              </label>

              <button onClick={saveEntry} style={{ padding: "10px 14px", cursor: "pointer" }}>
                Speichern
              </button>
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
              {stats && (
                <p style={{ marginTop: 8 }}>
                  Einträge: <b>{stats.count || 0}</b> · Durchschnitt: <b>{stats.avg ?? "-"}</b> · Min: <b>{stats.min ?? "-"}</b> · Max: <b>{stats.max ?? "-"}</b>
                </p>
              )}
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
                        <b>{e.date}</b> — {e.score}/100
                        {e.text && <div style={{ opacity: 0.85, marginTop: 4 }}>{e.text}</div>}
                      </div>
                      <button onClick={() => deleteEntry(e.id)} style={{ cursor: "pointer" }}>
                        Löschen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
