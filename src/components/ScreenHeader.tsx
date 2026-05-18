import { ReactNode } from "react";
import { Icon } from "../lib/icons";

export function ScreenHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: "16px 20px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="chevron-left" size={16} />
      </button>
      <div className="t-h2" style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>
        {title}
      </div>
      {action}
    </div>
  );
}
