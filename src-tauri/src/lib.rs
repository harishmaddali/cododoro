mod commands;
mod gh;
mod scheduler;
mod tray;

use std::sync::Arc;

use tauri::WindowEvent;

pub fn run() {
    let state = Arc::new(scheduler::SchedulerState::default());
    let scheduler_state = state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::check_gh_status,
            commands::fetch_contributions,
            commands::apply_settings,
            commands::send_test_notification,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .setup(move |app| {
            tray::install(app.handle())?;
            scheduler::start(app.handle().clone(), scheduler_state.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
