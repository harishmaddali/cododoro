import { ContributionsSnapshot, Settings } from "../lib/types";

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
              Today · {snapshot.date}
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">
              {todayCount}
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
    </div>
  );
}
