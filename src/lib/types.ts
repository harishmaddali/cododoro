export type View = "dashboard" | "settings";

export interface Settings {
  dailyGoal: number;
  reminderTime: string;
  reminderEnabled: boolean;
  streakAtRiskEnabled: boolean;
  streakAtRiskHour: number;
  goalCompletedEnabled: boolean;
  pollIntervalMinutes: number;
}

export const defaultSettings: Settings = {
  dailyGoal: 3,
  reminderTime: "21:00",
  reminderEnabled: true,
  streakAtRiskEnabled: true,
  streakAtRiskHour: 22,
  goalCompletedEnabled: true,
  pollIntervalMinutes: 15,
};

export interface DayContribution {
  date: string;
  commitCount: number;
}

export interface ContributionsSnapshot {
  login: string;
  today: DayContribution;
  currentStreak: number;
  longestStreak: number;
  last90Days: DayContribution[];
  fetchedAt: string;
}

export interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  login: string | null;
  error: string | null;
}
