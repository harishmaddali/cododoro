import { Fragment } from "react";
import { Icon } from "../lib/icons";
import { ProgressRing, Stepper } from "../components/shared";
import { ScreenHeader } from "../components/ScreenHeader";
import { openExternal } from "../lib/api";
import { AppSnapshot, Config, DayPoint } from "../lib/types";

interface Props {
  repoId: string;
  snapshot: AppSnapshot;
  days: DayPoint[];
  config: Config;
  onConfigChange: (next: Config) => void;
  onBack: () => void;
}

export function RepoDetail({ repoId, snapshot, days, config, onConfigChange, onBack }: Props) {
  const repo = snapshot.repos.find((r) => r.nameWithOwner === repoId);
  if (!repo) return null;

  const goal = config.repoGoals[repoId] ?? repo.goal ?? 0;
  const done = goal > 0 && repo.today >= goal;
  const recent = snapshot.recentCommits.filter((c) => c.repo === repo.name);
  const last90 = days.slice(-91);

  const setGoal = (v: number) =>
    onConfigChange({
      ...config,
      repoGoals: { ...config.repoGoals, [repoId]: v },
    });

  return (
    <div className="screen">
      <ScreenHeader
        title="Repository"
        onBack={onBack}
        action={
          <button
            onClick={() => openExternal(repo.url)}
            aria-label="Open on GitHub"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="arrow-up-right" size={15} />
          </button>
        }
      />

      <div style={{ padding: "8px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: repo.color }} />
          <div className="t-mono" style={{ fontSize: 13, color: "var(--fg-2)" }}>
            {repo.owner}/
          </div>
        </div>
        <div
          className="t-display"
          style={{
            fontSize: 28,
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            letterSpacing: "-0.03em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {repo.name}
        </div>
        <div
          className="t-small"
          style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}
        >
          <span>{repo.language ?? "—"}</span>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--fg-3)" }} />
          <span>main</span>
        </div>
      </div>

      <div
        style={{
          padding: "24px 20px 0",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 18,
          alignItems: "center",
        }}
      >
        <ProgressRing
          value={repo.today}
          goal={Math.max(goal, 1)}
          size={128}
          stroke={11}
          accent={done ? "var(--grass-4)" : repo.color}
        >
          <div>
            <div className="t-mono" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1 }}>
              {repo.today}
            </div>
            <div className="t-small" style={{ marginTop: 4, fontSize: 11 }}>
              / {goal || "—"} today
            </div>
          </div>
        </ProgressRing>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <RepoStat label="This week" value={repo.week} />
          <RepoStat label="Today" value={repo.today} />
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Last 90 days
        </div>
        <div className="card" style={{ padding: 14, overflow: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(13, 1fr)",
              gridTemplateRows: "repeat(7, 16px)",
              gridAutoFlow: "column",
              gap: 4,
            }}
          >
            {last90.map((c, i) => (
              <div
                key={i}
                style={{
                  background:
                    c.level === 0
                      ? "var(--grass-0)"
                      : c.level === 1
                        ? repo.color + "33"
                        : c.level === 2
                          ? repo.color + "66"
                          : c.level === 3
                            ? repo.color + "aa"
                            : repo.color,
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          This repo's goal
        </div>
        <div className="card">
          <div className="t-small" style={{ marginBottom: 10, paddingLeft: 4 }}>
            Per-repo daily goal (0 = use the global goal)
          </div>
          <Stepper value={goal} onChange={setGoal} min={0} max={9999} />
        </div>
      </div>

      <div style={{ padding: "24px 20px 24px" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Recent
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {recent.length === 0 && (
            <div className="t-small" style={{ padding: 16 }}>
              No qualifying commits today.
            </div>
          )}
          {recent.map((c, i, a) => (
            <Fragment key={c.sha}>
              <button
                onClick={() => c.url && openExternal(c.url)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <div style={{ color: "var(--grass-3)" }}>
                  <Icon name="commit" size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.message || "(no message)"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 3,
                    }}
                  >
                    <span className="t-mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>
                      {c.shortSha}
                    </span>
                  </div>
                </div>
                <Icon name="arrow-up-right" size={14} />
              </button>
              {i < a.length - 1 && <div className="divider" style={{ marginLeft: 42 }} />}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function RepoStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "8px 12px",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 10,
      }}
    >
      <div className="t-small" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div className="t-mono" style={{ fontSize: 16, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}
