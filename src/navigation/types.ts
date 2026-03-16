/**
 * Shared types for navigation params.
 * Used by RootStackParamList and screen route params.
 */

export interface SubtaskItem {
  text: string;
  minutes: number;
}

export interface TaskData {
  taskTitle: string;
  taskType?: string;
  estimatedMinutes: number;
  isTiny?: boolean;
  isProject?: boolean;
  subtasks?: SubtaskItem[];
  suggestedDuration: number;
  requiresBeforePhoto?: boolean;
  subject?: string | null;
}

export interface SessionSummary {
  taskTitle: string;
  durationMinutes: number;
  completedAt: string;
  verified?: boolean;
  taskType?: string;
  subtasksDone?: number;
  subtasksTotal?: number;
  streak?: number;
  beforeUri?: string | null;
  afterUri?: string | null;
  recallAnswer?: string | null;
  frictionAnswers?: string[];
}

export interface ProjectData {
  projectId: string;
  projectName: string;
  deadline?: string;
  estimatedHours?: number;
  phases?: Array<{ name: string; sessions: string; color: string }>;
}
