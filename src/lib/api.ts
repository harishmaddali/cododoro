import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AppSnapshot, Config, GhStatus, RepoMeta } from "./types";

export function authStatus(): Promise<GhStatus> {
  return invoke<GhStatus>("auth_status");
}

export function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

export function saveConfig(config: Config): Promise<void> {
  return invoke<void>("save_config", { config });
}

export function loadSnapshot(): Promise<AppSnapshot | null> {
  return invoke<AppSnapshot | null>("load_snapshot");
}

export function refresh(): Promise<AppSnapshot> {
  return invoke<AppSnapshot>("refresh");
}

export function listRepos(): Promise<RepoMeta[]> {
  return invoke<RepoMeta[]>("list_repos");
}

export function notifyTest(): Promise<void> {
  return invoke<void>("send_test_notification");
}

export function openExternal(url: string): Promise<void> {
  return openUrl(url).catch(() => undefined);
}
