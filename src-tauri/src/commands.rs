use std::sync::Arc;

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::gh::{self, ContributionsSnapshot, GhStatus};
use crate::scheduler::{SchedulerState, Settings};
use crate::tray;

#[tauri::command]
pub fn check_gh_status() -> GhStatus {
    gh::check_status()
}

#[tauri::command]
pub fn fetch_contributions(
    app: AppHandle,
    state: tauri::State<'_, Arc<SchedulerState>>,
    only_non_merge: bool,
) -> Result<ContributionsSnapshot, String> {
    let snap = gh::fetch(only_non_merge)?;
    let goal = state
        .settings
        .lock()
        .unwrap()
        .as_ref()
        .map(|s| s.daily_goal)
        .unwrap_or(1);
    tray::update_progress(&app, snap.commit_count, goal);
    *state.last_snapshot.lock().unwrap() = Some(snap.clone());
    Ok(snap)
}

#[tauri::command]
pub fn apply_settings(
    app: AppHandle,
    state: tauri::State<'_, Arc<SchedulerState>>,
    settings: Settings,
) -> Result<(), String> {
    let goal = settings.daily_goal;
    *state.settings.lock().unwrap() = Some(settings);
    if let Some(snap) = state.last_snapshot.lock().unwrap().as_ref() {
        tray::update_progress(&app, snap.commit_count, goal);
    }
    Ok(())
}

#[tauri::command]
pub fn send_test_notification(app: AppHandle) -> Result<(), String> {
    app.notification()
        .builder()
        .title("Codeodoro")
        .body("Notifications are wired up correctly.")
        .show()
        .map_err(|e| e.to_string())
}
