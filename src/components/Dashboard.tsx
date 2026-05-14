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
      <div className="card text-sm text-zinc-400">
        No data yet.{" "}
        <button className="text-accent hover:underline" onClick={onRefresh}>
          Try fetching now
        </button>
        .
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
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-baseline justify-between">
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
            className="btn-ghost"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full transition-all ${goalMet ? "bg-accent" : "bg-accent/70"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          {goalMet ? (
            <span className="text-accent">Goal hit. See you tomorrow.</span>
          ) : (
            <>
              {remaining} more commit{remaining === 1 ? "" : "s"} to hit today's goal.
            </>
          )}
        </p>
      </section>

      <section className="card text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <span>
            Counting{" "}
            {snapshot.onlyNonMerge ? "non-merge commits only" : "all commits"} authored by{" "}
            <span className="text-zinc-300">@{snapshot.login}</span> today (00:00–23:59 local).
          </span>
          <span>updated {fetchedAt.toLocaleTimeString()}</span>
        </div>
      </section>

      <RepoBreakdown repos={snapshot.repos} />
    </div>
  );
}

function RepoBreakdown({ repos }: { repos: RepoCommits[] }) {
  if (repos.length === 0) {
    return (
      <section className="card text-sm text-zinc-500">
        No commits found in any repository today.
      </section>
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
    <li className="border-b border-zinc-800 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition hover:bg-zinc-800/40"
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Chevron open={expanded} />
          <span className="truncate text-sm text-zinc-200">{repo.nameWithOwner}</span>
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold text-accent">
          {repo.commitCount}
        </span>
      </button>
      {expanded && (
        <ul className="border-t border-zinc-800/70 bg-zinc-950/40">
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
          <span className="block truncate text-sm text-zinc-200">
            {commit.message || "(no message)"}
          </span>
          {commit.isMerge && (
            <span className="mr-2 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
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
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="4 2 8 6 4 10" />
    </svg>
  );
}
