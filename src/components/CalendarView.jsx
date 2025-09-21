import { useState } from "react";
import dayjs from "dayjs";

export default function CalendarView({ entries }) {
  const [month, setMonth] = useState(dayjs());

  const startOfMonth = month.startOf("month");
  const endOfMonth = month.endOf("month");
  const daysInMonth = month.daysInMonth();

  const entriesByDate = Object.fromEntries(entries.map(e => [e.date, e]));

  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = month.date(i).format("YYYY-MM-DD");
    const entry = entriesByDate[dateStr];
    days.push({ day: i, dateStr, entry });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={() => setMonth(month.subtract(1, "month"))}>←</button>
        <span>{month.format("MMMM YYYY")}</span>
        <button onClick={() => setMonth(month.add(1, "month"))}>→</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => (
          <div key={d} style={{ fontWeight: "bold", textAlign: "center" }}>{d}</div>
        ))}
        {Array(startOfMonth.day() === 0 ? 6 : startOfMonth.day()-1).fill(null).map((_,i) => (
          <div key={"empty-"+i}></div>
        ))}
        {days.map(d => (
          <div key={d.day} style={{
            border: d.entry ? `2px solid ${d.entry.color}` : "1px solid #ccc",
            borderRadius: 6,
            textAlign: "center",
            padding: 8,
            minHeight: 60
          }}>
            <div>{d.day}</div>
            {d.entry && <div style={{ fontSize: 12 }}>{d.entry.score}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
