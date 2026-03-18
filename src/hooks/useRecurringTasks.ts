import { useEffect } from "react";
import { useAppStore, type Task } from "../store/useAppStore";

/**
 * On app open, generates the next 7 days of task instances
 * from recurring templates.
 */
export function useRecurringTasks() {
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);

  useEffect(() => {
    const templates = tasks.filter((t) => t.isRecurringTemplate && t.recurringConfig);
    if (templates.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateKey = toDateKey(date);
      const dayOfWeek = date.getDay(); // 0=Sun

      for (const template of templates) {
        const cfg = template.recurringConfig!;

        // Check if this date should have an instance
        if (cfg.endDate && dateKey > cfg.endDate) continue;

        let shouldGenerate = false;

        if (cfg.frequency === "daily") {
          shouldGenerate = true;
        } else if (cfg.frequency === "weekly") {
          const days = cfg.daysOfWeek ?? [];
          shouldGenerate = days.includes(dayOfWeek);
        } else if (cfg.frequency === "custom" && cfg.interval) {
          const createdDate = new Date(template.createdAt);
          createdDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor(
            (date.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          shouldGenerate = diffDays >= 0 && diffDays % cfg.interval === 0;
        }

        if (!shouldGenerate) continue;

        // Check if instance already exists for this date
        const alreadyExists = tasks.some(
          (t) =>
            t.recurringParentId === template.id &&
            t.scheduledDate === dateKey
        );

        if (alreadyExists) continue;

        // Create instance
        const instance: Task = {
          id: `${template.id}-${dateKey}`,
          name: template.name,
          description: template.description,
          category: template.category,
          estimatedMinutes: template.estimatedMinutes,
          deadline: null,
          blockedApps: template.blockedApps,
          proofType: template.proofType,
          status: "todo",
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
          aiAnalysis: template.aiAnalysis,
          proofSubmission: null,
          aiGrade: null,
          reflectionAnswers: {},
          priority: template.priority,
          strictnessLevel: template.strictnessLevel,
          subjectId: template.subjectId,
          recurringParentId: template.id,
          scheduledDate: dateKey,
        };

        addTask(instance);
      }
    }
  }, []); // Run once on mount
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
