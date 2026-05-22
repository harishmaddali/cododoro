import { Fragment } from "react";
import { Icon } from "../lib/icons";
import { ProgressRing, SectionHeader } from "../components/shared";
import { openExternal } from "../lib/api";
import { AppSnapshot, CommitDetail, Config, deriveStatus, RepoEntry } from "../lib/types";

interface Props {
  snapshot: AppSnapshot;
  config: Config;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenRepo: (id: string) => void;
  onOpenCommits: () => void;
}

export function Home({
  snapshot,
  config,
  refreshing,
  onRefresh,
  onOpenRepo,
  onOpenCommits,
}: Props) {
  const status = deriveStatus(snapshot);
  const todayCommits = snapshot.todayCount;
  const dailyGoal = snapshot.dailyGoal;

  // Goal-ring label sizing: the "value/goal" text is monospace (Geist Mono,
  // ~0.6em per glyph). Shrink it for longer strings so it always keeps ~13% of
  // the ring radius clear on each side and never crowds the ring stroke.
  const ringSize = 196;
  const ringStroke = 14;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringInner = ringSize - ringStroke * 2;
  const ringLabel = `${todayCommits}/${dailyGoal}`;
  const ringFontSize = Math.min(54, (ringInner - ringRadius * 0.26) / (ringLabel.length * 0.6));
  const ringScale = ringFontSize / 54;
  const hours = Math.max(1, 24 - new Date().getHours());
  const todaysRepos = snapshot.repos.filter((r) => r.today > 0);
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
        </div>
      </div>

      <div style={{ padding: "24px 20px 8px", position: "relative" }}>
        <ProgressRing
          value={todayCommits}
          goal={dailyGoal}
          size={ringSize}
          stroke={ringStroke}
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
                fontSize: ringFontSize,
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
            <div className="t-small" style={{ marginTop: 8 * ringScale, fontSize: 12 * ringScale }}>
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
              {/* Filled, enlarged flame — the shared stroke-only Icon renders as a faint hairline here. */}
              <svg
                width={12}
                height={14}
                viewBox="6 2 12 14"
                fill="#FFD66B"
                style={{ display: "block", flexShrink: 0 }}
              >
                <path d="M12 3c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 1-5 2 1 2 3 3-3z" />
              </svg>{" "}
              Streak ends in {hours}h
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

      <div style={{ height: 24 }} />
      <SectionHeader title="Recent commits" />
      <div style={{ padding: "0 20px 24px" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {snapshot.recentCommits.length === 0 && (
            <div className="t-small" style={{ padding: 16 }}>
              No qualifying commits yet today.
            </div>
          )}
          {snapshot.recentCommits.slice(0, 5).map((c, i, a) => (
            <Fragment key={c.sha}>
              <CommitRow commit={c} />
              {i < a.length - 1 && <div className="divider" style={{ marginLeft: 50 }} />}
            </Fragment>
          ))}
        </div>
        {snapshot.recentCommits.length > 0 && (
          <button
            onClick={onOpenCommits}
            style={{
              marginTop: 10,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px 0",
              borderRadius: 12,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              color: "var(--fg-1)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            See all commits today
            <Icon name="arrow-right" size={14} />
          </button>
        )}
      </div>

      <div style={{ height: 12 }} />
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

export function CommitRow({ commit }: { commit: CommitDetail }) {
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
  if (status === "danger") return null;
  const mood = status === "on-fire" ? "happy" : "neutral";
  const eyes = mood === "happy" ? ["^", "^"] : ["•", "•"];
  const mouth = mood === "happy" ? "ᴗ" : "_";
  const face = `(${eyes[0]}${mouth}${eyes[1]})`;
  const msg = mood === "happy" ? "You're crushing it today." : "Halfway there — one more push?";
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
            background: mood === "happy" ? "rgba(57,216,120,0.1)" : "var(--bg-3)",
            color: mood === "happy" ? "var(--grass-4)" : "var(--fg-1)",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "-0.05em",
            whiteSpace: "pre",
            flexShrink: 0,
          }}
        >
          {face}
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.4 }}>{msg}</div>
      </div>
    </div>
  );
}
