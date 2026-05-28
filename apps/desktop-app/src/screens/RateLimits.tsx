import { useCallback, useEffect, useState } from "react";
import { Icon } from "../lib/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { rateLimitStatus } from "../lib/api";
import { RateLimitStatus } from "../lib/types";

interface Props {
  onBack: () => void;
}

export function RateLimitsScreen({ onBack }: Props) {
  const [data, setData] = useState<RateLimitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await rateLimitStatus();
      setData(s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="screen">
      <ScreenHeader
        title="GitHub rate limits"
        onBack={onBack}
        action={
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              opacity: loading ? 0.55 : 1,
            }}
          >
            <Icon name="refresh" size={16} />
          </button>
        }
      />

      <div style={{ padding: "8px 20px 24px" }}>
        {loading && !data && (
          <div
            className="card"
            style={{ display: "grid", placeItems: "center", padding: 32, color: "var(--fg-2)" }}
          >
            <div className="t-small">Loading rate-limit status…</div>
          </div>
        )}

        {error && !loading && (
          <div
            className="card"
            style={{
              background: "var(--danger-soft)",
              border: "1px solid rgba(239,74,74,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)" }}>
              <Icon name="x" size={16} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>Couldn't fetch rate limits</div>
            </div>
            <div
              className="t-small"
              style={{ marginTop: 6, fontSize: 12, wordBreak: "break-word" }}
            >
              {error}
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 14, height: 40, fontSize: 13 }}
              onClick={load}
            >
              Try again
            </button>
          </div>
        )}

        {data && <RateLimitBody data={data} loading={loading} />}
      </div>
    </div>
  );
}

function RateLimitBody({ data, loading }: { data: RateLimitStatus; loading: boolean }) {
  const { login, limit, remaining, used, resetAt } = data;
  const ratio = limit > 0 ? remaining / limit : 0;
  const remainingColor =
    ratio < 0.1 ? "var(--danger)" : ratio < 0.5 ? "var(--warn)" : "var(--grass-4)";
  const usedPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const exhausted = remaining === 0 && limit > 0;

  return (
    <>
      <div
        className="card"
        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "var(--bg-3)",
            color: "var(--fg-1)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="github" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-small" style={{ fontSize: 11 }}>
            VIEWER
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              marginTop: 2,
              fontFamily: "var(--font-mono)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            @{login}
          </div>
        </div>
        {loading && <div className="t-small">Refreshing…</div>}
      </div>

      {exhausted && (
        <div
          className="card"
          style={{
            marginBottom: 14,
            background: "var(--danger-soft)",
            border: "1px solid rgba(239,74,74,0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)" }}>
            <Icon name="lock" size={16} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>You're rate limited</div>
          </div>
          <div className="t-small" style={{ marginTop: 6, fontSize: 12 }}>
            Resets {formatResetAbsolute(resetAt)} · {formatResetRelative(resetAt)}.
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="t-eyebrow">Remaining</div>
          <div className="t-small" style={{ fontSize: 11 }}>
            of {limit.toLocaleString()}
          </div>
        </div>
        <div
          className="t-mono"
          style={{
            fontSize: 48,
            fontWeight: 500,
            lineHeight: 1,
            marginTop: 8,
            color: remainingColor,
          }}
        >
          {remaining.toLocaleString()}
        </div>
        <div
          style={{
            marginTop: 14,
            height: 6,
            borderRadius: 999,
            background: "var(--bg-3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${usedPct}%`,
              height: "100%",
              background: remainingColor,
              transition: "width .4s cubic-bezier(.6,.1,.3,1)",
            }}
          />
        </div>
        <div
          className="t-small"
          style={{
            marginTop: 8,
            fontSize: 11,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{usedPct}% used</span>
          <span>{used.toLocaleString()} used</span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <StatCard label="Limit" value={limit.toLocaleString()} />
        <StatCard label="Used" value={used.toLocaleString()} />
      </div>

      <div className="card">
        <div className="t-eyebrow" style={{ marginBottom: 8 }}>
          Resets at
        </div>
        <div className="t-mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--fg-0)" }}>
          {formatResetAbsolute(resetAt)}
        </div>
        <div className="t-small" style={{ marginTop: 6, fontSize: 12 }}>
          {formatResetRelative(resetAt)}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="t-eyebrow" style={{ fontSize: 10.5 }}>
        {label}
      </div>
      <div
        className="t-mono"
        style={{ fontSize: 22, fontWeight: 500, marginTop: 6, color: "var(--fg-0)" }}
      >
        {value}
      </div>
    </div>
  );
}

function formatResetAbsolute(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatResetRelative(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "resets now";
  const totalSeconds = Math.round(diffMs / 1000);
  if (totalSeconds < 60) return `resets in ${totalSeconds}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `resets in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `resets in ${hours}h ${mins}m`;
}
