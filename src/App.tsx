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
import {
  authStatus,
  getConfig,
  listRepos,
  loadSnapshot,
  refresh as apiRefresh,
  saveConfig,
} from "./lib/api";
import { checkForUpdates } from "./lib/updater";
import {
  AppSnapshot,
  Config,
  defaultConfig,
  GhStatus,
  Overlay,
  RepoMeta,
  Stage,
  Tab,
  toDayPoints,
} from "./lib/types";

function shade(hex: string, percent: number): string {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return (
    "#" +
    [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(
    h.slice(2, 4),
    16,
  )}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
}

export default function App() {
  const [stage, setStage] = useState<Stage>("loading");
  const [tab, setTab] = useState<Tab>("home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [status, setStatus] = useState<GhStatus | null>(null);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [repos, setRepos] = useState<RepoMeta[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const saveTimer = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const dataSig = useRef<string>("");

  // Apply accent across the heatmap palette (mirrors the design's behaviour).
  useEffect(() => {
    const a = config.accent || "#39d878";
    const root = document.documentElement.style;
    root.setProperty("--grass-4", a);
    root.setProperty("--grass-glow", hexToRgba(a, 0.45));
    root.setProperty("--grass-3", shade(a, -28));
    root.setProperty("--grass-2", shade(a, -55));
    root.setProperty("--grass-1", shade(a, -75));
  }, [config.accent]);

  const doRefresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const run = (async () => {
      setRefreshing(true);
      setError(null);
      try {
        const snap = await apiRefresh();
        setSnapshot(snap);
        dataSig.current = JSON.stringify([
          config.filters,
          config.streakDays,
          config.dailyGoal,
        ]);
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

  const loadReposOnce = useCallback(async () => {
    setReposLoading(true);
    try {
      const r = await listRepos();
      setRepos(r);
    } catch {
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
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
      dataSig.current = JSON.stringify([
        cfg.filters,
        cfg.streakDays,
        cfg.dailyGoal,
      ]);

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

      const sig = JSON.stringify([
        next.filters,
        next.streakDays,
        next.dailyGoal,
      ]);
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
      loadReposOnce();
    }
  }, [config.onboarded, doRefresh, loadReposOnce]);

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
    body = (
      <Welcome
        status={status}
        onContinue={goForward}
        onNeedsAuth={() => setStage("auth")}
      />
    );
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
              loadReposOnce();
            }
          }
        }}
      />
    );
  } else if (stage === "onboarding") {
    body = (
      <Onboarding
        repos={repos}
        reposLoading={reposLoading}
        initial={config}
        onDone={finishOnboarding}
      />
    );
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
            {refreshing
              ? "Fetching your commit activity…"
              : error || "No data yet."}
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
      <GoalsScreen
        config={config}
        onConfigChange={applyConfig}
        onBack={() => setOverlay(null)}
      />
    );
  } else if (overlay?.type === "nudges") {
    body = (
      <NudgesScreen
        config={config}
        onConfigChange={applyConfig}
        onBack={() => setOverlay(null)}
      />
    );
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
            onOpenNudges={() => setOverlay({ type: "nudges" })}
            onOpenCalendar={() => setTab("calendar")}
          />
        )}
        {tab === "repos" && (
          <ReposScreen
            snapshot={snapshot}
            days={days}
            onOpenRepo={(id) => setOverlay({ type: "repo", id })}
          />
        )}
        {tab === "calendar" && (
          <CalendarScreen snapshot={snapshot} days={days} />
        )}
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
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {body}
      </div>
      {showTabs && <TabBar tab={tab} onTab={setTab} />}
    </div>
  );
}
