import { useState } from "react";
import { Icon } from "../lib/icons";
import { MiniRepoGraph } from "../components/shared";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppSnapshot, DayPoint, RepoEntry } from "../lib/types";

interface Props {
  snapshot: AppSnapshot;
  days: DayPoint[];
  onOpenRepo: (id: string) => void;
  onBack: () => void;
}

export function ReposScreen({ snapshot, days, onOpenRepo, onBack }: Props) {
  const [filter, setFilter] = useState<"all" | "active">("active");
  const repos = snapshot.repos;
  const shown = repos.filter((r) => (filter === "all" ? true : r.today > 0));

  return (
    <div className="screen">
      <ScreenHeader title="Repos" onBack={onBack} />

      <div style={{ padding: "12px 20px 8px", display: "flex", gap: 8 }}>
        {[
          { id: "active", label: "Active today" },
          { id: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className="pill"
            style={{
              height: 32,
              padding: "0 14px",
              fontSize: 12,
              background: filter === f.id ? "rgba(57,216,120,0.12)" : "var(--bg-2)",
              color: filter === f.id ? "var(--grass-4)" : "var(--fg-1)",
              borderColor: filter === f.id ? "rgba(57,216,120,0.3)" : "var(--line)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: "8px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {shown.length === 0 && <div className="card t-small">Nothing here yet.</div>}
        {shown.map((r) => (
          <RepoCard
            key={r.nameWithOwner}
            repo={r}
            days={days}
            onClick={() => onOpenRepo(r.nameWithOwner)}
          />
        ))}
      </div>
    </div>
  );
}

function RepoCard({
  repo,
  days,
  onClick,
}: {
  repo: RepoEntry;
  days: DayPoint[];
  onClick: () => void;
}) {
  const done = repo.goal > 0 && repo.today >= repo.goal;
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "center",
        textAlign: "left",
        padding: 14,
      }}
    >
      <MiniRepoGraph days={days} accent={repo.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "var(--fg-2)" }}>{repo.owner}/</span>
          <span style={{ color: "var(--fg-0)", fontWeight: 500 }}>{repo.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: repo.color }} />
          <span className="t-small" style={{ fontSize: 11.5 }}>
            {repo.language ?? "—"}
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div
              className="t-mono"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: done ? "var(--grass-4)" : "var(--fg-0)",
              }}
            >
              {repo.today}
              {repo.goal > 0 && <span style={{ color: "var(--fg-3)" }}>/{repo.goal}</span>}
            </div>
            <div className="t-small" style={{ fontSize: 10.5 }}>
              today
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: "var(--line)" }} />
          <div>
            <div className="t-mono" style={{ fontSize: 15, fontWeight: 500 }}>
              {repo.week}
            </div>
            <div className="t-small" style={{ fontSize: 10.5 }}>
              this week
            </div>
          </div>
        </div>
      </div>
      <Icon name="chevron-right" size={16} stroke={1.5} />
    </button>
  );
}
