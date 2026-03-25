import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./contexts/AuthContext.jsx";
import Login from "./components/Login.jsx";
import { getAllHabits, createHabit, updateHabit, deleteHabit } from "./services/habitApi.js";
import { getContributions, logContribution } from "./services/contributionApi.js";
import { getAllUnits, createUnit, deleteUnit } from "./services/unitApi.js";
import { getIntegrations, updateIntegration } from "./services/integrationApi.js";
import { syncStrava, syncGitHub } from "./services/syncApi.js";
import { COLORS, getColor, getQuitColor } from "./constants/colors.js";
import { EMOJI_OPTIONS, DAYS_LABELS, MONTHS } from "./constants/defaults.js";
import {
  smallBtn,
  actionBtn,
  labelStyle,
  inputStyle,
  modalOverlay,
  modalBox,
  cancelBtn,
  deleteBtn,
  gearButton,
  settingsOverlay,
  settingsPanel,
  settingsHeader,
  tabBar,
  tabButton,
  tabButtonActive,
  integrationCard,
  statusBadgeConnected,
  statusBadgeDisconnected,
  syncButton,
  connectButton,
  unitRow,
  unitForm,
  toastContainer,
  toastSuccess,
  toastError,
} from "./constants/styles.js";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

function usePullToRefresh(enabled) {
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);
  const distanceRef = useRef(0);
  const threshold = 80;

  // Keep ref in sync with state so touchend can read current value
  distanceRef.current = pullDistance;

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setPulling(true);
      }
    };

    const onTouchMove = (e) => {
      if (!startY.current) return;
      if (window.scrollY > 0) {
        setPulling(false);
        setPullDistance(0);
        startY.current = 0;
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, 140));
      }
    };

    const onTouchEnd = () => {
      if (distanceRef.current >= threshold) {
        window.location.reload();
      }
      setPullDistance(0);
      setPulling(false);
      startY.current = 0;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled]);

  const ready = pullDistance >= threshold;
  return { pullDistance, pulling, ready, threshold };
}

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

function getLevel(value, minimum, max) {
  if (value === 0) return 0;
  if (value < minimum) return 0;
  if (max <= minimum) return 1;
  const quartile = (max - minimum) / 4;
  if (value < minimum + quartile) return 1;
  if (value < minimum + quartile * 2) return 2;
  if (value < minimum + quartile * 3) return 3;
  return 4;
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

/**
 * Takes an array of { date, count, source } and returns { [dateKey]: totalCount }
 * summing across sources for the same date.
 */
function sumContributionsByDate(contribArray) {
  const result = {};
  for (const entry of contribArray) {
    const key = entry.date;
    result[key] = (result[key] || 0) + entry.count;
  }
  return result;
}

/**
 * Computes the consecutive clean-day streak ending at `date` (walking backward).
 * A clean day is one where contributions[key] is 0 or undefined.
 * Only counts days >= createdAt (if provided).
 */
function getStreakAtDate(date, contributions, createdAt) {
  let streak = 0;
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const createdDate = createdAt ? new Date(createdAt) : null;
  if (createdDate) createdDate.setHours(0,0,0,0);
  while (true) {
    if (createdDate && d < createdDate) break;
    const key = getDateKey(d);
    if (contributions[key] && contributions[key] > 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
    if (streak > 365) break;
  }
  return streak;
}

/**
 * Maps a clean-day streak length to a green intensity level (1-4).
 */
function streakToLevel(streak) {
  if (streak === 0) return 0;
  if (streak <= 7) return 1;
  if (streak <= 14) return 2;
  if (streak <= 30) return 3;
  return 4;
}

function ContributionGrid({ habit, contributions, onToggle, selectedDate, onSelectDate, isMobile }) {
  const mobileWeeks = (() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const day = threeMonthsAgo.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - daysToMonday);
    const diffDays = Math.ceil((new Date() - threeMonthsAgo) / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  })();
  const days = getDaysInRange(isMobile ? mobileWeeks : 20);
  const weeks = groupByWeeks(days);
  const monthLabels = getMonthLabels(weeks);
  const todayKey = getDateKey(new Date());
  const cellSize = 13;
  const gap = 3;
  const leftPad = 28;
  const topPad = 22;
  const [tooltip, setTooltip] = useState({ text: "", x: 0, y: 0, visible: false });

  useEffect(() => {
    if (!tooltip.visible) return;
    const hide = () => setTooltip(t => ({ ...t, visible: false }));
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [tooltip.visible]);

  const isQuit = habit.type === "quit";
  const createdAt = habit.created_at || null;
  const createdDate = createdAt ? (() => { const cd = new Date(createdAt); cd.setHours(0,0,0,0); return cd; })() : null;

  const maxCount = days.reduce((m, day) => {
    const count = contributions[getDateKey(day)] || 0;
    return count > m ? count : m;
  }, 0);

  const getTooltipText = (count, day) => {
    const dd = String(day.getDate()).padStart(2, "0");
    const mm = String(day.getMonth() + 1).padStart(2, "0");
    if (isQuit) {
      if (count === 0) return `Sin reca\u00eddas el ${dd}/${mm}`;
      if (count === 1) return `1 reca\u00edda el ${dd}/${mm}`;
      return `${count} reca\u00eddas el ${dd}/${mm}`;
    }
    if (count === 0) return `Sin contribuciones el ${dd}/${mm}`;
    if (count === 1) return `1 contribuci\u00f3n el ${dd}/${mm}`;
    return `${count} contribuciones el ${dd}/${mm}`;
  };

  return (<>
    <div style={{ overflowX: "auto", paddingBottom: 4, position: "relative" }}>
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
            const dow = (day.getDay() + 6) % 7;
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const isFuture = day > new Date();
            const isBeforeCreation = createdDate && day < createdDate;
            const rectX = leftPad + wi * (cellSize + gap);
            const rectY = topPad + dow * (cellSize + gap);

            let fillColor;
            if (isFuture || isBeforeCreation) {
              fillColor = "rgba(255,255,255,0.015)";
            } else if (isQuit) {
              if (count > 0) {
                // Relapse day — red intensity by count quartile
                const relapseLevel = getLevel(count, 1, maxCount);
                fillColor = getQuitColor(relapseLevel);
              } else {
                // Clean day — green intensity by streak length at this date
                const streak = getStreakAtDate(day, contributions, createdAt);
                fillColor = getColor(streakToLevel(streak));
              }
            } else {
              const level = getLevel(count, habit.minimum || 1, maxCount);
              fillColor = getColor(level);
            }

            return (
              <rect
                key={key}
                x={rectX}
                y={rectY}
                width={cellSize}
                height={cellSize}
                rx={2.5}
                fill={fillColor}
                stroke={isSelected ? "#58a6ff" : isToday ? "rgba(255,255,255,0.3)" : "none"}
                strokeWidth={isSelected ? 2 : isToday ? 1.5 : 0}
                style={{ cursor: isFuture ? "default" : "pointer", transition: "fill 0.15s" }}
                onClick={() => !isFuture && onSelectDate(key)}
                onMouseEnter={(e) => {
                  if (!isFuture) {
                    const rect = e.target.getBoundingClientRect();
                    setTooltip({
                      text: getTooltipText(count, day),
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      visible: true,
                    });
                  }
                }}
                onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
              />
            );
          })
        )}
      </svg>
    </div>
    {tooltip.visible && (
      <div style={{
        position: "fixed",
        left: tooltip.x,
        top: tooltip.y - 6,
        transform: "translate(-50%, -100%)",
        background: "#1b1f23",
        color: "#fff",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        padding: "4px 8px",
        borderRadius: 4,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        opacity: 1,
        transition: "opacity 0.05s",
        zIndex: 1000,
        border: "1px solid rgba(255,255,255,0.1)",
      }}>
        {tooltip.text}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "100%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "4px solid #1b1f23",
        }} />
      </div>
    )}
  </>);
}

function HabitCard({ habit, contributions, onLog, onEdit, onDelete, isMobile }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const todayKey = getDateKey(new Date());
  const todayCount = contributions[todayKey] || 0;
  const totalCount = Object.values(contributions).reduce((a, b) => a + b, 0);
  const isQuit = habit.type === "quit";

  const unitAbbr = habit.unit_abbreviation || "vec";

  const habitMinimum = habit.minimum || 1;

  const currentStreak = (() => {
    let streak = 0;
    const d = new Date();
    d.setHours(0,0,0,0);
    if (isQuit) {
      const createdDate = new Date(habit.created_at);
      createdDate.setHours(0,0,0,0);
      while (d >= createdDate) {
        const key = getDateKey(d);
        if (contributions[key] && contributions[key] > 0) break;
        streak++;
        d.setDate(d.getDate() - 1);
      }
    } else {
      while (true) {
        const key = getDateKey(d);
        if (contributions[key] && contributions[key] >= habitMinimum) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else break;
      }
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
      marginBottom: isMobile ? 16 : 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile && collapsed ? 0 : 14 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: isMobile ? "pointer" : "default" }}
          onClick={() => isMobile && setCollapsed(c => !c)}
        >
          {isMobile && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1 }}>
              {collapsed ? "\u25B6" : "\u25BC"}
            </span>
          )}
          <span style={{ fontSize: 22 }}>{habit.emoji}</span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace" }}>
            {habit.name}
          </h3>
        </div>
        {!(isMobile && collapsed) && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onEdit(habit)} style={smallBtn}>{"\u270F\uFE0F"}</button>
            <button onClick={() => onDelete(habit.id)} style={smallBtn}>{"\uD83D\uDDD1\uFE0F"}</button>
          </div>
        )}
      </div>

      {isMobile && collapsed && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: -8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,0.35)" }}>
          {currentStreak > 0 && <span>{"\uD83D\uDD25"} {currentStreak}d</span>}
          <span style={{ color: isQuit ? (todayCount === 0 ? COLORS.l4 : "#ff4d58") : (todayCount > 0 ? COLORS.l4 : "rgba(255,255,255,0.25)") }}>{isQuit ? (todayCount === 0 ? "Limpio" : todayCount + " hoy") : todayCount + " " + unitAbbr + " hoy"}</span>
        </div>
      )}

      {!(isMobile && collapsed) && (<>
        {habit.description && (
          <p style={{ margin: "-8px 0 10px 32px", fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            {habit.description}
          </p>
        )}
        {habit.minimum > 0 && (
          <p style={{ margin: "2px 0 10px 32px", fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
            {"Min: " + habit.minimum + " " + unitAbbr}
          </p>
        )}

        <ContributionGrid
          habit={habit}
          contributions={contributions}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isMobile={isMobile}
        />

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 12 : 0, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 20, justifyContent: isMobile ? "space-around" : "flex-start" }}>
            <Stat
              label="Hoy"
              value={isQuit ? (todayCount === 0 ? "Limpio" : todayCount + " " + unitAbbr) : todayCount + " " + unitAbbr}
              accent={isQuit ? todayCount === 0 : todayCount > 0}
              accentColor={isQuit ? (todayCount === 0 ? COLORS.l4 : "#ff4d58") : undefined}
            />
            <Stat label="Racha" value={`${currentStreak}d`} accent={currentStreak >= 7} />
            <Stat label="Total" value={isQuit ? (totalCount + " reca\u00eddas") : totalCount + " " + unitAbbr} />
          </div>
          {isMobile ? (<>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {isToday ? "Hoy" : (() => {
                  const [y, m, d] = activeDate.split("-");
                  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
                  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                  return `${dias[dateObj.getDay()]} ${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
                })()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                >{"\u2212"}</button>
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
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>Menos</span>
                {[0,1,2,3,4].map(l => (
                  <div key={l} style={{ width: 11, height: 11, borderRadius: 2, background: getColor(l) }} />
                ))}
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>M{"\u00e1"}s</span>
              </div>
            </div>
          </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
                {isToday ? "Hoy" : (() => {
                  const [y, m, d] = activeDate.split("-");
                  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
                  const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                  return `${dias[dateObj.getDay()]} ${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
                })()}
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
              >{"\u2212"}</button>
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
          )}
        </div>

        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>Menos</span>
            {[0,1,2,3,4].map(l => (
              <div key={l} style={{ width: 11, height: 11, borderRadius: 2, background: getColor(l) }} />
            ))}
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>M{"\u00e1"}s</span>
          </div>
        )}
      </>)}
    </div>
  );
}

function Stat({ label, value, accent, accentColor }) {
  return (
    <div>
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        color: accent ? (accentColor || COLORS.l4) : "#e6edf3",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function HabitModal({ habit, units, onSave, onClose }) {
  const [name, setName] = useState(habit?.name || "");
  const [emoji, setEmoji] = useState(habit?.emoji || "\uD83C\uDFAF");
  const [description, setDescription] = useState(habit?.description || "");
  const [type, setType] = useState(habit?.type || "positive");
  const [unitId, setUnitId] = useState(habit?.unit_id || (units.length > 0 ? units[0].id : ""));
  const [minimum, setMinimum] = useState(habit?.minimum || 1);
  const isEdit = !!habit?.id;
  const isQuit = type === "quit";

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!isQuit && !unitId) return;
    if (!isQuit && (!minimum || minimum <= 0)) return;
    onSave({
      id: habit?.id || null,
      name: name.trim(),
      emoji,
      description: description.trim(),
      unit_id: Number(unitId || (units.length > 0 ? units[0].id : 1)),
      minimum: isQuit ? 1 : Number(minimum),
      type,
    });
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <h2 style={{
          margin: "0 0 20px",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#e6edf3",
        }}>
          {isEdit ? "Editar h\u00e1bito" : "Nuevo h\u00e1bito"}
        </h2>

        <label style={labelStyle}>Tipo</label>
        <div style={{
          display: "flex",
          marginBottom: 16,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {[
            { value: "positive", label: "Construir" },
            { value: "quit", label: "Dejar" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => !isEdit && setType(opt.value)}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: "none",
                cursor: isEdit ? "default" : "pointer",
                opacity: isEdit && type !== opt.value ? 0.4 : 1,
                background: type === opt.value
                  ? (opt.value === "quit" ? "rgba(255,77,88,0.15)" : "rgba(57,211,83,0.15)")
                  : "rgba(255,255,255,0.03)",
                color: type === opt.value
                  ? (opt.value === "quit" ? "#ff4d58" : COLORS.l4)
                  : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

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

        <label style={labelStyle}>{"Descripci\u00f3n (opcional)"}</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="ej: Al menos 30 p\u00e1ginas por d\u00eda"
          style={inputStyle}
        />

        {!isQuit && (
          <>
            <label style={labelStyle}>Unidad de medida</label>
            <select
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </option>
              ))}
            </select>

            <label style={labelStyle}>{"M\u00ednimo diario"}</label>
            <input
              type="number"
              value={minimum}
              onChange={e => setMinimum(e.target.value)}
              min="1"
              step="1"
              placeholder="ej: 30"
              style={inputStyle}
            />
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={handleSubmit} style={{
            flex: 1, padding: "10px 0", borderRadius: 8,
            background: name.trim() ? COLORS.l3 : "rgba(255,255,255,0.05)",
            border: "none",
            color: name.trim() ? "#000" : "rgba(255,255,255,0.3)",
            fontSize: 14, fontWeight: 600, cursor: name.trim() ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
          }}>
            {isEdit ? "Guardar" : "Crear h\u00e1bito"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        ...modalBox,
        padding: "24px 28px",
        maxWidth: 360,
      }}>
        <p style={{ margin: "0 0 20px", color: "#e6edf3", fontSize: 15, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
          <button onClick={onConfirm} style={deleteBtn}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const style = type === "success" ? toastSuccess : toastError;
  return (
    <div style={toastContainer}>
      <div style={style}>
        {message}
        <button onClick={onDismiss} style={{
          marginLeft: 12, background: "none", border: "none",
          color: "inherit", cursor: "pointer", fontSize: 16,
        }}>{"\u2715"}</button>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, type, habits, syncing, onSync, onLinkHabit }) {
  const isStrava = type === "strava";
  const isConnected = integration && integration.status === "connected";
  const isSyncing = syncing[type] || false;
  const linkedHabitId = integration?.habit_id || "";
  const linkableHabits = habits.filter(h => h.type !== "quit");

  const handleConnect = () => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    window.location.href = baseUrl + "/auth/strava";
  };

  const lastSync = integration?.last_synced_at
    ? new Date(integration.last_synced_at).toLocaleDateString("es-AR", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div style={integrationCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{isStrava ? "\uD83C\uDFC3" : "\uD83D\uDCBB"}</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace" }}>
            {isStrava ? "Strava" : "GitHub"}
          </span>
        </div>
        {isConnected ? (
          <span style={statusBadgeConnected}>Conectado</span>
        ) : (
          <span style={statusBadgeDisconnected}>Desconectado</span>
        )}
      </div>

      {isStrava && !isConnected && (
        <button onClick={handleConnect} style={connectButton}>
          {"Conectar con Strava"}
        </button>
      )}

      {(isConnected || !isStrava) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#8b949e", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
              {"H\u00e1bito vinculado:"}
            </label>
            <select
              value={linkedHabitId}
              onChange={e => onLinkHabit(type, e.target.value || null)}
              style={{
                ...inputStyle,
                marginBottom: 0,
                flex: 1,
                appearance: "auto",
              }}
            >
              <option value="">Sin vincular</option>
              {linkableHabits.map(h => (
                <option key={h.id} value={h.id}>
                  {h.emoji} {h.name}
                </option>
              ))}
            </select>
          </div>

          {lastSync && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {"\u00DAltima sync: " + lastSync}
            </span>
          )}

          <button
            onClick={onSync}
            disabled={isSyncing || !linkedHabitId}
            style={{
              ...syncButton,
              opacity: isSyncing || !linkedHabitId ? 0.5 : 1,
              cursor: isSyncing || !linkedHabitId ? "default" : "pointer",
              alignSelf: "flex-start",
            }}
          >
            {isSyncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      )}
    </div>
  );
}

function IntegrationsSection({ habits, integrations, syncing, onSyncStrava, onSyncGithub, onLinkHabit }) {
  const stravaIntegration = integrations.find(i => i.id === "strava") || null;
  const githubIntegration = integrations.find(i => i.id === "github") || null;

  return (
    <div>
      <IntegrationCard
        integration={stravaIntegration}
        type="strava"
        habits={habits}
        syncing={syncing}
        onSync={onSyncStrava}
        onLinkHabit={onLinkHabit}
      />
      <IntegrationCard
        integration={githubIntegration}
        type="github"
        habits={habits}
        syncing={syncing}
        onSync={onSyncGithub}
        onLinkHabit={onLinkHabit}
      />
    </div>
  );
}

function UnitsSection({ units, onCreateUnit, onDeleteUnit }) {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !abbreviation.trim()) return;
    onCreateUnit({ name: name.trim(), abbreviation: abbreviation.trim() });
    setName("");
    setAbbreviation("");
  };

  const predefined = units.filter(u => u.is_predefined);
  const custom = units.filter(u => !u.is_predefined);

  return (
    <div>
      {predefined.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Predefinidas
          </span>
          {predefined.map(u => (
            <div key={u.id} style={unitRow}>
              <span style={{ color: "#e6edf3", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                {u.name} <span style={{ color: "#8b949e" }}>({u.abbreviation})</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {custom.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Personalizadas
          </span>
          {custom.map(u => (
            <div key={u.id} style={unitRow}>
              <span style={{ color: "#e6edf3", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                {u.name} <span style={{ color: "#8b949e" }}>({u.abbreviation})</span>
              </span>
              <button
                onClick={() => onDeleteUnit(u.id)}
                style={{ ...smallBtn, fontSize: 14, color: "#f85149" }}
              >{"\uD83D\uDDD1\uFE0F"}</button>
            </div>
          ))}
        </div>
      )}

      <div style={unitForm}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre"
          style={{ ...inputStyle, marginBottom: 0, flex: 2 }}
        />
        <input
          value={abbreviation}
          onChange={e => setAbbreviation(e.target.value)}
          placeholder="Abrev."
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
        />
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !abbreviation.trim()}
          style={{
            ...connectButton,
            opacity: name.trim() && abbreviation.trim() ? 1 : 0.4,
            cursor: name.trim() && abbreviation.trim() ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >{"Crear"}</button>
      </div>
    </div>
  );
}

function SettingsPanel({ habits, units, integrations, syncing, onClose, onSyncStrava, onSyncGithub, onLinkHabit, onCreateUnit, onDeleteUnit, onLogout }) {
  const [activeTab, setActiveTab] = useState("integraciones");

  return (
    <div style={settingsOverlay} onClick={onClose}>
      <div style={settingsPanel} onClick={e => e.stopPropagation()}>
        <div style={settingsHeader}>
          <h2 style={{ margin: 0, color: "#e6edf3", fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {"Configuraci\u00f3n"}
          </h2>
          <button onClick={onClose} style={{ ...smallBtn, fontSize: 18 }}>{"\u2715"}</button>
        </div>
        <div style={tabBar}>
          <button
            style={activeTab === "integraciones" ? tabButtonActive : tabButton}
            onClick={() => setActiveTab("integraciones")}
          >Integraciones</button>
          <button
            style={activeTab === "unidades" ? tabButtonActive : tabButton}
            onClick={() => setActiveTab("unidades")}
          >Unidades</button>
        </div>
        {activeTab === "integraciones" && (
          <IntegrationsSection
            habits={habits}
            integrations={integrations}
            syncing={syncing}
            onSyncStrava={onSyncStrava}
            onSyncGithub={onSyncGithub}
            onLinkHabit={onLinkHabit}
          />
        )}
        {activeTab === "unidades" && (
          <UnitsSection
            units={units}
            onCreateUnit={onCreateUnit}
            onDeleteUnit={onDeleteUnit}
          />
        )}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "10px 16px", background: "none",
              border: "1px solid rgba(218,54,51,0.4)", borderRadius: 8,
              color: "#da3633", fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
              cursor: "pointer",
            }}
          >Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

function HabitTracker() {
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const { pullDistance, pulling, ready } = usePullToRefresh(isMobile);
  const [habits, setHabits] = useState([]);
  const [contributions, setContributions] = useState({});
  const [units, setUnits] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [habitsData, unitsData, integrationsData] = await Promise.all([
          getAllHabits(),
          getAllUnits(),
          getIntegrations().catch(() => []),
        ]);

        setHabits(habitsData);
        setUnits(unitsData);
        setIntegrations(integrationsData);

        // Compute date range for contributions fetch
        const days = getDaysInRange(20);
        const fromDate = getDateKey(days[0]);
        const toDate = getDateKey(days[days.length - 1]);

        // Fetch contributions for all habits in parallel
        const contribEntries = await Promise.all(
          habitsData.map(async (h) => {
            const raw = await getContributions(h.id, fromDate, toDate);
            return [h.id, sumContributionsByDate(raw)];
          })
        );

        const contribs = {};
        for (const [id, data] of contribEntries) {
          contribs[id] = data;
        }

        setContributions(contribs);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError(err.message || "Error al cargar datos");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // T5: Detect ?strava=connected URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stravaStatus = params.get("strava");
    if (stravaStatus === "connected") {
      setToast({ message: "\u00A1Strava conectado exitosamente!", type: "success" });
      window.history.replaceState({}, "", window.location.pathname);
      getIntegrations().then(setIntegrations).catch(console.error);
    } else if (stravaStatus === "error") {
      setToast({ message: "Error al conectar con Strava", type: "error" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [habitsData, unitsData, integrationsData] = await Promise.all([
        getAllHabits(),
        getAllUnits(),
        getIntegrations().catch(() => []),
      ]);
      setHabits(habitsData);
      setUnits(unitsData);
      setIntegrations(integrationsData);

      const days = getDaysInRange(20);
      const fromDate = getDateKey(days[0]);
      const toDate = getDateKey(days[days.length - 1]);
      const contribEntries = await Promise.all(
        habitsData.map(async (h) => {
          const raw = await getContributions(h.id, fromDate, toDate);
          return [h.id, sumContributionsByDate(raw)];
        })
      );
      const contribs = {};
      for (const [id, data] of contribEntries) {
        contribs[id] = data;
      }
      setContributions(contribs);
    } catch (err) {
      console.error("Error al refrescar datos:", err);
    }
  }, []);

  const handleSyncStrava = async () => {
    setSyncing(s => ({ ...s, strava: true }));
    try {
      await syncStrava();
      setToast({ message: "Strava sincronizado correctamente", type: "success" });
      await refreshData();
    } catch (err) {
      setToast({ message: err.message || "Error al sincronizar Strava", type: "error" });
    } finally {
      setSyncing(s => ({ ...s, strava: false }));
    }
  };

  const handleSyncGithub = async () => {
    setSyncing(s => ({ ...s, github: true }));
    try {
      await syncGitHub();
      setToast({ message: "GitHub sincronizado correctamente", type: "success" });
      await refreshData();
    } catch (err) {
      setToast({ message: err.message || "Error al sincronizar GitHub", type: "error" });
    } finally {
      setSyncing(s => ({ ...s, github: false }));
    }
  };

  const handleLinkHabit = async (integrationId, habitId) => {
    try {
      await updateIntegration(integrationId, { habit_id: habitId || null });
      const updated = await getIntegrations();
      setIntegrations(updated);
      setToast({ message: "Integraci\u00f3n actualizada", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Error al vincular h\u00e1bito", type: "error" });
    }
  };

  const handleCreateUnit = async ({ name, abbreviation }) => {
    try {
      await createUnit({ name, abbreviation });
      const updated = await getAllUnits();
      setUnits(updated);
      setToast({ message: "Unidad creada correctamente", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Error al crear unidad", type: "error" });
    }
  };

  const handleDeleteUnit = async (id) => {
    try {
      await deleteUnit(id);
      const updated = await getAllUnits();
      setUnits(updated);
      setToast({ message: "Unidad eliminada", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Error al eliminar unidad", type: "error" });
    }
  };

  const handleSaveHabit = async (habitData) => {
    try {
      if (habitData.id) {
        // Editing existing habit (type is immutable after creation, not sent on update)
        const updated = await updateHabit(habitData.id, {
          name: habitData.name,
          emoji: habitData.emoji,
          description: habitData.description,
          unit_id: habitData.unit_id,
          minimum: habitData.minimum,
        });
        setHabits(prev => prev.map(h => h.id === updated.id ? updated : h));
      } else {
        // Creating new habit
        const created = await createHabit({
          name: habitData.name,
          emoji: habitData.emoji,
          description: habitData.description,
          unit_id: habitData.unit_id,
          minimum: habitData.minimum,
          type: habitData.type,
        });
        setHabits(prev => [...prev, created]);
        setContributions(prev => ({ ...prev, [created.id]: {} }));
      }
      setShowModal(false);
      setEditingHabit(null);
    } catch (err) {
      console.error("Error al guardar h\u00e1bito:", err);
      setError(err.message);
    }
  };

  const handleDeleteHabit = async (id) => {
    try {
      await deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      setContributions(prev => {
        const newContribs = { ...prev };
        delete newContribs[id];
        return newContribs;
      });
      setDeletingId(null);
    } catch (err) {
      console.error("Error al eliminar h\u00e1bito:", err);
      setError(err.message);
    }
  };

  const handleLog = async (habitId, dateKey, count) => {
    const safeCount = Math.max(0, count);

    // Optimistic update
    setContributions(prev => {
      const habitContribs = { ...(prev[habitId] || {}) };
      if (safeCount === 0) {
        delete habitContribs[dateKey];
      } else {
        habitContribs[dateKey] = safeCount;
      }
      return { ...prev, [habitId]: habitContribs };
    });

    try {
      await logContribution(habitId, dateKey, safeCount);
    } catch (err) {
      console.error("Error al registrar contribuci\u00f3n:", err);
      // Revert optimistic update on error — reload contributions
      try {
        const days = getDaysInRange(20);
        const fromDate = getDateKey(days[0]);
        const toDate = getDateKey(days[days.length - 1]);
        const raw = await getContributions(habitId, fromDate, toDate);
        setContributions(prev => ({
          ...prev,
          [habitId]: sumContributionsByDate(raw),
        }));
      } catch (_) {
        // silent fallback
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#010409",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 16,
          fontFamily: "'JetBrains Mono', monospace",
        }}>Cargando...</p>
      </div>
    );
  }

  const todayKey = getDateKey(new Date());
  const habitsCompletedToday = habits.filter(h => {
    const count = contributions[h.id]?.[todayKey] || 0;
    return h.type === "quit" ? count === 0 : count >= (h.minimum || 1);
  }).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      color: "#e6edf3",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {pulling && pullDistance > 0 && (
        <div style={{
          height: pullDistance,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          transition: pulling ? "none" : "height 0.3s ease",
          color: ready ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          userSelect: "none",
        }}>
          <span style={{
            display: "inline-block",
            transform: ready ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            fontSize: 20,
            marginRight: 8,
          }}>{"↓"}</span>
          {ready ? "Soltá para recargar" : "Deslizá para recargar"}
        </div>
      )}

      <div style={{ maxWidth: isMobile ? 720 : 1200, margin: "0 auto", padding: "32px 20px 60px" }}>
        <header style={{ marginBottom: 32, position: "relative" }}>
          <button
            onClick={() => setShowSettings(true)}
            title={"Configuraci\u00f3n"}
            style={gearButton}
          >{"\u2699\uFE0F"}</button>
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
              ? "Cre\u00e1 tu primer h\u00e1bito para empezar a contribuir"
              : `${habitsCompletedToday}/${habits.length} completados hoy`}
          </p>
        </header>

        {error && (
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "rgba(218,54,51,0.1)",
            border: "1px solid rgba(218,54,51,0.3)",
            color: "#f85149",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "none", border: "none", color: "#f85149",
                cursor: "pointer", fontSize: 16, padding: "0 4px",
              }}
            >{"\u2715"}</button>
          </div>
        )}

        <div style={isMobile ? {} : { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              contributions={contributions[habit.id] || {}}
              onLog={handleLog}
              onEdit={(h) => { setEditingHabit(h); setShowModal(true); }}
              onDelete={(id) => setDeletingId(id)}
              isMobile={isMobile}
            />
          ))}
        </div>

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
          {"+ Nuevo h\u00e1bito"}
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
            <span>{"hac\u00e9 click en un cuadradito para seleccionar fecha \u00b7 us\u00e1 + y \u2212 para registrar"}</span>
          </div>
        )}
      </div>

      {showModal && (
        <HabitModal
          habit={editingHabit}
          units={units}
          onSave={handleSaveHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}

      {deletingId && (
        <ConfirmModal
          message={"\u00BFEst\u00e1s seguro? Se eliminar\u00e1 el h\u00e1bito y todas sus contribuciones."}
          onConfirm={() => handleDeleteHabit(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          habits={habits}
          units={units}
          integrations={integrations}
          syncing={syncing}
          onClose={() => setShowSettings(false)}
          onSyncStrava={handleSyncStrava}
          onSyncGithub={handleSyncGithub}
          onLinkHabit={handleLinkHabit}
          onCreateUnit={handleCreateUnit}
          onDeleteUnit={handleDeleteUnit}
          onLogout={logout}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d1117" }} />
    );
  }

  return isAuthenticated ? <HabitTracker /> : <Login />;
}
