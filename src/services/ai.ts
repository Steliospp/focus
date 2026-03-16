/** Mock AI service — no real API calls. Simulates delay then returns fake data. */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ClassifyTaskResult {
  taskType: string;
  estimatedMinutes: number;
  isTiny: boolean;
  isProject: boolean;
  subtasks: Array<{ text: string; minutes: number }>;
  suggestedDuration: number;
  requiresBeforePhoto: boolean;
  subject: string | null;
}

export async function classifyTask(_text: string): Promise<ClassifyTaskResult> {
  await delay(1500);
  return {
    taskType: "transformation",
    estimatedMinutes: 25,
    isTiny: false,
    isProject: false,
    subtasks: [
      { text: "Clear the left side", minutes: 8 },
      { text: "Sort items into piles", minutes: 7 },
      { text: "Put things away", minutes: 6 },
      { text: "Wipe the surface", minutes: 4 },
    ],
    suggestedDuration: 25,
    requiresBeforePhoto: true,
    subject: null,
  };
}

export interface VerifyTransformationResult {
  confidenceScore: number;
  verified: boolean;
  verifiedItems: string[];
  uncertainItems: string[];
  triggerFriction: boolean;
}

export async function verifyTransformation(
  _beforeUri: string,
  _afterUri: string,
  _task: unknown
): Promise<VerifyTransformationResult> {
  await delay(2000);
  return {
    confidenceScore: 87,
    verified: true,
    verifiedItems: ["Surface is clearer", "Items organised"],
    uncertainItems: ["Right corner unclear"],
    triggerFriction: false,
  };
}

export interface VerifyScreenshotResult {
  contentDetected: boolean;
  matchesTask: boolean;
  confidenceScore: number;
  triggerFriction: boolean;
}

export async function verifyScreenshot(
  _imageUri: string,
  _task: unknown
): Promise<VerifyScreenshotResult> {
  await delay(2000);
  return {
    contentDetected: true,
    matchesTask: true,
    confidenceScore: 82,
    triggerFriction: false,
  };
}

export async function generateRecallQuestion(_subject: string | null): Promise<string> {
  await delay(1000);
  return "What was the main concept you reviewed today?";
}

export interface FrictionQuestion {
  question: string;
  options: string[];
}

export async function getFrictionQuestions(
  _task: unknown,
  _earlyEnd: boolean,
  _minutesEarly: number
): Promise<FrictionQuestion[]> {
  await delay(1500);
  return [
    {
      question: "You finished early — what happened?",
      options: [
        "Done faster than expected",
        "Got distracted partway",
        "Task was easier than I thought",
        "Honestly didn't really finish",
      ],
    },
    {
      question: "How would you rate your focus?",
      options: [
        "Fully focused the whole time",
        "Mostly focused, minor distractions",
        "Distracted but got it done",
        "Barely focused at all",
      ],
    },
  ];
}
