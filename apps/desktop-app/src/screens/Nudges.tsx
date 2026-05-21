import { useState } from "react";
import { Icon } from "../lib/icons";
import { ToggleRow } from "../components/shared";
import { ScreenHeader } from "../components/ScreenHeader";
import { notifyTest } from "../lib/api";
import { Config } from "../lib/types";

interface Props {
  config: Config;
  onConfigChange: (next: Config) => void;
  onBack: () => void;
}

export function NudgesScreen({ config, onConfigChange, onBack }: Props) {
  const [testing, setTesting] = useState(false);
  const setNudge = (patch: Partial<Config["nudges"]>) =>
    onConfigChange({ ...config, nudges: { ...config.nudges, ...patch } });

  return (
    <div className="screen">
      <ScreenHeader title="Nudges" onBack={onBack} />

      <div style={{ padding: "8px 20px 0" }}>
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(57,216,120,0.08), rgba(57,216,120,0.02))",
            border: "1px solid rgba(57,216,120,0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(57,216,120,0.12)",
                color: "var(--grass-4)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="bell" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Stay on rhythm.</div>
              <div className="t-small" style={{ marginTop: 2, fontSize: 12 }}>
                Notifications fire while Cododoro is running.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Schedule
        </div>
        <ToggleRow
          icon="zap"
          title="Morning ping"
          sub="08:30 — set intent"
          value={config.nudges.morning}
          onChange={(v) => setNudge({ morning: v })}
        />
        <ToggleRow
          icon="clock"
          title="Midday check-in"
          sub="13:00 — gentle reminder"
          value={config.nudges.midday}
          onChange={(v) => setNudge({ midday: v })}
        />
        <ToggleRow
          icon="bell"
          title="Last-call nudge"
          sub={`${config.reminderTime} — only if behind`}
          value={config.nudges.evening}
          onChange={(v) => setNudge({ evening: v })}
        />
        {config.nudges.evening && (
          <div
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
            }}
          >
            <div className="t-small">Last-call time</div>
            <input
              type="time"
              value={config.reminderTime}
              onChange={(e) => onConfigChange({ ...config, reminderTime: e.target.value })}
              style={{
                background: "var(--bg-3)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                color: "var(--fg-0)",
                padding: "6px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
              }}
            />
          </div>
        )}
      </div>

      <div style={{ padding: "24px 20px 0" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Streak alerts
        </div>
        <ToggleRow
          icon="flame"
          title="Streak about to break"
          sub="After 21:00 if you're still at 0"
          value={config.nudges.streakWarn}
          onChange={(v) => setNudge({ streakWarn: v })}
        />
        <ToggleRow
          icon="trophy"
          title="Milestone hit"
          sub="7, 30, 100, 365 day marks"
          value={config.nudges.milestone}
          onChange={(v) => setNudge({ milestone: v })}
        />
      </div>

      <div style={{ padding: "28px 20px 28px" }}>
        <div className="t-eyebrow" style={{ marginBottom: 10 }}>
          Preview
        </div>
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "rgba(20,24,30,0.7)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: "var(--grass-4)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ width: 14, height: 14, position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gridTemplateRows: "repeat(3,1fr)",
                  gap: 1,
                }}
              >
                {[1, 1, 0, 1, 1, 1, 0, 1, 1].map((v, i) => (
                  <div
                    key={i}
                    style={{
                      background: v ? "#03130a" : "transparent",
                      borderRadius: 1,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>CODODORO</div>
              <div className="t-small" style={{ fontSize: 11 }}>
                now
              </div>
            </div>
            <div style={{ fontSize: 14, marginTop: 4, fontWeight: 500 }}>
              Keep your streak alive
            </div>
            <div className="t-small" style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.4 }}>
              A couple of commits before midnight does it.
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: 16 }}
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
          {testing ? "Sending…" : "Send a test notification"}
        </button>
      </div>
    </div>
  );
}
