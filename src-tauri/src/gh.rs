use std::process::Command;

use chrono::{Local, TimeZone, Utc};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct GhStatus {
    pub installed: bool,
    pub authenticated: bool,
    pub login: Option<String>,
    pub error: Option<String>,
}

pub fn check_status() -> GhStatus {
    let version = Command::new("gh").arg("--version").output();
    let installed = matches!(&version, Ok(out) if out.status.success());
    if !installed {
        return GhStatus {
            installed: false,
            authenticated: false,
            login: None,
            error: Some("gh CLI not found on PATH".into()),
        };
    }

    let auth = Command::new("gh")
        .args(["api", "user", "--jq", ".login"])
        .output();

    match auth {
        Ok(out) if out.status.success() => {
            let login = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if login.is_empty() {
                GhStatus {
                    installed: true,
                    authenticated: false,
                    login: None,
                    error: Some("gh returned empty login".into()),
                }
            } else {
                GhStatus {
                    installed: true,
                    authenticated: true,
                    login: Some(login),
                    error: None,
                }
            }
        }
        Ok(out) => GhStatus {
            installed: true,
            authenticated: false,
            login: None,
            error: Some(String::from_utf8_lossy(&out.stderr).trim().to_string()),
        },
        Err(e) => GhStatus {
            installed: true,
            authenticated: false,
            login: None,
            error: Some(format!("gh invocation failed: {e}")),
        },
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct ContributionsSnapshot {
    pub login: String,
    pub date: String,
    #[serde(rename = "commitCount")]
    pub commit_count: u32,
    #[serde(rename = "onlyNonMerge")]
    pub only_non_merge: bool,
    #[serde(rename = "fetchedAt")]
    pub fetched_at: String,
}

const SAFETY_PAGE_CAP: u32 = 10;
const PAGE_SIZE: u32 = 100;

pub fn fetch(only_non_merge: bool) -> Result<ContributionsSnapshot, String> {
    let login = fetch_login()?;

    let now_local = Local::now();
    let today = now_local.date_naive();
    let start_local = Local
        .from_local_datetime(&today.and_hms_opt(0, 0, 0).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local start of day".to_string())?;
    let end_local = Local
        .from_local_datetime(&today.and_hms_opt(23, 59, 59).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local end of day".to_string())?;
    let start_utc = start_local
        .with_timezone(&Utc)
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();
    let end_utc = end_local
        .with_timezone(&Utc)
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();

    let query = format!("author:{login} author-date:{start_utc}..{end_utc}");

    let first = search_commits(&query, 1)?;
    let total = first["total_count"].as_u64().unwrap_or(0) as u32;

    let count = if !only_non_merge {
        total
    } else {
        let mut filtered = count_non_merge(&first);
        let pages = total.div_ceil(PAGE_SIZE).min(SAFETY_PAGE_CAP);
        for page in 2..=pages {
            let json = search_commits(&query, page)?;
            filtered += count_non_merge(&json);
        }
        filtered
    };

    Ok(ContributionsSnapshot {
        login,
        date: today.format("%Y-%m-%d").to_string(),
        commit_count: count,
        only_non_merge,
        fetched_at: now_local.to_rfc3339(),
    })
}

fn fetch_login() -> Result<String, String> {
    let out = Command::new("gh")
        .args(["api", "user", "--jq", ".login"])
        .output()
        .map_err(|e| format!("failed to invoke gh: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "gh auth failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    let login = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if login.is_empty() {
        return Err("gh returned empty login".into());
    }
    Ok(login)
}

fn search_commits(query: &str, page: u32) -> Result<serde_json::Value, String> {
    let output = Command::new("gh")
        .arg("api")
        .arg("-X")
        .arg("GET")
        .arg("/search/commits")
        .arg("-f")
        .arg(format!("q={query}"))
        .arg("-f")
        .arg(format!("per_page={PAGE_SIZE}"))
        .arg("-F")
        .arg(format!("page={page}"))
        .output()
        .map_err(|e| format!("failed to invoke gh: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "gh exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("invalid JSON from gh: {e}"))?;

    if let Some(message) = json.get("message").and_then(|v| v.as_str()) {
        return Err(format!("GitHub error: {message}"));
    }

    Ok(json)
}

fn count_non_merge(json: &serde_json::Value) -> u32 {
    let items = match json["items"].as_array() {
        Some(a) => a,
        None => return 0,
    };
    items
        .iter()
        .filter(|item| {
            item["parents"]
                .as_array()
                .map(|a| a.len())
                .unwrap_or(0)
                <= 1
        })
        .count() as u32
}
