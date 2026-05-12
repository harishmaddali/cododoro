use std::collections::BTreeMap;
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
pub struct CommitDetail {
    pub sha: String,
    #[serde(rename = "shortSha")]
    pub short_sha: String,
    pub message: String,
    pub url: String,
    #[serde(rename = "authoredAt")]
    pub authored_at: String,
    #[serde(rename = "isMerge")]
    pub is_merge: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct RepoCommits {
    #[serde(rename = "nameWithOwner")]
    pub name_with_owner: String,
    pub url: String,
    #[serde(rename = "commitCount")]
    pub commit_count: u32,
    pub commits: Vec<CommitDetail>,
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
    pub repos: Vec<RepoCommits>,
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

    let mut count = 0u32;
    let mut repos: BTreeMap<String, RepoCommits> = BTreeMap::new();
    process_page(&first, only_non_merge, &mut count, &mut repos);

    let pages = total.div_ceil(PAGE_SIZE).min(SAFETY_PAGE_CAP);
    for page in 2..=pages {
        let json = search_commits(&query, page)?;
        process_page(&json, only_non_merge, &mut count, &mut repos);
    }

    let mut repo_list: Vec<RepoCommits> = repos.into_values().collect();
    for repo in repo_list.iter_mut() {
        repo.commits
            .sort_by(|a, b| b.authored_at.cmp(&a.authored_at));
    }
    repo_list.sort_by(|a, b| {
        b.commit_count
            .cmp(&a.commit_count)
            .then_with(|| a.name_with_owner.cmp(&b.name_with_owner))
    });

    Ok(ContributionsSnapshot {
        login,
        date: today.format("%Y-%m-%d").to_string(),
        commit_count: count,
        only_non_merge,
        fetched_at: now_local.to_rfc3339(),
        repos: repo_list,
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

fn process_page(
    json: &serde_json::Value,
    only_non_merge: bool,
    count: &mut u32,
    repos: &mut BTreeMap<String, RepoCommits>,
) {
    let items = match json["items"].as_array() {
        Some(a) => a,
        None => return,
    };
    for item in items {
        let is_merge = item["parents"].as_array().map(|a| a.len()).unwrap_or(0) > 1;
        if only_non_merge && is_merge {
            continue;
        }

        *count += 1;

        let repo_name = item["repository"]["full_name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();
        let repo_url = item["repository"]["html_url"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let sha = item["sha"].as_str().unwrap_or("").to_string();
        let short_sha = sha.chars().take(7).collect::<String>();
        let message = item["commit"]["message"]
            .as_str()
            .unwrap_or("")
            .lines()
            .next()
            .unwrap_or("")
            .to_string();
        let html_url = item["html_url"].as_str().unwrap_or("").to_string();
        let authored_at = item["commit"]["author"]["date"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let entry = repos.entry(repo_name.clone()).or_insert_with(|| RepoCommits {
            name_with_owner: repo_name.clone(),
            url: repo_url,
            commit_count: 0,
            commits: Vec::new(),
        });
        entry.commit_count += 1;
        entry.commits.push(CommitDetail {
            sha,
            short_sha,
            message,
            url: html_url,
            authored_at,
            is_merge,
        });
    }
}
