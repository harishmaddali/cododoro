use std::sync::Arc;

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::gh::{self, ContributionsSnapshot, GhStatus};
use crate::scheduler::{SchedulerState, Settings};

#[tauri::command]
pub fn check_gh_status() -> GhStatus {
    gh::check_status()
}

#[tauri::command]
pub fn fetch_contributions(
    state: tauri::State<'_, Arc<SchedulerState>>,
) -> Result<ContributionsSnapshot, String> {
    let snap = gh::fetch()?;
    *state.last_snapshot.lock().unwrap() = Some(snap.clone());
    Ok(snap)
}

#[tauri::command]
pub fn apply_settings(
    state: tauri::State<'_, Arc<SchedulerState>>,
    settings: Settings,
) -> Result<(), String> {
    *state.settings.lock().unwrap() = Some(settings);
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
