import { useMemo } from "react";

export default function CalendarView({ entries }) {
  // --- Einträge nach Datum gruppieren ---
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [entries]);

  // --- Hilfsfunktion: Tage des aktuellen Monats ---
  function generateMonthDays() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      days.push(`${yyyy}-${mm}-${dd}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  const days = generateMonthDays();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {days.map(day => (
        <div 
          key={day} 
          style={{ 
            border: entriesByDate[day]?.length 
              ? `2px solid ${entriesByDate[day][0].color}` 
              : "1px solid #ccc", 
            minHeight: 60, 
            padding: 4, 
            position: "relative", 
            borderRadius: 6 
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 2 }}>{day.slice(-2)}</div>

          {entriesByDate[day]?.map((e, i) => (
            <div key={i} style={{
              padding: "2px 4px",
              fontSize: 12,
              marginTop: 2,
              fontWeight: "bold",
              border: `1px solid ${e.color}`,
              borderRadius: 4,
              color: "#000",
              backgroundColor: "#fff"
            }}>
              {e.badge || "🏷"} {e.score}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
