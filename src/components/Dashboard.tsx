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

  const todayCount = snapshot.today.commitCount;
  const goal = settings.dailyGoal;
  const progress = Math.min(100, Math.round((todayCount / Math.max(1, goal)) * 100));
  const remaining = Math.max(0, goal - todayCount);
  const goalMet = todayCount >= goal;

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Today · {snapshot.today.date}
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
            <span className="text-accent">Goal hit. Keep the streak alive tomorrow.</span>
          ) : (
            <>
              {remaining} more commit{remaining === 1 ? "" : "s"} to hit today's goal.
            </>
          )}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Current streak" value={`${snapshot.currentStreak} day${snapshot.currentStreak === 1 ? "" : "s"}`} />
        <Stat label="Longest streak" value={`${snapshot.longestStreak} day${snapshot.longestStreak === 1 ? "" : "s"}`} />
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-200">Last 90 days</h2>
          <p className="text-xs text-zinc-500">
            updated {new Date(snapshot.fetchedAt).toLocaleTimeString()}
          </p>
        </div>
        <Heatmap days={snapshot.last90Days} goal={goal} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Heatmap({ days, goal }: { days: { date: string; commitCount: number }[]; goal: number }) {
  const cells = [...days].reverse();
  return (
    <div className="mt-4 grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0,1fr))" }}>
      {cells.map((d) => {
        const ratio = goal > 0 ? Math.min(1, d.commitCount / goal) : 0;
        const bg =
          d.commitCount === 0
            ? "bg-zinc-800/70"
            : ratio < 0.34
              ? "bg-accent/30"
              : ratio < 0.67
                ? "bg-accent/60"
                : "bg-accent";
        return (
          <div
            key={d.date}
            className={`aspect-square rounded-sm ${bg}`}
            title={`${d.date}: ${d.commitCount} commit${d.commitCount === 1 ? "" : "s"}`}
          />
        );
      })}
    </div>
  );
}
