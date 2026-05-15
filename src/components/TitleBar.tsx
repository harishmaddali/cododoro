import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    getCurrentWindow().startDragging().catch(() => undefined);
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="flex h-[38px] flex-shrink-0 select-none items-center"
      style={{
        background: "var(--bg-titlebar)",
        borderBottom: "1px solid var(--border-separator)",
        paddingLeft: 88,
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
  );
}
