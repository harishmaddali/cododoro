import { useState } from "react";
import {
  CommitDetail,
  ContributionsSnapshot,
  RepoCommits,
  Settings,
} from "../lib/types";

interface Props {
  snapshot: ContributionsSnapshot | null;
  settings: Settings;
  refreshing: boolean;
  onRefresh: () => void;
}

export function Dashboard({ snapshot, settings, refreshing, onRefresh }: Props) {
  if (!snapshot) {
    return (
      <div className="card text-[13px] text-secondary">
        No data yet.{" "}
        <button
          className="text-accent hover:underline"
          style={{ color: "var(--accent)" }}
          onClick={onRefresh}
        >
          Fetch now
        </button>
      </div>
    );
  }

  const todayCount = snapshot.commitCount;
  const goal = settings.dailyGoal;
  const progress = Math.min(100, Math.round((todayCount / Math.max(1, goal)) * 100));
  const remaining = Math.max(0, goal - todayCount);
  const goalMet = todayCount >= goal;
  const fetchedAt = new Date(snapshot.fetchedAt);

  return (
    <div className="space-y-3">
      {/* Progress card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today · <span className="font-mono">{snapshot.date}</span>
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums">
              <span className="text-accent">{todayCount}</span>
              <span className="text-xl text-zinc-500"> / {goal}</span>
            </p>
          </div>

          <button
            className="btn-ghost mt-1"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="mt-4 h-[5px] overflow-hidden rounded-full"
          style={{ background: "var(--bg-control)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: goalMet ? "var(--accent)" : "rgba(40,205,65,0.55)",
            }}
          />
        </div>

        <p className="mt-2.5 text-[13px]" style={{ color: goalMet ? "var(--accent)" : "var(--text-secondary)" }}>
          {goalMet
            ? "Goal hit. See you tomorrow."
            : `${remaining} more commit${remaining === 1 ? "" : "s"} to hit today's goal.`}
        </p>
      </div>

      {/* Meta info */}
      <div
        className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[11px]"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          Counting{" "}
          <span style={{ color: "var(--text-primary)" }}>
            {snapshot.onlyNonMerge ? "non-merge commits" : "all commits"}
          </span>{" "}
          by{" "}
          <span style={{ color: "var(--text-primary)" }}>@{snapshot.login}</span>{" "}
          today
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>
          {fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Repo breakdown */}
      <RepoBreakdown repos={snapshot.repos} />
    </div>
  );
}

function RepoBreakdown({ repos }: { repos: RepoCommits[] }) {
  if (repos.length === 0) {
    return (
      <div className="card text-[13px]" style={{ color: "var(--text-secondary)" }}>
        No commits in any repository today.
      </div>
    );
  }

  return (
    <section className="card p-0">
      <div className="border-b border-zinc-800 px-5 py-3">
        <h2 className="text-sm font-medium text-zinc-200">By repository</h2>
        <p className="text-xs text-zinc-500">
          Expand a repo to see all commits made today.
        </p>
      </div>
      <ul>
        {repos.map((repo) => (
          <RepoRow key={repo.nameWithOwner} repo={repo} />
        ))}
      </ul>
    </section>
  );
}

function RepoRow({ repo }: { repo: RepoCommits }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li style={{ borderBottom: "1px solid var(--border-separator)" }} className="last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors duration-100"
        style={{ color: "var(--text-primary)" }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "var(--bg-row-hover)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Chevron open={expanded} />
          <span className="truncate text-[13px]">{repo.nameWithOwner}</span>
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold text-accent">
          {repo.commitCount}
        </span>
      </button>
      {expanded && (
        <ul style={{ borderTop: "1px solid var(--border-separator)", background: "rgba(0,0,0,0.03)" }}>
          {repo.commits.map((commit) => (
            <CommitRow key={commit.sha} commit={commit} />
          ))}
        </ul>
      )}
    </li>
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
    <li>
      <div className="flex w-full items-start gap-3 px-5 py-2 text-left">
        <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">
          {commit.shortSha}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]" style={{ color: "var(--text-primary)" }}>
            {commit.message || "(no message)"}
          </span>
          {commit.isMerge && (
            <span
              className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                background: "var(--bg-control)",
                color: "var(--text-secondary)",
              }}
            >
              merge
            </span>
          )}
        </span>
        {time && (
          <span className="shrink-0 font-mono text-xs text-zinc-500 tabular-nums">{time}</span>
        )}
      </div>
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={`shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      style={{ color: "var(--text-tertiary)" }}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 2 7 5 3 8" />
    </svg>
  );
}
