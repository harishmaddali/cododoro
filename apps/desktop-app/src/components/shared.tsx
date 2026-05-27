import { useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon, IconName } from "../lib/icons";
import { AppSnapshot, DayPoint, Tab } from "../lib/types";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

function ordinalSuffix(day: number) {
  // 11th–13th always take "th" regardless of their last digit.
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatCellTooltip(count: number, date: Date) {
  const noun = count === 1 ? "contribution" : "contributions";
  const label = count === 0 ? "No contributions" : `${count} ${noun}`;
  const day = date.getDate();
  const when = `${day}${ordinalSuffix(day)} ${MONTH_ABBR[date.getMonth()]}`;
  return `${label} on ${when}`;
}

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size, height: size, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(3, 1fr)",
            gap: 2,
          }}
        >
          {[1, 2, 3, 4, 2, 4, 3, 4, 4].map((l, i) => (
            <div
              key={i}
              style={{
                background:
                  l === 4
                    ? "var(--grass-4)"
                    : l === 3
                      ? "var(--grass-3)"
                      : l === 2
                        ? "var(--grass-2)"
                        : "var(--grass-1)",
                borderRadius: 1.5,
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>Cododoro</div>
    </div>
  );
}

/** Slim draggable title bar — desktop stand-in for the mock's phone status bar. */
export function TopBar({ right }: { right?: ReactNode }) {
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    getCurrentWindow()
      .startDragging()
      .catch(() => undefined);
  };
  return (
    <div
      data-tauri-drag-region
      onMouseDown={onMouseDown}
      className={"topbar" + (isMac ? " mac" : "")}
    >
      <div data-tauri-drag-region className="topbar-center" style={{ pointerEvents: "none" }}>
        <Logo size={18} />
      </div>
      {right && <div className="topbar-right">{right}</div>}
    </div>
  );
}

export function ProgressRing({
  value,
  goal,
  size = 168,
  stroke = 12,
  accent = "var(--grass-4)",
  children,
}: {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  accent?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(goal, 1), 1);
  const offset = c * (1 - pct);
  const isComplete = value >= goal && goal > 0;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1a2129"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset .6s cubic-bezier(.6,.1,.3,1)",
            filter: isComplete ? `drop-shadow(0 0 8px ${accent})` : "none",
          }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ContribGrid({
  days,
  cellSize = 10,
  gap = 2,
}: {
  days: DayPoint[];
  cellSize?: number;
  gap?: number;
}) {
  const cols = Math.ceil(days.length / 7);
  const firstDow = days[0]?.date.getDay() ?? 0;
  const pads = Array.from({ length: firstDow });
  const [hover, setHover] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const onCellEnter = (e: MouseEvent<HTMLDivElement>, c: DayPoint) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      text: formatCellTooltip(c.count, c.date),
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // Clamp the tooltip horizontally so long labels don't get clipped by the
  // viewport edges (heatmap cells span the full window width).
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el || !hover) return;
    el.style.transform = "translate(-50%, -100%)";
    el.style.left = `${hover.x}px`;
    const rect = el.getBoundingClientRect();
    const pad = 6;
    if (rect.left < pad) {
      el.style.left = `${pad}px`;
      el.style.transform = "translateY(-100%)";
    } else if (rect.right > window.innerWidth - pad) {
      el.style.left = `${window.innerWidth - pad - rect.width}px`;
      el.style.transform = "translateY(-100%)";
    }
  }, [hover]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
          gridAutoFlow: "column",
          gap: `${gap}px`,
          width: "max-content",
        }}
      >
        {pads.map((_, i) => (
          <div key={"p" + i} />
        ))}
        {days.map((c, i) => (
          <div
            key={i}
            className="cell"
            data-l={c.level || undefined}
            style={{ width: cellSize, height: cellSize }}
            onMouseEnter={(e) => onCellEnter(e, c)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>
      {hover && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="cell-tooltip"
          style={{
            position: "fixed",
            top: hover.y - 8,
            left: hover.x,
            transform: "translate(-50%, -100%)",
          }}
        >
          {hover.text}
        </div>
      )}
    </>
  );
}

export function MiniRepoGraph({ days, accent }: { days: DayPoint[]; accent: string }) {
  const recent = days.slice(-49);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows: "repeat(7, 1fr)",
        gridAutoFlow: "column",
        gap: 3,
        width: 78,
        height: 78,
      }}
    >
      {recent.map((c, i) => (
        <div
          key={i}
          style={{
            background:
              c.level === 0
                ? "var(--grass-0)"
                : c.level === 1
                  ? accent + "33"
                  : c.level === 2
                    ? accent + "66"
                    : c.level === 3
                      ? accent + "aa"
                      : accent,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "0 20px",
        marginBottom: 12,
      }}
    >
      <div className="t-h3">{title}</div>
      {action && (
        <button
          onClick={onAction}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            color: "var(--fg-2)",
            fontSize: 13,
          }}
        >
          {action} <Icon name="chevron-right" size={14} />
        </button>
      )}
    </div>
  );
}

// Profile tab glyph with avatar → initial → person-icon fallback. The active
// ring is a box-shadow (not a border) so toggling it never shifts the label.
function ProfileTabAvatar({ snapshot, active }: { snapshot: AppSnapshot | null; active: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = 22;
  const ring = active ? "0 0 0 1.5px var(--grass-4)" : undefined;

  if (snapshot?.avatarUrl && !failed) {
    return (
      <img
        src={snapshot.avatarUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          boxShadow: ring,
        }}
      />
    );
  }

  const initial = (snapshot?.name || snapshot?.login || "").trim().charAt(0).toUpperCase();
  if (initial) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--bg-3)",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1,
          fontFamily: "var(--font-mono)",
          boxShadow: ring,
        }}
      >
        {initial}
      </div>
    );
  }

  return <Icon name="user" size={size} stroke={active ? 2 : 1.6} />;
}

export function TabBar({
  tab,
  onTab,
  snapshot,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  snapshot: AppSnapshot | null;
}) {
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "home", label: "Today", icon: "home" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            className={active ? "active" : ""}
            onClick={() => onTab(t.id)}
            aria-label={t.label}
          >
            {t.id === "profile" ? (
              <ProfileTabAvatar snapshot={snapshot} active={active} />
            ) : (
              <Icon name={t.icon} size={22} stroke={active ? 2 : 1.6} />
            )}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ToggleRow({
  title,
  sub,
  value,
  onChange,
  icon,
}: {
  title: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: IconName;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        width: "100%",
        textAlign: "left",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        marginBottom: 10,
      }}
    >
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--bg-3)",
            display: "grid",
            placeItems: "center",
            color: "var(--fg-1)",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={18} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--fg-0)" }}>{title}</div>
        {sub && (
          <div className="t-small" style={{ marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <div className={"toggle" + (value ? " on" : "")} />
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 9999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "var(--bg-2)",
        borderRadius: 14,
        padding: 6,
        border: "1px solid var(--line)",
      }}
    >
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--bg-3)",
          display: "grid",
          placeItems: "center",
          color: "var(--fg-0)",
        }}
      >
        <Icon name="x" size={16} />
      </button>
      <input
        type="number"
        className="t-mono"
        value={value}
        min={min}
        max={max}
        inputMode="numeric"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return;
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          onChange(clamp(n));
        }}
        onBlur={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isFinite(n)) onChange(min);
          else onChange(clamp(n));
        }}
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 28,
          fontWeight: 500,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--fg-0)",
          width: "100%",
          minWidth: 0,
        }}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--grass-4)",
          display: "grid",
          placeItems: "center",
          color: "#03130a",
        }}
      >
        <Icon name="plus" size={16} stroke={2.5} />
      </button>
    </div>
  );
}

export function StatTile({
  label,
  value,
  suffix,
  icon,
  accent = "var(--fg-0)",
  warning,
}: {
  label: string;
  value: number;
  suffix: string;
  icon: IconName;
  accent?: string;
  warning?: boolean;
}) {
  return (
    <div className="card" style={{ padding: 12, position: "relative", overflow: "hidden" }}>
      {warning && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at top right, var(--danger-soft), transparent 70%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--fg-2)",
          marginBottom: 8,
        }}
      >
        <Icon name={icon} size={12} />
        <span
          className="t-small"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="t-mono"
        style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: accent }}
      >
        {value}
      </div>
      <div className="t-small" style={{ marginTop: 4, fontSize: 11 }}>
        {suffix}
      </div>
    </div>
  );
}

export function SevenDayChart({ days, goal }: { days: DayPoint[]; goal: number }) {
  const max = Math.max(goal + 1, ...days.map((d) => d.count), 1);
  const labels = days.map((d) =>
    d.date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2),
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
      {days.map((d, i) => {
        const h = (d.count / max) * 100;
        const hitGoal = d.count >= goal && goal > 0;
        const isToday = i === days.length - 1;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              height: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
                position: "relative",
              }}
            >
              {i === 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${(goal / max) * 100}%`,
                    height: 1,
                    background:
                      "repeating-linear-gradient(to right, var(--line-2) 0, var(--line-2) 4px, transparent 4px, transparent 8px)",
                    width: "100%",
                    zIndex: 0,
                  }}
                />
              )}
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(h, 4)}%`,
                  background:
                    d.count === 0 ? "var(--bg-3)" : hitGoal ? "var(--grass-4)" : "var(--grass-2)",
                  borderRadius: 4,
                  boxShadow: isToday && hitGoal ? "0 0 12px var(--grass-glow)" : "none",
                  border: isToday
                    ? "1px solid " + (hitGoal ? "var(--grass-4)" : "var(--warn)")
                    : "none",
                }}
              />
            </div>
            <div
              className="t-mono"
              style={{
                fontSize: 10,
                color: isToday ? "var(--fg-0)" : "var(--fg-3)",
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
