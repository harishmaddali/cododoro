import { useState } from "react";
import { Settings as SettingsType } from "../lib/types";
import { notifyTest } from "../lib/gh";

interface Props {
  settings: SettingsType;
  onChange: (next: SettingsType) => Promise<void> | void;
}

export function Settings({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false);

  const update = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Daily goal</h2>
          <p className="text-xs text-zinc-500">
            How many commits do you want to make per day?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={50}
            value={settings.dailyGoal}
            onChange={(e) =>
              update("dailyGoal", Math.max(1, Math.min(50, Number(e.target.value) || 1)))
            }
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">
            commit{settings.dailyGoal === 1 ? "" : "s"} per day
          </span>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Notifications</h2>
          <p className="text-xs text-zinc-500">
            Stay nudged toward your goal — the app must be running for these to fire.
          </p>
        </div>

        <Toggle
          label="Daily reminder"
          description="Ping me at a fixed time each day if I haven't met the goal."
          checked={settings.reminderEnabled}
          onChange={(v) => update("reminderEnabled", v)}
        >
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            Time
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(e) => update("reminderTime", e.target.value)}
              className="input w-32"
              disabled={!settings.reminderEnabled}
            />
          </label>
        </Toggle>

        <Toggle
          label="Streak-at-risk alert"
          description="Warn me late in the day if my streak is about to break."
          checked={settings.streakAtRiskEnabled}
          onChange={(v) => update("streakAtRiskEnabled", v)}
        >
          <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
            Trigger after
            <select
              className="input w-28"
              value={settings.streakAtRiskHour}
              onChange={(e) => update("streakAtRiskHour", Number(e.target.value))}
              disabled={!settings.streakAtRiskEnabled}
            >
              {Array.from({ length: 12 }, (_, i) => i + 12).map((h) => (
                <option key={h} value={h}>
                  {`${h.toString().padStart(2, "0")}:00`}
                </option>
              ))}
            </select>
          </label>
        </Toggle>

        <Toggle
          label="Goal-completed celebration"
          description="Cheer when I hit today's goal."
          checked={settings.goalCompletedEnabled}
          onChange={(v) => update("goalCompletedEnabled", v)}
        />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            Test a notification to verify OS permissions.
          </p>
          <button
            className="btn-ghost"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              try {
                await notifyTest();
              } finally {
                setTesting(false);
              }
            }}
          >
            {testing ? "Sending…" : "Send test"}
          </button>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Sync</h2>
          <p className="text-xs text-zinc-500">
            How often to re-query GitHub via the gh CLI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={120}
            value={settings.pollIntervalMinutes}
            onChange={(e) =>
              update(
                "pollIntervalMinutes",
                Math.max(1, Math.min(120, Number(e.target.value) || 1)),
              )
            }
            className="input w-24"
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  children,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-200">{label}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-zinc-100 transition ${checked ? "left-4" : "left-0.5"}`}
          />
        </button>
      </div>
      {children}
    </div>
  );
}
