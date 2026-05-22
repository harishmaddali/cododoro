import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Welcome } from "./components/Welcome";
import { AuthGate } from "./components/AuthGate";
import { Onboarding } from "./components/Onboarding";
import { TopBar, TabBar } from "./components/shared";
import { Home } from "./screens/Home";
import { ReposScreen } from "./screens/Repos";
import { CalendarScreen } from "./screens/History";
import { ProfileScreen } from "./screens/Profile";
import { RepoDetail } from "./screens/RepoDetail";
import { GoalsScreen } from "./screens/Goals";
import { NudgesScreen } from "./screens/Nudges";
import { CommitsScreen } from "./screens/Commits";
import { authStatus, getConfig, loadSnapshot, refresh as apiRefresh, saveConfig } from "./lib/api";
import { checkForUpdates } from "./lib/updater";
import {
  AppSnapshot,
  Config,
  defaultConfig,
  GhStatus,
  Overlay,
  Stage,
  Tab,
  toDayPoints,
} from "./lib/types";

export default function App() {
  const [stage, setStage] = useState<Stage>("loading");
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [status, setStatus] = useState<GhStatus | null>(null);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const saveTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const dataSig = useRef<string>("");

  const doRefresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const run = (async () => {
      setRefreshing(true);
      setError(null);
      try {
        const snap = await apiRefresh();
        setSnapshot(snap);
        dataSig.current = JSON.stringify([config.filters, config.streakDays, config.dailyGoal]);
      } catch (e) {
        setError(String(e));
      } finally {
        setRefreshing(false);
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = run;
    return run;
  }, [config.filters, config.streakDays, config.dailyGoal]);

  const recheckStatus = useCallback(async () => {
    const s = await authStatus();
    setStatus(s);
    return s;
  }, []);

  // Boot
  useEffect(() => {
    (async () => {
      const [cfg, st, cached] = await Promise.all([
        getConfig().catch(() => defaultConfig),
        authStatus().catch(
          () =>
            ({
              installed: false,
              authenticated: false,
              login: null,
              name: null,
              avatarUrl: null,
              error: "gh CLI unavailable",
            }) as GhStatus,
        ),
        loadSnapshot().catch(() => null),
      ]);
      setConfig(cfg);
      setStatus(st);
      if (cached) setSnapshot(cached);
      dataSig.current = JSON.stringify([cfg.filters, cfg.streakDays, cfg.dailyGoal]);

      if (st.authenticated && cfg.onboarded) {
        setStage("app");
        doRefresh();
      } else {
        setStage("welcome");
      }
      checkForUpdates(true).catch(() => undefined);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background refresh while in the app
  useEffect(() => {
    if (stage !== "app" || !status?.authenticated) return;
    const ms = Math.max(1, config.pollIntervalMinutes) * 60_000;
    const id = window.setInterval(() => doRefresh(), ms);
    return () => window.clearInterval(id);
  }, [stage, status?.authenticated, config.pollIntervalMinutes, doRefresh]);

  useEffect(() => {
    if (stage !== "app" || !status?.authenticated) return;
    let unlisten: (() => void) | null = null;
    listen("tauri://focus", () => doRefresh())
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, [stage, status?.authenticated, doRefresh]);

  const applyConfig = useCallback(
    (next: Config) => {
      setConfig(next);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveConfig(next).catch((e) => setError(String(e)));
      }, 400);

      const sig = JSON.stringify([next.filters, next.streakDays, next.dailyGoal]);
      if (sig !== dataSig.current) {
        if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(() => doRefresh(), 900);
      }
    },
    [doRefresh],
  );

  const goForward = useCallback(async () => {
    if (config.onboarded) {
      setStage("app");
      doRefresh();
    } else {
      setStage("onboarding");
    }
  }, [config.onboarded, doRefresh]);

  const finishOnboarding = useCallback(
    async (cfg: Config) => {
      setConfig(cfg);
      try {
        await saveConfig(cfg);
      } catch (e) {
        setError(String(e));
      }
      setStage("app");
      setTab("home");
      doRefresh();
    },
    [doRefresh],
  );

  const resetAccount = useCallback(async () => {
    const next = { ...config, onboarded: false };
    setConfig(next);
    await saveConfig(next).catch(() => undefined);
    setSnapshot(null);
    setOverlay(null);
    setTab("home");
    setStage("welcome");
  }, [config]);

  const days = snapshot ? toDayPoints(snapshot.days) : [];

  let body: React.ReactNode;
  if (stage === "loading") {
    body = (
      <div
        className="screen"
        style={{ display: "grid", placeItems: "center", color: "var(--fg-2)" }}
      >
        <div className="t-small">Loading…</div>
      </div>
    );
  } else if (stage === "welcome") {
    body = <Welcome status={status} onContinue={goForward} onNeedsAuth={() => setStage("auth")} />;
  } else if (stage === "auth") {
    body = (
      <AuthGate
        status={status}
        onBack={() => setStage("welcome")}
        onRecheck={async () => {
          const s = await recheckStatus();
          if (s.authenticated) {
            if (config.onboarded) {
              setStage("app");
              doRefresh();
            } else {
              setStage("onboarding");
            }
          }
        }}
      />
    );
  } else if (stage === "onboarding") {
    body = <Onboarding initial={config} onDone={finishOnboarding} />;
  } else if (!snapshot) {
    body = (
      <div
        className="screen"
        style={{
          display: "grid",
          placeItems: "center",
          color: "var(--fg-2)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <div className="t-small" style={{ marginBottom: 12 }}>
            {refreshing ? "Fetching your commit activity…" : error || "No data yet."}
          </div>
          {!refreshing && (
            <button className="btn btn-primary" onClick={() => doRefresh()}>
              Fetch now
            </button>
          )}
        </div>
      </div>
    );
  } else if (overlay?.type === "repo") {
    body = (
      <RepoDetail
        repoId={overlay.id}
        snapshot={snapshot}
        days={days}
        config={config}
        onConfigChange={applyConfig}
        onBack={() => setOverlay(null)}
      />
    );
  } else if (overlay?.type === "goals") {
    body = (
      <GoalsScreen config={config} onConfigChange={applyConfig} onBack={() => setOverlay(null)} />
    );
  } else if (overlay?.type === "nudges") {
    body = (
      <NudgesScreen config={config} onConfigChange={applyConfig} onBack={() => setOverlay(null)} />
    );
  } else if (overlay?.type === "commits") {
    body = <CommitsScreen snapshot={snapshot} onBack={() => setOverlay(null)} />;
  } else {
    body = (
      <>
        {tab === "home" && (
          <Home
            snapshot={snapshot}
            days={days}
            config={config}
            refreshing={refreshing}
            onRefresh={() => doRefresh()}
            onOpenRepo={(id) => setOverlay({ type: "repo", id })}
            onOpenCalendar={() => setTab("calendar")}
            onOpenCommits={() => setOverlay({ type: "commits" })}
          />
        )}
        {tab === "repos" && (
          <ReposScreen
            snapshot={snapshot}
            days={days}
            onOpenRepo={(id) => setOverlay({ type: "repo", id })}
          />
        )}
        {tab === "calendar" && <CalendarScreen snapshot={snapshot} days={days} />}
        {tab === "profile" && (
          <ProfileScreen
            snapshot={snapshot}
            config={config}
            onOpenGoals={() => setOverlay({ type: "goals" })}
            onOpenNudges={() => setOverlay({ type: "nudges" })}
            onReset={resetAccount}
          />
        )}
      </>
    );
  }

  const showTabs = stage === "app" && !!snapshot && !overlay;

  return (
    <div className="app">
      <TopBar />
      {error && stage === "app" && snapshot && (
        <div
          style={{
            margin: "8px 16px 0",
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--danger-soft)",
            border: "1px solid rgba(239,74,74,0.25)",
            color: "var(--danger)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body}</div>
      {showTabs && <TabBar tab={tab} onTab={setTab} />}
    </div>
  );
}
