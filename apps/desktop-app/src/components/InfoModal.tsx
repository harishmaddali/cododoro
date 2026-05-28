import { useEffect } from "react";

interface Props {
  message: string;
  onDismiss: () => void;
}

export function InfoModal({ message, onDismiss }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        className="card fade-up"
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 22,
          background: "var(--bg-1)",
          boxShadow: "0 24px 60px -20px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--fg-0)",
            marginBottom: 18,
          }}
        >
          {message}
        </div>
        <button
          className="btn btn-primary"
          style={{ width: "100%", height: 44, fontSize: 14 }}
          onClick={onDismiss}
          autoFocus
        >
          OK
        </button>
      </div>
    </div>
  );
}
