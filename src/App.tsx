import { useCallback, useEffect, useState } from "react";
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

  const refreshContributions = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await fetchContributions();
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
        await refreshContributions();
      }
      setLoading(false);
    })();
  }, [refreshContributions, refreshGhStatus]);

  useEffect(() => {
    if (!ghStatus?.authenticated) return;
    const ms = Math.max(1, settings.pollIntervalMinutes) * 60_000;
    const interval = window.setInterval(() => {
      refreshContributions();
    }, ms);
    return () => window.clearInterval(interval);
  }, [ghStatus?.authenticated, settings.pollIntervalMinutes, refreshContributions]);

  const updateSettings = useCallback(async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
    await applySettings(next);
  }, []);

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
            await refreshContributions();
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
            onRefresh={refreshContributions}
          />
        )}
        {view === "settings" && (
          <SettingsView settings={settings} onChange={updateSettings} />
        )}
      </main>
    </div>
  );
}
