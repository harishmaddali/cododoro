import { useState } from "react";
import { Icon, IconName } from "../lib/icons";
import { SevenDayChart, StatTile } from "../components/shared";
import { openExternal } from "../lib/api";
import { AppSnapshot, Config, DayPoint, deriveStatus } from "../lib/types";

interface Props {
  snapshot: AppSnapshot;
  days: DayPoint[];
  config: Config;
  onOpenGoals: () => void;
  onOpenNudges: () => void;
  onOpenCalendar: () => void;
  onReset: () => void;
}

export function ProfileScreen({
  snapshot,
  days,
  config,
  onOpenGoals,
  onOpenNudges,
  onOpenCalendar,
  onReset,
}: Props) {
  const repoCount = snapshot.repos.length;
  const activeFilters = Object.values(config.filters).filter(Boolean).length;
  const status = deriveStatus(snapshot);
  const weekTotal = snapshot.repos.reduce((s, r) => s + r.week, 0);
  const activeCount = snapshot.repos.filter((r) => r.today > 0).length;
  const nudgeLabel = config.nudges.morning
    ? "Morning · 08:30"
    : config.nudges.midday
      ? "Midday · 13:00"
      : config.nudges.evening
        ? `Last-call · ${config.reminderTime}`
        : "Off";
  const scheduleLabel =
    config.streakDays.length === 7
      ? "Every day"
      : config.streakDays.length === 5 &&
          !config.streakDays.includes("Sat") &&
          !config.streakDays.includes("Sun")
        ? "Mon–Fri"
        : `${config.streakDays.length} days`;

  return (
    <div className="screen">
      <div style={{ padding: "16px 20px 4px" }}>
        <h1 className="t-h1">Profile</h1>
      </div>

      <div style={{ padding: "20px" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar snapshot={snapshot} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {snapshot.name || snapshot.login}
            </div>
            <div
              className="t-small"
              style={{ marginTop: 2, fontFamily: "var(--font-mono)", fontSize: 12 }}
            >
              github.com/{snapshot.login}
            </div>
          </div>
          <button
            onClick={() => openExternal(`https://github.com/${snapshot.login}`)}
            aria-label="Open on GitHub"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="arrow-up-right" size={16} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginTop: 14,
          }}
        >
          <ProfileStat value={snapshot.yearTotal} label="Year" />
          <ProfileStat value={snapshot.streak} label="Streak" accent="var(--grass-4)" />
          <ProfileStat value={repoCount} label="Repos" />
        </div>

        <div className="card" onClick={onOpenCalendar} style={{ cursor: "pointer", marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div className="t-h3">Last 7 days</div>
            <div
              className="t-small"
              style={{
                color: "var(--fg-2)",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              View all <Icon name="chevron-right" size={13} />
            </div>
          </div>
          <SevenDayChart days={days.slice(-7)} goal={snapshot.dailyGoal} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginTop: 10,
          }}
        >
          <StatTile
            label="Streak"
            value={snapshot.streak}
            suffix="days"
            icon="flame"
            accent={
              status === "danger"
                ? "var(--danger)"
                : status === "on-fire"
                  ? "var(--grass-4)"
                  : "var(--fg-2)"
            }
            warning={status === "danger"}
          />
          <StatTile label="This week" value={weekTotal} suffix="commits" icon="commit" />
          <StatTile
            label="Active"
            value={activeCount}
            suffix={`of ${snapshot.repos.length}`}
            icon="repo"
          />
        </div>

        <div className="t-eyebrow" style={{ marginTop: 28, marginBottom: 10, padding: "0 4px" }}>
          Goals
        </div>
        <NavRow
          icon="target"
          label="Daily commit goal"
          value={`${config.dailyGoal} / day`}
          onClick={onOpenGoals}
        />
        <NavRow icon="flame" label="Streak schedule" value={scheduleLabel} onClick={onOpenGoals} />
        <NavRow
          icon="filter"
          label="Commit filters"
          value={`${activeFilters} active`}
          onClick={onOpenGoals}
        />

        <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 10, padding: "0 4px" }}>
          Notifications
        </div>
        <NavRow icon="bell" label="Nudges" value={nudgeLabel} onClick={onOpenNudges} />

        <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 10, padding: "0 4px" }}>
          Account
        </div>
        <NavRow icon="github" label="Connected via gh CLI" value={`@${snapshot.login}`} />
        <NavRow icon="logout" label="Reset & disconnect" onClick={onReset} danger />

        <div
          className="t-small"
          style={{
            textAlign: "center",
            marginTop: 24,
            color: "var(--fg-3)",
            fontSize: 11,
          }}
        >
          Cododoro · made for committers
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

function Avatar({ snapshot }: { snapshot: AppSnapshot }) {
  const [failed, setFailed] = useState(false);
  if (!snapshot.avatarUrl || failed) {
    return (
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: "linear-gradient(135deg, #14633a, #39d878)",
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          fontWeight: 600,
          color: "#03130a",
          fontFamily: "var(--font-mono)",
          border: "1.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {(snapshot.name || snapshot.login).slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={snapshot.avatarUrl}
      alt=""
      width={56}
      height={56}
      onError={() => setFailed(true)}
      style={{
        borderRadius: 999,
        objectFit: "cover",
        border: "1.5px solid rgba(255,255,255,0.08)",
      }}
    />
  );
}

function ProfileStat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="card" style={{ padding: 12, textAlign: "center" }}>
      <div
        className="t-mono"
        style={{ fontSize: 22, fontWeight: 500, color: accent || "var(--fg-0)" }}
      >
        {value}
      </div>
      <div className="t-small" style={{ fontSize: 11, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function NavRow({
  icon,
  label,
  value,
  onClick,
  danger,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 14px",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        marginBottom: 6,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-3)",
          display: "grid",
          placeItems: "center",
          color: danger ? "var(--danger)" : "var(--fg-1)",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={16} />
      </div>
      <div style={{ flex: 1, fontSize: 14, color: danger ? "var(--danger)" : "var(--fg-0)" }}>
        {label}
      </div>
      {value && (
        <div className="t-small" style={{ fontSize: 12 }}>
          {value}
        </div>
      )}
      {!danger && onClick && <Icon name="chevron-right" size={14} stroke={1.5} />}
    </button>
  );
}
