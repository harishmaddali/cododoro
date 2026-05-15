export type View = "dashboard" | "settings";

export interface Settings {
  dailyGoal: number;
  onlyNonMergeCommits: boolean;
  reminderTime: string;
  reminderEnabled: boolean;
  goalCompletedEnabled: boolean;
  pollIntervalMinutes: number;
}

export const defaultSettings: Settings = {
  dailyGoal: 3,
  onlyNonMergeCommits: true,
  reminderTime: "21:00",
  reminderEnabled: true,
  goalCompletedEnabled: true,
  pollIntervalMinutes: 30,
};

export interface CommitDetail {
  sha: string;
  shortSha: string;
  message: string;
  url: string;
  authoredAt: string;
  isMerge: boolean;
}

export interface RepoCommits {
  nameWithOwner: string;
  url: string;
  commitCount: number;
  commits: CommitDetail[];
}

export interface ContributionsSnapshot {
  login: string;
  date: string;
  commitCount: number;
  onlyNonMerge: boolean;
  fetchedAt: string;
  repos: RepoCommits[];
}

export interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  login: string | null;
  error: string | null;
}
