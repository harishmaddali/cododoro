import { useEffect, useState } from "react";
import { Icon } from "../lib/icons";
import { Logo } from "./shared";
import { GhStatus } from "../lib/types";

interface Props {
  status: GhStatus | null;
  onContinue: () => void;
  onNeedsAuth: () => void;
}

const SLIDES = [
  {
    title: "Ship every day.",
    sub: "Set commit goals and keep your streak alive — no shame, just rhythm.",
    art: "ring" as const,
  },
  {
    title: "Track by repo.",
    sub: "Decide which projects count. Side quests can have their own pace.",
    art: "repos" as const,
  },
  {
    title: "Quality > noise.",
    sub: "Filter out merge commits, docs, and lockfile churn. Real work only.",
    art: "filter" as const,
  },
];

export function Welcome({ status, onContinue, onNeedsAuth }: Props) {
  const [slide, setSlide] = useState(0);
  const authed = !!status?.authenticated;
  const advance = authed ? onContinue : onNeedsAuth;

  useEffect(() => {
    const t = setTimeout(() => setSlide((s) => (s + 1) % SLIDES.length), 4200);
    return () => clearTimeout(t);
  }, [slide]);

  const cur = SLIDES[slide];

  return (
    <div
      className="screen bg-grid"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div
        style={{
          padding: "20px 24px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo />
        <button onClick={advance} className="t-small" style={{ color: "var(--fg-1)" }}>
          Skip
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 28px",
        }}
      >
        <CarouselArt kind={cur.art} key={slide} />
        <div style={{ marginTop: 36 }} className="fade-up" key={"text-" + slide}>
          <h1 className="t-display" style={{ margin: 0 }}>
            {cur.title}
          </h1>
          <p className="t-body" style={{ marginTop: 12, fontSize: 15 }}>
            {cur.sub}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === slide ? 24 : 6,
                height: 6,
                borderRadius: 999,
                background: i === slide ? "var(--grass-4)" : "var(--line-2)",
                transition: "all .3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        {authed ? (
          <button
            onClick={onContinue}
            className="btn btn-block btn-primary"
            style={{ height: 56, borderRadius: 16, fontSize: 15 }}
          >
            <Avatar status={status} /> Continue as @{status!.login}
          </button>
        ) : (
          <button
            onClick={onNeedsAuth}
            className="btn btn-block"
            style={{
              background: "#0f1419",
              color: "var(--fg-0)",
              border: "1px solid var(--line-2)",
              height: 56,
              borderRadius: 16,
              fontSize: 15,
            }}
          >
            <Icon name="terminal" size={20} /> Connect GitHub CLI
          </button>
        )}
        <div
          className="t-small"
          style={{
            textAlign: "center",
            marginTop: 14,
            color: "var(--fg-3)",
            fontSize: 11,
          }}
        >
          {authed
            ? "Signed in via the GitHub CLI on this machine."
            : "Cododoro uses your local gh CLI — no separate login."}
        </div>
      </div>
    </div>
  );
}

function Avatar({ status }: { status: GhStatus | null }) {
  const [failed, setFailed] = useState(false);
  if (!status?.avatarUrl || failed) {
    return (
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "rgba(3,19,10,0.25)",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {status?.login?.slice(0, 1).toUpperCase() ?? "@"}
      </span>
    );
  }
  return (
    <img
      src={status.avatarUrl}
      alt=""
      width={22}
      height={22}
      onError={() => setFailed(true)}
      style={{ borderRadius: 999, objectFit: "cover" }}
    />
  );
}

function CarouselArt({ kind }: { kind: "ring" | "repos" | "filter" }) {
  if (kind === "ring") {
    return (
      <div
        style={{
          height: 240,
          position: "relative",
          display: "grid",
          placeItems: "center",
        }}
        className="fade-up"
      >
        <svg width="220" height="220" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r="90" stroke="#1a2129" strokeWidth="14" fill="none" />
          <circle
            cx="110"
            cy="110"
            r="90"
            stroke="var(--grass-4)"
            strokeWidth="14"
            fill="none"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * 0.18}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 12px var(--grass-glow))" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div
              className="t-mono"
              style={{ fontSize: 48, fontWeight: 500, lineHeight: 1 }}
            >
              4<span style={{ color: "var(--fg-3)" }}>/5</span>
            </div>
            <div
              className="t-small"
              style={{ marginTop: 6, color: "var(--grass-4)" }}
            >
              commits today
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (kind === "repos") {
    const repos = [
      { name: "core-engine", c: 4, t: 3 },
      { name: "design-system", c: 2, t: 2 },
      { name: "blog-rewrite", c: 0, t: 1 },
    ];
    return (
      <div
        className="fade-up"
        style={{
          height: 240,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {repos.map((r, i) => (
          <div
            key={i}
            className="card"
            style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}
          >
            <Icon name="repo" size={18} stroke={1.5} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
              <div
                style={{
                  height: 4,
                  marginTop: 8,
                  background: "var(--bg-3)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (r.c / r.t) * 100)}%`,
                    background: r.c >= r.t ? "var(--grass-4)" : "var(--grass-3)",
                  }}
                />
              </div>
            </div>
            <div
              className="t-mono"
              style={{
                fontSize: 13,
                color: r.c >= r.t ? "var(--grass-4)" : "var(--fg-1)",
              }}
            >
              {r.c}/{r.t}
            </div>
          </div>
        ))}
      </div>
    );
  }
  const filters = ["Merge commits", "Docs-only", "Lockfiles", "Reverts"];
  return (
    <div
      className="fade-up"
      style={{
        height: 240,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div className="card" style={{ padding: 18 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>
          Don't count
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filters.map((f) => (
            <div
              key={f}
              className="pill"
              style={{
                background: "var(--bg-3)",
                color: "var(--fg-1)",
                height: 30,
                fontSize: 13,
                padding: "0 12px",
              }}
            >
              <Icon name="x" size={12} /> {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
