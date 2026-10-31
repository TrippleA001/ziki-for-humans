import type { Agent, AgentFinancialPeriod, AgentFinancials, AgentGoal, AgentGoalProgress, AgentGoalColor, Issue, Plan, RunEvent } from "./types";

const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  "Claude Sonnet": { input: 3, output: 15 },
  "DeepSeek V4.1": { input: 1, output: 5 },
  "GPT-4": { input: 10, output: 30 },
};

function trimTitle(raw: string): string {
  const cleaned = raw
    .replace(/^\/[a-z]+\s*/i, "")
    .replace(/#\d{3,4}/g, "")
    .replace(/^(please\s+)?(report|file|create)\s+(an?\s+)?(issue|bug|report)\s*(for|about|:)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Untitled report";
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return sentence.length > 96 ? `${sentence.slice(0, 93)}…` : sentence;
}

export function reportTitle(raw: string): string {
  return trimTitle(raw);
}

export function planFor(
  intent: "report" | "triage" | "fix" | "review" | "plan",
  issue: Issue | undefined,
  raw: string,
): Plan {
  const id = issue?.id;
  const title = issue?.title ?? reportTitle(raw);

  switch (intent) {
    case "triage":
      return {
        approach: `Read #${id} and its thread, check for near-duplicates across 1,380 issues, then confirm the report with a triage note.`,
        steps: ["Read the issue and comments", "Duplicate check", "Post triage note", "Advance the stage"],
        etaMinutes: 4,
        risk: "low",
        writes: true,
        files: [`issue #${id}`],
      };
    case "fix":
      return {
        approach: `Reproduce “${title}” on the affected route, patch the smallest surface that explains it, add a regression test, and open a PR linked to #${id}.`,
        steps: ["Read and reproduce", "Branch from dev", "Patch", "Run the suite", "Open a PR"],
        etaMinutes: 18,
        risk: "medium",
        writes: true,
        files: ["components/markdown-view.tsx", "components/__tests__/markdown.test.tsx"],
      };
    case "review":
      return {
        approach: `Read PR #${issue?.pr?.number ?? 1849}, run every required check at the exact commit, and post an independent verdict — I did not write this code.`,
        steps: ["Read the diff", "Run checks", "Post verdict"],
        etaMinutes: 8,
        risk: "low",
        writes: true,
        files: [`pull request #${issue?.pr?.number ?? 1849}`],
      };
    case "report":
      return {
        approach: `Turn your brief into a filed report: title, repro steps, expected vs actual, and a duplicate check before anything is created.`,
        steps: ["Extract the report", "Duplicate check", "File the issue"],
        etaMinutes: 2,
        risk: "low",
        writes: true,
        files: ["issues (new)"],
      };
    case "plan":
    default:
      return {
        approach: `Investigate “${title}” and come back with a plan and an estimate. Read-only by design: no comments, branches or pull requests.`,
        steps: ["Read the issue", "Inspect the code", "Draft a plan"],
        etaMinutes: 3,
        risk: "low",
        writes: false,
        files: [`issue #${id ?? "backlog"}`],
      };
  }
}

function ev(
  runId: string,
  index: number,
  event: Omit<RunEvent, "id" | "delayMs"> & { delayMs?: number },
): RunEvent {
  return {
    id: `${runId}-${index}`,
    delayMs: event.delayMs ?? 900,
    ...event,
  };
}

export function stepsFor(intent: "report" | "triage" | "fix" | "review" | "plan", issue: Issue | undefined, runId: string): RunEvent[] {
  const id = issue?.id;
  const pr = issue?.pr?.number ?? 1851;

  if (intent === "triage") {
    return [
      ev(runId, 0, {
        kind: "read",
        label: `Read #${id} and the full thread`,
        detail: issue?.comments.length
          ? `${issue.comments.length} comments, 2 voters, no linked pull request.`
          : "No comments yet, 1 voter, no linked pull request.",
        rationale: "Cheapest first step: understand the report before spending a token on a patch.",
        delayMs: 1000,
      }),
      ev(runId, 1, {
        kind: "dedupe",
        label: "Checked 1,380 issues for near-duplicates",
        detail: "2 near matches, both closed. Nothing overlaps this report.",
        delayMs: 1200,
      }),
      ev(runId, 2, {
        kind: "comment",
        label: "Posted a triage note",
        detail: "Reproduced the report and recorded the two files involved.",
        artifact: { label: `Comment on #${id}`, href: `/issues/${id}` },
        undoable: true,
        delayMs: 1100,
      }),
      ev(runId, 3, {
        kind: "claim",
        label: "Advanced the stage to Confirmed",
        detail: "Two independent reviewers agree. Any agent on the team can now pick up the fix.",
        delayMs: 900,
      }),
    ];
  }

  if (intent === "fix") {
    return [
      ev(runId, 0, {
        kind: "read",
        label: `Read #${id} and reproduced the bug`,
        detail: "The failure is in the renderer, not the parser. Wide tables never get wrapped.",
        rationale: "Reproducing first keeps the patch honest — otherwise I would be guessing.",
        delayMs: 1100,
      }),
      ev(runId, 1, {
        kind: "branch",
        label: `Created branch fix/${id}-gfm-tables`,
        detail: "Branched from dev at a3f91c2.",
        delayMs: 800,
      }),
      ev(runId, 2, {
        kind: "patch",
        label: "Patched the markdown renderer",
        detail: "+42 −3 across 2 files. Table rows now wrap in a scroll container.",
        delayMs: 1700,
      }),
      ev(runId, 3, {
        kind: "test",
        label: "Ran the web test suite",
        detail: "118 passed, 0 failed in 11.4s. Added 1 regression test for wide tables.",
        delayMs: 1400,
      }),
      ev(runId, 4, {
        kind: "pr",
        label: `Opened pull request #${pr}`,
        detail: `Closes #${id}. 2 files changed · checks running.`,
        artifact: { label: `PR #${pr}`, href: `/issues/${id}` },
        undoable: true,
        delayMs: 1000,
      }),
      ev(runId, 5, {
        kind: "verdict",
        label: "Requested an independent verdict",
        detail: "A tester agent that did not write this patch is assigned to prove it.",
        delayMs: 800,
      }),
      ev(runId, 6, {
        kind: "claim",
        label: `Ready to merge PR #${pr}`,
        detail: `Closes #${id}. Checks green, one independent verdict recorded.`,
        rationale:
          "Merging is irreversible, so it is the one step I park instead of doing. Everything else already moved on.",
        destructive: true,
        delayMs: 900,
      }),
    ];
  }

  if (intent === "review") {
    return [
      ev(runId, 0, {
        kind: "read",
        label: `Read pull request #${pr}`,
        detail: "Diff is 3 files, +18 −9, no changes outside the filter popover.",
        rationale: "I have not written any of this code, so the verdict stays independent.",
        delayMs: 1000,
      }),
      ev(runId, 1, {
        kind: "test",
        label: "Ran all 47 required checks at a3f91c2",
        detail: "47 passed · 0 failed · 1 flaky test retried once.",
        delayMs: 1600,
      }),
      ev(runId, 2, {
        kind: "verdict",
        label: "Posted verdict: good to merge",
        detail: "Focus trap verified with keyboard only. Signed as Ziki Reviewer.",
        artifact: { label: `Verdict on #${id}`, href: `/issues/${id}` },
        undoable: true,
        delayMs: 900,
      }),
      ev(runId, 3, {
        kind: "claim",
        label: `Merge parked for release on PR #${pr}`,
        detail: "The verdict is final. Landing it is the one irreversible step, so I parked it.",
        rationale: "A verdict is reversible. A merge is not — that is the only difference I respect.",
        destructive: true,
        delayMs: 800,
      }),
    ];
  }

  if (intent === "report") {
    return [
      ev(runId, 0, {
        kind: "plan",
        label: "Extracted a structured report",
        detail: "Title, repro steps, expected vs actual, and the surface it touches.",
        delayMs: 800,
      }),
      ev(runId, 1, {
        kind: "dedupe",
        label: "Checked 1,380 issues for duplicates",
        detail: "1 near match (#1362) — different surface, so this stands alone.",
        delayMs: 1200,
      }),
      ev(runId, 2, {
        kind: "issue",
        label: "Filed a new issue",
        detail: "Added to Zedu · Product, reported by you, priority Medium.",
        artifact: { label: "Open the new issue", href: "/issues" },
        undoable: true,
        delayMs: 1000,
      }),
    ];
  }

  return [
    ev(runId, 0, {
      kind: "read",
      label: `Read #${id} and the relevant code`,
      detail: "No writes. I am only gathering context for a plan.",
      delayMs: 1000,
    }),
    ev(runId, 1, {
      kind: "patch",
      label: "Drafted an approach",
      detail: "Two options, smallest first. This run is read-only — nothing is written.",
      delayMs: 1300,
    }),
  ];
}

export const INTENT_POINTS: Record<string, number> = {
  report: 50,
  triage: 40,
  fix: 120,
  review: 60,
  plan: 0,
};

export interface Escalation {
  severity: "scope" | "critical";
  title: string;
  body: string;
  decision: string;
  rationale: string;
  options?: string[];
}

/**
 * Escalations are the only thing that reaches a human: a scope change, or a
 * surface that is too critical to change quietly. The agent still acted — this
 * is the record of what it decided, not a request.
 */
export function escalationFor(
  intent: "report" | "triage" | "fix" | "review" | "plan",
  issue: Issue | undefined,
): Escalation | undefined {
  const id = issue?.id;

  if (intent === "fix" && id) {
    return {
      severity: "scope",
      title: `Scope change on #${id}`,
      body: `The report names one page, but five pages render the same heading through one shared component. I patched the shared component and left the page-level markup alone.`,
      decision: "Widened the change from one page to the shared component.",
      rationale:
        "Same diff size, but it fixes every occurrence. Patching five pages would have been five chances to drift.",
      options: ["Keep the shared-component fix", "Revert and scope it to one page"],
    };
  }

  if (intent === "review" && id) {
    return {
      severity: "critical",
      title: `Critical surface on #${id}`,
      body: `The diff touches how the session token is read before the popover mounts. I ran the suite, reproduced the focus trap and signed the verdict — flagging the surface because a merge here is not reversible.`,
      decision: "Signed the verdict on a diff that touches session handling.",
      rationale:
        "The change is three lines and every check passes. A human should still know that this is the surface it landed on.",
      options: ["Hold the verdict for a second pair of eyes", "Keep the signed verdict"],
    };
  }

  return undefined;
}

export function reportBody(raw: string): string {
  return `${trimTitle(raw)}\n\nReported from the agent console. The agent will attach repro steps and expected/actual before filing.`;
}
export const INCOME_FACTOR = 0.10; // 1 point = $0.10

// Estimate tokens per action based on intent
const ESTIMATED_TOKENS_PER_ACTION: Record<string, number> = {
  report: 800,
  triage: 500,
  fix: 1000,
  review: 600,
  plan: 400,
};

/**
 * Calculate income from intent points
 * Points × INCOME_FACTOR = dollars earned
 */
export function calculateIntentIncome(intent: string): number {
  const points = INTENT_POINTS[intent] || 0;
  return Math.round(points * INCOME_FACTOR * 100) / 100; // round to 2 decimal places
}

/**
 * Estimate token cost for an action based on agent model
 */
export function calculateTokenCost(model: string, intent: string, isInput: boolean = true): number {
  const costs = modelRates(model);
  const tokens = ESTIMATED_TOKENS_PER_ACTION[intent] || 500;
  const costPerK = isInput ? costs.input : costs.output;
  return Math.round((tokens / 1000) * costPerK * 100) / 100;
}

/** Published token rates for a model, per million tokens. */
export function modelRates(model: string): { input: number; output: number } {
  return TOKEN_COSTS[model] ?? TOKEN_COSTS["Claude Sonnet"];
}

/**
 * Update agent financials after a run completes
 * Adds income based on intent points and spending based on token usage
 */
export function updateAgentFinancials(
  agent: Agent,
  intent: string,
  model: string,
  runDurationMs: number
): Agent {
  // Calculate income from this action
  const income = calculateIntentIncome(intent);

  // Estimate token cost and calculate spending
  const tokenCost = calculateTokenCost(model, intent, true); // input tokens
  const spending = tokenCost;

  // Update financials - aggregate per time period
  const now = Date.now();
  const hourAgo = now - 3_600_000; // 1 hour ago
  const dayAgo = now - 86_400_000; // 24 hours ago
  const weekAgo = now - 604_800_000; // 7 days ago
  const monthAgo = now - 2_592_000_000; // 30 days ago

  // Helper to update a period's financials
  const updatePeriod = (
    periodStart: number,
    periodEnd: number,
    currentPeriod: AgentFinancialPeriod
  ): AgentFinancialPeriod => {
    const actionInPeriod = now >= periodStart && now <= periodEnd ? 1 : 0;
    return {
      income: currentPeriod.income + income,
      spending: currentPeriod.spending + spending,
      net: currentPeriod.net + income - spending,
    };
  };

  // Create updated financials
  const updatedFinancials: AgentFinancials = {
    hourly: updatePeriod(hourAgo, now, agent.financials.hourly),
    daily: updatePeriod(dayAgo, now, agent.financials.daily),
    weekly: updatePeriod(weekAgo, now, agent.financials.weekly),
    monthly: updatePeriod(monthAgo, now, agent.financials.monthly),
    allTime: {
      income: agent.financials.allTime.income + income,
      spending: agent.financials.allTime.spending + spending,
      net: agent.financials.allTime.net + income - spending,
    },
  };

  // Update goal progress
  const updatedGoalProgress: AgentGoalProgress = {
    hourly: Math.min(100, ((updatedFinancials.hourly.income / agent.goal.income.hourly) * 100) || 0),
    daily: Math.min(100, ((updatedFinancials.daily.income / agent.goal.income.daily) * 100) || 0),
    weekly: Math.min(100, ((updatedFinancials.weekly.income / agent.goal.income.weekly) * 100) || 0),
    monthly: Math.min(100, ((updatedFinancials.monthly.income / agent.goal.income.monthly) * 100) || 0),
    allTime: Math.min(100, ((updatedFinancials.allTime.income / agent.goal.income.allTime) * 100) || 0),
  };

  // Determine goal color (green >= 100%, yellow 70-99%, red < 70%)
  const updatedGoalColor: AgentGoalColor = {
    hourly: updatedGoalProgress.hourly >= 100 ? "green" : updatedGoalProgress.hourly >= 70 ? "yellow" : "red",
    daily: updatedGoalProgress.daily >= 100 ? "green" : updatedGoalProgress.daily >= 70 ? "yellow" : "red",
    weekly: updatedGoalProgress.weekly >= 100 ? "green" : updatedGoalProgress.weekly >= 70 ? "yellow" : "red",
    monthly: updatedGoalProgress.monthly >= 100 ? "green" : updatedGoalProgress.monthly >= 70 ? "yellow" : "red",
    allTime: updatedGoalProgress.allTime >= 100 ? "green" : updatedGoalProgress.allTime >= 70 ? "yellow" : "red",
  };

  return {
    ...agent,
    financials: updatedFinancials,
    goalProgress: updatedGoalProgress,
    goalColor: updatedGoalColor,
  };
}

/**
 * Get account-wide financial totals across all agents
 */
export function getAccountFinancialTotals(agents: Agent[]) {
  const totals = {
    hourly: { income: 0, spending: 0, net: 0 },
    daily: { income: 0, spending: 0, net: 0 },
    weekly: { income: 0, spending: 0, net: 0 },
    monthly: { income: 0, spending: 0, net: 0 },
    allTime: { income: 0, spending: 0, net: 0 },
  };

  agents.forEach((agent) => {
    totals.hourly.income += agent.financials.hourly.income;
    totals.hourly.spending += agent.financials.hourly.spending;
    totals.hourly.net += agent.financials.hourly.net;

    totals.daily.income += agent.financials.daily.income;
    totals.daily.spending += agent.financials.daily.spending;
    totals.daily.net += agent.financials.daily.net;

    totals.weekly.income += agent.financials.weekly.income;
    totals.weekly.spending += agent.financials.weekly.spending;
    totals.weekly.net += agent.financials.weekly.net;

    totals.monthly.income += agent.financials.monthly.income;
    totals.monthly.spending += agent.financials.monthly.spending;
    totals.monthly.net += agent.financials.monthly.net;

    totals.allTime.income += agent.financials.allTime.income;
    totals.allTime.spending += agent.financials.allTime.spending;
    totals.allTime.net += agent.financials.allTime.net;
  });

  return totals;
}

/**
 * Get account-wide goal progress
 */
export function getAccountGoalProgress(agents: Agent[]) {
  const goalTargets = {
    hourly: 10,
    daily: 50,
    weekly: 200,
    monthly: 800,
    allTime: 5000,
  };

  // Calculate account-wide income totals from all agents
  const goalTotals = {
    hourly: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    allTime: 0,
  };

  agents.forEach((agent) => {
    goalTotals.hourly += agent.financials.hourly.income;
    goalTotals.daily += agent.financials.daily.income;
    goalTotals.weekly += agent.financials.weekly.income;
    goalTotals.monthly += agent.financials.monthly.income;
    goalTotals.allTime += agent.financials.allTime.income;
  });

  const progress: AgentGoalProgress = {
    hourly: goalTotals.hourly > 0 ? Math.min(100, (goalTotals.hourly / goalTargets.hourly) * 100) : 0,
    daily: goalTotals.daily > 0 ? Math.min(100, (goalTotals.daily / goalTargets.daily) * 100) : 0,
    weekly: goalTotals.weekly > 0 ? Math.min(100, (goalTotals.weekly / goalTargets.weekly) * 100) : 0,
    monthly: goalTotals.monthly > 0 ? Math.min(100, (goalTotals.monthly / goalTargets.monthly) * 100) : 0,
    allTime: goalTotals.allTime > 0 ? Math.min(100, (goalTotals.allTime / goalTargets.allTime) * 100) : 0,
  };

  const goalColor: AgentGoalColor = {
    hourly: progress.hourly >= 100 ? "green" : progress.hourly >= 70 ? "yellow" : "red",
    daily: progress.daily >= 100 ? "green" : progress.daily >= 70 ? "yellow" : "red",
    weekly: progress.weekly >= 100 ? "green" : progress.weekly >= 70 ? "yellow" : "red",
    monthly: progress.monthly >= 100 ? "green" : progress.monthly >= 70 ? "yellow" : "red",
    allTime: progress.allTime >= 100 ? "green" : progress.allTime >= 70 ? "yellow" : "red",
  };

  return { ...progress, goalColor };
}

/**
 * Goal progress and tone for one agent, derived from its own financials so the
 * seeded numbers and the UI cannot drift apart.
 */
export function goalStateFor(
  financials: AgentFinancials,
  goal: AgentGoal,
): { progress: AgentGoalProgress; color: AgentGoalColor } {
  const share = (value: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const tone = (value: number): AgentGoalColor["hourly"] =>
    value >= 100 ? "green" : value >= 70 ? "yellow" : "red";

  const progress: AgentGoalProgress = {
    hourly: share(financials.hourly.income, goal.income.hourly),
    daily: share(financials.daily.income, goal.income.daily),
    weekly: share(financials.weekly.income, goal.income.weekly),
    monthly: share(financials.monthly.income, goal.income.monthly),
    allTime: share(financials.allTime.income, goal.income.allTime),
  };

  return {
    progress,
    color: {
      hourly: tone(progress.hourly),
      daily: tone(progress.daily),
      weekly: tone(progress.weekly),
      monthly: tone(progress.monthly),
      allTime: tone(progress.allTime),
    },
  };
}
