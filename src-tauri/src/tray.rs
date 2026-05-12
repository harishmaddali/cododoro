use std::sync::Arc;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::scheduler::{self, SchedulerState};

pub const TRAY_ID: &str = "codeodoro-tray";

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Codeodoro", true, None::<&str>)?;
    let refresh = MenuItem::with_id(app, "refresh", "Refresh now", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &refresh, &quit])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("default window icon".into()))?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .menu(&menu)
        .tooltip("Codeodoro")
        .title("—")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "refresh" => {
                let app = app.clone();
                std::thread::spawn(move || {
                    if let Some(state) = app.try_state::<Arc<SchedulerState>>() {
                        scheduler::refresh_now(&app, state.inner());
                    }
                });
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

pub fn update_progress(app: &AppHandle, count: u32, goal: u32) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let met = count >= goal;
        let title = if met {
            format!("✓ {count}/{goal}")
        } else {
            format!("{count}/{goal}")
        };
        let tooltip = format!("Codeodoro · {count}/{goal} commits today");
        let _ = tray.set_title(Some(title));
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
