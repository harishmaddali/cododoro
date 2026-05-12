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
  onlyNonMergeCommits: false,
  reminderTime: "21:00",
  reminderEnabled: true,
  goalCompletedEnabled: true,
  pollIntervalMinutes: 30,
};

export interface ContributionsSnapshot {
  login: string;
  date: string;
  commitCount: number;
  onlyNonMerge: boolean;
  fetchedAt: string;
}

export interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  login: string | null;
  error: string | null;
}
