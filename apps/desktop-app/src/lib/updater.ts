import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates(silent = false): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      if (!silent) {
        console.log("No updates available");
      }
      return;
    }

    const shouldInstall = silent
      ? true
      : window.confirm(
          `A new version ${update.version} is available!\n\n${update.body ?? ""}\n\nWould you like to install it now?`,
        );

    if (!shouldInstall) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.error("Failed to check for updates:", e);
  }
}
