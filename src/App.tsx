import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Dashboard } from "./components/Dashboard";
import { Settings as SettingsView } from "./components/Settings";
import { Onboarding } from "./components/Onboarding";
import { loadSettings, saveSettings } from "./lib/store";
import { applySettings, checkGhStatus, fetchContributions } from "./lib/gh";
import { checkForUpdates } from "./lib/updater";
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
      checkForUpdates(true).catch(() => undefined);
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
      <div className="flex h-full items-center justify-center text-[13px] text-secondary">
        Loading…
      </div>
    );
  }

  if (!ghStatus?.authenticated) {
    return <Onboarding status={ghStatus} onRecheck={async () => {
      const status = await refreshGhStatus();
      if (status.authenticated) {
        await refreshContributions(settings.onlyNonMergeCommits);
      }
    }} />;
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Title bar — Telegram-style: solid strip at top with traffic lights and title.
          Entire bar is a drag region. */}
      <div
        data-tauri-drag-region
        className="flex items-center h-[38px] flex-shrink-0 select-none"
        style={{
          background: "var(--bg-titlebar)",
          borderBottom: "1px solid var(--border-separator)",
          paddingLeft: 88, // leave room for macOS traffic lights
          paddingRight: 12,
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <span
          data-tauri-drag-region
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Codeodoro
        </span>
      </div>

      {/* Sub-header — identity on left, tabs on right (below the title bar) */}
      <div className="flex items-center justify-between px-5 pt-3 pb-0 gap-4">
        <div className="flex items-center gap-2.5 flex-1 select-none">
          <div
            className="h-5 w-5 rounded"
            style={{ background: "var(--accent)" }}
          />
          <div>
            {ghStatus.login && (
              <p
                className="text-[12px] font-medium text-primary leading-tight"
              >
                @{ghStatus.login}
              </p>
            )}
            <p className="text-[11px] text-secondary leading-none mt-0.5">
              Daily commit tracker
            </p>
          </div>
        </div>

        {/* Right: segmented tab control */}
        <div
          className="flex gap-0.5 rounded-[8px] p-0.5 flex-shrink-0"
          style={{
            background: "rgba(120,120,128,0.14)",
          }}
        >
          {(["dashboard", "settings"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`mac-tab ${view === v ? "mac-tab-active" : ""}`}
              style={{ textTransform: "capitalize" }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-5 mt-3 h-px" style={{ background: "var(--border-separator)" }} />

      <main className="flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div
            className="mb-4 rounded-[8px] px-3 py-2 text-[13px]"
            style={{
              background: "rgba(255, 59, 48, 0.1)",
              border: "1px solid rgba(255, 59, 48, 0.2)",
              color: "rgb(255, 100, 90)",
            }}
          >
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
