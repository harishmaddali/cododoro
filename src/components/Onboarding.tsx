import { useState } from "react";
import { GhStatus } from "../lib/types";

interface Props {
  status: GhStatus | null;
  onRecheck: () => Promise<void>;
}

export function Onboarding({ status, onRecheck }: Props) {
  const [checking, setChecking] = useState(false);

  const handleRecheck = async () => {
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
    }
  };

  const needsInstall = status && !status.installed;
  const needsAuth = status?.installed && !status.authenticated;

  return (
    <div
      className="flex h-full flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Traffic light spacer */}
      <div style={{ height: 52 }} />

      <div className="card w-full" style={{ maxWidth: 420 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-9 w-9 rounded-[8px] flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Welcome to Codeodoro
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Daily commit goals, powered by the gh CLI
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5">
          {needsInstall && (
            <Step
              step={1}
              title="Install the GitHub CLI"
              body={
                <>
                  Codeodoro talks to GitHub through the{" "}
                  <code
                    className="rounded px-1 py-0.5 text-[12px] font-mono"
                    style={{ background: "var(--bg-code)", color: "var(--text-primary)" }}
                  >
                    gh
                  </code>{" "}
                  command. Install it at{" "}
                  <a
                    href="https://cli.github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    cli.github.com
                  </a>
                  , then return here.
                </>
              }
            />
          )}

          {needsAuth && (
            <Step
              step={needsInstall ? 2 : 1}
              title="Sign in with gh"
              body={
                <>
                  Run this in your terminal:
                  <pre
                    className="mt-2 rounded-[6px] px-3 py-2.5 text-[12px] font-mono"
                    style={{
                      background: "var(--bg-code)",
                      color: "var(--text-primary)",
                    }}
                  >
                    gh auth login
                  </pre>
                  Then click <em>Re-check</em> below.
                </>
              }
            />
          )}
        </div>

        {status?.error && (
          <p className="mt-3 text-[12px]" style={{ color: "rgb(255, 100, 90)" }}>
            {status.error}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button className="btn-primary" onClick={handleRecheck} disabled={checking}>
            {checking ? "Checking…" : "Re-check"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  step,
  title,
  body,
}: {
  step: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-3 rounded-[8px] px-3 py-3"
      style={{
        background: "var(--bg-control)",
        border: "1px solid var(--border-card)",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
        style={{
          width: 20,
          height: 20,
          marginTop: 1,
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        {step}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="text-[12px] mt-1 leading-[18px]" style={{ color: "var(--text-secondary)" }}>
          {body}
        </p>
      </div>
    </div>
  );
}
