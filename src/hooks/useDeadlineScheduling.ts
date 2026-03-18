import { useAppStore, type Task } from '../store/useAppStore';

export function useDeadlineScheduling() {
  const tasks = useAppStore((s) => s.tasks);

  // Get parent tasks with deadlines, sorted by urgency
  const getUpcomingDeadlines = (): Task[] => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter((t) => t.hardDeadline && !t.parentTaskId && t.hardDeadline >= today)
      .sort((a, b) => (a.hardDeadline! > b.hardDeadline! ? 1 : -1));
  };

  // Find sessions that are overdue (scheduled before today, still todo)
  const getMissedSessions = (): Task[] => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(
      (t) => t.parentTaskId && t.scheduledDate && t.scheduledDate < today && t.status === 'todo'
    );
  };

  // Get progress for a parent task
  const getParentProgress = (parentTaskId: string) => {
    const sessions = tasks.filter((t) => t.parentTaskId === parentTaskId);
    const completed = sessions.filter((t) => t.status === 'completed').length;
    return { completed, total: sessions.length, sessions };
  };

  // Build existing load map (date -> total scheduled minutes)
  const getExistingLoadByDate = (): Record<string, number> => {
    const load: Record<string, number> = {};
    for (const t of tasks) {
      const date = t.scheduledDate || (t.deadline ? t.deadline.split('T')[0] : null);
      if (date && t.status !== 'completed' && t.status !== 'failed') {
        load[date] = (load[date] || 0) + t.estimatedMinutes;
      }
    }
    return load;
  };

  // Get urgency level for a deadline
  const getUrgencyLevel = (hardDeadline: string): 'red' | 'amber' | 'green' => {
    const today = new Date();
    const deadline = new Date(hardDeadline + 'T00:00:00');
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 2) return 'red';
    if (daysLeft <= 5) return 'amber';
    return 'green';
  };

  const getDaysUntil = (hardDeadline: string): number => {
    const today = new Date();
    const deadline = new Date(hardDeadline + 'T00:00:00');
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return {
    getUpcomingDeadlines,
    getMissedSessions,
    getParentProgress,
    getExistingLoadByDate,
    getUrgencyLevel,
    getDaysUntil,
  };
}
