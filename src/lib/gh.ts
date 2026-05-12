import { invoke } from "@tauri-apps/api/core";
import { ContributionsSnapshot, GhStatus, Settings } from "./types";

export async function checkGhStatus(): Promise<GhStatus> {
  return invoke<GhStatus>("check_gh_status");
}

export async function fetchContributions(
  onlyNonMerge: boolean,
): Promise<ContributionsSnapshot> {
  return invoke<ContributionsSnapshot>("fetch_contributions", {
    onlyNonMerge,
  });
}

export async function applySettings(settings: Settings): Promise<void> {
  return invoke<void>("apply_settings", { settings });
}

export async function notifyTest(): Promise<void> {
  return invoke<void>("send_test_notification");
}
