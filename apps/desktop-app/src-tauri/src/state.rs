use std::sync::Mutex;

use chrono::NaiveDate;

use crate::db::Db;
use crate::gh::AppSnapshot;

#[derive(Default, Debug)]
pub struct FiredFlags {
    pub date: Option<NaiveDate>,
    pub reminder: bool,
    pub goal_completed: bool,
    pub streak_warn: bool,
}

pub struct AppState {
    pub db: Db,
    pub last_snapshot: Mutex<Option<AppSnapshot>>,
    pub fired: Mutex<FiredFlags>,
}

impl AppState {
    pub fn new(db: Db) -> Self {
        Self {
            db,
            last_snapshot: Mutex::new(None),
            fired: Mutex::new(FiredFlags::default()),
        }
    }
}
