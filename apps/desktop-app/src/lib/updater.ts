import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type AvailableUpdate = {
  version: string;
  body: string;
  install: () => Promise<void>;
};

// Returns the available update, or `null` when the app is already on the
// latest version. Throws on transport / backend errors so the caller can
// surface that distinct state (e.g. a manual "Check for updates" button
// needs to tell the user the check actually failed, not that no update
// is available).
export async function checkForUpdates(silent = false): Promise<AvailableUpdate | null> {
  const update = await check();
  if (!update) {
    if (!silent) console.log("No updates available");
    return null;
  }

  const install = async () => {
    await update.downloadAndInstall();
    await relaunch();
  };

  if (silent) {
    await install();
    return null;
  }

  return {
    version: update.version,
    body: update.body ?? "",
    install,
  };
}
