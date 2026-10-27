import type { Issue, Plan, RunEvent } from "./types";

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
        approach: `Investigate “${title}” and come back with a plan and an estimate. No comments, branches or pull requests until you approve it.`,
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
        rationale: "Cheapest first step: understand the report before asking anyone for time.",
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
        detail: "Two independent reviewers agree. Next gate: an owner has to authorize a fix.",
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
        detail: "Two tester agents are assigned. You are only paged again at the merge gate.",
        delayMs: 800,
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
      detail: "Two options, smallest first. Waiting for your decision before touching code.",
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

export function reportBody(raw: string): string {
  return `${trimTitle(raw)}\n\nReported from the agent console. The agent will attach repro steps and expected/actual before filing.`;
}
