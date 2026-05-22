use std::collections::BTreeMap;
use std::process::Command;
use std::sync::OnceLock;
use std::time::Duration;

use chrono::{Datelike, Local, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::db::{Config, Filters};

#[derive(Debug, Serialize, Clone)]
pub struct GhStatus {
    pub installed: bool,
    pub authenticated: bool,
    pub login: Option<String>,
    pub name: Option<String>,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: Option<String>,
    pub error: Option<String>,
}

pub async fn check_status() -> GhStatus {
    if !check_cli_installed().await {
        return GhStatus {
            installed: false,
            authenticated: false,
            login: None,
            name: None,
            avatar_url: None,
            error: Some("gh CLI not found".into()),
        };
    }

    let token = match fetch_cli_token().await {
        Ok(token) => token,
        Err(e) => {
            return GhStatus {
                installed: true,
                authenticated: false,
                login: None,
                name: None,
                avatar_url: None,
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
                name: None,
                avatar_url: None,
                error: Some(e),
            };
        }
    };

    match api.fetch_viewer().await {
        Ok(v) => GhStatus {
            installed: true,
            authenticated: true,
            login: Some(v.login),
            name: v.name,
            avatar_url: Some(v.avatar_url),
            error: None,
        },
        Err(e) => GhStatus {
            installed: true,
            authenticated: false,
            login: None,
            name: None,
            avatar_url: None,
            error: Some(e),
        },
    }
}

#[derive(Debug, Clone)]
struct Viewer {
    login: String,
    name: Option<String>,
    avatar_url: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct CommitDetail {
    pub sha: String,
    #[serde(rename = "shortSha")]
    pub short_sha: String,
    pub message: String,
    pub repo: String,
    pub url: String,
    #[serde(rename = "authoredAt")]
    pub authored_at: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct DayCount {
    pub date: String,
    pub count: u32,
    pub level: u8,
}

#[derive(Debug, Serialize, Clone)]
pub struct RepoEntry {
    #[serde(rename = "nameWithOwner")]
    pub name_with_owner: String,
    pub owner: String,
    pub name: String,
    pub language: Option<String>,
    pub color: String,
    pub url: String,
    pub today: u32,
    pub week: u32,
    pub goal: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct BestDay {
    pub date: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Clone)]
pub struct AppSnapshot {
    pub login: String,
    pub name: Option<String>,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    pub date: String,
    #[serde(rename = "fetchedAt")]
    pub fetched_at: String,
    #[serde(rename = "todayCount")]
    pub today_count: u32,
    #[serde(rename = "dailyGoal")]
    pub daily_goal: u32,
    pub streak: u32,
    #[serde(rename = "longestStreak")]
    pub longest_streak: u32,
    #[serde(rename = "longestRange")]
    pub longest_range: String,
    #[serde(rename = "yearTotal")]
    pub year_total: u32,
    #[serde(rename = "bestDay")]
    pub best_day: Option<BestDay>,
    pub days: Vec<DayCount>,
    #[serde(rename = "recentCommits")]
    pub recent_commits: Vec<CommitDetail>,
    pub repos: Vec<RepoEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RepoMeta {
    #[serde(rename = "nameWithOwner")]
    pub name_with_owner: String,
    pub owner: String,
    pub name: String,
    pub language: Option<String>,
    pub color: String,
    pub url: String,
}

const SAFETY_PAGE_CAP: u32 = 10;
const WEEK_PAGE_CAP: u32 = 5;
const PAGE_SIZE: u32 = 100;
const GITHUB_API_URL: &str = "https://api.github.com";
const GITHUB_GRAPHQL_URL: &str = "https://api.github.com/graphql";
const REQUEST_TIMEOUT_SECS: u64 = 30;

/// Fetch everything the UI needs and fold it into a single snapshot using the
/// user's stored configuration (goal, commit filters, schedule).
pub async fn build_snapshot(config: &Config) -> Result<AppSnapshot, String> {
    let token = fetch_cli_token().await?;
    let api = GitHubApi::new(token)?;

    let viewer = api.fetch_viewer().await?;
    let calendar = api.fetch_contribution_calendar().await?;
    let repo_meta = api.fetch_user_repos().await.unwrap_or_default();

    let now_local = Local::now();
    let today = now_local.date_naive();

    // Today's filtered commits (per-repo + recent list).
    let (today_count, today_by_repo, recent_commits) =
        fetch_today(&api, &viewer.login, &config.filters, today).await?;

    // Lightweight last-7-day per-repo counts (no per-commit file inspection).
    let week_by_repo = fetch_week(&api, &viewer.login, &config.filters, today)
        .await
        .unwrap_or_default();

    let days = to_day_counts(&calendar);
    let year_total = days.iter().map(|d| d.count).sum();
    let best_day = days
        .iter()
        .filter(|d| d.count > 0)
        .max_by_key(|d| d.count)
        .map(|d| BestDay {
            date: d.date.clone(),
            count: d.count,
        });
    let streak = current_streak(&days, &config.streak_days, &today);
    let (longest_streak, longest_range) = longest_streak(&days, &config.streak_days);

    let repos = merge_repos(&repo_meta, &today_by_repo, &week_by_repo, config);

    Ok(AppSnapshot {
        login: viewer.login,
        name: viewer.name,
        avatar_url: viewer.avatar_url,
        date: today.format("%Y-%m-%d").to_string(),
        fetched_at: now_local.to_rfc3339(),
        today_count,
        daily_goal: config.daily_goal,
        streak,
        longest_streak,
        longest_range,
        year_total,
        best_day,
        days,
        recent_commits,
        repos,
    })
}

async fn fetch_today(
    api: &GitHubApi,
    login: &str,
    filters: &Filters,
    today: NaiveDate,
) -> Result<(u32, BTreeMap<String, u32>, Vec<CommitDetail>), String> {
    let start = Local
        .from_local_datetime(&today.and_hms_opt(0, 0, 0).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local start of day".to_string())?
        .with_timezone(&Utc)
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();
    let end = Local
        .from_local_datetime(&today.and_hms_opt(23, 59, 59).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local end of day".to_string())?
        .with_timezone(&Utc)
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();

    let query = format!("author:{login} author-date:{start}..{end}");
    let first = api.search_commits(&query, 1).await?;
    let total = first["total_count"].as_u64().unwrap_or(0) as u32;

    let mut count = 0u32;
    let mut by_repo: BTreeMap<String, u32> = BTreeMap::new();
    let mut commits: Vec<CommitDetail> = Vec::new();
    process_today_page(api, &first, filters, &mut count, &mut by_repo, &mut commits).await?;

    let pages = total.div_ceil(PAGE_SIZE).min(SAFETY_PAGE_CAP);
    for page in 2..=pages {
        let json = api.search_commits(&query, page).await?;
        process_today_page(api, &json, filters, &mut count, &mut by_repo, &mut commits).await?;
    }

    commits.sort_by(|a, b| b.authored_at.cmp(&a.authored_at));
    Ok((count, by_repo, commits))
}

async fn fetch_week(
    api: &GitHubApi,
    login: &str,
    filters: &Filters,
    today: NaiveDate,
) -> Result<BTreeMap<String, u32>, String> {
    let week_ago = today - chrono::Duration::days(6);
    let start = Local
        .from_local_datetime(&week_ago.and_hms_opt(0, 0, 0).expect("valid time"))
        .single()
        .ok_or_else(|| "ambiguous local start of week".to_string())?
        .with_timezone(&Utc)
        .format("%Y-%m-%dT%H:%M:%SZ")
        .to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    let query = format!("author:{login} author-date:{start}..{now}");
    let first = api.search_commits(&query, 1).await?;
    let total = first["total_count"].as_u64().unwrap_or(0) as u32;

    let mut by_repo: BTreeMap<String, u32> = BTreeMap::new();
    collect_week_page(&first, filters, &mut by_repo);
    let pages = total.div_ceil(PAGE_SIZE).min(WEEK_PAGE_CAP);
    for page in 2..=pages {
        let json = api.search_commits(&query, page).await?;
        collect_week_page(&json, filters, &mut by_repo);
    }
    Ok(by_repo)
}

fn collect_week_page(
    json: &serde_json::Value,
    filters: &Filters,
    by_repo: &mut BTreeMap<String, u32>,
) {
    let Some(items) = json["items"].as_array() else {
        return;
    };
    for item in items {
        let is_merge = item["parents"].as_array().map(|a| a.len()).unwrap_or(0) > 1;
        if filters.merge && is_merge {
            continue;
        }
        let message = first_line(&item["commit"]["message"]);
        if filters.revert && is_revert(&message) {
            continue;
        }
        if filters.empty && is_wip(&message) {
            continue;
        }
        if let Some(repo) = item["repository"]["full_name"].as_str() {
            *by_repo.entry(repo.to_string()).or_insert(0) += 1;
        }
    }
}

fn merge_repos(
    meta: &[RepoMeta],
    today: &BTreeMap<String, u32>,
    week: &BTreeMap<String, u32>,
    config: &Config,
) -> Vec<RepoEntry> {
    let mut names: Vec<String> = meta.iter().map(|m| m.name_with_owner.clone()).collect();
    for name in today.keys().chain(week.keys()) {
        if !names.iter().any(|n| n == name) {
            names.push(name.clone());
        }
    }

    let mut repos: Vec<RepoEntry> = names
        .into_iter()
        .map(|full| {
            let m = meta.iter().find(|m| m.name_with_owner == full);
            let (owner, name) = split_repo(&full);
            let goal = config.repo_goals.get(&full).copied().unwrap_or(0);
            RepoEntry {
                name_with_owner: full.clone(),
                owner: m.map(|m| m.owner.clone()).unwrap_or(owner),
                name: m.map(|m| m.name.clone()).unwrap_or(name),
                language: m.and_then(|m| m.language.clone()),
                color: m
                    .map(|m| m.color.clone())
                    .unwrap_or_else(|| language_color(None)),
                url: m
                    .map(|m| m.url.clone())
                    .unwrap_or_else(|| format!("https://github.com/{full}")),
                today: today.get(&full).copied().unwrap_or(0),
                week: week.get(&full).copied().unwrap_or(0),
                goal,
            }
        })
        .collect();

    repos.sort_by(|a, b| {
        b.today
            .cmp(&a.today)
            .then(b.week.cmp(&a.week))
            .then_with(|| a.name_with_owner.cmp(&b.name_with_owner))
    });
    repos
}

fn split_repo(full: &str) -> (String, String) {
    match full.split_once('/') {
        Some((o, n)) => (o.to_string(), n.to_string()),
        None => (String::new(), full.to_string()),
    }
}

fn to_day_counts(weeks: &[Vec<(String, u32)>]) -> Vec<DayCount> {
    // Scale the colour buckets to the busiest day of the year so the heatmap
    // reflects the user's own activity distribution rather than fixed cutoffs.
    let peak = weeks
        .iter()
        .flat_map(|week| week.iter())
        .map(|(_, count)| *count)
        .max()
        .unwrap_or(0);
    let mut out = Vec::new();
    for week in weeks {
        for (date, count) in week {
            out.push(DayCount {
                date: date.clone(),
                count: *count,
                level: level_for(*count, peak),
            });
        }
    }
    out
}

/// Map a day's contribution count onto a 0–4 colour bucket. An empty day is
/// always level 0; non-empty days are split into quartile bands of the year's
/// peak day, so only genuinely busy days reach the brightest level.
fn level_for(count: u32, peak: u32) -> u8 {
    if count == 0 || peak == 0 {
        return 0;
    }
    let band = ((count as f64 / peak as f64) * 4.0).ceil() as u8;
    band.clamp(1, 4)
}

fn weekday_name(date: &str) -> Option<&'static str> {
    let d = NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
    Some(match d.weekday() {
        chrono::Weekday::Mon => "Mon",
        chrono::Weekday::Tue => "Tue",
        chrono::Weekday::Wed => "Wed",
        chrono::Weekday::Thu => "Thu",
        chrono::Weekday::Fri => "Fri",
        chrono::Weekday::Sat => "Sat",
        chrono::Weekday::Sun => "Sun",
    })
}

/// Consecutive scheduled days with activity, counting back from today. Days the
/// user chose to skip neither extend nor break the streak; an empty (but still
/// in-progress) today does not break it either.
fn current_streak(days: &[DayCount], schedule: &[String], today: &NaiveDate) -> u32 {
    let today_str = today.format("%Y-%m-%d").to_string();
    let mut streak = 0u32;
    for day in days.iter().rev() {
        let Some(wd) = weekday_name(&day.date) else {
            continue;
        };
        let scheduled = schedule.iter().any(|s| s == wd);
        if !scheduled {
            continue;
        }
        if day.count > 0 {
            streak += 1;
        } else if day.date == today_str {
            // today not done yet — don't break the chain
            continue;
        } else {
            break;
        }
    }
    streak
}

fn longest_streak(days: &[DayCount], schedule: &[String]) -> (u32, String) {
    let mut best = 0u32;
    let mut best_start = String::new();
    let mut best_end = String::new();
    let mut run = 0u32;
    let mut run_start = String::new();
    for day in days {
        let Some(wd) = weekday_name(&day.date) else {
            continue;
        };
        if !schedule.iter().any(|s| s == wd) {
            continue;
        }
        if day.count > 0 {
            if run == 0 {
                run_start = day.date.clone();
            }
            run += 1;
            if run > best {
                best = run;
                best_start = run_start.clone();
                best_end = day.date.clone();
            }
        } else {
            run = 0;
        }
    }
    let range = if best == 0 {
        String::new()
    } else {
        format!("{} — {}", pretty_month(&best_start), pretty_month(&best_end))
    };
    (best, range)
}

fn pretty_month(date: &str) -> String {
    const MONTHS: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    match NaiveDate::parse_from_str(date, "%Y-%m-%d") {
        Ok(d) => format!("{} {}", MONTHS[(d.month0()) as usize], d.year()),
        Err(_) => date.to_string(),
    }
}

struct GitHubApi {
    client: reqwest::Client,
    token: String,
}

impl GitHubApi {
    fn new(token: String) -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .user_agent("cododoro")
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .map_err(|e| format!("failed to build GitHub client: {e}"))?;
        Ok(Self { client, token })
    }

    async fn fetch_viewer(&self) -> Result<Viewer, String> {
        let json = self
            .graphql(
                "query { viewer { login name avatarUrl } }",
                json!({}),
            )
            .await?;
        let viewer = &json["data"]["viewer"];
        let login = viewer["login"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or_else(|| "GitHub did not return a login".to_string())?
            .to_string();
        Ok(Viewer {
            login,
            name: viewer["name"].as_str().map(|s| s.to_string()),
            avatar_url: viewer["avatarUrl"].as_str().unwrap_or("").to_string(),
        })
    }

    /// Past-year daily contribution calendar grouped into weeks of
    /// `(date, count)` tuples — drives the heatmap, streaks and trend charts.
    async fn fetch_contribution_calendar(&self) -> Result<Vec<Vec<(String, u32)>>, String> {
        let query = "query { viewer { contributionsCollection { contributionCalendar { \
            weeks { contributionDays { date contributionCount } } } } } }";
        let json = self.graphql(query, json!({})).await?;
        let weeks = json["data"]["viewer"]["contributionsCollection"]["contributionCalendar"]
            ["weeks"]
            .as_array()
            .ok_or_else(|| "GitHub did not return a contribution calendar".to_string())?;

        let mut out = Vec::with_capacity(weeks.len());
        for week in weeks {
            let mut days = Vec::new();
            if let Some(list) = week["contributionDays"].as_array() {
                for d in list {
                    let date = d["date"].as_str().unwrap_or("").to_string();
                    let count = d["contributionCount"].as_u64().unwrap_or(0) as u32;
                    days.push((date, count));
                }
            }
            out.push(days);
        }
        Ok(out)
    }

    async fn fetch_user_repos(&self) -> Result<Vec<RepoMeta>, String> {
        let json = self
            .get_json(
                "/user/repos",
                &[
                    ("per_page", "100".to_string()),
                    ("sort", "pushed".to_string()),
                    ("affiliation", "owner,collaborator".to_string()),
                ],
            )
            .await?;
        let items = json
            .as_array()
            .ok_or_else(|| "unexpected /user/repos response".to_string())?;
        let mut repos = Vec::new();
        for item in items {
            if item["fork"].as_bool().unwrap_or(false) {
                continue;
            }
            let Some(full) = item["full_name"].as_str() else {
                continue;
            };
            let (owner, name) = split_repo(full);
            let language = item["language"].as_str().map(|s| s.to_string());
            repos.push(RepoMeta {
                name_with_owner: full.to_string(),
                owner,
                name,
                color: language_color(language.as_deref()),
                language,
                url: item["html_url"].as_str().unwrap_or("").to_string(),
            });
        }
        Ok(repos)
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

    async fn graphql(
        &self,
        query: &str,
        variables: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let response = self
            .client
            .post(GITHUB_GRAPHQL_URL)
            .bearer_auth(&self.token)
            .header("Accept", "application/vnd.github+json")
            .json(&json!({ "query": query, "variables": variables }))
            .send()
            .await
            .map_err(|e| format!("GitHub GraphQL request failed: {e}"))?;
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
            return Err(format!("GitHub GraphQL {status}: {message}"));
        }
        if let Some(errors) = json.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let msg = errors[0]["message"].as_str().unwrap_or("GraphQL error");
                return Err(format!("GitHub GraphQL error: {msg}"));
            }
        }
        Ok(json)
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

/// Absolute path to the `gh` binary, resolved once and cached.
///
/// A macOS `.app` launched from Finder/Dock/Spotlight inherits launchd's
/// minimal PATH (`/usr/bin:/bin:/usr/sbin:/sbin`), which omits Homebrew and
/// other dirs. A bare `Command::new("gh")` therefore fails in the production
/// bundle even when `gh` is installed (it only works under `tauri dev`, which
/// inherits the terminal's PATH). We resolve an absolute path explicitly.
fn gh_path() -> &'static str {
    static GH_PATH: OnceLock<String> = OnceLock::new();
    GH_PATH.get_or_init(resolve_gh).as_str()
}

fn resolve_gh() -> String {
    // 1. Explicit override (escape hatch for unusual setups).
    if let Ok(p) = std::env::var("CODODORO_GH_PATH") {
        if !p.trim().is_empty() {
            return p;
        }
    }

    #[cfg(unix)]
    {
        // 2. Well-known install locations: Homebrew (arm64 / x86),
        //    MacPorts, system, then user-local and Nix per-user profiles.
        let mut candidates: Vec<std::path::PathBuf> = vec![
            "/opt/homebrew/bin/gh".into(),
            "/usr/local/bin/gh".into(),
            "/opt/local/bin/gh".into(),
            "/usr/bin/gh".into(),
        ];
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(std::path::Path::new(&home).join(".local/bin/gh"));
            candidates.push(std::path::Path::new(&home).join("bin/gh"));
        }
        if let Ok(user) = std::env::var("USER") {
            candidates.push(format!("/etc/profiles/per-user/{user}/bin/gh").into());
        }
        if let Some(found) = candidates.into_iter().find(|c| c.is_file()) {
            return found.to_string_lossy().into_owned();
        }

        // 3. Ask the user's login shell (handles asdf/mise/custom dirs).
        if let Some(p) = gh_from_login_shell() {
            return p;
        }
    }

    // 4. Last resort: rely on PATH (works under `tauri dev`).
    "gh".to_string()
}

#[cfg(unix)]
fn gh_from_login_shell() -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into());
    let out = Command::new(shell)
        .args(["-lc", "command -v gh"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .next_back()?
        .to_string();
    std::path::Path::new(&path).is_file().then_some(path)
}

/// A `Command` for `gh` using an absolute program path and a PATH that
/// includes common bin dirs (so anything `gh` itself shells out to resolves).
fn gh_command() -> Command {
    let mut cmd = Command::new(gh_path());
    let extra = "/opt/homebrew/bin:/usr/local/bin:/opt/local/bin:/usr/bin:/bin";
    let path = match std::env::var("PATH") {
        Ok(base) if !base.is_empty() => format!("{extra}:{base}"),
        _ => extra.to_string(),
    };
    cmd.env("PATH", path);
    cmd
}

async fn fetch_cli_token() -> Result<String, String> {
    let output = tauri::async_runtime::spawn_blocking(|| {
        gh_command().args(["auth", "token"]).output()
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
    match tauri::async_runtime::spawn_blocking(|| gh_command().arg("--version").output())
        .await
    {
        Ok(Ok(out)) => out.status.success(),
        _ => false,
    }
}

fn first_line(value: &serde_json::Value) -> String {
    value
        .as_str()
        .unwrap_or("")
        .lines()
        .next()
        .unwrap_or("")
        .to_string()
}

fn is_revert(message: &str) -> bool {
    message.trim_start().to_ascii_lowercase().starts_with("revert")
}

fn is_wip(message: &str) -> bool {
    let m = message.trim();
    if m.is_empty() {
        return true;
    }
    let lower = m.to_ascii_lowercase();
    lower.starts_with("wip") || lower == "."
}

async fn process_today_page(
    api: &GitHubApi,
    json: &serde_json::Value,
    filters: &Filters,
    count: &mut u32,
    by_repo: &mut BTreeMap<String, u32>,
    commits: &mut Vec<CommitDetail>,
) -> Result<(), String> {
    let Some(items) = json["items"].as_array() else {
        return Ok(());
    };
    for item in items {
        let is_merge = item["parents"].as_array().map(|a| a.len()).unwrap_or(0) > 1;
        if filters.merge && is_merge {
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
        let message = first_line(&item["commit"]["message"]);

        if filters.revert && is_revert(&message) {
            continue;
        }
        if filters.empty && is_wip(&message) {
            continue;
        }
        if filters.docs || filters.lock {
            let files = api.fetch_commit_files(&repo_name, &sha).await?;
            if !files.is_empty() && !has_real_change(&files, filters) {
                continue;
            }
        }

        *count += 1;
        *by_repo.entry(repo_name.clone()).or_insert(0) += 1;
        commits.push(CommitDetail {
            short_sha: sha.chars().take(7).collect(),
            sha,
            message,
            repo: repo_name.rsplit('/').next().unwrap_or(&repo_name).to_string(),
            url: item["html_url"].as_str().unwrap_or("").to_string(),
            authored_at: item["commit"]["author"]["date"]
                .as_str()
                .unwrap_or("")
                .to_string(),
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

/// True if at least one changed file is "real" work given the active filters
/// (i.e. not purely documentation and/or lockfile churn).
fn has_real_change(files: &[String], filters: &Filters) -> bool {
    files.iter().any(|path| {
        let doc = filters.docs && is_documentation_path(path);
        let lock = filters.lock && is_lockfile_path(path);
        !doc && !lock
    })
}

fn is_lockfile_path(path: &str) -> bool {
    const LOCKFILES: &[&str] = &[
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "cargo.lock",
        "composer.lock",
        "gemfile.lock",
        "poetry.lock",
        "pipfile.lock",
        "go.sum",
        "bun.lockb",
        "flake.lock",
    ];
    let name = path
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    LOCKFILES.contains(&name.as_str())
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

/// GitHub's linguist-ish language → hue mapping so each repo gets a stable
/// accent dot. Falls back to a neutral slate.
fn language_color(language: Option<&str>) -> String {
    match language.unwrap_or("") {
        "TypeScript" => "#3178c6",
        "JavaScript" => "#f1e05a",
        "Rust" => "#dea584",
        "Python" => "#3572A5",
        "Go" => "#00ADD8",
        "Svelte" => "#ff3e00",
        "Vue" => "#41b883",
        "Ruby" => "#701516",
        "Java" => "#b07219",
        "Kotlin" => "#A97BFF",
        "Swift" => "#F05138",
        "C" => "#555555",
        "C++" => "#f34b7d",
        "C#" => "#178600",
        "Shell" => "#89e051",
        "HTML" => "#e34c26",
        "CSS" => "#563d7c",
        "MDX" => "#a855f7",
        "Dart" => "#00B4AB",
        "PHP" => "#4F5D95",
        "Elixir" => "#6e4a7e",
        "Haskell" => "#5e5086",
        "Zig" => "#ec915c",
        "Lua" => "#000080",
        "Scala" => "#c22d40",
        _ => "#6e7684",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_common_documentation_files() {
        assert!(is_documentation_path("README.md"));
        assert!(is_documentation_path("docs/architecture.png"));
        assert!(is_documentation_path("Documentation/guide.adoc"));
        assert!(is_documentation_path(".github/ISSUE_TEMPLATE/bug_report.yml"));
        assert!(is_documentation_path("LICENSE-MIT"));
    }

    #[test]
    fn keeps_code_and_workflow_paths_countable() {
        assert!(!is_documentation_path("src/main.rs"));
        assert!(!is_documentation_path("src/components/Dashboard.tsx"));
        assert!(!is_documentation_path(".github/workflows/ci.yml"));
        assert!(!is_documentation_path("package-lock.json"));
    }

    #[test]
    fn detects_lockfiles() {
        assert!(is_lockfile_path("package-lock.json"));
        assert!(is_lockfile_path("frontend/yarn.lock"));
        assert!(is_lockfile_path("Cargo.lock"));
        assert!(!is_lockfile_path("src/main.rs"));
    }

    #[test]
    fn has_real_change_respects_filters() {
        let all = Filters {
            merge: true,
            docs: true,
            lock: true,
            revert: false,
            empty: true,
        };
        assert!(!has_real_change(
            &["README.md".into(), "Cargo.lock".into()],
            &all
        ));
        assert!(has_real_change(
            &["README.md".into(), "src/main.rs".into()],
            &all
        ));
        let docs_off = Filters {
            docs: false,
            ..all.clone()
        };
        assert!(has_real_change(&["README.md".into()], &docs_off));
    }

    #[test]
    fn streak_counts_back_over_scheduled_days() {
        let schedule: Vec<String> = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let days = vec![
            DayCount {
                date: "2026-05-15".into(),
                count: 2,
                level: 1,
            },
            DayCount {
                date: "2026-05-16".into(),
                count: 4,
                level: 2,
            },
            DayCount {
                date: "2026-05-17".into(),
                count: 1,
                level: 1,
            },
            DayCount {
                date: "2026-05-18".into(),
                count: 0,
                level: 0,
            },
        ];
        let today = NaiveDate::from_ymd_opt(2026, 5, 18).unwrap();
        // today empty but in-progress → previous 3 days form the streak
        assert_eq!(current_streak(&days, &schedule, &today), 3);
    }

    #[test]
    fn level_for_scales_to_yearly_peak() {
        // Empty days are always level 0, regardless of the peak.
        assert_eq!(level_for(0, 20), 0);
        // A calendar with no activity collapses every day to level 0.
        assert_eq!(level_for(0, 0), 0);
        assert_eq!(level_for(1, 0), 0);
        // Quartile bands of a 20-contribution peak: only the top quarter is max.
        assert_eq!(level_for(1, 20), 1);
        assert_eq!(level_for(5, 20), 1);
        assert_eq!(level_for(6, 20), 2);
        assert_eq!(level_for(10, 20), 2);
        assert_eq!(level_for(11, 20), 3);
        assert_eq!(level_for(15, 20), 3);
        assert_eq!(level_for(16, 20), 4);
        assert_eq!(level_for(20, 20), 4);
        // A single quiet day on a busy calendar stays at the lowest non-zero band.
        assert_eq!(level_for(1, 100), 1);
    }

    #[test]
    fn to_day_counts_buckets_against_busiest_day() {
        let weeks = vec![vec![
            ("2026-01-01".to_string(), 0),
            ("2026-01-02".to_string(), 2),
            ("2026-01-03".to_string(), 8),
        ]];
        let days = to_day_counts(&weeks);
        assert_eq!(days[0].level, 0);
        // 2 of a peak of 8 sits in the bottom quartile.
        assert_eq!(days[1].level, 1);
        // The peak day itself is the brightest level.
        assert_eq!(days[2].level, 4);
    }
}
