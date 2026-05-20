mod commands;
mod db;
mod gh;
mod scheduler;
mod state;
mod tray;

use std::sync::Arc;

use tauri::{Manager, WindowEvent};

use crate::db::Db;
use crate::state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::auth_status,
            commands::get_config,
            commands::save_config,
            commands::load_snapshot,
            commands::refresh,
            commands::send_test_notification,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .setup(move |app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("could not resolve app data directory");
            let db = Db::open(&data_dir.join("cododoro.db"))
                .expect("could not open the cododoro database");
            let state = Arc::new(AppState::new(db));
            app.manage(state.clone());

            tray::install(app.handle())?;
            scheduler::start(app.handle().clone(), state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
