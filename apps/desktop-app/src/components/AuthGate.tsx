import { ReactNode, useState } from "react";
import { Icon } from "../lib/icons";
import { Logo } from "./shared";
import { openExternal } from "../lib/api";
import { GhStatus } from "../lib/types";

interface Props {
  status: GhStatus | null;
  onRecheck: () => Promise<void>;
  onBack: () => void;
}

export function AuthGate({ status, onRecheck, onBack }: Props) {
  const [checking, setChecking] = useState(false);
  const needsInstall = status ? !status.installed : true;
  const needsAuth = !!status?.installed && !status.authenticated;

  const recheck = async () => {
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "16px 20px 4px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <Logo size={20} />
      </div>

      <div
        style={{
          flex: 1,
          padding: "24px 24px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="t-eyebrow" style={{ color: "var(--grass-4)" }}>
          Connect
        </div>
        <h1 className="t-h1" style={{ margin: "10px 0 8px" }}>
          Use the GitHub CLI
        </h1>
        <p className="t-body">
          Cododoro reads your commit activity through the local{" "}
          <span className="t-mono" style={{ color: "var(--fg-0)" }}>
            gh
          </span>{" "}
          tool — there's no separate sign-in.
        </p>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {needsInstall && (
            <StepCard
              n={1}
              title="Install the GitHub CLI"
              body={
                <>
                  Grab it from{" "}
                  <button
                    onClick={() => openExternal("https://cli.github.com")}
                    style={{ color: "var(--grass-4)", textDecoration: "underline" }}
                  >
                    cli.github.com
                  </button>
                  , then come back.
                </>
              }
            />
          )}
          <StepCard
            n={needsInstall ? 2 : 1}
            title="Authenticate"
            body={
              <>
                Run this once in your terminal:
                <pre
                  className="t-mono"
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-3)",
                    color: "var(--fg-0)",
                    fontSize: 13,
                  }}
                >
                  gh auth login
                </pre>
              </>
            }
          />
        </div>

        {status?.error && !needsInstall && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--danger-soft)",
              border: "1px solid rgba(239,74,74,0.25)",
              color: "var(--danger)",
              fontSize: 12,
            }}
          >
            {status.error}
          </div>
        )}
      </div>

      <div style={{ padding: "0 24px 28px" }}>
        <button onClick={recheck} disabled={checking} className="btn btn-primary btn-block">
          {checking ? (
            <Icon name="refresh" size={16} />
          ) : (
            <>
              {needsAuth ? "I've signed in" : "Re-check"}
              <Icon name="arrow-right" size={16} stroke={2.5} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: "rgba(57,216,120,0.12)",
          color: "var(--grass-4)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        <div className="t-small" style={{ marginTop: 4, lineHeight: 1.5 }}>
          {body}
        </div>
      </div>
    </div>
  );
}
