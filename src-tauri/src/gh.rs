use std::collections::BTreeMap;
use std::process::Command;
use std::time::Duration;

use chrono::{Local, TimeZone, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
pub struct GhStatus {
    pub installed: bool,
    pub authenticated: bool,
    pub login: Option<String>,
    pub error: Option<String>,
}

pub async fn check_status() -> GhStatus {
    if !check_cli_installed().await {
        return GhStatus {
            installed: false,
            authenticated: false,
            login: None,
            error: Some("gh CLI not found on PATH".into()),
        };
    }

    let token = match fetch_cli_token().await {
        Ok(token) => token,
        Err(e) => {
            return GhStatus {
                installed: true,
                authenticated: false,
                login: None,
                error: Some(e),
            };
        }
    };

    let api = match GitHubApi::new(token) {
        Ok(api) => api,
        Err(e) => {
            return GhStatus {
                installed: true,
                authenticated: false,
                login: None,
                error: Some(e),
            };
        }
    };

    match api.fetch_login().await {
        Ok(login) => GhStatus {
            installed: true,
            authenticated: true,
            login: Some(login),
            error: None,
        },
        Err(e) => GhStatus {
            installed: true,
            authenticated: false,
            login: None,
            error: Some(e),
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
const GITHUB_API_URL: &str = "https://api.github.com";
const REQUEST_TIMEOUT_SECS: u64 = 30;

pub async fn fetch(only_non_merge: bool) -> Result<ContributionsSnapshot, String> {
    let token = fetch_cli_token().await?;
    let api = GitHubApi::new(token)?;
    let login = api.fetch_login().await?;

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

    let first = api.search_commits(&query, 1).await?;
    let total = first["total_count"].as_u64().unwrap_or(0) as u32;

    let mut count = 0u32;
    let mut repos: BTreeMap<String, RepoCommits> = BTreeMap::new();
    process_page(&api, &first, only_non_merge, &mut count, &mut repos).await?;

    let pages = total.div_ceil(PAGE_SIZE).min(SAFETY_PAGE_CAP);
    for page in 2..=pages {
        let json = api.search_commits(&query, page).await?;
        process_page(&api, &json, only_non_merge, &mut count, &mut repos).await?;
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

struct GitHubApi {
    client: Client,
    token: String,
}

impl GitHubApi {
    fn new(token: String) -> Result<Self, String> {
        let client = Client::builder()
            .user_agent("cododoro")
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .map_err(|e| format!("failed to build GitHub client: {e}"))?;

        Ok(Self { client, token })
    }

    async fn fetch_login(&self) -> Result<String, String> {
        let json = self.get_json("/user", &[]).await?;
        let login = json["login"]
            .as_str()
            .ok_or_else(|| "GitHub user response did not include login".to_string())?
            .to_string();
        if login.is_empty() {
            return Err("GitHub returned empty login".into());
        }
        Ok(login)
    }

    async fn search_commits(&self, query: &str, page: u32) -> Result<serde_json::Value, String> {
        self.get_json(
            "/search/commits",
            &[
                ("q", query.to_string()),
                ("per_page", PAGE_SIZE.to_string()),
                ("page", page.to_string()),
            ],
        )
        .await
    }

    async fn fetch_commit_files(&self, repo_name: &str, sha: &str) -> Result<Vec<String>, String> {
        if repo_name.is_empty() || sha.is_empty() {
            return Ok(Vec::new());
        }

        let endpoint = format!("/repos/{repo_name}/commits/{sha}");
        let json = self.get_json(&endpoint, &[]).await?;
        let response: CommitFilesResponse = serde_json::from_value(json)
            .map_err(|e| format!("invalid commit JSON from GitHub: {e}"))?;

        Ok(response
            .files
            .unwrap_or_default()
            .into_iter()
            .map(|file| file.filename)
            .collect())
    }

    async fn get_json(
        &self,
        path: &str,
        query: &[(&str, String)],
    ) -> Result<serde_json::Value, String> {
        let url = format!("{GITHUB_API_URL}{path}");
        let mut request = self
            .client
            .get(url)
            .bearer_auth(&self.token)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28");

        if !query.is_empty() {
            request = request.query(query);
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("GitHub request failed: {e}"))?;
        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|e| format!("failed to read GitHub response: {e}"))?;
        let json: serde_json::Value =
            serde_json::from_str(&text).map_err(|e| format!("invalid JSON from GitHub: {e}"))?;

        if !status.is_success() {
            let message = json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or_else(|| text.trim());
            return Err(format!("GitHub API {status}: {message}"));
        }

        Ok(json)
    }
}

async fn fetch_cli_token() -> Result<String, String> {
    let output = tauri::async_runtime::spawn_blocking(|| {
        Command::new("gh").args(["auth", "token"]).output()
    })
    .await
    .map_err(|e| format!("failed to read gh auth token: {e}"))?
    .map_err(|e| format!("failed to invoke gh auth token: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "gh auth token failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if token.is_empty() {
        return Err("gh auth token returned empty token".into());
    }
    Ok(token)
}

async fn check_cli_installed() -> bool {
    match tauri::async_runtime::spawn_blocking(|| Command::new("gh").arg("--version").output())
        .await
    {
        Ok(Ok(out)) => out.status.success(),
        _ => false,
    }
}

async fn process_page(
    api: &GitHubApi,
    json: &serde_json::Value,
    only_non_merge: bool,
    count: &mut u32,
    repos: &mut BTreeMap<String, RepoCommits>,
) -> Result<(), String> {
    let items = match json["items"].as_array() {
        Some(a) => a,
        None => return Ok(()),
    };
    for item in items {
        let is_merge = item["parents"].as_array().map(|a| a.len()).unwrap_or(0) > 1;
        if only_non_merge && is_merge {
            continue;
        }

        let Some(repo_name) = item["repository"]["full_name"].as_str() else {
            continue;
        };
        let Some(sha) = item["sha"].as_str() else {
            continue;
        };
        let repo_name = repo_name.to_string();
        let sha = sha.to_string();
        let repo_url = item["repository"]["html_url"]
            .as_str()
            .unwrap_or("")
            .to_string();
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

        if !commit_has_code_changes(api, &repo_name, &sha).await? {
            continue;
        }

        *count += 1;

        let entry = repos
            .entry(repo_name.clone())
            .or_insert_with(|| RepoCommits {
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
    Ok(())
}

#[derive(Debug, Deserialize)]
struct CommitFile {
    filename: String,
}

#[derive(Debug, Deserialize)]
struct CommitFilesResponse {
    files: Option<Vec<CommitFile>>,
}

async fn commit_has_code_changes(
    api: &GitHubApi,
    repo_name: &str,
    sha: &str,
) -> Result<bool, String> {
    let files = api.fetch_commit_files(repo_name, sha).await?;
    Ok(files.iter().any(|path| !is_documentation_path(path)))
}

fn is_documentation_path(path: &str) -> bool {
    const DOC_DIRECTORIES: &[&str] = &[
        "doc",
        "docs",
        "documentation",
        "guides",
        "manual",
        "manuals",
        "wiki",
    ];
    const DOC_EXTENSIONS: &[&str] = &[
        "adoc", "asciidoc", "md", "mdx", "rst", "tex", "textile", "wiki",
    ];
    const DOC_FILENAMES: &[&str] = &[
        "authors",
        "changelog",
        "changes",
        "code_of_conduct",
        "contributing",
        "copying",
        "faq",
        "history",
        "license",
        "notice",
        "readme",
        "security",
        "support",
    ];

    let normalized = path.replace('\\', "/").to_ascii_lowercase();
    let parts = normalized
        .split('/')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    let Some(file_name) = parts.last() else {
        return false;
    };

    if parts.iter().any(|part| DOC_DIRECTORIES.contains(part)) {
        return true;
    }

    if matches!(parts.first(), Some(&".github"))
        && matches!(
            parts.get(1).copied(),
            Some("discussion_template" | "issue_template" | "pull_request_template")
        )
    {
        return true;
    }

    let stem = file_name
        .split_once('.')
        .map(|(stem, _)| stem)
        .unwrap_or(file_name);
    if DOC_FILENAMES.contains(file_name)
        || DOC_FILENAMES.contains(&stem)
        || DOC_FILENAMES
            .iter()
            .any(|name| file_name.starts_with(&format!("{name}-")))
    {
        return true;
    }

    file_name
        .rsplit_once('.')
        .map(|(_, extension)| DOC_EXTENSIONS.contains(&extension))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::is_documentation_path;

    #[test]
    fn detects_common_documentation_files() {
        assert!(is_documentation_path("README.md"));
        assert!(is_documentation_path("docs/architecture.png"));
        assert!(is_documentation_path("Documentation/guide.adoc"));
        assert!(is_documentation_path(
            ".github/ISSUE_TEMPLATE/bug_report.yml"
        ));
        assert!(is_documentation_path("LICENSE-MIT"));
    }

    #[test]
    fn keeps_code_and_workflow_paths_countable() {
        assert!(!is_documentation_path("src/main.rs"));
        assert!(!is_documentation_path("src/components/Dashboard.tsx"));
        assert!(!is_documentation_path(".github/workflows/ci.yml"));
        assert!(!is_documentation_path("package-lock.json"));
    }
}
