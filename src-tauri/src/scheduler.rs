use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration as StdDuration;

use chrono::{DateTime, Local, NaiveDate, NaiveTime, Timelike};
use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::gh::{self, ContributionsSnapshot};
use crate::tray;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub daily_goal: u32,
    pub only_non_merge_commits: bool,
    pub reminder_time: String,
    pub reminder_enabled: bool,
    pub goal_completed_enabled: bool,
    pub poll_interval_minutes: u32,
}

#[derive(Default, Debug)]
pub struct FiredFlags {
    pub date: Option<NaiveDate>,
    pub reminder: bool,
    pub goal_completed: bool,
}

#[derive(Default)]
pub struct SchedulerState {
    pub settings: Mutex<Option<Settings>>,
    pub last_snapshot: Mutex<Option<ContributionsSnapshot>>,
    pub fired: Mutex<FiredFlags>,
}

pub fn start(app: AppHandle, state: Arc<SchedulerState>) {
    std::thread::spawn(move || loop {
        tick(&app, &state);
        std::thread::sleep(StdDuration::from_secs(60));
    });
}

pub fn refresh_now(app: &AppHandle, state: &Arc<SchedulerState>) {
    let only_non_merge = state
        .settings
        .lock()
        .unwrap()
        .as_ref()
        .map(|s| s.only_non_merge_commits)
        .unwrap_or(false);
    if let Ok(snap) = gh::fetch(only_non_merge) {
        let daily_goal = state
            .settings
            .lock()
            .unwrap()
            .as_ref()
            .map(|s| s.daily_goal)
            .unwrap_or(1);
        tray::update_progress(app, snap.commit_count, daily_goal);
        *state.last_snapshot.lock().unwrap() = Some(snap);
    }
}

fn tick(app: &AppHandle, state: &SchedulerState) {
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

    let settings = match state.settings.lock().unwrap().clone() {
        Some(s) => s,
        None => return,
    };

    let needs_fetch = {
        let snap = state.last_snapshot.lock().unwrap();
        match snap.as_ref() {
            None => true,
            Some(s) => {
                if s.only_non_merge != settings.only_non_merge_commits {
                    true
                } else {
                    match DateTime::parse_from_rfc3339(&s.fetched_at) {
                        Ok(t) => {
                            let age = now
                                .signed_duration_since(t.with_timezone(&Local))
                                .num_minutes();
                            age >= settings.poll_interval_minutes.max(1) as i64
                        }
                        Err(_) => true,
                    }
                }
            }
        }
    };
    if needs_fetch {
        if let Ok(snap) = gh::fetch(settings.only_non_merge_commits) {
            tray::update_progress(app, snap.commit_count, settings.daily_goal);
            *state.last_snapshot.lock().unwrap() = Some(snap);
        }
    }

    let snapshot = state.last_snapshot.lock().unwrap().clone();
    let today_count = snapshot.as_ref().map(|s| s.commit_count).unwrap_or(0);
    let goal_met = today_count >= settings.daily_goal;
    let current_hour = now.hour();
    let current_minute = now.minute();

    if settings.reminder_enabled && !goal_met {
        if let Some((rh, rm)) = parse_time(&settings.reminder_time) {
            let mut fired = state.fired.lock().unwrap();
            let due = current_hour > rh || (current_hour == rh && current_minute >= rm);
            if !fired.reminder && due {
                fired.reminder = true;
                drop(fired);
                let remaining = settings.daily_goal - today_count;
                let body = format!(
                    "{remaining} more commit{} to hit today's goal.",
                    if remaining == 1 { "" } else { "s" }
                );
                send_notification(app, "Daily commit reminder", &body);
            }
        }
    }

    if settings.goal_completed_enabled && goal_met {
        let mut fired = state.fired.lock().unwrap();
        if !fired.goal_completed {
            fired.goal_completed = true;
            drop(fired);
            let goal = settings.daily_goal;
            let body = format!("You hit your daily commit goal ({today_count}/{goal}). Nice.");
            send_notification(app, "Goal complete", &body);
        }
    }
}

fn parse_time(s: &str) -> Option<(u32, u32)> {
    NaiveTime::parse_from_str(s, "%H:%M")
        .ok()
        .map(|t| (t.hour(), t.minute()))
}

fn send_notification(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}
