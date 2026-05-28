import { useLayoutEffect, useRef, useState } from "react";
import { Icon, IconName } from "../lib/icons";
import { ContribGrid, SevenDayChart, StatTile } from "../components/shared";
import { openExternal } from "../lib/api";
import { AppSnapshot, Config, DayPoint, deriveStatus } from "../lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  snapshot: AppSnapshot;
  days: DayPoint[];
  config: Config;
  onOpenGoals: () => void;
  onOpenNudges: () => void;
  onOpenRepos: () => void;
  onOpenRateLimits: () => void;
  onCheckForUpdates: () => void;
  checkingForUpdate: boolean;
  onReset: () => void;
}

export function ProfileScreen({
  snapshot,
  days,
  config,
  onOpenGoals,
  onOpenNudges,
  onOpenRepos,
  onOpenRateLimits,
  onCheckForUpdates,
  checkingForUpdate,
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

        <div className="card" style={{ marginTop: 14 }}>
          <div className="t-h3" style={{ marginBottom: 14 }}>
            Last 7 days
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

        <div
          style={{
            marginTop: 28,
            marginBottom: 10,
            padding: "0 4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <div className="t-eyebrow">History</div>
          <div className="t-small" style={{ fontSize: 11 }}>
            {snapshot.yearTotal} this year
          </div>
        </div>
        <HistorySection snapshot={snapshot} days={days} />

        <div className="t-eyebrow" style={{ marginTop: 28, marginBottom: 10, padding: "0 4px" }}>
          Repositories
        </div>
        <NavRow icon="repo" label="Repos" value={`${repoCount}`} onClick={onOpenRepos} />

        <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 10, padding: "0 4px" }}>
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
        <NavRow icon="zap" label="GitHub rate limits" onClick={onOpenRateLimits} />
        <NavRow
          icon="refresh"
          label="Check for updates"
          value={checkingForUpdate ? "Checking…" : undefined}
          onClick={onCheckForUpdates}
          loading={checkingForUpdate}
        />
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

function HistorySection({ snapshot, days }: { snapshot: AppSnapshot; days: DayPoint[] }) {
  const { streak, longestStreak, longestRange, bestDay } = snapshot;
  const heatmapRef = useRef<HTMLDivElement>(null);

  const heatmapDays: DayPoint[] = [...days];
  if (days.length > 0) {
    const windowEnd = new Date();
    windowEnd.setHours(0, 0, 0, 0);
    windowEnd.setMonth(windowEnd.getMonth() + 1);
    const cursor = new Date(heatmapDays[heatmapDays.length - 1].date);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= windowEnd) {
      heatmapDays.push({ date: new Date(cursor), count: 0, level: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const monthsTrack: { label: string; idx: number }[] = [];
  let lastMonth = -1;
  heatmapDays.forEach((d, i) => {
    if (d.date.getDate() <= 7 && d.date.getMonth() !== lastMonth) {
      monthsTrack.push({ label: MONTHS[d.date.getMonth()], idx: Math.floor(i / 7) });
      lastMonth = d.date.getMonth();
    }
  });

  const best = bestDay
    ? {
        label: new Date(bestDay.date + "T00:00:00").toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        count: bestDay.count,
      }
    : null;

  // Pin the heatmap to its right edge on mount so the most recent months
  // (including the one-month-ahead padding) are visible without scrolling.
  useLayoutEffect(() => {
    const el = heatmapRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, []);

  return (
    <>
      <div className="card">
        <div ref={heatmapRef} style={{ overflowX: "auto" }} className="hscroll-x">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: "max-content",
            }}
          >
            <div style={{ position: "relative", height: 14 }}>
              {monthsTrack.map((m, i) => (
                <div
                  key={i}
                  className="t-mono"
                  style={{
                    position: "absolute",
                    left: m.idx * (12 + 2),
                    fontSize: 10.5,
                    color: "var(--fg-2)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <ContribGrid days={heatmapDays} cellSize={12} gap={2} />
          </div>
        </div>
        <div
          style={{
            padding: "12px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
          }}
        >
          <span className="t-small" style={{ fontSize: 10.5 }}>
            Less
          </span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className="cell"
              data-l={l || undefined}
              style={{ width: 10, height: 10 }}
            />
          ))}
          <span className="t-small" style={{ fontSize: 10.5 }}>
            More
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Current
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div
              className="t-mono"
              style={{ fontSize: 32, fontWeight: 500, color: "var(--grass-4)" }}
            >
              {streak}
            </div>
            <div className="t-small">days</div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 3 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background:
                    i < Math.min(10, Math.floor(streak / 10)) ? "var(--grass-4)" : "var(--bg-3)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Longest
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div className="t-mono" style={{ fontSize: 32, fontWeight: 500 }}>
              {longestStreak}
            </div>
            <div className="t-small">days</div>
          </div>
          <div className="t-small" style={{ marginTop: 12, fontSize: 11 }}>
            {longestRange || "—"}
          </div>
        </div>
      </div>

      {best && (
        <div
          className="card"
          style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10 }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(57,216,120,0.1)",
              border: "1px solid rgba(57,216,120,0.25)",
              display: "grid",
              placeItems: "center",
              color: "var(--grass-4)",
              flexShrink: 0,
            }}
          >
            <Icon name="trophy" size={20} stroke={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-small" style={{ fontSize: 11 }}>
              BEST DAY
            </div>
            <div style={{ fontSize: 15, marginTop: 2, fontWeight: 500 }}>
              {best.label} · {best.count} contributions
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 10 }}>
        <div className="t-h3" style={{ marginBottom: 14 }}>
          Your pattern
        </div>
        <WeekdayPattern days={days} />
      </div>
    </>
  );
}

function WeekdayPattern({ days }: { days: DayPoint[] }) {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((d) => {
    buckets[d.date.getDay()] += d.count;
  });
  const max = Math.max(...buckets, 1);
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
      {buckets.map((b, i) => {
        const peak = b === max && b > 0;
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
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${(b / max) * 100}%`,
                  background: peak ? "var(--grass-4)" : "var(--grass-2)",
                  borderRadius: 4,
                  boxShadow: peak ? "0 0 10px var(--grass-glow)" : "none",
                }}
              />
            </div>
            <div
              className="t-mono"
              style={{ fontSize: 10.5, color: peak ? "var(--grass-4)" : "var(--fg-3)" }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NavRow({
  icon,
  label,
  value,
  onClick,
  danger,
  loading,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
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
        opacity: loading ? 0.7 : 1,
        cursor: loading ? "default" : undefined,
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
      {loading ? (
        <span className="spin" style={{ display: "grid", color: "var(--fg-2)" }}>
          <Icon name="refresh" size={14} stroke={1.5} />
        </span>
      ) : (
        !danger && onClick && <Icon name="chevron-right" size={14} stroke={1.5} />
      )}
    </button>
  );
}
