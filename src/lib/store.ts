import { load, Store } from "@tauri-apps/plugin-store";
import { defaultSettings, Settings } from "./types";

const STORE_FILE = "settings.json";
const SETTINGS_KEY = "settings";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE);
  }
  return storePromise;
}

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const stored = await store.get<Partial<Settings>>(SETTINGS_KEY);
  return {
    ...defaultSettings,
    ...(stored ?? {}),
    onlyNonMergeCommits: true,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const store = await getStore();
  await store.set(SETTINGS_KEY, {
    ...settings,
    onlyNonMergeCommits: true,
  });
  await store.save();
}
