import { useState } from "react";
import { Icon } from "../lib/icons";
import { Stepper, ToggleRow } from "./shared";
import { Config } from "../lib/types";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type NudgeChoice = "morning" | "midday" | "evening" | "none";

interface Props {
  initial: Config;
  onDone: (cfg: Config) => void;
}

export function Onboarding({ initial, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [streakDays, setStreakDays] = useState<string[]>(initial.streakDays);
  const [filters, setFilters] = useState(initial.filters);
  const [nudge, setNudge] = useState<NudgeChoice>("evening");

  const steps = ["goal", "schedule", "filters", "nudge"] as const;
  const total = steps.length;
  const current = steps[step];

  const finish = () => {
    onDone({
      ...initial,
      onboarded: true,
      dailyGoal,
      streakDays,
      filters,
      nudges: {
        morning: nudge === "morning",
        midday: nudge === "midday",
        evening: nudge === "evening",
        streakWarn: initial.nudges.streakWarn,
        milestone: initial.nudges.milestone,
      },
    });
  };

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "16px 20px 4px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : undefined)}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "var(--bg-2)",
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--line)",
            opacity: step === 0 ? 0.3 : 1,
          }}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <div
          style={{
            flex: 1,
            height: 4,
            background: "var(--bg-2)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${((step + 1) / total) * 100}%`,
              background: "var(--grass-4)",
              transition: "width .35s ease",
            }}
          />
        </div>
        <div
          className="t-mono"
          style={{ fontSize: 12, color: "var(--fg-2)", width: 28, textAlign: "right" }}
        >
          {step + 1}/{total}
        </div>
      </div>

      <div
        style={{ flex: 1, padding: "28px 24px 16px", display: "flex", flexDirection: "column" }}
        key={current}
      >
        <div className="fade-up" style={{ flex: 1 }}>
          {current === "goal" && <StepGoal value={dailyGoal} onChange={setDailyGoal} />}
          {current === "schedule" && <StepSchedule days={streakDays} onChange={setStreakDays} />}
          {current === "filters" && <StepFilters filters={filters} onChange={setFilters} />}
          {current === "nudge" && <StepNudge value={nudge} onChange={setNudge} />}
        </div>
      </div>

      <div style={{ padding: "0 24px 28px" }}>
        <button
          onClick={() => (step < total - 1 ? setStep(step + 1) : finish())}
          className="btn btn-primary btn-block"
        >
          {step < total - 1 ? "Continue" : "Start tracking"}
          <Icon name="arrow-right" size={16} stroke={2.5} />
        </button>
      </div>
    </div>
  );
}

function StepGoal({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
        01 · Daily goal
      </div>
      <h2 className="t-h1" style={{ margin: "10px 0 8px" }}>
        How many commits per day?
      </h2>
      <p className="t-body">
        Pick a rhythm you can hit on busy days too. You can change this anytime.
      </p>

      <div style={{ marginTop: 36, marginBottom: 28, display: "grid", placeItems: "center" }}>
        <div style={{ width: 220, height: 220, position: "relative" }}>
          <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="110" cy="110" r="100" stroke="#1a2129" strokeWidth="2" fill="none" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div
                className="t-mono"
                style={{ fontSize: 88, fontWeight: 500, lineHeight: 1, color: "var(--grass-4)" }}
              >
                {value}
              </div>
              <div className="t-small" style={{ marginTop: 8 }}>
                commits / day
              </div>
            </div>
          </div>
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2 - Math.PI / 2;
            const x = 110 + Math.cos(angle) * 100;
            const y = 110 + Math.sin(angle) * 100;
            const active = i < (value / 12) * 20;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - 3,
                  top: y - 3,
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: active ? "var(--grass-4)" : "var(--bg-3)",
                  boxShadow: active ? "0 0 6px var(--grass-glow)" : "none",
                  transition: "all .3s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      <Stepper value={value} onChange={onChange} min={1} max={9999} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, max-content)",
          gap: 8,
          marginTop: 18,
          justifyContent: "center",
        }}
      >
        {[30, 100, 1000, 5000].map((v, i) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="pill"
            style={{
              height: 30,
              padding: "0 14px",
              fontSize: 12,
              background: value === v ? "rgba(57,216,120,0.12)" : "var(--bg-2)",
              color: value === v ? "var(--grass-4)" : "var(--fg-1)",
              borderColor: value === v ? "rgba(57,216,120,0.3)" : "var(--line)",
              gridColumn: i === 3 ? "2" : undefined,
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepSchedule({ days, onChange }: { days: string[]; onChange: (d: string[]) => void }) {
  const toggle = (d: string) =>
    onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  return (
    <div>
      <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
        02 · Streak schedule
      </div>
      <h2 className="t-h1" style={{ margin: "10px 0 8px" }}>
        Which days count?
      </h2>
      <p className="t-body">Days you skip won't break the streak. Weekend warriors welcome.</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          marginTop: 32,
        }}
      >
        {ALL_DAYS.map((d) => {
          const on = days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              style={{
                aspectRatio: "1/1.4",
                borderRadius: 12,
                background: on ? "rgba(57,216,120,0.1)" : "var(--bg-2)",
                border: "1px solid " + (on ? "rgba(57,216,120,0.35)" : "var(--line)"),
                color: on ? "var(--grass-4)" : "var(--fg-1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all .15s ease",
              }}
            >
              <div className="t-mono" style={{ fontSize: 11, opacity: 0.7 }}>
                {d.toUpperCase()}
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: on ? "var(--grass-4)" : "var(--bg-3)",
                }}
              />
            </button>
          );
        })}
      </div>

      <div
        className="card"
        style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "flex-start" }}
      >
        <div style={{ color: "var(--grass-4)", marginTop: 2 }}>
          <Icon name="flame" size={18} />
        </div>
        <div className="t-small" style={{ color: "var(--fg-1)", lineHeight: 1.5 }}>
          Days outside your schedule are <span style={{ color: "var(--grass-4)" }}>free</span> —
          they never break the chain.
        </div>
      </div>
    </div>
  );
}

function StepFilters({
  filters,
  onChange,
}: {
  filters: Config["filters"];
  onChange: (f: Config["filters"]) => void;
}) {
  const items: { id: keyof Config["filters"]; label: string; sub: string }[] = [
    { id: "merge", label: "Merge commits", sub: "Anything with multiple parents" },
    { id: "docs", label: "Docs-only commits", sub: "Only .md / .rst / docs changes" },
    { id: "lock", label: "Lockfile bumps", sub: "package-lock, yarn.lock, Cargo.lock…" },
    { id: "revert", label: "Reverts", sub: "Commits that start with 'Revert'" },
    { id: "empty", label: "Empty / WIP", sub: "Empty or 'wip' messages" },
  ];
  return (
    <div>
      <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
        03 · What's a real commit?
      </div>
      <h2 className="t-h1" style={{ margin: "10px 0 8px" }}>
        Filter out the noise.
      </h2>
      <p className="t-body">These won't count toward your daily goal or break your streak.</p>

      <div style={{ marginTop: 22 }}>
        {items.map((it) => (
          <ToggleRow
            key={it.id}
            title={it.label}
            sub={it.sub}
            value={filters[it.id]}
            onChange={(v) => onChange({ ...filters, [it.id]: v })}
          />
        ))}
      </div>
    </div>
  );
}

function StepNudge({
  value,
  onChange,
}: {
  value: NudgeChoice;
  onChange: (v: NudgeChoice) => void;
}) {
  const opts: { id: NudgeChoice; title: string; sub: string; icon: any }[] = [
    { id: "morning", title: "Morning ping", sub: "08:30 — set intent for the day", icon: "zap" },
    { id: "midday", title: "Midday check-in", sub: "13:00 — gentle reminder", icon: "clock" },
    {
      id: "evening",
      title: "Last-call nudge",
      sub: "Evening — only if you're behind",
      icon: "bell",
    },
    {
      id: "none",
      title: "No notifications",
      sub: "Quiet mode — check the app yourself",
      icon: "lock",
    },
  ];
  return (
    <div>
      <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
        04 · Nudges
      </div>
      <h2 className="t-h1" style={{ margin: "10px 0 8px" }}>
        When should we tap you?
      </h2>
      <p className="t-body">Pick the moment you're most likely to act on it.</p>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {opts.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                background: on ? "rgba(57,216,120,0.06)" : "var(--bg-1)",
                border: "1px solid " + (on ? "rgba(57,216,120,0.35)" : "var(--line)"),
                borderRadius: 14,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: on ? "rgba(57,216,120,0.12)" : "var(--bg-3)",
                  color: on ? "var(--grass-4)" : "var(--fg-1)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name={o.icon} size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{o.title}</div>
                <div className="t-small" style={{ marginTop: 2 }}>
                  {o.sub}
                </div>
              </div>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: "1.5px solid " + (on ? "var(--grass-4)" : "var(--line-2)"),
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {on && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "var(--grass-4)",
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
