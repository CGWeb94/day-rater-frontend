import { useMemo } from "react";

export default function CalendarView({ entries }) {
  // --- Hilfsfunktion: Datum als YYYY-MM-DD ---
  const toYMD = (d) => {
    const date = new Date(d);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // --- Einträge nach Datum gruppieren ---
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const day = toYMD(e.date);
      if (!map[day]) map[day] = [];
      map[day].push(e);
    });
    return map;
  }, [entries]);

  // --- Tage des aktuellen Monats ---
  function generateMonthDays() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      const day = toYMD(date);
      days.push(day);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  const days = generateMonthDays();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {days.map(day => {
        const dayEntries = entriesByDate[day] || [];
        return (
          <div
            key={day}
            style={{
              border: dayEntries.length
                ? `2px solid ${dayEntries[0].color || "#000"}`
                : "1px solid #ccc",
              minHeight: 60,
              padding: 4,
              position: "relative",
              borderRadius: 6
            }}
          >
            <div style={{ fontSize: 12, marginBottom: 2 }}>{day.slice(-2)}</div>

            {dayEntries.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: "2px 4px",
                  fontSize: 12,
                  marginTop: 2,
                  fontWeight: "bold",
                  border: `1px solid ${e.color || "#000"}`,
                  borderRadius: 4,
                  color: "#000",
                  backgroundColor: "#fff"
                }}
              >
                {e.badge || "🏷"} {e.score}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
