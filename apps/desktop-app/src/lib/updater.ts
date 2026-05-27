import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type AvailableUpdate = {
  version: string;
  body: string;
  install: () => Promise<void>;
};

export async function checkForUpdates(silent = false): Promise<AvailableUpdate | null> {
  try {
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
  } catch (e) {
    console.error("Failed to check for updates:", e);
    return null;
  }
}
