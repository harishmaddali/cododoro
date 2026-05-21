use std::sync::Arc;
use std::time::Duration as StdDuration;

use chrono::{DateTime, Local, NaiveTime, Timelike};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::gh;
use crate::state::{AppState, FiredFlags};
use crate::tray;

pub fn start(app: AppHandle, state: Arc<AppState>) {
    std::thread::spawn(move || loop {
        tick(&app, &state);
        std::thread::sleep(StdDuration::from_secs(60));
    });
}

pub fn refresh_now(app: &AppHandle, state: &Arc<AppState>) {
    let config = state.db.load_config();
    if let Ok(snap) = tauri::async_runtime::block_on(gh::build_snapshot(&config)) {
        if let Ok(value) = serde_json::to_value(&snap) {
            let _ = state.db.save_snapshot(&value);
        }
        tray::update_progress(app, snap.today_count, config.daily_goal);
        *state.last_snapshot.lock().unwrap() = Some(snap);
    }
}

fn tick(app: &AppHandle, state: &Arc<AppState>) {
    let now = Local::now();
    let today = now.date_naive();

    {
        let mut fired = state.fired.lock().unwrap();
        if fired.date != Some(today) {
            *fired = FiredFlags {
                date: Some(today),
                ..Default::default()
            };
        }
    }

    let config = state.db.load_config();
    if !config.onboarded {
        return;
    }

    let needs_fetch = {
        let snap = state.last_snapshot.lock().unwrap();
        match snap.as_ref() {
            None => true,
            Some(s) => match DateTime::parse_from_rfc3339(&s.fetched_at) {
                Ok(t) => {
                    now.signed_duration_since(t.with_timezone(&Local))
                        .num_minutes()
                        >= config.poll_interval_minutes.max(1) as i64
                }
                Err(_) => true,
            },
        }
    };
    if needs_fetch {
        refresh_now(app, state);
    }

    let snapshot = state.last_snapshot.lock().unwrap().clone();
    let Some(snap) = snapshot else {
        return;
    };
    let today_count = snap.today_count;
    let goal_met = today_count >= config.daily_goal;
    let hour = now.hour();
    let minute = now.minute();

    if config.nudges.morning && due(hour, minute, 8, 30) && claim(state, Slot::Reminder) {
        let remaining = config.daily_goal.saturating_sub(today_count);
        send(
            app,
            "Morning check-in",
            &format!("Today's target: {remaining} more commit{}.", plural(remaining)),
        );
    }

    if config.nudges.midday && due(hour, minute, 13, 0) && claim(state, Slot::Reminder) {
        send(
            app,
            "Midday check-in",
            &format!("{today_count}/{} so far — keep the rhythm.", config.daily_goal),
        );
    }

    if config.nudges.evening && !goal_met {
        if let Some((rh, rm)) = parse_time(&config.reminder_time) {
            if due(hour, minute, rh, rm) && claim(state, Slot::Reminder) {
                let remaining = config.daily_goal.saturating_sub(today_count);
                send(
                    app,
                    "Last-call nudge",
                    &format!(
                        "{remaining} more commit{} to hit today's goal.",
                        plural(remaining)
                    ),
                );
            }
        }
    }

    if config.nudges.streak_warn
        && hour >= 21
        && today_count == 0
        && snap.streak > 0
        && claim(state, Slot::StreakWarn)
    {
        send(
            app,
            "Streak about to break",
            &format!(
                "Commit before midnight to keep your {}-day streak alive.",
                snap.streak
            ),
        );
    }

    if config.nudges.milestone
        && goal_met
        && is_milestone(snap.streak)
        && claim(state, Slot::Milestone)
    {
        send(
            app,
            "Milestone hit",
            &format!("{}-day streak. Keep shipping.", snap.streak),
        );
    }
}

enum Slot {
    Reminder,
    StreakWarn,
    Milestone,
}

/// Returns true the first time a given notification slot is claimed for the
/// current day; subsequent calls return false until the daily reset.
fn claim(state: &Arc<AppState>, slot: Slot) -> bool {
    let mut fired = state.fired.lock().unwrap();
    let flag = match slot {
        Slot::Reminder => &mut fired.reminder,
        Slot::StreakWarn => &mut fired.streak_warn,
        Slot::Milestone => &mut fired.goal_completed,
    };
    if *flag {
        return false;
    }
    *flag = true;
    true
}

fn due(hour: u32, minute: u32, target_h: u32, target_m: u32) -> bool {
    hour > target_h || (hour == target_h && minute >= target_m)
}

fn is_milestone(streak: u32) -> bool {
    matches!(streak, 7 | 30 | 100 | 365)
}

fn plural(n: u32) -> &'static str {
    if n == 1 {
        ""
    } else {
        "s"
    }
}

fn parse_time(s: &str) -> Option<(u32, u32)> {
    NaiveTime::parse_from_str(s, "%H:%M")
        .ok()
        .map(|t| (t.hour(), t.minute()))
}

fn send(app: &AppHandle, title: &str, body: &str) {
    let _ = app.notification().builder().title(title).body(body).show();
}
