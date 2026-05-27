use std::collections::BTreeMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

/// On-disk SQLite store. Holds the user's onboarding/goal configuration and a
/// cached copy of the last GitHub snapshot so the UI can paint instantly while
/// a fresh fetch runs in the background.
pub struct Db {
    conn: Mutex<Connection>,
}

const CONFIG_KEY: &str = "config";
const SNAPSHOT_KEY: &str = "snapshot";

impl Db {
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create data dir: {e}"))?;
        }
        let conn = Connection::open(path).map_err(|e| format!("failed to open database: {e}"))?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
            [],
        )
        .map_err(|e| format!("failed to init schema: {e}"))?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS commit_files_cache (
                repo TEXT NOT NULL,
                sha TEXT NOT NULL,
                files_json TEXT NOT NULL,
                cached_at INTEGER NOT NULL,
                PRIMARY KEY (repo, sha)
            )",
            [],
        )
        .map_err(|e| format!("failed to init commit cache schema: {e}"))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn get_raw(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT value FROM kv WHERE key = ?1", [key], |row| {
            row.get::<_, String>(0)
        })
        .map(Some)
        .or_else(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(format!("db read failed: {other}")),
        })
    }

    fn set_raw(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO kv (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
        )
        .map_err(|e| format!("db write failed: {e}"))?;
        Ok(())
    }

    fn get_json<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Result<Option<T>, String> {
        match self.get_raw(key)? {
            Some(raw) => serde_json::from_str(&raw)
                .map(Some)
                .map_err(|e| format!("corrupt {key} record: {e}")),
            None => Ok(None),
        }
    }

    fn set_json<T: Serialize>(&self, key: &str, value: &T) -> Result<(), String> {
        let raw = serde_json::to_string(value).map_err(|e| format!("serialize {key}: {e}"))?;
        self.set_raw(key, &raw)
    }

    pub fn load_config(&self) -> Config {
        match self.get_json::<Config>(CONFIG_KEY).ok().flatten() {
            Some(mut config) => {
                // One-shot bump of the legacy 30-minute poll default to 15. A stored value
                // of exactly 30 implies the user never customized it; any other value is
                // treated as an explicit choice and left alone. Safe to remove after a few
                // releases once the bulk of installs have rolled past this version.
                if config.poll_interval_minutes == 30 {
                    config.poll_interval_minutes = 15;
                    let _ = self.save_config(&config);
                }
                config
            }
            None => Config::default(),
        }
    }

    pub fn save_config(&self, config: &Config) -> Result<(), String> {
        self.set_json(CONFIG_KEY, config)
    }

    pub fn load_snapshot(&self) -> Option<serde_json::Value> {
        self.get_json(SNAPSHOT_KEY).ok().flatten()
    }

    pub fn save_snapshot(&self, snapshot: &serde_json::Value) -> Result<(), String> {
        self.set_json(SNAPSHOT_KEY, snapshot)
    }

    /// Look up cached file list for a previously fetched commit. Commits are
    /// immutable, so a hit here lets us skip the per-commit `/commits/{sha}`
    /// REST call entirely on re-refresh.
    pub fn get_cached_commit_files(
        &self,
        repo: &str,
        sha: &str,
    ) -> Result<Option<Vec<String>>, String> {
        let conn = self.conn.lock().unwrap();
        let row = conn.query_row(
            "SELECT files_json FROM commit_files_cache WHERE repo = ?1 AND sha = ?2",
            [repo, sha],
            |row| row.get::<_, String>(0),
        );
        match row {
            Ok(raw) => serde_json::from_str(&raw)
                .map(Some)
                .map_err(|e| format!("corrupt commit_files_cache row: {e}")),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(err) => Err(format!("db read failed: {err}")),
        }
    }

    pub fn put_cached_commit_files(
        &self,
        repo: &str,
        sha: &str,
        files: &[String],
    ) -> Result<(), String> {
        let raw =
            serde_json::to_string(files).map_err(|e| format!("serialize commit files: {e}"))?;
        let cached_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO commit_files_cache (repo, sha, files_json, cached_at)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(repo, sha) DO UPDATE SET
                files_json = excluded.files_json,
                cached_at = excluded.cached_at",
            rusqlite::params![repo, sha, raw, cached_at],
        )
        .map_err(|e| format!("db write failed: {e}"))?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Filters {
    pub merge: bool,
    pub docs: bool,
    pub lock: bool,
    pub revert: bool,
    pub empty: bool,
}

impl Default for Filters {
    fn default() -> Self {
        Self {
            merge: true,
            docs: true,
            lock: true,
            revert: false,
            empty: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Nudges {
    pub morning: bool,
    pub midday: bool,
    pub evening: bool,
    pub streak_warn: bool,
    pub milestone: bool,
}

impl Default for Nudges {
    fn default() -> Self {
        Self {
            morning: false,
            midday: false,
            evening: true,
            streak_warn: true,
            milestone: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub onboarded: bool,
    pub daily_goal: u32,
    pub streak_days: Vec<String>,
    /// repo "owner/name" -> optional per-repo daily goal override.
    pub repo_goals: BTreeMap<String, u32>,
    pub filters: Filters,
    pub nudges: Nudges,
    pub reminder_time: String,
    pub poll_interval_minutes: u32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            onboarded: false,
            daily_goal: 3,
            streak_days: ["Mon", "Tue", "Wed", "Thu", "Fri"]
                .iter()
                .map(|s| s.to_string())
                .collect(),
            repo_goals: BTreeMap::new(),
            filters: Filters::default(),
            nudges: Nudges::default(),
            reminder_time: "21:00".to_string(),
            poll_interval_minutes: 15,
        }
    }
}
