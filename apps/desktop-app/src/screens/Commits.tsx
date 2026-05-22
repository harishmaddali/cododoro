import { Fragment } from "react";
import { Icon } from "../lib/icons";
import { ScreenHeader } from "../components/ScreenHeader";
import { CommitRow } from "./Home";
import { AppSnapshot } from "../lib/types";

interface Props {
  snapshot: AppSnapshot;
  onBack: () => void;
}

export function CommitsScreen({ snapshot, onBack }: Props) {
  const commits = snapshot.recentCommits;

  return (
    <div className="screen">
      <ScreenHeader title="Today's commits" onBack={onBack} />

      {commits.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "72px 32px",
            gap: 4,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              color: "var(--fg-3)",
              marginBottom: 12,
            }}
          >
            <Icon name="commit" size={24} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-1)" }}>
            No commits yet today
          </div>
          <div className="t-small" style={{ maxWidth: 240, lineHeight: 1.5 }}>
            Commits you push today will show up here.
          </div>
        </div>
      ) : (
        <div style={{ padding: "4px 20px 24px" }}>
          {commits.map((c, i, a) => (
            <Fragment key={c.sha}>
              <CommitRow commit={c} />
              {i < a.length - 1 && <div className="divider" style={{ marginLeft: 50 }} />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
