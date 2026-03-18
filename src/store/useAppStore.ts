import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TaskCategory =
  | "study"
  | "writing"
  | "coding"
  | "practice"
  | "chores"
  | "fitness"
  | "creative"
  | "work"
  | "errands"
  | "other";
export type TaskStatus = "todo" | "active" | "completed" | "late" | "failed";
export type ProofType = "photo" | "written" | "honor";
export type Difficulty = "easy" | "medium" | "hard";
export type ProofStrictness = "strict" | "normal" | "relaxed";
export type Priority = "low" | "medium" | "high" | "urgent";
export type StrictnessLevel = "flexible" | "standard" | "deep_focus" | "hardcore";

export interface Subject {
  id: string;
  name: string;
  color: string;
  teacherName?: string;
}

export interface RecurringConfig {
  frequency: "daily" | "weekly" | "custom";
  daysOfWeek?: number[];
  interval?: number;
  endDate?: string;
}

export interface PhotoPrompt {
  id: string;
  stepId?: string;           // links to subtask.id for multi-step tasks
  stepIndex?: number;        // 0-based index for mapping before IDs are assigned
  photoTiming: "start" | "during" | "end";
  photoPrompt: string;       // user-facing instruction
  whatAILooksFor: string;    // grading rubric for this specific photo
  requiresPhoto: boolean;   // false = skip photo, use written instead
}

export interface CapturedPhoto {
  promptId: string;
  imageBase64: string;
  capturedAt: string;
}

export interface AIAnalysis {
  taskType: string;
  gradingCriteria: string[];
  whatGoodLooksLike: string;
  estimatedDifficulty: Difficulty;
  proofSuggestions: string[];
  recommendedProofType?: ProofType;
  photoPrompts?: PhotoPrompt[];
}

export interface ProofSubmission {
  type: "photo" | "written";
  capturedPhotos?: CapturedPhoto[];
  beforeImageBase64?: string;  // legacy compat
  afterImageBase64?: string;   // legacy compat
  writtenSummary?: string;
  submittedAt: string;
}

export interface AIGrade {
  score: number;
  passed: boolean;
  comment: string;
  strengths: string[];
  improvements: string[];
  unlocksApps: boolean;
}

export interface ReflectionQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface Subtask {
  id: string;
  name: string;
  estimatedMinutes: number;
  proofType: ProofType;
  waitMinutesAfter: number; // 0 = no wait, >0 = passive wait before next step
  waitReason: string;       // e.g. "washing cycle running"
  status: "pending" | "active" | "waiting" | "completed";
  aiGrade: AIGrade | null;
  proofSubmission: ProofSubmission | null;
}

export interface DecompositionResult {
  isMultiStep: boolean;
  reason: string;
  subtasks: Array<{
    name: string;
    estimatedMinutes: number;
    proofType: ProofType;
    waitMinutesAfter: number;
    waitReason: string;
  }>;
}

export interface ParsedSyllabusTask {
  name: string;
  description: string;
  category: TaskCategory;
  estimatedMinutes: number;
  dueDate: string; // ISO date
  proofType: ProofType;
}

export type HonestyReport = "full" | "rushed" | "skipped";
export type ConfidenceLevel = "high" | "medium" | "low";
export type DelayReason =
  | "underestimated"
  | "distracted"
  | "harder_than_expected"
  | "personal_interruption";

export interface Task {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  estimatedMinutes: number;
  deadline: string | null;
  blockedApps: string[];
  proofType: ProofType;
  status: TaskStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  aiAnalysis: AIAnalysis | null;
  proofSubmission: ProofSubmission | null;
  aiGrade: AIGrade | null;
  reflectionAnswers: Record<string, string>;
  finishedEarly?: boolean;
  minutesDelta?: number;
  subtasks?: Subtask[];
  currentSubtaskIndex?: number;
  isMultiStep?: boolean;
  // Parent task fields (the assignment with a deadline)
  hardDeadline?: string;           // "YYYY-MM-DD" date string
  sessionPlan?: {
    totalSessions: number;
    totalEstimatedMinutes: number;
    createdAt: string;
  };
  // Session task fields (children of a parent)
  parentTaskId?: string;           // links back to parent task ID
  sessionIndex?: number;           // 0-based index
  totalSessions?: number;          // for display "2 of 4"
  sessionLabel?: string;           // AI-generated label like "Research Phase"
  // Reflection data
  honestySelfReport?: HonestyReport | null;
  confidenceLevel?: ConfidenceLevel | null;
  delayReason?: DelayReason | null;
  appealText?: string | null;
  finalScore?: number | null;
  streakAdjusted?: boolean;
  knowledgeLog?: string | null;
  /** ISO date string (e.g. "2026-03-17") to assign this task to a specific calendar date */
  scheduledDate?: string;
  // Batch 1: Core flow polish
  priority?: Priority;
  strictnessLevel?: StrictnessLevel;
  proofRetakeCount?: number;
  // Batch 2: Subjects
  subjectId?: string;
  // Batch 3: Recurring
  recurringConfig?: RecurringConfig;
  recurringParentId?: string;
  isRecurringTemplate?: boolean;
  // Proof gate exit tracking
  exitPath?: "proof" | "abandon" | "emergency" | null;
  abandonReason?: string | null;
  emergencyReason?: string | null;
  failedProofAttempts?: number;
  cooldownServed?: boolean;
}

export interface PlannedSession {
  sessionIndex: number;
  label: string;
  scheduledDate: string;
  estimatedMinutes: number;
  description: string;
  proofType: ProofType;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO date "YYYY-MM-DD"
  content: string;
  createdAt: string;
  updatedAt: string;
  type: "auto" | "manual"; // auto = created from task completion, manual = user wrote it
  taskId?: string; // linked task if auto-generated
  taskScore?: number;
  mood?: string; // optional emoji
}

export interface WeeklyInsight {
  id: string;
  weekOf: string; // ISO date of the Monday
  content: string;
  generatedAt: string;
  tasksCompleted: number;
  totalFocusMinutes: number;
}

interface AppState {
  tasks: Task[];
  blockedApps: string[];
  currentTaskId: string | null;
  streakDays: number;
  totalFocusMinutes: number;
  userName: string;
  proofStrictness: ProofStrictness;
  emergencyUnlocksRemaining: number;
  unavailableDays: number[];       // 0=Sun ... 6=Sat
  blockedDates: string[];          // "YYYY-MM-DD" strings
  subjects: Subject[];
  emergencyUnlockReasons: string[];
  isOnboarded: boolean;
  onboardingGoal: string | null;
  blockMode: "blocklist" | "allowlist";
  customApps: string[];
  blockedWebsites: string[];
  journalEntries: JournalEntry[];
  weeklyInsights: WeeklyInsight[];
  weeklyAbandonCount: number;
  lastAbandonWeekStart: string;
  cooldownEndsAt: string | null;

  addJournalEntry: (entry: JournalEntry) => void;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => void;
  removeJournalEntry: (id: string) => void;
  addWeeklyInsight: (insight: WeeklyInsight) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setCurrentTask: (id: string | null) => void;
  setBlockedApps: (apps: string[]) => void;
  setUserName: (name: string) => void;
  setProofStrictness: (s: ProofStrictness) => void;
  useEmergencyUnlock: (reason: string) => void;
  setUnavailableDays: (days: number[]) => void;
  setBlockedDates: (dates: string[]) => void;
  removeSessionsForParent: (parentTaskId: string) => void;
  clearAllData: () => void;
  addFocusMinutes: (mins: number) => void;
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  setIsOnboarded: (v: boolean) => void;
  setOnboardingGoal: (g: string | null) => void;
  setBlockMode: (mode: "blocklist" | "allowlist") => void;
  setCustomApps: (apps: string[]) => void;
  setBlockedWebsites: (websites: string[]) => void;
  adjustStreak: (delta: number) => void;
  abandonTask: (taskId: string, reason: string) => void;
  emergencyUnlockTask: (taskId: string, reason: string) => void;
  clearCooldown: () => void;
  incrementFailedProofAttempts: (taskId: string) => void;
}

const seedTasks: Task[] = [
  {
    id: "seed-1",
    name: "Chemistry Problem Set — Ch.7 Reactions",
    description:
      "Complete problems 1-25 from Chapter 7 on chemical reactions and balancing equations.",
    category: "study",
    estimatedMinutes: 45,
    deadline: null,
    blockedApps: ["Instagram", "TikTok", "YouTube"],
    proofType: "photo",
    status: "completed",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    startedAt: new Date(Date.now() - 86400000 + 3600000).toISOString(),
    completedAt: new Date(Date.now() - 86400000 + 6600000).toISOString(),
    aiAnalysis: {
      taskType: "Chemistry problem-solving assignment",
      gradingCriteria: [
        "All 25 problems attempted with shown work",
        "Chemical equations properly balanced",
        "Correct use of stoichiometry principles",
      ],
      whatGoodLooksLike:
        "A completed problem set with clear handwritten work for each problem, balanced equations, and final answers circled or boxed.",
      estimatedDifficulty: "medium",
      proofSuggestions: [
        "Photo of blank problem set before starting",
        "Photo of completed pages with all work shown",
      ],
    },
    proofSubmission: null,
    aiGrade: {
      score: 92,
      passed: true,
      comment:
        "Excellent work! Clear evidence of thorough engagement with all 25 problems. Work is well-organized.",
      strengths: ["All problems completed", "Clean handwriting and organized layout"],
      improvements: ["Show intermediate steps for complex equations"],
      unlocksApps: true,
    },
    reflectionAnswers: {},
    finishedEarly: true,
    minutesDelta: 5,
  },
  {
    id: "seed-2",
    name: "Chapter 5 Calculus — Integration",
    description:
      "Read Chapter 5 and solve practice integrals. Focus on u-substitution and integration by parts.",
    category: "study",
    estimatedMinutes: 60,
    deadline: null,
    blockedApps: ["Instagram", "TikTok", "Reddit", "Discord"],
    proofType: "written",
    status: "todo",
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    aiAnalysis: null,
    proofSubmission: null,
    aiGrade: null,
    reflectionAnswers: {},
  },
  {
    id: "seed-3",
    name: "English Lit Essay — 1984 Analysis",
    description:
      'Write a 500-word analysis of surveillance themes in George Orwell\'s 1984.',
    category: "writing",
    estimatedMinutes: 40,
    deadline: new Date(Date.now() - 3600000).toISOString(),
    blockedApps: ["Instagram", "Snapchat", "X/Twitter"],
    proofType: "written",
    status: "late",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    startedAt: null,
    completedAt: null,
    aiAnalysis: {
      taskType: "Literary analysis essay writing",
      gradingCriteria: [
        "Clear thesis statement about surveillance themes",
        "At least 3 textual references from the novel",
        "Minimum 500 words with proper structure",
      ],
      whatGoodLooksLike:
        "A well-structured essay with an introduction, body paragraphs containing specific quotes and analysis, and a conclusion tying surveillance themes to broader ideas.",
      estimatedDifficulty: "medium",
      proofSuggestions: [
        "Screenshot of blank document before starting",
        "Screenshot of completed essay with word count visible",
      ],
    },
    proofSubmission: null,
    aiGrade: null,
    reflectionAnswers: {},
  },
];

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: seedTasks,
      blockedApps: [
        "Instagram",
        "TikTok",
        "X/Twitter",
        "Snapchat",
        "YouTube",
        "Reddit",
        "Discord",
      ],
      currentTaskId: null,
      streakDays: 7,
      totalFocusMinutes: 192,
      userName: "Stelios",
      proofStrictness: "normal",
      emergencyUnlocksRemaining: 3,
      unavailableDays: [],
      blockedDates: [],
      subjects: [],
      emergencyUnlockReasons: [],
      isOnboarded: false,
      onboardingGoal: null,
      blockMode: "blocklist",
      customApps: [],
      blockedWebsites: [],
      journalEntries: [],
      weeklyInsights: [],
      weeklyAbandonCount: 0,
      lastAbandonWeekStart: getMondayISO(new Date()),
      cooldownEndsAt: null,

      addJournalEntry: (entry) =>
        set((s) => ({ journalEntries: [...s.journalEntries, entry] })),

      updateJournalEntry: (id, updates) =>
        set((s) => ({
          journalEntries: s.journalEntries.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      removeJournalEntry: (id) =>
        set((s) => ({
          journalEntries: s.journalEntries.filter((e) => e.id !== id),
        })),

      addWeeklyInsight: (insight) =>
        set((s) => ({ weeklyInsights: [...s.weeklyInsights, insight] })),

      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),

      updateTask: (id, updates) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      setCurrentTask: (id) => set({ currentTaskId: id }),

      setBlockedApps: (apps) => set({ blockedApps: apps }),

      setUserName: (name) => set({ userName: name }),

      setProofStrictness: (s) => set({ proofStrictness: s }),

      useEmergencyUnlock: (reason: string) =>
        set((s) => ({
          emergencyUnlocksRemaining: Math.max(0, s.emergencyUnlocksRemaining - 1),
          emergencyUnlockReasons: [...s.emergencyUnlockReasons, reason],
        })),

      setUnavailableDays: (days) => set({ unavailableDays: days }),

      setBlockedDates: (dates) => set({ blockedDates: dates }),

      removeSessionsForParent: (parentTaskId) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.parentTaskId !== parentTaskId),
        })),

      clearAllData: () =>
        set({
          tasks: [],
          currentTaskId: null,
          streakDays: 0,
          totalFocusMinutes: 0,
          emergencyUnlocksRemaining: 3,
        }),

      addFocusMinutes: (mins) =>
        set((s) => ({ totalFocusMinutes: s.totalFocusMinutes + mins })),

      adjustStreak: (delta) =>
        set((s) => ({ streakDays: Math.max(0, s.streakDays + delta) })),

      addSubject: (subject) =>
        set((s) => ({ subjects: [...s.subjects, subject] })),

      updateSubject: (id, updates) =>
        set((s) => ({
          subjects: s.subjects.map((sub) =>
            sub.id === id ? { ...sub, ...updates } : sub
          ),
        })),

      removeSubject: (id) =>
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) })),

      setIsOnboarded: (v) => set({ isOnboarded: v }),

      setOnboardingGoal: (g) => set({ onboardingGoal: g }),

      setBlockMode: (mode) => set({ blockMode: mode }),

      setCustomApps: (apps) => set({ customApps: apps }),

      setBlockedWebsites: (websites) => set({ blockedWebsites: websites }),

      abandonTask: (taskId, reason) =>
        set((s) => {
          const currentMonday = getMondayISO(new Date());
          const sameWeek = s.lastAbandonWeekStart === currentMonday;
          return {
            tasks: s.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "failed" as const,
                    exitPath: "abandon" as const,
                    abandonReason: reason,
                    completedAt: new Date().toISOString(),
                  }
                : t
            ),
            streakDays: 0,
            currentTaskId: null,
            weeklyAbandonCount: (sameWeek ? s.weeklyAbandonCount : 0) + 1,
            lastAbandonWeekStart: currentMonday,
            cooldownEndsAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          };
        }),

      emergencyUnlockTask: (taskId, reason) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "completed" as const,
                  exitPath: "emergency" as const,
                  emergencyReason: reason,
                  completedAt: new Date().toISOString(),
                }
              : t
          ),
          emergencyUnlocksRemaining: Math.max(0, s.emergencyUnlocksRemaining - 1),
          emergencyUnlockReasons: [...s.emergencyUnlockReasons, reason],
          currentTaskId: null,
        })),

      clearCooldown: () => set({ cooldownEndsAt: null }),

      incrementFailedProofAttempts: (taskId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, failedProofAttempts: (t.failedProofAttempts ?? 0) + 1 }
              : t
          ),
        })),
    }),
    {
      name: "focuslock-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
