import { Fragment } from "react";
import { Icon, IconName } from "../lib/icons";
import { ProgressRing, SectionHeader } from "../components/shared";
import { openExternal } from "../lib/api";
import { AppSnapshot, CommitDetail, Config, DayPoint, deriveStatus, RepoEntry } from "../lib/types";

interface Props {
  snapshot: AppSnapshot;
  days: DayPoint[];
  config: Config;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenRepo: (id: string) => void;
  onOpenNudges: () => void;
  onOpenCalendar: () => void;
}

export function Home({
  snapshot,
  days,
  config,
  refreshing,
  onRefresh,
  onOpenRepo,
  onOpenNudges,
  onOpenCalendar,
}: Props) {
  const status = deriveStatus(snapshot);
  const todayCommits = snapshot.todayCount;
  const dailyGoal = snapshot.dailyGoal;
  const streak = snapshot.streak;
  const hours = Math.max(1, 24 - new Date().getHours());
  const todaysRepos = snapshot.repos.filter((r) => r.today > 0);
  const weekTotal = snapshot.repos.reduce((s, r) => s + r.week, 0);
  const greeting = snapshot.name?.split(" ")[0] || snapshot.login;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="screen">
      <div
        style={{
          padding: "16px 20px 4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="t-small" style={{ marginBottom: 2 }}>
            {today}
          </div>
          <div className="t-h2">Hi, {greeting}.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onRefresh}
            aria-label="Refresh"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className={refreshing ? "spin" : ""} style={{ display: "grid" }}>
              <Icon name="refresh" size={17} />
            </span>
          </button>
          <button
            onClick={onOpenNudges}
            aria-label="Nudges"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              position: "relative",
            }}
          >
            <Icon name="bell" size={18} />
            <div
              style={{
                position: "absolute",
                top: 9,
                right: 11,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "var(--grass-4)",
                boxShadow: "0 0 6px var(--grass-glow)",
              }}
            />
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 20px 8px", position: "relative" }}>
        <ProgressRing
          value={todayCommits}
          goal={dailyGoal}
          size={196}
          stroke={14}
          accent={
            status === "danger"
              ? "var(--danger)"
              : status === "on-fire"
                ? "var(--grass-4)"
                : "var(--fg-3)"
          }
        >
          <div>
            <div
              className="t-mono"
              style={{
                fontSize: 54,
                fontWeight: 500,
                lineHeight: 1,
                color:
                  status === "danger"
                    ? "var(--danger)"
                    : status === "on-fire"
                      ? "var(--grass-4)"
                      : "var(--fg-0)",
              }}
            >
              {todayCommits}
              <span style={{ color: "var(--fg-3)", fontWeight: 300 }}>/{dailyGoal}</span>
            </div>
            <div className="t-small" style={{ marginTop: 8 }}>
              commits today
            </div>
          </div>
        </ProgressRing>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          {status === "on-fire" && (
            <div className="pill pill-green">
              <Icon name="check" size={12} stroke={3} /> Goal hit · keep going
            </div>
          )}
          {status === "in-progress" && (
            <div className="pill">
              <Icon name="clock" size={12} /> {hours}h left to hit today's goal
            </div>
          )}
          {status === "danger" && (
            <div
              className="pill pill-danger"
              style={{ animation: "pulse-glow-danger 2s infinite" }}
            >
              <Icon name="flame" size={12} /> Streak ends in {hours}h
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 24 }} />
      <SectionHeader title="Today's repos" />
      <div style={{ padding: "0 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {todaysRepos.length === 0 && (
          <div className="card t-small">No contributions yet today.</div>
        )}
        {todaysRepos.slice(0, 6).map((r) => (
          <RepoProgressRow
            key={r.nameWithOwner}
            repo={r}
            onClick={() => onOpenRepo(r.nameWithOwner)}
          />
        ))}
      </div>

      {config.showMascot && <Mascot status={status} />}

      <div style={{ padding: "16px 20px 0" }}>
        <div className="card" onClick={onOpenCalendar} style={{ cursor: "pointer" }}>
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
          <SevenDayChart days={days.slice(-7)} goal={dailyGoal} />
        </div>
      </div>

      <div
        style={{
          padding: "24px 20px 12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <StatTile
          label="Streak"
          value={streak}
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
          value={snapshot.repos.filter((r) => r.today > 0).length}
          suffix={`of ${snapshot.repos.length}`}
          icon="repo"
        />
      </div>

      <div style={{ height: 24 }} />
      <SectionHeader title="Recent commits" />
      <div style={{ padding: "0 20px 24px" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {snapshot.recentCommits.length === 0 && (
            <div className="t-small" style={{ padding: 16 }}>
              No qualifying commits yet today.
            </div>
          )}
          {snapshot.recentCommits.map((c, i, a) => (
            <Fragment key={c.sha}>
              <CommitRow commit={c} />
              {i < a.length - 1 && <div className="divider" style={{ marginLeft: 50 }} />}
            </Fragment>
          ))}
        </div>
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}

function StatTile({
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

function SevenDayChart({ days, goal }: { days: DayPoint[]; goal: number }) {
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

function RepoProgressRow({ repo, onClick }: { repo: RepoEntry; onClick: () => void }) {
  const goal = repo.goal > 0 ? repo.goal : Math.max(1, repo.goal);
  const pct = Math.min(100, (repo.today / goal) * 100);
  const done = repo.goal > 0 ? repo.today >= repo.goal : repo.today > 0;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: repo.color + "1a",
          border: "1px solid " + repo.color + "33",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 2, background: repo.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "var(--fg-2)" }}>{repo.owner}/</span>
          {repo.name}
        </div>
        <div
          style={{
            height: 4,
            background: "var(--bg-3)",
            borderRadius: 2,
            marginTop: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: pct + "%",
              background: done ? "var(--grass-4)" : "var(--grass-2)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
      <div style={{ textAlign: "right", minWidth: 38 }}>
        <div
          className="t-mono"
          style={{ fontSize: 14, color: done ? "var(--grass-4)" : "var(--fg-0)" }}
        >
          {repo.today}
          {repo.goal > 0 && <span style={{ color: "var(--fg-3)" }}>/{repo.goal}</span>}
        </div>
      </div>
    </button>
  );
}

function CommitRow({ commit }: { commit: CommitDetail }) {
  const time = commit.authoredAt
    ? new Date(commit.authoredAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <button
      onClick={() => commit.url && openExternal(commit.url)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        width: "100%",
        textAlign: "left",
      }}
    >
      <div style={{ marginTop: 2, color: "var(--grass-3)" }}>
        <Icon name="commit" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            color: "var(--fg-0)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {commit.message || "(no message)"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span className="t-mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>
            {commit.shortSha}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--fg-3)" }} />
          <span className="t-small" style={{ fontSize: 11 }}>
            {commit.repo}
          </span>
          {time && (
            <>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 999,
                  background: "var(--fg-3)",
                }}
              />
              <span className="t-small" style={{ fontSize: 11 }}>
                {time}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function Mascot({ status }: { status: ReturnType<typeof deriveStatus> }) {
  const mood = status === "on-fire" ? "happy" : status === "in-progress" ? "neutral" : "sad";
  const eyes = mood === "happy" ? ["^", "^"] : mood === "neutral" ? ["•", "•"] : ["x", "x"];
  const mouth = mood === "happy" ? "ᴗ" : mood === "neutral" ? "_" : "︵";
  const msg =
    mood === "happy"
      ? "You're crushing it today."
      : mood === "neutral"
        ? "Halfway there — one more push?"
        : "I don't want to see you lose the streak.";
  return (
    <div style={{ padding: "8px 20px 0" }}>
      <div
        className="card"
        style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--bg-1)" }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background:
              mood === "happy"
                ? "rgba(57,216,120,0.1)"
                : mood === "neutral"
                  ? "var(--bg-3)"
                  : "rgba(239,74,74,0.08)",
            color:
              mood === "happy"
                ? "var(--grass-4)"
                : mood === "neutral"
                  ? "var(--fg-1)"
                  : "var(--danger)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            flexShrink: 0,
          }}
        >
          ({eyes[0]}
          {mouth}
          {eyes[1]})
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.4 }}>{msg}</div>
      </div>
    </div>
  );
}
