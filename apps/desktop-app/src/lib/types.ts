export type Stage = "loading" | "welcome" | "auth" | "onboarding" | "app";
export type Tab = "home" | "repos" | "calendar" | "profile";
export type Overlay =
  | { type: "repo"; id: string }
  | { type: "goals" }
  | { type: "nudges" }
  | { type: "commits" }
  | null;

export interface GhStatus {
  installed: boolean;
  authenticated: boolean;
  login: string | null;
  name: string | null;
  avatarUrl: string | null;
  error: string | null;
}

export interface Filters {
  merge: boolean;
  docs: boolean;
  lock: boolean;
  revert: boolean;
  empty: boolean;
}

export interface Nudges {
  morning: boolean;
  midday: boolean;
  evening: boolean;
  streakWarn: boolean;
  milestone: boolean;
}

export interface Config {
  onboarded: boolean;
  dailyGoal: number;
  streakDays: string[];
  repoGoals: Record<string, number>;
  filters: Filters;
  nudges: Nudges;
  reminderTime: string;
  pollIntervalMinutes: number;
  showMascot: boolean;
}

export const defaultConfig: Config = {
  onboarded: false,
  dailyGoal: 3,
  streakDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  repoGoals: {},
  filters: { merge: true, docs: true, lock: true, revert: false, empty: true },
  nudges: {
    morning: false,
    midday: false,
    evening: true,
    streakWarn: true,
    milestone: true,
  },
  reminderTime: "21:00",
  pollIntervalMinutes: 30,
  showMascot: true,
};

export interface CommitDetail {
  sha: string;
  shortSha: string;
  message: string;
  repo: string;
  url: string;
  authoredAt: string;
}

export interface DayCount {
  date: string;
  count: number;
  level: number;
}

export interface RepoEntry {
  nameWithOwner: string;
  owner: string;
  name: string;
  language: string | null;
  color: string;
  url: string;
  today: number;
  week: number;
  goal: number;
}

export interface BestDay {
  date: string;
  count: number;
}

export interface AppSnapshot {
  login: string;
  name: string | null;
  avatarUrl: string;
  date: string;
  fetchedAt: string;
  todayCount: number;
  dailyGoal: number;
  streak: number;
  longestStreak: number;
  longestRange: string;
  yearTotal: number;
  bestDay: BestDay | null;
  days: DayCount[];
  recentCommits: CommitDetail[];
  repos: RepoEntry[];
}

/** A day with its parsed Date, used by the chart/heatmap components. */
export interface DayPoint {
  date: Date;
  count: number;
  level: number;
}

export function toDayPoints(days: DayCount[]): DayPoint[] {
  return days.map((d) => ({
    date: new Date(d.date + "T00:00:00"),
    count: d.count,
    level: d.level,
  }));
}

export type Status = "on-fire" | "in-progress" | "danger";

export function deriveStatus(snapshot: AppSnapshot): Status {
  if (snapshot.todayCount >= snapshot.dailyGoal && snapshot.dailyGoal > 0) {
    return "on-fire";
  }
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(24, 0, 0, 0);
  const hoursLeft = (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 4 && snapshot.streak > 0) {
    return "danger";
  }
  return "in-progress";
}
