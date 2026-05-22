import { useLayoutEffect, useRef } from "react";
import { Icon } from "../lib/icons";
import { ContribGrid } from "../components/shared";
import { AppSnapshot, DayPoint } from "../lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  snapshot: AppSnapshot;
  days: DayPoint[];
}

export function CalendarScreen({ snapshot, days }: Props) {
  const { streak, longestStreak, longestRange, yearTotal, bestDay } = snapshot;
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Pad the heatmap one month past today so the upcoming month is visible.
  // Those days have no contributions yet, so they render as empty (level 0) cells.
  const heatmapDays: DayPoint[] = [...days];
  if (days.length > 0) {
    const windowEnd = new Date();
    windowEnd.setHours(0, 0, 0, 0);
    windowEnd.setMonth(windowEnd.getMonth() + 1);
    const cursor = new Date(heatmapDays[heatmapDays.length - 1].date);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= windowEnd) {
      heatmapDays.push({ date: new Date(cursor), count: 0, level: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const monthsTrack: { label: string; idx: number }[] = [];
  let lastMonth = -1;
  heatmapDays.forEach((d, i) => {
    if (d.date.getDate() <= 7 && d.date.getMonth() !== lastMonth) {
      monthsTrack.push({ label: MONTHS[d.date.getMonth()], idx: Math.floor(i / 7) });
      lastMonth = d.date.getMonth();
    }
  });

  const best = bestDay
    ? {
        label: new Date(bestDay.date + "T00:00:00").toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        count: bestDay.count,
      }
    : null;

  // Pin the heatmap to its right edge on mount so the most recent months
  // (including the one-month-ahead padding) are visible without scrolling.
  // useLayoutEffect + direct scrollLeft assignment lands the scroll before
  // paint, so the user never sees a left-aligned flash first.
  useLayoutEffect(() => {
    const el = heatmapRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, []);

  return (
    <div className="screen">
      <div style={{ padding: "16px 20px 4px" }}>
        <h1 className="t-h1">History</h1>
        <div className="t-small" style={{ marginTop: 4 }}>
          {yearTotal} contributions this year
        </div>
      </div>

      <div style={{ padding: "20px 20px 8px" }}>
        <div ref={heatmapRef} style={{ overflowX: "auto" }} className="hscroll-x">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              width: "max-content",
            }}
          >
            <div style={{ position: "relative", height: 14 }}>
              {monthsTrack.map((m, i) => (
                <div
                  key={i}
                  className="t-mono"
                  style={{
                    position: "absolute",
                    left: m.idx * (12 + 2),
                    fontSize: 10.5,
                    color: "var(--fg-2)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <ContribGrid days={heatmapDays} cellSize={12} gap={2} />
          </div>
        </div>
        <div
          style={{
            padding: "12px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
          }}
        >
          <span className="t-small" style={{ fontSize: 10.5 }}>
            Less
          </span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className="cell"
              data-l={l || undefined}
              style={{ width: 10, height: 10 }}
            />
          ))}
          <span className="t-small" style={{ fontSize: 10.5 }}>
            More
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "20px 20px 8px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Current
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div
              className="t-mono"
              style={{ fontSize: 32, fontWeight: 500, color: "var(--grass-4)" }}
            >
              {streak}
            </div>
            <div className="t-small">days</div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 3 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background:
                    i < Math.min(10, Math.floor(streak / 10)) ? "var(--grass-4)" : "var(--bg-3)",
                }}
              />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>
            Longest
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div className="t-mono" style={{ fontSize: 32, fontWeight: 500 }}>
              {longestStreak}
            </div>
            <div className="t-small">days</div>
          </div>
          <div className="t-small" style={{ marginTop: 12, fontSize: 11 }}>
            {longestRange || "—"}
          </div>
        </div>
      </div>

      {best && (
        <div style={{ padding: "10px 20px" }}>
          <div className="card" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(57,216,120,0.1)",
                border: "1px solid rgba(57,216,120,0.25)",
                display: "grid",
                placeItems: "center",
                color: "var(--grass-4)",
                flexShrink: 0,
              }}
            >
              <Icon name="trophy" size={20} stroke={1.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="t-small" style={{ fontSize: 11 }}>
                BEST DAY
              </div>
              <div style={{ fontSize: 15, marginTop: 2, fontWeight: 500 }}>
                {best.label} · {best.count} contributions
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "10px 20px 24px" }}>
        <div className="card">
          <div className="t-h3" style={{ marginBottom: 14 }}>
            Your pattern
          </div>
          <WeekdayPattern days={days} />
        </div>
      </div>
    </div>
  );
}

function WeekdayPattern({ days }: { days: DayPoint[] }) {
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  days.forEach((d) => {
    buckets[d.date.getDay()] += d.count;
  });
  const max = Math.max(...buckets, 1);
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80 }}>
      {buckets.map((b, i) => {
        const peak = b === max && b > 0;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              height: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${(b / max) * 100}%`,
                  background: peak ? "var(--grass-4)" : "var(--grass-2)",
                  borderRadius: 4,
                  boxShadow: peak ? "0 0 10px var(--grass-glow)" : "none",
                }}
              />
            </div>
            <div
              className="t-mono"
              style={{ fontSize: 10.5, color: peak ? "var(--grass-4)" : "var(--fg-3)" }}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
