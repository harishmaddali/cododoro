use std::sync::Arc;

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::gh::{self, AppSnapshot, GhStatus, RateLimitStatus};
use crate::state::AppState;
use crate::tray;

#[tauri::command]
pub async fn auth_status() -> GhStatus {
    gh::check_status().await
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, Arc<AppState>>) -> serde_json::Value {
    serde_json::to_value(state.db.load_config()).unwrap_or_default()
}

#[tauri::command]
pub fn save_config(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
    config: crate::db::Config,
) -> Result<(), String> {
    state.db.save_config(&config)?;
    if let Some(snap) = state.last_snapshot.lock().unwrap().as_ref() {
        tray::update_progress(&app, snap.today_count, config.daily_goal);
    }
    Ok(())
}

#[tauri::command]
pub fn load_snapshot(state: tauri::State<'_, Arc<AppState>>) -> Option<serde_json::Value> {
    state.db.load_snapshot()
}

#[tauri::command]
pub async fn refresh(
    app: AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<AppSnapshot, String> {
    let state = state.inner().clone();
    let config = state.db.load_config();
    let snap = gh::build_snapshot(&state.db, &config).await?;

    if let Ok(value) = serde_json::to_value(&snap) {
        let _ = state.db.save_snapshot(&value);
    }
    tray::update_progress(&app, snap.today_count, config.daily_goal);
    *state.last_snapshot.lock().unwrap() = Some(snap.clone());
    Ok(snap)
}

#[tauri::command]
pub async fn rate_limit_status() -> Result<RateLimitStatus, String> {
    gh::fetch_rate_limit_status().await
}

#[tauri::command]
pub fn send_test_notification(app: AppHandle) -> Result<(), String> {
    app.notification()
        .builder()
        .title("cododoro")
        .body("Notifications are wired up correctly.")
        .show()
        .map_err(|e| e.to_string())
}
