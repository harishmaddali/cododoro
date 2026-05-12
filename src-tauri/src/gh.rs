use std::collections::BTreeMap;
use std::process::Command;

use chrono::{DateTime, Duration, Local, NaiveDate, TimeZone, Utc};
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
pub struct DayContribution {
    pub date: String,
    #[serde(rename = "commitCount")]
    pub commit_count: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct ContributionsSnapshot {
    pub login: String,
    pub today: DayContribution,
    #[serde(rename = "currentStreak")]
    pub current_streak: u32,
    #[serde(rename = "longestStreak")]
    pub longest_streak: u32,
    #[serde(rename = "last90Days")]
    pub last_90_days: Vec<DayContribution>,
    #[serde(rename = "fetchedAt")]
    pub fetched_at: String,
}

const QUERY: &str = r#"query($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) {
        contributions(first: 100) {
          nodes {
            commitCount
            occurredAt
          }
        }
      }
    }
  }
}"#;

pub fn fetch() -> Result<ContributionsSnapshot, String> {
    let now_local = Local::now();
    let today = now_local.date_naive();
    let from_date = today - Duration::days(364);

    let from_local = Local
        .from_local_datetime(&from_date.and_hms_opt(0, 0, 0).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local time".to_string())?;
    let to_local = Local
        .from_local_datetime(&today.and_hms_opt(23, 59, 59).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local time".to_string())?;

    let from_utc = from_local.with_timezone(&Utc).to_rfc3339();
    let to_utc = to_local.with_timezone(&Utc).to_rfc3339();

    let output = Command::new("gh")
        .arg("api")
        .arg("graphql")
        .arg("-f")
        .arg(format!("query={QUERY}"))
        .arg("-f")
        .arg(format!("from={from_utc}"))
        .arg("-f")
        .arg(format!("to={to_utc}"))
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

    if let Some(errs) = json.get("errors").and_then(|v| v.as_array()) {
        let msg = errs
            .iter()
            .filter_map(|e| e.get("message").and_then(|m| m.as_str()))
            .collect::<Vec<_>>()
            .join("; ");
        return Err(format!("GraphQL errors: {msg}"));
    }

    let viewer = &json["data"]["viewer"];
    let login = viewer["login"].as_str().unwrap_or("").to_string();

    let mut per_day: BTreeMap<NaiveDate, u32> = BTreeMap::new();
    if let Some(repos) = viewer["contributionsCollection"]["commitContributionsByRepository"].as_array() {
        for repo in repos {
            if let Some(nodes) = repo["contributions"]["nodes"].as_array() {
                for node in nodes {
                    let count = node["commitCount"].as_u64().unwrap_or(0) as u32;
                    let occurred = node["occurredAt"].as_str().unwrap_or("");
                    if let Ok(dt) = DateTime::parse_from_rfc3339(occurred) {
                        let local_date = dt.with_timezone(&Local).date_naive();
                        *per_day.entry(local_date).or_insert(0) += count;
                    }
                }
            }
        }
    }

    let mut last_90: Vec<DayContribution> = Vec::with_capacity(90);
    for offset in (0..90).rev() {
        let d = today - Duration::days(offset);
        let count = per_day.get(&d).copied().unwrap_or(0);
        last_90.push(DayContribution {
            date: d.format("%Y-%m-%d").to_string(),
            commit_count: count,
        });
    }

    let today_count = per_day.get(&today).copied().unwrap_or(0);

    let mut current_streak: u32 = 0;
    let mut anchor = today;
    if today_count == 0 {
        let yesterday = today - Duration::days(1);
        if per_day.get(&yesterday).copied().unwrap_or(0) > 0 {
            anchor = yesterday;
        } else {
            anchor = today;
        }
    }
    while per_day.get(&anchor).copied().unwrap_or(0) > 0 {
        current_streak += 1;
        anchor -= Duration::days(1);
    }

    let mut longest: u32 = 0;
    let mut running: u32 = 0;
    let start = today - Duration::days(364);
    for offset in 0..365 {
        let d = start + Duration::days(offset);
        if per_day.get(&d).copied().unwrap_or(0) > 0 {
            running += 1;
            if running > longest {
                longest = running;
            }
        } else {
            running = 0;
        }
    }

    Ok(ContributionsSnapshot {
        login,
        today: DayContribution {
            date: today.format("%Y-%m-%d").to_string(),
            commit_count: today_count,
        },
        current_streak,
        longest_streak: longest,
        last_90_days: last_90,
        fetched_at: now_local.to_rfc3339(),
    })
}
