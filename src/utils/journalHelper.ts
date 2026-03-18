import type { Task, JournalEntry } from "../store/useAppStore";

export function createAutoJournalEntry(task: Task): JournalEntry {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: `journal-${task.id}-${Date.now()}`,
    date: today,
    content: `Completed "${task.name}". ${task.aiGrade?.comment ?? ""}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "auto",
    taskId: task.id,
    taskScore: task.aiGrade?.score,
  };
}
