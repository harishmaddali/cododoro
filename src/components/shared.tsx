import type { MouseEvent, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon, IconName } from "../lib/icons";
import { DayPoint, Tab } from "../lib/types";

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
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
        Cododoro
      </div>
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
      <div
        data-tauri-drag-region
        className="topbar-center"
        style={{ pointerEvents: "none" }}
      >
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
  return (
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
          title={`${c.count} on ${c.date.toLocaleDateString()}`}
        />
      ))}
    </div>
  );
}

export function MiniRepoGraph({
  days,
  accent,
}: {
  days: DayPoint[];
  accent: string;
}) {
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

export function TabBar({
  tab,
  onTab,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "home", label: "Today", icon: "home" },
    { id: "repos", label: "Repos", icon: "repo" },
    { id: "calendar", label: "History", icon: "calendar" },
    { id: "profile", label: "Profile", icon: "user" },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? "active" : ""}
          onClick={() => onTab(t.id)}
          aria-label={t.label}
        >
          <Icon name={t.icon} size={22} stroke={tab === t.id ? 2 : 1.6} />
          <span>{t.label}</span>
        </button>
      ))}
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
        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--fg-0)" }}>
          {title}
        </div>
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
          MozAppearance: "textfield",
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
