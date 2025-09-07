import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Supabase Client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  const [badge, setBadge] = useState("");
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [user, setUser] = useState(null);
  const [userKey, setUserKey] = useState(null);

// --- Auth State + Key Management ---
useEffect(() => {
  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) setUserKey(await getUserKey(session.user.id));
  }
  init();

  const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    if (session?.user) getUserKey(session.user.id).then(setUserKey);
  });

  return () => subscription.unsubscribe();
}, []);

async function getUserKey(userId) {
  const savedKey = localStorage.getItem(`key_${userId}`);
  if (savedKey) {
    const raw = Uint8Array.from(atob(savedKey), c => c.charCodeAt(0));
    return crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  } else {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const exported = await crypto.subtle.exportKey("raw", key);
    localStorage.setItem(`key_${userId}`, btoa(String.fromCharCode(...new Uint8Array(exported))));
    return key;
  }
}

// --- Verschlüsselung / Entschlüsselung ---
async function encryptText(plainText, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encoded = enc.encode(plainText);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return { cipherText: btoa(String.fromCharCode(...new Uint8Array(cipher))), iv: Array.from(iv) };
}

async function decryptText(cipherText, iv, key) {
  const bytes = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    bytes
  );
  return new TextDecoder().decode(decrypted);
}

// --- Auth functions ---
async function signUp() {
  const email = prompt("Deine Email:");
  const password = prompt("Dein Passwort:");
  if (!email || !password) return alert("Email & Passwort nötig");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert("Signup erfolgreich! Bitte bestätige deine Email.");
}

async function signIn() {
  const email = prompt("Deine Email:");
  const password = prompt("Dein Passwort:");
  if (!email || !password) return alert("Email & Passwort nötig");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
}

async function signOut() {
  await supabase.auth.signOut();
  setUser(null);
  setUserKey(null);
}

// --- Load entries & stats ---
async function load() {
  if (!user || !userKey) return;
  setLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Kein gültiger Token");

    const [eRes, sRes] = await Promise.all([
      fetch(`${API}/entries`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/stats`, { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const entriesData = await eRes.json();
    const statsData = await sRes.json();

    // Text entschlüsseln
    const decryptedEntries = await Promise.all(entriesData.map(async e => ({
      ...e,
      text: e.text && userKey ? await decryptText(e.text, e.iv, userKey) : ""
    })));

    setEntries(decryptedEntries);
    setStats(statsData);
  } catch (err) {
    console.error(err);
    setEntries([]);
    setStats(null);
  }
  setLoading(false);
}

useEffect(() => { load(); }, [user, userKey]);

// --- Save entry ---
async function saveEntry() {
  if (!user) return alert("Bitte zuerst anmelden!");
  if (score < 1 || score > 100) return alert("Score muss 1–100 sein.");
  if (!userKey) return alert("Key noch nicht bereit");

  try {
    const { cipherText, iv } = await encryptText(text, userKey);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${API}/entries`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ date, score: Number(score), badge, text: cipherText, iv })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Fehler beim Speichern");
    }

    setText("");
    setScore(50);
    setBadge("");
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
      headers: { Authorization: `Bearer ${token}` }
    });
    await load();
  } catch (err) {
    console.error(err);
    alert("Fehler beim Löschen");
  }
}

// --- Chart data ---
const chartData = useMemo(() => {
  const copy = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  return copy.map(e => ({ date: e.date, score: e.score }));
}, [entries]);

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
            Badge (optional)<br />
            <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="z.B. 🌟" />
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
                    <b>{e.date.slice(0, 10)}</b> — {e.score}/100 {e.badge && <span>{e.badge}</span>}
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
