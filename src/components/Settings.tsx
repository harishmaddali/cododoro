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
    <div className="space-y-3 pb-4">
      {/* Daily goal */}
      <Section title="Daily goal" subtitle="How many commits do you want to make per day?">
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={50}
            value={settings.dailyGoal}
            onChange={(e) =>
              update("dailyGoal", Math.max(1, Math.min(50, Number(e.target.value) || 1)))
            }
            className="input"
            style={{ width: 72 }}
          />
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            commit{settings.dailyGoal === 1 ? "" : "s"} / day
          </span>
        </div>
      </Section>

      {/* Counting rules */}
      <Section title="Counting rules" subtitle="How commits authored by you are counted.">
        <Toggle
          label="Only non-merge commits"
          description="Skip commits with more than one parent."
          checked={settings.onlyNonMergeCommits}
          onChange={(v) => update("onlyNonMergeCommits", v)}
        />
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        subtitle="Nudges fired while the app is running."
      >
        <div className="space-y-2">
          <Toggle
            label="Daily reminder"
            description="Ping at a fixed time if goal not met."
            checked={settings.reminderEnabled}
            onChange={(v) => update("reminderEnabled", v)}
          >
            <label
              className="mt-2.5 flex items-center gap-2 text-[12px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Time
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => update("reminderTime", e.target.value)}
                className="input"
                style={{ width: 110 }}
                disabled={!settings.reminderEnabled}
              />
            </label>
          </Toggle>

          <Toggle
            label="Goal celebration"
            description="Cheer when daily goal is reached."
            checked={settings.goalCompletedEnabled}
            onChange={(v) => update("goalCompletedEnabled", v)}
          />

          <div
            className="flex items-center justify-between rounded-[8px] px-3 py-2.5"
            style={{
              background: "var(--bg-control)",
              border: "1px solid var(--border-card)",
            }}
          >
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Test OS notification permissions
            </p>
            <button
              className="btn-ghost"
              style={{ fontSize: 12, paddingTop: 4, paddingBottom: 4 }}
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
        </div>
      </Section>

      {/* Sync */}
      <Section
        title="Sync interval"
        subtitle="How often to re-query GitHub via the gh CLI."
      >
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
            className="input"
            style={{ width: 72 }}
          />
          <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            minutes
          </span>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-3">
      <div>
        <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </p>
      </div>
      {children}
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
    <div
      className="rounded-[8px] px-3 py-2.5"
      style={{
        background: "var(--bg-control)",
        border: "1px solid var(--border-card)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        </div>

        {/* macOS-style toggle */}
        <button
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className="relative shrink-0 mt-0.5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2"
          style={{
            width: 36,
            height: 21,
            background: checked ? "var(--accent)" : "var(--toggle-off)",
          }}
        >
          <span
            className="absolute rounded-full transition-all duration-200"
            style={{
              width: 17,
              height: 17,
              top: 2,
              left: checked ? 17 : 2,
              background: "var(--toggle-thumb)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>
      {children}
    </div>
  );
}
