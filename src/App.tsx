import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Dashboard } from "./components/Dashboard";
import { Settings as SettingsView } from "./components/Settings";
import { Onboarding } from "./components/Onboarding";
import { loadSettings, saveSettings } from "./lib/store";
import { applySettings, checkGhStatus, fetchContributions } from "./lib/gh";
import {
  ContributionsSnapshot,
  defaultSettings,
  GhStatus,
  Settings,
  View,
} from "./lib/types";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ghStatus, setGhStatus] = useState<GhStatus | null>(null);
  const [snapshot, setSnapshot] = useState<ContributionsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshContributions = useCallback(async (onlyNonMerge: boolean) => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchContributions(onlyNonMerge);
      setSnapshot(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshGhStatus = useCallback(async () => {
    const status = await checkGhStatus();
    setGhStatus(status);
    return status;
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
      await applySettings(loaded).catch(() => undefined);
      const status = await refreshGhStatus();
      if (status.authenticated) {
        await refreshContributions(loaded.onlyNonMergeCommits);
      }
      setLoading(false);
    })();
  }, [refreshContributions, refreshGhStatus]);

  useEffect(() => {
    if (!ghStatus?.authenticated) return;
    const ms = Math.max(1, settings.pollIntervalMinutes) * 60_000;
    const interval = window.setInterval(() => {
      refreshContributions(settings.onlyNonMergeCommits);
    }, ms);
    return () => window.clearInterval(interval);
  }, [
    ghStatus?.authenticated,
    settings.pollIntervalMinutes,
    settings.onlyNonMergeCommits,
    refreshContributions,
  ]);

  useEffect(() => {
    if (!ghStatus?.authenticated) return;
    let unlisten: (() => void) | null = null;
    listen("tauri://focus", () => {
      refreshContributions(settings.onlyNonMergeCommits);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, [ghStatus?.authenticated, settings.onlyNonMergeCommits, refreshContributions]);

  const updateSettings = useCallback(
    async (next: Settings) => {
      const prevOnlyNonMerge = settings.onlyNonMergeCommits;
      setSettings(next);
      await saveSettings(next);
      await applySettings(next);
      if (
        next.onlyNonMergeCommits !== prevOnlyNonMerge &&
        ghStatus?.authenticated
      ) {
        await refreshContributions(next.onlyNonMergeCommits);
      }
    },
    [settings.onlyNonMergeCommits, ghStatus?.authenticated, refreshContributions],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!ghStatus?.authenticated) {
    return (
      <Onboarding
        status={ghStatus}
        onRecheck={async () => {
          const status = await refreshGhStatus();
          if (status.authenticated) {
            await refreshContributions(settings.onlyNonMergeCommits);
          }
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-accent" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Codeodoro</h1>
            <p className="text-xs text-zinc-500">
              {ghStatus.login ? `@${ghStatus.login}` : "Daily commit goal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {ghStatus.authenticated && (
            <div className="flex items-center gap-2 text-sm">
              <svg
                className="h-4 w-4 text-accent"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-zinc-200">@{ghStatus.login}</span>
            </div>
          )}
          <nav className="flex gap-1">
            <button
              className={`btn-ghost ${view === "dashboard" ? "text-zinc-100" : ""}`}
              onClick={() => setView("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`btn-ghost ${view === "settings" ? "text-zinc-100" : ""}`}
              onClick={() => setView("settings")}
            >
              Settings
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {view === "dashboard" && (
          <Dashboard
            snapshot={snapshot}
            settings={settings}
            refreshing={refreshing}
            onRefresh={() => refreshContributions(settings.onlyNonMergeCommits)}
          />
        )}
        {view === "settings" && (
          <SettingsView settings={settings} onChange={updateSettings} />
        )}
      </main>
    </div>
  );
}
