import type {
  AIAnalysis,
  AIGrade,
  ClassificationResult,
  DecompositionResult,
  Horizon,
  JournalEntry,
  ParsedSyllabusTask,
  PhotoPrompt,
  PlannedSession,
  ReflectionQuestion,
  Task,
  TaskArchetype,
  TaskContext,
} from "../store/useAppStore";

const API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY!;
const MODEL = "gpt-4o";

async function callAI(
  messages: { role: string; content: unknown }[],
  maxTokens = 1024
): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Keyword-based fallback classifier ────────────────────────────────
const PRODUCER_KEYWORDS = /\b(essay|write|writing|code|coding|program|design|report|presentation|spreadsheet|build|draft|compose|thesis|paper|homework|problem set|study|read|review)\b/i;
const DOER_KEYWORDS = /\b(laundry|clean|gym|cook|cooking|wash|fold|pack|fix|organize|mow|vacuum|dishes|iron|sweep|mop|workout|exercise|run|jog|swim|bike|groceries|shopping|move|assemble|paint|garden|rake)\b/i;
const HANDLER_KEYWORDS = /\b(call|email|text|book|schedule|pay|buy|respond|register|sign up|signup|cancel|renew|return|send|message|contact|phone|appointment|order|rsvp|reply|submit|apply|enroll)\b/i;

function fallbackClassify(taskName: string): ClassificationResult {
  const lower = taskName.toLowerCase();

  if (HANDLER_KEYWORDS.test(lower)) {
    return {
      archetype: "handler",
      outputType: null,
      needsGuidelines: false,
      suggestedWorkTools: null,
      isMultiStep: false,
      steps: null,
      estimatedMinutes: 10,
      blockingLevel: 1,
      proofRequired: false,
      suggestedSessions: 1,
    };
  }

  if (DOER_KEYWORDS.test(lower)) {
    const isLaundry = /laundry/i.test(lower);
    return {
      archetype: "doer",
      outputType: null,
      needsGuidelines: false,
      suggestedWorkTools: null,
      isMultiStep: isLaundry,
      steps: isLaundry
        ? [
            { name: "Sort & load washer", type: "active", estimatedMinutes: 5, photoPrompt: "Photo of loaded washing machine", waitReason: null },
            { name: "Washing cycle", type: "wait", estimatedMinutes: 40, photoPrompt: null, waitReason: "Washer running" },
            { name: "Transfer to dryer", type: "active", estimatedMinutes: 3, photoPrompt: "Photo of loaded dryer", waitReason: null },
            { name: "Drying cycle", type: "wait", estimatedMinutes: 45, photoPrompt: null, waitReason: "Dryer running" },
            { name: "Fold clothes", type: "active", estimatedMinutes: 15, photoPrompt: "Photo of folded clothes", waitReason: null },
            { name: "Put away", type: "active", estimatedMinutes: 5, photoPrompt: "Photo of clothes put away", waitReason: null },
          ]
        : null,
      estimatedMinutes: isLaundry ? 28 : 45,
      blockingLevel: 3,
      proofRequired: true,
      suggestedSessions: 1,
    };
  }

  // Default to producer
  const isEssay = /essay|write|writing|paper|draft|thesis|compose/i.test(lower);
  const isCode = /code|coding|program|build|develop/i.test(lower);
  return {
    archetype: "producer",
    outputType: isEssay ? "essay" : isCode ? "code" : "other",
    needsGuidelines: isEssay,
    suggestedWorkTools: isCode ? ["VS Code", "Terminal"] : isEssay ? ["Google Docs"] : null,
    isMultiStep: false,
    steps: null,
    estimatedMinutes: 45,
    blockingLevel: 3,
    proofRequired: true,
    suggestedSessions: 1,
  };
}

/**
 * Classify a task into one of three archetypes: producer, doer, or handler.
 * Runs instantly when user finishes typing. Drives all proof/blocking logic silently.
 */
export async function classifyTask(taskName: string): Promise<ClassificationResult> {
  try {
    const text = await callAI([
      {
        role: "user",
        content: `Classify this task: "${taskName}"

There are exactly 3 types:
- "producer": User creates something that can be submitted as proof (essay, report, code, design, spreadsheet, studying, reading, problem sets)
- "doer": User physically does something visible but not digital (laundry, gym, cooking, cleaning, groceries, packing, fixing things)
- "handler": User handles something administrative or social (call someone, email, book appointment, pay bill, buy something, respond to messages)

Return ONLY valid JSON:
{
  "archetype": "producer" | "doer" | "handler",
  "outputType": "essay" | "code" | "design" | "other" | null,
  "needsGuidelines": true | false,
  "suggestedWorkTools": ["app name"] | null,
  "isMultiStep": true | false,
  "steps": [
    {
      "name": "step name",
      "type": "active" | "wait",
      "estimatedMinutes": 5,
      "photoPrompt": "what to photograph" | null,
      "waitReason": "why waiting" | null
    }
  ] | null,
  "estimatedMinutes": 45,
  "blockingLevel": 0 | 1 | 2 | 3,
  "proofRequired": true | false,
  "suggestedSessions": 1
}

RULES:
- "handler" tasks: blockingLevel 1, proofRequired false, estimatedMinutes 5-15
- "doer" tasks: blockingLevel 3, proofRequired true. If multi-step (laundry, cooking), include ALL steps with wait phases. estimatedMinutes = total ACTIVE time only.
- "producer" tasks: blockingLevel 3, proofRequired true
- For multi-step doer tasks: "wait" type steps represent passive waits (washer running, oven baking). "active" steps are things the user does.
- photoPrompt: only for "active" doer steps. Describe what to photograph. Very brief.
- outputType: only for producer tasks
- suggestedWorkTools: only for producer tasks
- needsGuidelines: true if producer task might have an assignment sheet
- suggestedSessions: usually 1, more for large producer tasks
- Be aggressive about classifying as "handler" — anything administrative, social, or phone-based`,
      },
    ]);
    return parseJSON<ClassificationResult>(text);
  } catch (error) {
    console.warn("Task classification failed (using fallback):", (error as any)?.message ?? error);
    return fallbackClassify(taskName);
  }
}

// Category-aware fallback criteria when API is unavailable
const FALLBACK_CRITERIA: Record<string, { taskType: string; criteria: string[]; whatGoodLooksLike: string; proofBefore: string; proofAfter: string; proofType: "photo" | "written" | "honor"; photoPrompts?: PhotoPrompt[] }> = {
  study: {
    taskType: "Study / learning session",
    criteria: ["Material thoroughly reviewed", "Notes or problems completed", "Key concepts understood"],
    whatGoodLooksLike: "Clear evidence of engagement with the study material — notes taken, problems solved, or reading completed with understanding.",
    proofBefore: "Photo of blank notebook or unopened textbook",
    proofAfter: "Photo of completed notes or solved problems",
    proofType: "written",
    photoPrompts: [
      { id: "p1", photoTiming: "end", photoPrompt: "Photo of your completed notes or solved problems", whatAILooksFor: "Filled pages with handwritten work, notes, or solved problems showing active engagement", requiresPhoto: true },
    ],
  },
  writing: {
    taskType: "Writing task",
    criteria: ["Draft completed with target word count", "Clear structure and flow", "Main ideas expressed"],
    whatGoodLooksLike: "A written piece that meets the target length with coherent structure, clear arguments or narrative, and proper formatting.",
    proofBefore: "Screenshot of blank document",
    proofAfter: "Screenshot of completed draft with word count visible",
    proofType: "written",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Screenshot of your completed draft with word count visible", whatAILooksFor: "Document with substantial text, visible word count meeting target", requiresPhoto: true }],
  },
  coding: {
    taskType: "Programming / development task",
    criteria: ["Code written and functional", "Core requirements implemented", "Tested and working"],
    whatGoodLooksLike: "Working code that meets the requirements, compiles/runs without errors, and handles the main use cases.",
    proofBefore: "Screenshot of project before changes",
    proofAfter: "Screenshot of working code or passing tests",
    proofType: "written",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Screenshot of your working code or passing tests", whatAILooksFor: "Code editor with new code, terminal with passing tests or running app", requiresPhoto: true }],
  },
  chores: {
    taskType: "Household chore / cleaning task",
    criteria: ["Area visibly cleaner or organized", "All items put away properly", "Task fully completed, not partially done"],
    whatGoodLooksLike: "The space is noticeably transformed — surfaces clear, items organized, laundry folded and put away, dishes done, floor clean.",
    proofBefore: "Photo of the messy area before starting",
    proofAfter: "Photo of the clean, organized result",
    proofType: "photo",
    photoPrompts: [
      { id: "p1", photoTiming: "start", photoPrompt: "Photo of the area before you start — show the current state", whatAILooksFor: "Visible mess, clutter, or disorganization needing attention", requiresPhoto: true },
      { id: "p2", photoTiming: "end", photoPrompt: "Photo of the cleaned/organized result", whatAILooksFor: "Noticeable transformation — surfaces clear, items organized, visibly cleaner", requiresPhoto: true },
    ],
  },
  fitness: {
    taskType: "Fitness / exercise session",
    criteria: ["Full workout completed", "Target reps/duration achieved", "Proper form maintained"],
    whatGoodLooksLike: "A complete workout session with all planned exercises done, target heart rate or reps achieved, and cool-down completed.",
    proofBefore: "Photo or screenshot of workout plan",
    proofAfter: "Photo of completed workout log or fitness tracker summary",
    proofType: "photo",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Photo of your fitness tracker, workout log, or post-workout selfie", whatAILooksFor: "Fitness app showing completed workout, filled log, or evidence of physical exertion", requiresPhoto: true }],
  },
  work: {
    taskType: "Professional / work task",
    criteria: ["Deliverable completed or progressed significantly", "Quality meets professional standards", "All action items addressed"],
    whatGoodLooksLike: "Clear progress on the work item — emails sent, document drafted, presentation built, or meetings completed with action items.",
    proofBefore: "Screenshot of task list or empty document",
    proofAfter: "Screenshot of completed work or sent deliverable",
    proofType: "written",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Screenshot of your completed deliverable or progress", whatAILooksFor: "Visible completed work — document, email, presentation, or checked-off task", requiresPhoto: true }],
  },
  creative: {
    taskType: "Creative project",
    criteria: ["Creative output produced", "Time spent in focused creation", "Progress visible from start to finish"],
    whatGoodLooksLike: "A tangible creative output — art piece progressed, music recorded, design iterated, or content produced with visible creative effort.",
    proofBefore: "Photo of blank canvas, empty project, or starting point",
    proofAfter: "Photo of the creative work produced",
    proofType: "photo",
    photoPrompts: [
      { id: "p1", photoTiming: "start", photoPrompt: "Photo of your blank canvas, empty project, or starting point", whatAILooksFor: "Empty or minimal starting state — blank canvas, empty document", requiresPhoto: true },
      { id: "p2", photoTiming: "end", photoPrompt: "Photo of your creative work in progress or completed", whatAILooksFor: "Visible creative output with clear effort — art, design, writing", requiresPhoto: true },
    ],
  },
  errands: {
    taskType: "Errand / outing task",
    criteria: ["All errands on the list completed", "Items purchased or tasks handled", "Nothing left unfinished"],
    whatGoodLooksLike: "All planned errands completed — groceries bought, packages mailed, appointments attended, or items returned.",
    proofBefore: "Photo of your errand list",
    proofAfter: "Photo of completed errands (bags, receipts, etc.)",
    proofType: "photo",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Photo of completed errands — bags, receipts, or checked-off list", whatAILooksFor: "Evidence of completed errands — purchased items, receipts, mailed packages", requiresPhoto: true }],
  },
  practice: {
    taskType: "Practice / skill-building session",
    criteria: ["Dedicated practice time completed", "Specific skills targeted", "Noticeable improvement or repetition"],
    whatGoodLooksLike: "Focused practice on the target skill with repetition, drills, or exercises completed for the full duration.",
    proofBefore: "Photo of practice setup or starting point",
    proofAfter: "Photo or recording of practice results",
    proofType: "photo",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Photo of your practice results or completed exercises", whatAILooksFor: "Evidence of completed practice — filled drill sheets, instrument setup, or exercises", requiresPhoto: true }],
  },
  other: {
    taskType: "General task",
    criteria: ["Task completed as described", "Genuine effort put in", "End result matches the goal"],
    whatGoodLooksLike: "The described task is done with clear evidence that it was completed thoroughly and with effort.",
    proofBefore: "Document your starting point",
    proofAfter: "Document your finished result",
    proofType: "photo",
    photoPrompts: [{ id: "p1", photoTiming: "end", photoPrompt: "Photo showing your completed task result", whatAILooksFor: "Evidence that the task was completed with genuine effort", requiresPhoto: true }],
  },
};

export async function analyzeTask(task: Partial<Task>, subtaskNames?: string[]): Promise<AIAnalysis> {
  try {
    const subtaskContext = subtaskNames?.length
      ? `\n\nThis is a MULTI-STEP task with these steps:\n${subtaskNames.map((n, i) => `  Step ${i}: "${n}"`).join("\n")}\nGenerate photo prompts for each step that needs visual proof. Use "stepIndex" (0-based) to link prompts to steps.`
      : "";

    const text = await callAI([
      {
        role: "user",
        content: `You are an AI productivity and accountability coach. Analyze this task and determine the best way to verify completion.

Task: ${task.name}
Description: ${task.description}
Category: ${task.category}
Duration: ${task.estimatedMinutes} minutes
Proof type: ${task.proofType}${subtaskContext}

For each step (or for the whole task if single-step), determine:
- Does a photo actually prove this step happened?
- If yes, what SPECIFIC visual evidence would a photo capture?
- When should the photo be taken? "start" = before beginning (e.g. messy room), "during" = while working, "end" = capture the result (most common)
- What exactly should the AI look for when grading this photo?
If a photo cannot meaningfully prove this step (e.g. "think about X", "mental math"), set requiresPhoto: false.

Return ONLY valid JSON (no markdown):
{
  "taskType": "one sentence describing what kind of task this is",
  "gradingCriteria": ["criterion 1", "criterion 2", "criterion 3"],
  "whatGoodLooksLike": "A paragraph describing what genuine completion looks like",
  "estimatedDifficulty": "easy|medium|hard",
  "proofSuggestions": [],
  "recommendedProofType": "photo|written|honor",
  "photoPrompts": [
    {
      "id": "p1",
      ${subtaskNames ? '"stepIndex": 0,' : ""}
      "photoTiming": "start|during|end",
      "photoPrompt": "Specific user-facing instruction — tell them EXACTLY what to photograph",
      "whatAILooksFor": "Specific visual evidence the AI grader will check for",
      "requiresPhoto": true
    }
  ]
}

RULES for photoPrompts:
- Most tasks need 1-2 photos max. Don't over-request.
- "end" timing is most common — capture the result, not the setup.
- Only use "start" for before/after comparisons (cleaning, organizing).
- Make photoPrompt concrete: not "Take a photo" but "Photo of your open textbook on Chapter 5 with notes visible beside it"
- Make whatAILooksFor specific: not "task done" but "Open book on correct chapter, handwritten notes with key concepts"
- For tasks where photos are useless (mental tasks, planning), set requiresPhoto: false
- For recommendedProofType: "photo" for physical/visual tasks, "written" for knowledge tasks, "honor" for simple quick tasks`,
      },
    ]);
    return parseJSON<AIAnalysis>(text);
  } catch (error) {
    console.warn("AI analysis failed (using fallback):", (error as any)?.message ?? error);
    const cat = task.category ?? "other";
    const fb = FALLBACK_CRITERIA[cat] ?? FALLBACK_CRITERIA.other;
    return {
      taskType: fb.taskType,
      gradingCriteria: fb.criteria,
      whatGoodLooksLike: fb.whatGoodLooksLike,
      estimatedDifficulty: "medium",
      proofSuggestions: [fb.proofBefore, fb.proofAfter],
      recommendedProofType: fb.proofType,
      photoPrompts: fb.photoPrompts ?? [],
    };
  }
}

export async function decomposeTask(task: Partial<Task>): Promise<DecompositionResult> {
  try {
    const text = await callAI([
      {
        role: "user",
        content: `Analyze this task and determine if it has multiple distinct sequential steps that should be done one after another. Tasks like laundry, cooking, multi-part cleaning, or multi-stage projects ARE multi-step. Simple tasks like "read chapter 5" or "write an essay" are NOT multi-step.

Task: ${task.name}
Description: ${task.description ?? ""}
Category: ${task.category}

Return ONLY valid JSON:
{
  "isMultiStep": true/false,
  "reason": "brief explanation of why this is or isn't multi-step",
  "subtasks": [
    {
      "name": "step name — be specific and actionable",
      "estimatedMinutes": 5,
      "proofType": "photo",
      "waitMinutesAfter": 0,
      "waitReason": ""
    }
  ]
}

IMPORTANT RULES:
- For laundry: include wash cycle (~40 min wait), dryer cycle (~45 min wait) as waitMinutesAfter
- For cooking: include oven/baking time as wait periods
- For multi-part cleaning: no wait times, just sequential steps
- proofType should be "photo" for physical tasks (chores, fitness), "written" for knowledge tasks, "honor" for quick simple steps
- If isMultiStep is false, return subtasks as an empty array
- Keep subtask names short and action-oriented
- estimatedMinutes = ACTIVE time only (not including wait)`,
      },
    ]);
    return parseJSON<DecompositionResult>(text);
  } catch (error) {
    console.warn("Task decomposition failed (using fallback):", (error as any)?.message ?? error);
    // Smart fallback based on category
    if (task.category === "chores" && task.name?.toLowerCase().includes("laundry")) {
      return {
        isMultiStep: true,
        reason: "Laundry involves multiple sequential steps with machine wait times",
        subtasks: [
          { name: "Sort & load washing machine", estimatedMinutes: 5, proofType: "photo", waitMinutesAfter: 40, waitReason: "Washing cycle running" },
          { name: "Move clothes to dryer", estimatedMinutes: 3, proofType: "photo", waitMinutesAfter: 45, waitReason: "Dryer cycle running" },
          { name: "Fold clothes", estimatedMinutes: 15, proofType: "photo", waitMinutesAfter: 0, waitReason: "" },
          { name: "Put away in drawers/closet", estimatedMinutes: 5, proofType: "photo", waitMinutesAfter: 0, waitReason: "" },
        ],
      };
    }
    // Default: not multi-step
    return { isMultiStep: false, reason: "Could not analyze task", subtasks: [] };
  }
}

export async function gradePhotoProof(
  task: Task,
  photos: Array<{ prompt: PhotoPrompt; imageBase64: string }>,
  // Legacy compat: if no prompts, accept before/after
  legacyBeforeBase64?: string,
  legacyAfterBase64?: string,
): Promise<AIGrade> {
  try {
    const criteria =
      task.aiAnalysis?.gradingCriteria?.join("\n") ??
      "Complete the task thoroughly";

    // Build content array with photos and rubrics
    const content: unknown[] = [];

    if (photos.length > 0) {
      // New prompt-based grading
      photos.forEach((p, i) => {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${p.imageBase64}` },
        });
      });

      const photoDescriptions = photos
        .map((p, i) => `Photo ${i + 1} (${p.prompt.photoTiming}): "${p.prompt.photoPrompt}" — Look for: "${p.prompt.whatAILooksFor}"`)
        .join("\n");

      const isDoer = task.archetype === "doer";
      const leniencyNote = isDoer
        ? `\n\nIMPORTANT: This is a physical/household task. Grade VERY leniently. You're just checking "did this happen?" not "was it perfect?"
- "I can see folded clothes" = pass (90+)
- "I can see a loaded washing machine" = pass (90+)
- "I can see someone at the gym" = pass (90+)
- Any reasonable evidence the task happened = pass
- Only fail if the photo is completely unrelated to the task
- Give benefit of the doubt ALWAYS`
        : "";

      content.push({
        type: "text",
        text: `You are grading task completion based on photo evidence. Each photo was taken at a specific point with a specific purpose.

Task: ${task.name}
Description: ${task.description}
Category: ${task.category}
Grading criteria: ${criteria}
Finished early: ${task.finishedEarly ?? false}

Photos submitted with their expected evidence:
${photoDescriptions}

For each photo, check whether it shows what was expected. Grade based on how well the photos collectively prove the task was completed.${leniencyNote}

Return ONLY valid JSON:
{
  "score": 0-100,
  "passed": true/false,
  "comment": "2-3 sentence honest assessment referencing specific photos",
  "strengths": ["what they did well"],
  "improvements": ["what could be better"],
  "unlocksApps": true/false
}
Score guide: 90-100 = excellent evidence, 70-89 = good evidence, 50-69 = partial, below 50 = insufficient. Pass threshold is 60.`,
      });
    } else if (legacyBeforeBase64 && legacyAfterBase64) {
      // Legacy before/after grading
      content.push(
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${legacyBeforeBase64}` } },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${legacyAfterBase64}` } },
        {
          type: "text",
          text: `Grade this task based on before/after photos.
Task: ${task.name} | Category: ${task.category} | Criteria: ${criteria}
Return ONLY valid JSON: { "score": 0-100, "passed": true/false, "comment": "...", "strengths": ["..."], "improvements": ["..."], "unlocksApps": true/false }`,
        },
      );
    } else {
      throw new Error("No photos provided for grading");
    }

    const text = await callAI([{ role: "user", content }]);
    return parseJSON<AIGrade>(text);
  } catch (error) {
    console.warn("Photo grading failed (using fallback):", (error as any)?.message ?? error);
    return {
      score: 70,
      passed: true,
      comment: "AI grading temporarily unavailable. Default pass applied.",
      strengths: ["Task was attempted"],
      improvements: ["Try again when AI grading is available for detailed feedback"],
      unlocksApps: true,
    };
  }
}

export async function gradeWrittenProof(
  task: Task,
  summary: string
): Promise<AIGrade> {
  try {
    const criteria =
      task.aiAnalysis?.gradingCriteria?.join("\n") ??
      "Complete the task thoroughly";
    const text = await callAI([
      {
        role: "user",
        content: `You are grading someone's written summary of a completed task. This could be ANY type of task — studying, chores, fitness, cooking, errands, creative work, etc. Judge based on what the task actually is.

Task: ${task.name}
Category: ${task.category}
Original description: ${task.description}
Grading criteria:
${criteria}
Written summary: ${summary}
Finished early: ${task.finishedEarly ?? false}

Does their summary show genuine completion? For chores: did they describe what they cleaned? For study: what did they learn? Be practical and fair.

Grade honestly. Return ONLY valid JSON:
{
  "score": 0-100,
  "passed": true/false,
  "comment": "2-3 sentence honest assessment",
  "strengths": ["..."],
  "improvements": ["..."],
  "unlocksApps": true/false
}`,
      },
    ]);
    return parseJSON<AIGrade>(text);
  } catch (error) {
    console.warn("Written grading failed (using fallback):", (error as any)?.message ?? error);
    return {
      score: 70,
      passed: true,
      comment: "AI grading temporarily unavailable. Default pass applied.",
      strengths: ["Task was attempted"],
      improvements: ["Try again when AI grading is available"],
      unlocksApps: true,
    };
  }
}

export async function evaluateAppeal(
  task: Task,
  originalGrade: AIGrade,
  appealText: string
): Promise<AIGrade> {
  try {
    const text = await callAI([
      {
        role: "user",
        content: `You are re-evaluating a task that received a borderline AI score. The user has provided a written explanation of what they actually did. Be fair but maintain standards.

Task: ${task.name}
Description: ${task.description}
Category: ${task.category}
Original AI Score: ${originalGrade.score}/100
Original AI Comment: ${originalGrade.comment}
Original Strengths: ${originalGrade.strengths.join(", ")}
Original Improvements: ${originalGrade.improvements.join(", ")}

User's appeal explanation: "${appealText}"

Re-evaluate based on their explanation. If they provide convincing, specific details about what they did, you may upgrade the score. If the explanation is vague or doesn't address the original concerns, maintain or lower the score.

Return ONLY valid JSON:
{
  "score": 0-100,
  "passed": true/false,
  "comment": "2-3 sentence re-evaluation",
  "strengths": ["..."],
  "improvements": ["..."],
  "unlocksApps": true/false
}
Pass threshold is 75 for appeals.`,
      },
    ]);
    return parseJSON<AIGrade>(text);
  } catch (error) {
    console.warn("Appeal evaluation failed:", (error as any)?.message ?? error);
    return originalGrade;
  }
}

export async function generateReflectionQuestions(
  task: Task,
  grade: AIGrade
): Promise<ReflectionQuestion[]> {
  try {
    const timingStr = task.finishedEarly
      ? `Finished early by ${task.minutesDelta ?? 0} minutes`
      : `Finished late by ${task.minutesDelta ?? 0} minutes`;
    const text = await callAI([
      {
        role: "user",
        content: `Generate 3 multiple choice reflection questions for a student who just completed this task.
Task: ${task.name}
Category: ${task.category}
${timingStr}
AI score: ${grade.score}/100
Apps blocked during session: ${task.blockedApps.join(", ")}
Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "options": ["option A", "option B", "option C", "option D"]
    }
  ]
}
Make questions specific to the task and context. 3 questions max.`,
      },
    ]);
    const parsed = parseJSON<{ questions: ReflectionQuestion[] }>(text);
    return parsed.questions;
  } catch (error) {
    console.warn("Reflection questions failed (using fallback):", (error as any)?.message ?? error);
    return [
      {
        id: "q1",
        question: "How focused were you during this session?",
        options: [
          "Fully focused",
          "Mostly focused",
          "Somewhat distracted",
          "Very distracted",
        ],
      },
      {
        id: "q2",
        question: "How well do you understand the material now?",
        options: [
          "Very confident",
          "Mostly got it",
          "Still confused",
          "Need to revisit",
        ],
      },
      {
        id: "q3",
        question: "Would you change your approach next time?",
        options: [
          "No, it worked well",
          "Maybe minor tweaks",
          "Yes, significant changes",
          "I need a completely different strategy",
        ],
      },
    ];
  }
}

export async function parseSyllabus(syllabusText: string): Promise<ParsedSyllabusTask[]> {
  try {
    const text = await callAI(
      [
        {
          role: "system",
          content: "You are a syllabus parser. You MUST return valid JSON only — no markdown, no explanation, no code fences. Just a raw JSON array.",
        },
        {
          role: "user",
          content: `Parse this syllabus and extract ALL actionable tasks — assignments, exams, readings, projects, labs, quizzes, problem sets, presentations, etc. Be aggressive about extracting tasks: if something looks like it could be homework, a quiz, an exam, a project, or a due date, include it.

For each task return:
- name: Concise task name (e.g. "Problem Set #3 - Ch.6", "Midterm Exam", "Quiz 2 (Ch. 4, 6, 18)")
- description: Brief description with context from syllabus
- category: "study" for readings/problem sets/exam prep, "writing" for essays/reports, "coding" for programming, "practice" for presentations, "work" for group projects
- estimatedMinutes: Realistic active time (problem sets: 60, readings: 30, essays: 90, exam study: 120, quizzes: 45)
- dueDate: ISO date "YYYY-MM-DD". Use the current year (2026) for spring semester dates. Convert month names like "February 10" to "2026-02-10". If ambiguous, pick a reasonable date.
- proofType: "written" for most academic work, "photo" for physical/lab work, "honor" for simple readings

SYLLABUS TEXT:
${syllabusText}

Return a JSON array. Even partial or messy syllabus text should yield tasks. Look for patterns like dates followed by topics, "due" mentions, "quiz", "exam", "problem set", "chapter", "project", etc.`,
        },
      ],
      4096
    );
    const result = parseJSON<ParsedSyllabusTask[]>(text);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    // If AI returned empty, try fallback
    return fallbackParseSyllabus(syllabusText);
  } catch (error) {
    console.warn("Syllabus parsing failed:", (error as any)?.message ?? error);
    // Try regex-based fallback
    return fallbackParseSyllabus(syllabusText);
  }
}

export async function parseSyllabusFromFile(
  base64: string,
  mimeType: string
): Promise<ParsedSyllabusTask[]> {
  try {
    const isImage = mimeType.startsWith("image/");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const content: unknown[] = [
      {
        type: "text",
        text: `You are a syllabus parser. This ${isImage ? "image" : "PDF"} contains a course syllabus. Extract ALL actionable tasks — assignments, exams, readings, projects, labs, quizzes, problem sets, presentations, due dates, etc.

For each task return:
- name: Concise task name (e.g. "Problem Set #3 - Ch.6", "Midterm Exam")
- description: Brief description with context
- category: "study" for readings/problem sets/exam prep, "writing" for essays/reports, "coding" for programming, "practice" for presentations, "work" for group projects
- estimatedMinutes: Realistic active time (problem sets: 60, readings: 30, essays: 90, exam study: 120, quizzes: 45)
- dueDate: ISO date "YYYY-MM-DD". Use year 2026 for spring semester dates. Convert "February 10" to "2026-02-10".
- proofType: "written" for most academic work, "photo" for physical/lab work, "honor" for simple readings

Return ONLY a valid JSON array. No markdown, no explanation. Be aggressive about extracting tasks — if something looks like homework, a quiz, an exam, or has a due date, include it.`,
      },
    ];

    if (isImage) {
      content.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    } else {
      // For PDFs, GPT-4o supports them as file inputs via the image_url type
      content.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }

    const text = await callAI(
      [{ role: "user", content }],
      4096
    );

    const result = parseJSON<ParsedSyllabusTask[]>(text);
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return [];
  } catch (error) {
    console.warn("File syllabus parsing failed:", (error as any)?.message ?? error);
    return [];
  }
}

// ── Deadline-aware scheduling ────────────────────────────────────────

function getAvailableDates(
  startDate: string,
  endDate: string,
  unavailableDays: number[],
  blockedDates: string[],
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const blockedSet = new Set(blockedDates);
  while (current < end) {
    const dateStr = current.toISOString().split("T")[0];
    if (!unavailableDays.includes(current.getDay()) && !blockedSet.has(dateStr)) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function buildFallbackSessions(
  totalMinutes: number,
  availableDates: string[],
  existingLoadByDate: Record<string, number>,
  proofType: "photo" | "written" | "honor" = "written",
): PlannedSession[] {
  // Filter out heavily-loaded dates (>90 min already scheduled)
  const lightDates = availableDates.filter((d) => (existingLoadByDate[d] || 0) <= 90);
  const usableDates = lightDates.length > 0 ? lightDates : availableDates;
  if (usableDates.length === 0) return [];

  // Determine number of sessions: keep each between 30-90 min
  const maxSessionMin = 90;
  const minSessionMin = 30;
  let numSessions = Math.max(1, Math.ceil(totalMinutes / maxSessionMin));
  if (totalMinutes / numSessions < minSessionMin && numSessions > 1) {
    numSessions = Math.max(1, Math.floor(totalMinutes / minSessionMin));
  }
  numSessions = Math.min(numSessions, usableDates.length);

  const perSession = Math.round(totalMinutes / numSessions);
  // Spread sessions evenly across available dates
  const step = Math.max(1, Math.floor(usableDates.length / numSessions));

  const sessions: PlannedSession[] = [];
  for (let i = 0; i < numSessions; i++) {
    const dateIndex = Math.min(i * step, usableDates.length - 1);
    const mins = i === numSessions - 1 ? totalMinutes - perSession * (numSessions - 1) : perSession;
    sessions.push({
      sessionIndex: i,
      label: `Session ${i + 1}`,
      scheduledDate: usableDates[dateIndex],
      estimatedMinutes: Math.max(minSessionMin, mins),
      description: "",
      proofType,
    });
  }
  return sessions;
}

export async function generateSessionPlan(
  task: Partial<Task>,
  hardDeadline: string,
  unavailableDays: number[],
  blockedDates: string[],
  existingLoadByDate: Record<string, number>,
): Promise<PlannedSession[]> {
  const today = new Date().toISOString().split("T")[0];
  const daysAway = Math.ceil(
    (new Date(hardDeadline + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const availableDates = getAvailableDates(today, hardDeadline, unavailableDays, blockedDates);
  if (availableDates.length === 0) {
    return buildFallbackSessions(
      task.estimatedMinutes ?? 60,
      [today],
      existingLoadByDate,
      task.proofType,
    );
  }

  const heavyDates = Object.entries(existingLoadByDate)
    .filter(([, mins]) => mins > 90)
    .map(([date]) => date);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const unavailableDayNames = unavailableDays.map((d) => dayNames[d]).join(", ") || "none";

  try {
    const text = await callAI(
      [
        {
          role: "user",
          content: `You are a scheduling assistant for a student with ADHD. Break a large task into focused work sessions spread across available days before a deadline.

Task: ${task.name}
Description: ${task.description ?? ""}
Category: ${task.category ?? "other"}
Total estimated minutes: ${task.estimatedMinutes ?? 60}
Hard deadline: ${hardDeadline} (${daysAway} days away)
Unavailable weekdays: ${unavailableDayNames}
Blocked specific dates: ${blockedDates.length > 0 ? blockedDates.join(", ") : "none"}
Dates with heavy load (>90 min already): ${heavyDates.length > 0 ? heavyDates.join(", ") : "none"}
Available dates: ${availableDates.join(", ")}

RULES:
- Do NOT schedule on the deadline day itself (${hardDeadline})
- Spread sessions evenly across available dates
- Each session should be 30-90 minutes of active work
- Avoid dates that already have heavy load
- Leave at least 1 buffer day before the deadline if possible
- Give each session a short descriptive label (e.g. "Research Phase", "First Draft", "Review & Polish")
- proofType should match the task type: "photo" for physical tasks, "written" for knowledge tasks, "honor" for simple tasks

Return ONLY valid JSON:
{
  "sessions": [
    {
      "sessionIndex": 0,
      "label": "descriptive label",
      "scheduledDate": "YYYY-MM-DD",
      "estimatedMinutes": 45,
      "description": "what to focus on in this session",
      "proofType": "written"
    }
  ],
  "totalSessions": 3,
  "bufferDays": 1
}`,
        },
      ],
      1024,
    );

    const parsed = parseJSON<{ sessions: PlannedSession[] }>(text);
    if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
      return parsed.sessions;
    }
    throw new Error("AI returned empty sessions");
  } catch (error) {
    console.warn("generateSessionPlan AI failed (using fallback):", (error as any)?.message ?? error);
    return buildFallbackSessions(
      task.estimatedMinutes ?? 60,
      availableDates,
      existingLoadByDate,
      task.proofType,
    );
  }
}

export async function rescheduleRemainingSessions(
  parentTask: Task,
  completedCount: number,
  remainingMinutes: number,
  hardDeadline: string,
  unavailableDays: number[],
  blockedDates: string[],
  existingLoadByDate: Record<string, number>,
): Promise<PlannedSession[]> {
  const today = new Date().toISOString().split("T")[0];
  const availableDates = getAvailableDates(today, hardDeadline, unavailableDays, blockedDates);

  if (availableDates.length === 0) {
    return buildFallbackSessions(remainingMinutes, [today], existingLoadByDate, parentTask.proofType);
  }

  const heavyDates = Object.entries(existingLoadByDate)
    .filter(([, mins]) => mins > 90)
    .map(([date]) => date);

  try {
    const text = await callAI(
      [
        {
          role: "user",
          content: `You are a scheduling assistant. A student missed or fell behind on a multi-session task. Redistribute the remaining work across available days.

Task: ${parentTask.name}
Description: ${parentTask.description}
Category: ${parentTask.category}
Sessions completed so far: ${completedCount}
Remaining minutes of work: ${remainingMinutes}
Hard deadline: ${hardDeadline}
Available dates: ${availableDates.join(", ")}
Dates with heavy load (>90 min already): ${heavyDates.length > 0 ? heavyDates.join(", ") : "none"}

RULES:
- Do NOT schedule on the deadline day itself
- Keep sessions 30-90 minutes
- Spread evenly, avoid overloaded days
- Session indexes should continue from ${completedCount}
- Give each session a descriptive label

Return ONLY valid JSON:
{
  "sessions": [
    {
      "sessionIndex": ${completedCount},
      "label": "descriptive label",
      "scheduledDate": "YYYY-MM-DD",
      "estimatedMinutes": 45,
      "description": "what to focus on",
      "proofType": "written"
    }
  ]
}`,
        },
      ],
      1024,
    );

    const parsed = parseJSON<{ sessions: PlannedSession[] }>(text);
    if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
      return parsed.sessions;
    }
    throw new Error("AI returned empty sessions");
  } catch (error) {
    console.warn("rescheduleRemainingSessions AI failed (using fallback):", (error as any)?.message ?? error);
    const fallback = buildFallbackSessions(
      remainingMinutes,
      availableDates,
      existingLoadByDate,
      parentTask.proofType,
    );
    // Adjust session indexes to continue from completedCount
    return fallback.map((s, i) => ({ ...s, sessionIndex: completedCount + i }));
  }
}

export async function generateWeeklyInsight(
  entries: JournalEntry[],
  tasks: Task[],
  totalMinutes: number,
): Promise<string> {
  try {
    const entrySummaries = entries
      .map((e) => `- [${e.type}] ${e.content.slice(0, 200)}`)
      .join("\n");
    const taskSummaries = tasks
      .map((t) => `- "${t.name}" (score: ${t.aiGrade?.score ?? "n/a"})`)
      .join("\n");

    const text = await callAI([
      {
        role: "user",
        content: `You are a warm, supportive friend reflecting on someone's week. Based on their journal entries and completed tasks, write a personal 2-3 sentence reflection. Be genuine, specific to what they did, and encouraging without being cheesy. Speak directly to them using "you".

Journal entries this week:
${entrySummaries || "(no entries)"}

Tasks completed this week:
${taskSummaries || "(no tasks)"}

Total focus minutes this week: ${totalMinutes}

Write ONLY the 2-3 sentence reflection, nothing else.`,
      },
    ]);
    return text.trim();
  } catch (error) {
    console.warn("Weekly insight generation failed:", (error as Error)?.message ?? error);
    const count = tasks.length;
    if (count === 0) {
      return "A fresh week ahead. Whatever you focus on, you're building momentum just by showing up.";
    }
    return `You completed ${count} task${count === 1 ? "" : "s"} and spent ${totalMinutes} minutes in deep focus this week. Keep building on that momentum.`;
  }
}

// ── Wait phase suggestion ─────────────────────────────────────────────

export interface WaitSuggestion {
  hasSuggestion: boolean;
  taskId: string | null;
  suggestionHeadline: string;
  suggestionSubtext: string;
  isRest: boolean;
}

function fallbackWaitSuggestion(
  freeMinutes: number,
  tasks: Task[],
): WaitSuggestion {
  // Find a task that fits in the time window (with 5 min buffer)
  const available = freeMinutes - 5;
  const candidates = tasks
    .filter(
      (t) =>
        (t.status === "todo" || t.status === "late") &&
        t.estimatedMinutes > 0 &&
        t.estimatedMinutes <= available,
    )
    .sort((a, b) => {
      // Overdue first
      if (a.status === "late" && b.status !== "late") return -1;
      if (b.status === "late" && a.status !== "late") return 1;
      // Then by priority
      const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (prio[a.priority ?? "medium"] ?? 2) - (prio[b.priority ?? "medium"] ?? 2);
    });

  if (candidates.length > 0) {
    const pick = candidates[0];
    return {
      hasSuggestion: true,
      taskId: pick.id,
      suggestionHeadline: `perfect time to ${pick.name.toLowerCase()}`,
      suggestionSubtext: `it'll take about ${pick.estimatedMinutes} min — fits right in`,
      isRest: false,
    };
  }

  // Short handler tasks
  const handlers = tasks.filter(
    (t) => t.archetype === "handler" && t.status === "todo",
  );
  if (handlers.length > 0) {
    const h = handlers[0];
    return {
      hasSuggestion: true,
      taskId: h.id,
      suggestionHeadline: `you've been meaning to ${h.name.toLowerCase()}`,
      suggestionSubtext: `that's a quick thing. do it now?`,
      isRest: false,
    };
  }

  // Rest
  return {
    hasSuggestion: false,
    taskId: null,
    suggestionHeadline: "take a break. you've earned it.",
    suggestionSubtext: `your phone is yours for ${freeMinutes} minutes 🌿`,
    isRest: true,
  };
}

export async function suggestWaitActivity(
  freeMinutes: number,
  tasks: Task[],
): Promise<WaitSuggestion> {
  const pendingTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "late" || t.status === "backlog",
  );

  if (pendingTasks.length === 0) {
    return {
      hasSuggestion: false,
      taskId: null,
      suggestionHeadline: "nothing on your list right now.",
      suggestionSubtext: "want to add something while you wait?",
      isRest: false,
    };
  }

  try {
    const taskSummaries = pendingTasks
      .slice(0, 15)
      .map(
        (t) =>
          `{ id: "${t.id}", name: "${t.name}", status: "${t.status}", minutes: ${t.estimatedMinutes}, priority: "${t.priority ?? "medium"}", archetype: "${t.archetype ?? "doer"}" }`,
      )
      .join("\n");

    const text = await callAI(
      [
        {
          role: "user",
          content: `User has ${freeMinutes} minutes of free time right now (waiting for something like a washer cycle).
Here is their task list:
${taskSummaries}

Suggest the SINGLE best use of this time window.
Criteria:
- Task duration must fit within ${freeMinutes} minutes (leave 5 min buffer)
- Prioritize: overdue (status "late") first, then high priority, then quick handler tasks
- If nothing fits the time window: suggest rest
- Keep the tone warm and casual, like a friend suggesting something

Return ONLY valid JSON:
{
  "hasSuggestion": true,
  "taskId": "the-task-id or null",
  "suggestionHeadline": "short friendly suggestion",
  "suggestionSubtext": "one line of context",
  "isRest": false
}`,
        },
      ],
      512,
    );

    const result = parseJSON<WaitSuggestion>(text);
    if (result && typeof result.suggestionHeadline === "string") {
      return result;
    }
    throw new Error("Invalid suggestion format");
  } catch (error) {
    console.warn("suggestWaitActivity AI failed (using fallback):", (error as Error)?.message ?? error);
    return fallbackWaitSuggestion(freeMinutes, tasks);
  }
}

// ── Urgency Detection ────────────────────────────────────────────────

export interface UrgencyResult {
  horizon: Horizon;
  deadline: string | null; // ISO timestamp
  isUrgent: boolean; // due within 24 hours
}

const TODAY_KEYWORDS = /\b(today|tonight|now|asap|urgent|immediately|this morning|this afternoon|this evening|due today)\b/i;
const SOON_KEYWORDS = /\b(tomorrow|this week|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|due\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
const TIME_PATTERN = /\b(at|by|before)\s+(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i;
const DATE_PATTERN = /\b(due|by)\s+(saturday|sunday|monday|tuesday|wednesday|thursday|friday|tomorrow|tonight)\b/i;

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function getNextDayDate(dayName: string): Date {
  const target = DAY_MAP[dayName.toLowerCase()];
  if (target === undefined) return new Date();
  const now = new Date();
  const current = now.getDay();
  let diff = target - current;
  if (diff <= 0) diff += 7;
  const result = new Date(now);
  result.setDate(result.getDate() + diff);
  result.setHours(23, 59, 0, 0);
  return result;
}

export function detectUrgency(taskText: string): UrgencyResult {
  const lower = taskText.toLowerCase();

  // Check for explicit today signals
  if (TODAY_KEYWORDS.test(lower)) {
    const today = new Date();
    today.setHours(23, 59, 0, 0);

    // Try to extract specific time
    const timeMatch = lower.match(TIME_PATTERN);
    if (timeMatch) {
      let hour = parseInt(timeMatch[2], 10);
      const isPM = timeMatch[4]?.toLowerCase() === "pm";
      const isAM = timeMatch[4]?.toLowerCase() === "am";
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
      today.setHours(hour, timeMatch[3] ? parseInt(timeMatch[3].slice(1), 10) : 0, 0, 0);
    }

    return {
      horizon: "today",
      deadline: today.toISOString(),
      isUrgent: true,
    };
  }

  // Check for this-week / specific day signals
  const dateMatch = lower.match(DATE_PATTERN);
  if (dateMatch) {
    const dayStr = dateMatch[2].toLowerCase();
    if (dayStr === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      const hoursUntil = (tomorrow.getTime() - Date.now()) / (1000 * 60 * 60);
      return {
        horizon: hoursUntil <= 24 ? "today" : "soon",
        deadline: tomorrow.toISOString(),
        isUrgent: hoursUntil <= 24,
      };
    }
    if (dayStr === "tonight") {
      const tonight = new Date();
      tonight.setHours(23, 59, 0, 0);
      return { horizon: "today", deadline: tonight.toISOString(), isUrgent: true };
    }
    const targetDate = getNextDayDate(dayStr);
    const hoursUntil = (targetDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return {
      horizon: hoursUntil <= 24 ? "today" : "soon",
      deadline: targetDate.toISOString(),
      isUrgent: hoursUntil <= 24,
    };
  }

  if (SOON_KEYWORDS.test(lower)) {
    // Extract the day name from SOON_KEYWORDS match
    const dayMatch = lower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (dayMatch) {
      const targetDate = getNextDayDate(dayMatch[1]);
      return {
        horizon: "soon",
        deadline: targetDate.toISOString(),
        isUrgent: false,
      };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return { horizon: "soon", deadline: tomorrow.toISOString(), isUrgent: false };
  }

  // No urgency detected — someday
  return { horizon: "someday", deadline: null, isUrgent: false };
}

// ── Paste List Parser ────────────────────────────────────────────────

export interface ParsedListItem {
  name: string;
  horizon: Horizon;
  deadline: string | null;
  contextName: string | null; // detected project/context name
  isUrgent: boolean;
  subtasks: string[];
}

export interface ParsedListResult {
  items: ParsedListItem[];
  detectedContexts: Array<{ name: string; color: string }>;
  totalTasks: number;
}

const CONTEXT_COLORS = ["#F97316", "#3B82F6", "#A855F7", "#10B981", "#EF4444", "#EC4899", "#6366F1", "#14B8A6"];

export async function parseListText(text: string): Promise<ParsedListResult> {
  try {
    const aiText = await callAI(
      [
        {
          role: "user",
          content: `Parse this freeform task list into structured data. The user copied this from their notes app.

TEXT:
"""
${text}
"""

Analyze the text and return JSON:
{
  "items": [
    {
      "name": "task name",
      "horizon": "today" | "soon" | "someday",
      "deadline": "ISO date string or null",
      "contextName": "project or category name if detected, else null",
      "isUrgent": true/false,
      "subtasks": ["subtask1", "subtask2"] // empty array if none
    }
  ],
  "detectedContexts": [
    { "name": "context name", "color": "#hex" }
  ]
}

Rules:
- Detect project headings (capitalized words, words followed by colons, repeated groupings)
- Detect urgency signals: "URGENT", "tonight", "due Saturday", "by 3pm", etc.
- Horizon: "today" = due today/urgent/tonight. "soon" = has a deadline this week. "someday" = no deadline/pressure.
- Subtasks = indented items under a parent, items with dashes/bullets under a heading
- For contexts, assign colors from this palette: ${CONTEXT_COLORS.join(", ")}
- Personal/life tasks with no project context should have contextName: "life"
- Keep task names concise and clean (strip bullets, dashes, numbers)`,
        },
      ],
      2048,
    );

    const result = parseJSON<ParsedListResult>(aiText);
    if (result?.items && Array.isArray(result.items)) {
      return {
        ...result,
        totalTasks: result.items.length,
      };
    }
    throw new Error("Invalid parse result");
  } catch (error) {
    console.warn("parseListText AI failed (using fallback):", (error as Error)?.message ?? error);
    return fallbackParseList(text);
  }
}

function fallbackParseList(text: string): ParsedListResult {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: ParsedListItem[] = [];
  const contextMap = new Map<string, string>();
  let currentContext: string | null = null;
  let colorIndex = 0;

  for (const line of lines) {
    // Detect headings (all caps, ends with colon, or short capitalized line)
    const isHeading =
      /^[A-Z][A-Za-z0-9 ]{1,30}:?\s*$/.test(line) ||
      line === line.toUpperCase() && line.length < 30 && !/[.!?]/.test(line);

    if (isHeading) {
      const name = line.replace(/:$/, "").trim();
      currentContext = name;
      if (!contextMap.has(name)) {
        contextMap.set(name, CONTEXT_COLORS[colorIndex % CONTEXT_COLORS.length]);
        colorIndex++;
      }
      continue;
    }

    // Skip very short lines
    const cleaned = line.replace(/^[-–—•*·]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    if (cleaned.length < 2) continue;

    // Check if this is a subtask (indented)
    const isIndented = /^\s{2,}/.test(line) || /^[-–—•*·]\s/.test(line);
    if (isIndented && items.length > 0) {
      items[items.length - 1].subtasks.push(cleaned);
      continue;
    }

    const urgency = detectUrgency(cleaned);

    items.push({
      name: cleaned,
      horizon: urgency.horizon,
      deadline: urgency.deadline,
      contextName: currentContext,
      isUrgent: urgency.isUrgent,
      subtasks: [],
    });
  }

  const detectedContexts = Array.from(contextMap.entries()).map(([name, color]) => ({
    name,
    color,
  }));

  // Add "life" for items without a context
  if (items.some((i) => !i.contextName)) {
    if (!detectedContexts.find((c) => c.name === "life")) {
      detectedContexts.push({ name: "life", color: "#78716C" });
    }
    items.forEach((i) => {
      if (!i.contextName) i.contextName = "life";
    });
  }

  return { items, detectedContexts, totalTasks: items.length };
}

function fallbackParseSyllabus(text: string): ParsedSyllabusTask[] {
  const tasks: ParsedSyllabusTask[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const currentYear = new Date().getFullYear();

  const monthMap: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Patterns that indicate actionable items
  const taskPatterns = /\b(problem set|quiz|exam|midterm|final|project|paper|essay|lab|report|presentation|assignment|homework|reading|chapter|due)\b/i;
  const datePattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})\b/i;

  let currentDate: string | null = null;

  for (const line of lines) {
    // Try to extract a date from this line
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const monthStr = dateMatch[1].toLowerCase().replace(".", "");
      const day = parseInt(dateMatch[2], 10);
      const month = monthMap[monthStr];
      if (month !== undefined && day >= 1 && day <= 31) {
        const d = new Date(currentYear, month, day);
        currentDate = d.toISOString().split("T")[0];
      }
    }

    // Check if this line has a task-like pattern
    if (taskPatterns.test(line)) {
      const name = line
        .replace(datePattern, "")
        .replace(/^\s*[-–—•]\s*/, "")
        .trim();

      if (name.length < 3) continue;

      let category: ParsedSyllabusTask["category"] = "study";
      let estimatedMinutes = 45;
      let proofType: ParsedSyllabusTask["proofType"] = "written";

      const lower = name.toLowerCase();
      if (/problem set|homework/i.test(lower)) {
        estimatedMinutes = 60;
        category = "study";
      } else if (/quiz/i.test(lower)) {
        estimatedMinutes = 45;
        category = "study";
        proofType = "honor";
      } else if (/midterm|exam|final/i.test(lower)) {
        estimatedMinutes = 120;
        category = "study";
        proofType = "honor";
      } else if (/essay|paper|report/i.test(lower)) {
        estimatedMinutes = 90;
        category = "writing";
      } else if (/project/i.test(lower)) {
        estimatedMinutes = 90;
        category = "work";
      } else if (/lab/i.test(lower)) {
        estimatedMinutes = 60;
        proofType = "written";
      } else if (/chapter|reading/i.test(lower)) {
        estimatedMinutes = 30;
        proofType = "honor";
      } else if (/presentation/i.test(lower)) {
        estimatedMinutes = 60;
        category = "practice";
      }

      tasks.push({
        name,
        description: "",
        category,
        estimatedMinutes,
        dueDate: currentDate ?? new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        proofType,
      });
    }
  }

  return tasks;
}
