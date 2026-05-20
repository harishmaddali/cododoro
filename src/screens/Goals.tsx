import { Stepper, ToggleRow } from "../components/shared";
import { ScreenHeader } from "../components/ScreenHeader";
import { Config } from "../lib/types";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACCENTS = ["#39d878", "#3b82f6", "#a855f7", "#f5a524", "#ef4a4a"];

interface Props {
  config: Config;
  onConfigChange: (next: Config) => void;
  onBack: () => void;
}

export function GoalsScreen({ config, onConfigChange, onBack }: Props) {
  const set = (patch: Partial<Config>) =>
    onConfigChange({ ...config, ...patch });

  const filterItems: { id: keyof Config["filters"]; label: string }[] = [
    { id: "merge", label: "Merge commits" },
    { id: "docs", label: "Docs-only commits" },
    { id: "lock", label: "Lockfile bumps" },
    { id: "revert", label: "Reverts" },
    { id: "empty", label: "Empty / WIP commits" },
  ];

  const toggleDay = (d: string) =>
    set({
      streakDays: config.streakDays.includes(d)
        ? config.streakDays.filter((x) => x !== d)
        : [...config.streakDays, d],
    });

  return (
    <div className="screen">
      <ScreenHeader title="Goals" onBack={onBack} />

      <div style={{ padding: "8px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Daily commit goal
        </div>
        <div className="card">
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div
              className="t-mono"
              style={{
                fontSize: 64,
                fontWeight: 500,
                color: "var(--grass-4)",
                lineHeight: 1,
              }}
            >
              {config.dailyGoal}
            </div>
            <div className="t-small" style={{ marginTop: 6 }}>
              commits per day
            </div>
          </div>
          <Stepper
            value={config.dailyGoal}
            onChange={(v) => set({ dailyGoal: v })}
            min={1}
            max={9999}
          />
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Streak schedule
        </div>
        <div className="card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {ALL_DAYS.map((d) => {
              const on = config.streakDays.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  style={{
                    aspectRatio: "1/1.4",
                    borderRadius: 10,
                    background: on ? "rgba(57,216,120,0.1)" : "var(--bg-2)",
                    border:
                      "1px solid " + (on ? "rgba(57,216,120,0.35)" : "var(--line)"),
                    color: on ? "var(--grass-4)" : "var(--fg-2)",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ opacity: 0.7 }}>{d.toUpperCase()}</div>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: on ? "var(--grass-4)" : "var(--bg-3)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Commit filters
        </div>
        <div className="t-small" style={{ marginBottom: 12, paddingLeft: 4, fontSize: 12 }}>
          These don't count toward your goal.
        </div>
        {filterItems.map((it) => (
          <ToggleRow
            key={it.id}
            title={it.label}
            value={config.filters[it.id]}
            onChange={(v) => set({ filters: { ...config.filters, [it.id]: v } })}
          />
        ))}
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Appearance
        </div>
        <div className="card">
          <div className="t-small" style={{ marginBottom: 12 }}>
            Accent
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {ACCENTS.map((c) => {
              const on = config.accent.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => set({ accent: c })}
                  aria-label={c}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: c,
                    border: on
                      ? "2px solid #fff"
                      : "2px solid rgba(255,255,255,0.08)",
                    boxShadow: on ? `0 0 12px ${c}` : "none",
                  }}
                />
              );
            })}
          </div>
          <div style={{ height: 14 }} />
          <ToggleRow
            title="Show mascot"
            sub="A little buddy that reacts to your progress"
            value={config.showMascot}
            onChange={(v) => set({ showMascot: v })}
          />
        </div>
      </div>

      <div style={{ padding: "20px 20px 28px" }}>
        <button className="btn btn-secondary btn-block" onClick={onBack}>
          Done
        </button>
      </div>
    </div>
  );
}
