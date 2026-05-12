mod commands;
mod gh;
mod scheduler;

use std::sync::Arc;

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
        .setup(move |app| {
            let handle = app.handle().clone();
            scheduler::start(handle, scheduler_state.clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
