import { useState, useMemo } from "react";
import CalendarView from "./components/CalendarView";

export default function EntriesPage() {
  const [view, setView] = useState("list"); // "list" oder "calendar"
  const [filterBadge, setFilterBadge] = useState("");
  const [sort, setSort] = useState("date-desc"); // "date-asc", "score-asc", "score-desc"

  // --- Einträge aus localStorage laden ---
  const entries = JSON.parse(localStorage.getItem("entries") || "[]");

  // --- Alle verfügbaren Badges für Filter ---
  const allBadges = useMemo(() => {
    return [...new Set(entries.map(e => e.badge).filter(Boolean))];
  }, [entries]);

  // --- Gefilterte & sortierte Einträge ---
  const filtered = useMemo(() => {
    let data = [...entries];
    if (filterBadge) data = data.filter(e => e.badge === filterBadge);

    switch (sort) {
      case "date-asc": data.sort((a,b) => a.date.localeCompare(b.date)); break;
      case "score-asc": data.sort((a,b) => a.score - b.score); break;
      case "score-desc": data.sort((a,b) => b.score - a.score); break;
      default: data.sort((a,b) => b.date.localeCompare(a.date)); break;
    }
    return data;
  }, [entries, filterBadge, sort]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Alle Einträge</h1>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)}>
          <option value="">Alle Badges</option>
          {allBadges.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="date-desc">Datum ⬇</option>
          <option value="date-asc">Datum ⬆</option>
          <option value="score-desc">Score ⬇</option>
          <option value="score-asc">Score ⬆</option>
        </select>

        <button onClick={() => setView(view === "list" ? "calendar" : "list")}>
          {view === "list" ? "📅 Kalender" : "📋 Liste"}
        </button>
      </div>

      {view === "list" ? (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {filtered.map(e => (
            <li key={e.id} style={{ border: `2px solid ${e.color}`, borderRadius: 8, padding: 12 }}>
              <b>{e.date}</b> — {e.score}/100 {e.badge && <span>{e.badge}</span>}
              {e.text && <div>{e.text}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <CalendarView entries={filtered} />
      )}
    </div>
  );
}
