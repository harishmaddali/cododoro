import { useState } from "react";
import { Icon } from "../lib/icons";
import type { AvailableUpdate } from "../lib/updater";

interface Props {
  update: AvailableUpdate;
  onDismiss: () => void;
}

export function UpdatePrompt({ update, onDismiss }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const install = async () => {
    setInstalling(true);
    setError(null);
    try {
      await update.install();
    } catch (e) {
      setError(String(e));
      setInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-prompt-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="card fade-up"
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 22,
          background: "var(--bg-1)",
          boxShadow: "0 24px 60px -20px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
          v{update.version}
        </div>
        <h2 id="update-prompt-title" className="t-h2" style={{ margin: "8px 0 12px" }}>
          Update available
        </h2>

        {update.body && (
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--fg-1)",
              marginBottom: 16,
            }}
          >
            {update.body}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: "var(--danger-soft)",
              border: "1px solid rgba(239, 74, 74, 0.25)",
              color: "var(--danger)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {installing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0 14px",
              color: "var(--fg-1)",
              fontSize: 13,
            }}
          >
            <span className="spin" style={{ display: "grid" }}>
              <Icon name="refresh" size={15} />
            </span>
            Installing update…
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, height: 44, fontSize: 14 }}
            onClick={onDismiss}
            disabled={installing}
          >
            Later
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, height: 44, fontSize: 14 }}
            onClick={install}
            disabled={installing}
          >
            Install now
          </button>
        </div>
      </div>
    </div>
  );
}
