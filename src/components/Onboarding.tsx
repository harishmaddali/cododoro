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
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6">
      <div className="card w-full">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-accent" />
          <div>
            <h1 className="text-base font-semibold">Welcome to Codeodoro</h1>
            <p className="text-xs text-zinc-500">
              Daily commit goals, powered by your local gh CLI.
            </p>
          </div>
        </div>

        {needsInstall && (
          <Step
            title="Install the GitHub CLI"
            body={
              <>
                Codeodoro talks to GitHub through the{" "}
                <code className="rounded bg-zinc-800 px-1 py-0.5">gh</code> command
                installed on your machine. Install it from{" "}
                <a
                  href="https://cli.github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  cli.github.com
                </a>
                , then come back here.
              </>
            }
          />
        )}

        {needsAuth && (
          <Step
            title="Sign in with gh"
            body={
              <>
                Run this in your terminal:
                <pre className="mt-2 rounded-md bg-zinc-950 p-3 text-xs text-zinc-300">
                  gh auth login
                </pre>
                Once you're logged in, click <em>Re-check</em> below.
              </>
            }
          />
        )}

        {status?.error && (
          <p className="mt-3 text-xs text-red-400">{status.error}</p>
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

function Step({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 p-4">
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </div>
  );
}
