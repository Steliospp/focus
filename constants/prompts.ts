export const DAILY_PROMPTS = [
  "What's on your mind…",
  "How are you feeling right now?",
  "What happened today worth remembering?",
  "What are you carrying with you?",
  "What do you want to say out loud?",
  "What would you tell a friend right now?",
  "What's something you noticed today?",
] as const;

export const NOTIFICATION_MESSAGES = [
  "What's on your mind today?",
  "Your daily check-in is waiting.",
  "Take 30 seconds for yourself.",
  "Your journal is listening.",
] as const;

export function getDailyPrompt(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}
