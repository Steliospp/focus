import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSIONS_KEY = "@focus_sessions";
const BACKLOG_KEY = "@focus_backlog";

export interface Session {
  id: string;
  taskTitle: string;
  taskType?: string;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  durationMinutes: number;
  verified?: boolean;
  [key: string]: unknown;
}

export interface BacklogTask {
  id: string;
  text: string;
  createdAt: string;
}

export async function saveSession(session: Session): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  const list: Session[] = raw ? JSON.parse(raw) : [];
  list.push(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
}

export async function getAllSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function saveBacklogTask(task: BacklogTask): Promise<void> {
  const raw = await AsyncStorage.getItem(BACKLOG_KEY);
  const list: BacklogTask[] = raw ? JSON.parse(raw) : [];
  list.push(task);
  await AsyncStorage.setItem(BACKLOG_KEY, JSON.stringify(list));
}

export async function getBacklogTasks(): Promise<BacklogTask[]> {
  const raw = await AsyncStorage.getItem(BACKLOG_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

/**
 * Streak = number of consecutive days (UTC) with at least one completed session.
 * Today counts; we look backwards from today.
 */
export async function calculateStreak(): Promise<number> {
  const sessions = await getAllSessions();
  const completed = sessions
    .filter((s) => s.completedAt)
    .map((s) => s.completedAt!.slice(0, 10)) // YYYY-MM-DD
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort()
    .reverse();

  if (completed.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  if (completed[0] !== today) return 0;

  let streak = 1;
  let prev = today;
  for (let i = 1; i < completed.length; i++) {
    const d = completed[i];
    const prevDate = new Date(prev);
    const currDate = new Date(d);
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays !== 1) break;
    streak++;
    prev = d;
  }
  return streak;
}
