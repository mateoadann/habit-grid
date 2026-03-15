import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "habit-grid-data";

const COLORS = {
  empty: "rgba(255,255,255,0.04)",
  l1: "#0e4429",
  l2: "#006d32",
  l3: "#26a641",
  l4: "#39d353",
};

const DAYS_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getDaysInRange(weeks = 20) {
  const days = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - totalDays + 1);
  const dayOfWeek = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOfWeek);
  const end = new Date(today);
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function groupByWeeks(days) {
  const weeks = [];
  let current = [];
  for (const d of days) {
    const dow = (d.getDay() + 6) % 7;
    if (dow === 0 && current.length > 0) {
      weeks.push(current);
      current = [];
    }
    current.push(d);
  }
  if (current.length) weeks.push(current);
  return weeks;
}

function getLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function getColor(level) {
  return [COLORS.empty, COLORS.l1, COLORS.l2, COLORS.l3, COLORS.l4][level];
}

function getMonthLabels(weeks) {
  const labels = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const first = week[0];
    const m = first.getMonth();
    if (m !== lastMonth) {
      labels.push({ index: i, label: MONTHS[m] });
      lastMonth = m;
    }
  });
  return labels;
}

function ContributionGrid({ habit, contributions, onToggle, selectedDate, onSelectDate }) {
  const days = getDaysInRange(20);
  const weeks = groupByWeeks(days);
  const monthLabels = getMonthLabels(weeks);
  const todayKey = getDateKey(new Date());
  const cellSize = 13;
  const gap = 3;
  const leftPad = 28;
  const topPad = 22;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <svg
        width={leftPad + weeks.length * (cellSize + gap) + 10}
        height={topPad + 7 * (cellSize + gap) + 10}
        style={{ display: "block" }}
      >
        {monthLabels.map((m, i) => (
          <text
            key={i}
            x={leftPad + m.index * (cellSize + gap)}
            y={14}
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
          >
            {m.label}
          </text>
        ))}
        {[0,1,2,3,4,5,6].map(row => (
          <text
            key={row}
            x={6}
            y={topPad + row * (cellSize + gap) + cellSize - 2}
            fill="rgba(255,255,255,0.25)"
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
          >
            {DAYS_LABELS[row]}
          </text>
        ))}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const key = getDateKey(day);
            const count = contributions[key] || 0;
            const level = getLevel(count);
            const dow = (day.getDay() + 6) % 7;
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const isFuture = day > new Date();
            return (
              <g key={key}>
                <rect
                  x={leftPad + wi * (cellSize + gap)}
                  y={topPad + dow * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2.5}
                  fill={isFuture ? "rgba(255,255,255,0.015)" : getColor(level)}
                  stroke={isSelected ? "#58a6ff" : isToday ? "rgba(255,255,255,0.3)" : "none"}
                  strokeWidth={isSelected ? 2 : isToday ? 1.5 : 0}
                  style={{ cursor: isFuture ? "default" : "pointer", transition: "fill 0.15s" }}
                  onClick={() => !isFuture && onSelectDate(key)}
                >
                  <title>{`${key}: ${count} ${count === 1 ? "vez" : "veces"}`}</title>
                </rect>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

function HabitCard({ habit, contributions, onLog, onEdit, onDelete }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const todayKey = getDateKey(new Date());
  const todayCount = contributions[todayKey] || 0;
  const totalCount = Object.values(contributions).reduce((a, b) => a + b, 0);

  const currentStreak = (() => {
    let streak = 0;
    const d = new Date();
    d.setHours(0,0,0,0);
    while (true) {
      const key = getDateKey(d);
      if (contributions[key] && contributions[key] > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  })();

  const activeDate = selectedDate || todayKey;
  const activeDateCount = contributions[activeDate] || 0;
  const isToday = activeDate === todayKey;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "20px 22px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{habit.emoji}</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace" }}>
              {habit.name}
            </h3>
          </div>
          {habit.description && (
            <p style={{ margin: "4px 0 0 32px", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
              {habit.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onEdit(habit)} style={smallBtn}>✏️</button>
          <button onClick={() => onDelete(habit.id)} style={smallBtn}>🗑️</button>
        </div>
      </div>

      <ContributionGrid
        habit={habit}
        contributions={contributions}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <div style={{ display: "flex", gap: 20 }}>
          <Stat label="Hoy" value={todayCount} accent={todayCount > 0} />
          <Stat label="Racha" value={`${currentStreak}d`} accent={currentStreak >= 7} />
          <Stat label="Total" value={totalCount} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
            {isToday ? "Hoy" : activeDate}
          </span>
          <button
            onClick={() => {
              const c = activeDateCount > 0 ? activeDateCount - 1 : 0;
              onLog(habit.id, activeDate, c);
            }}
            style={{
              ...actionBtn,
              opacity: activeDateCount === 0 ? 0.3 : 1,
              pointerEvents: activeDateCount === 0 ? "none" : "auto",
            }}
          >−</button>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            fontWeight: 700,
            color: activeDateCount > 0 ? COLORS.l4 : "rgba(255,255,255,0.3)",
            minWidth: 24,
            textAlign: "center",
          }}>{activeDateCount}</span>
          <button onClick={() => onLog(habit.id, activeDate, activeDateCount + 1)} style={actionBtn}>+</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>Menos</span>
        {[0,1,2,3,4].map(l => (
          <div key={l} style={{ width: 11, height: 11, borderRadius: 2, background: getColor(l) }} />
        ))}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>Más</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: accent ? COLORS.l4 : "#e6edf3",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function HabitModal({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit?.name || "");
  const [emoji, setEmoji] = useState(habit?.emoji || "🎯");
  const [description, setDescription] = useState(habit?.description || "");
  const isEdit = !!habit?.id;

  const EMOJI_OPTIONS = ["🎯","💪","📖","🧘","💻","🏃","✍️","🎨","🎵","🧠","💧","🥗","😴","📝","🔥","⚡","🌱","🏋️"];

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: habit?.id || `habit_${Date.now()}`,
      name: name.trim(),
      emoji,
      description: description.trim(),
      createdAt: habit?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "28px 28px 22px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <h2 style={{
          margin: "0 0 20px",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#e6edf3",
        }}>
          {isEdit ? "Editar hábito" : "Nuevo hábito"}
        </h2>

        <label style={labelStyle}>Emoji</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              width: 36, height: 36, fontSize: 18,
              borderRadius: 8,
              border: e === emoji ? `2px solid ${COLORS.l4}` : "1px solid rgba(255,255,255,0.08)",
              background: e === emoji ? "rgba(57,211,83,0.1)" : "rgba(255,255,255,0.03)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>{e}</button>
          ))}
        </div>

        <label style={labelStyle}>Nombre</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ej: Leer 30 min"
          autoFocus
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={inputStyle}
        />

        <label style={labelStyle}>Descripción (opcional)</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="ej: Al menos 30 páginas por día"
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e6edf3", fontSize: 14, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancelar</button>
          <button onClick={handleSubmit} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            background: name.trim() ? COLORS.l3 : "rgba(255,255,255,0.05)",
            border: "none",
            color: name.trim() ? "#000" : "rgba(255,255,255,0.3)",
            fontSize: 14, fontWeight: 600, cursor: name.trim() ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
          }}>
            {isEdit ? "Guardar" : "Crear hábito"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "24px 28px",
        maxWidth: 360,
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <p style={{ margin: "0 0 20px", color: "#e6edf3", fontSize: 15, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e6edf3", fontSize: 14, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            background: "#da3633", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const smallBtn = {
  background: "none", border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 6, width: 30, height: 30, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 13, transition: "background 0.15s",
};

const actionBtn = {
  width: 32, height: 32, borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#e6edf3", fontSize: 18, fontWeight: 600,
  cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center",
  fontFamily: "'JetBrains Mono', monospace",
  transition: "all 0.15s",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(255,255,255,0.4)",
  marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#e6edf3",
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  marginBottom: 14,
  boxSizing: "border-box",
};

// --- Storage helpers using localStorage ---
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load data:", e);
  }
  return { habits: [], contributions: {} };
}

function saveToStorage(habits, contributions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, contributions }));
  } catch (e) {
    console.error("Failed to save data:", e);
  }
}

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [contributions, setContributions] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const data = loadFromStorage();
    setHabits(data.habits);
    setContributions(data.contributions);
  }, []);

  const handleSaveHabit = (habit) => {
    const exists = habits.find(h => h.id === habit.id);
    let updated;
    if (exists) {
      updated = habits.map(h => h.id === habit.id ? habit : h);
    } else {
      updated = [...habits, habit];
    }
    setHabits(updated);
    saveToStorage(updated, contributions);
    setShowModal(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = (id) => {
    const updated = habits.filter(h => h.id !== id);
    const newContribs = { ...contributions };
    delete newContribs[id];
    setHabits(updated);
    setContributions(newContribs);
    saveToStorage(updated, newContribs);
    setDeletingId(null);
  };

  const handleLog = (habitId, dateKey, count) => {
    const newContribs = {
      ...contributions,
      [habitId]: {
        ...(contributions[habitId] || {}),
        [dateKey]: Math.max(0, count),
      },
    };
    if (count === 0 && newContribs[habitId]) {
      delete newContribs[habitId][dateKey];
    }
    setContributions(newContribs);
    saveToStorage(habits, newContribs);
  };

  const todayKey = getDateKey(new Date());
  const habitsCompletedToday = habits.filter(h => (contributions[h.id]?.[todayKey] || 0) > 0).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      color: "#e6edf3",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 60px" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: habitsCompletedToday === habits.length && habits.length > 0 ? COLORS.l4 : "rgba(255,255,255,0.15)",
              boxShadow: habitsCompletedToday === habits.length && habits.length > 0 ? `0 0 12px ${COLORS.l4}` : "none",
              transition: "all 0.3s",
            }} />
            <h1 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "-0.02em",
            }}>
              habit<span style={{ color: COLORS.l4 }}>.</span>grid
            </h1>
          </div>
          <p style={{ margin: "6px 0 0 22px", fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
            {habits.length === 0
              ? "Creá tu primer hábito para empezar a contribuir"
              : `${habitsCompletedToday}/${habits.length} completados hoy`}
          </p>
        </header>

        {habits.map(habit => (
          <HabitCard
            key={habit.id}
            habit={habit}
            contributions={contributions[habit.id] || {}}
            onLog={handleLog}
            onEdit={(h) => { setEditingHabit(h); setShowModal(true); }}
            onDelete={(id) => setDeletingId(id)}
          />
        ))}

        <button
          onClick={() => { setEditingHabit(null); setShowModal(true); }}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 12,
            border: `1.5px dashed rgba(57,211,83,0.25)`,
            background: "rgba(57,211,83,0.03)",
            color: COLORS.l3,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={e => {
            e.target.style.background = "rgba(57,211,83,0.08)";
            e.target.style.borderColor = "rgba(57,211,83,0.4)";
          }}
          onMouseLeave={e => {
            e.target.style.background = "rgba(57,211,83,0.03)";
            e.target.style.borderColor = "rgba(57,211,83,0.25)";
          }}
        >
          + Nuevo hábito
        </button>

        {habits.length > 0 && (
          <div style={{
            marginTop: 24,
            padding: "14px 18px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            justifyContent: "center",
            gap: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>tip:</span>
            <span>hacé click en un cuadradito para seleccionar fecha · usá + y − para registrar</span>
          </div>
        )}
      </div>

      {showModal && (
        <HabitModal
          habit={editingHabit}
          onSave={handleSaveHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}

      {deletingId && (
        <ConfirmModal
          message="¿Estás seguro? Se eliminará el hábito y todas sus contribuciones."
          onConfirm={() => handleDeleteHabit(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
