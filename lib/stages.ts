import { AGENTS, STAGES } from "./data";
import type { CommentKind, EventKind, Issue, Review, Run, RunEvent, Stage } from "./types";
import { clockTime } from "./utils";

/** One thing that happened inside a stage: a comment, or a step from a run. */
export interface StageItem {
  id: string;
  label: string;
  detail?: string;
  /** The agent's own reason for the step, when it gave one. */
  rationale?: string;
  author: string;
  isAgent: boolean;
  at?: string;
  tone: "comment" | "review" | "delivery" | "merge" | "step" | "hold" | "release";
}

export interface StageView {
  stage: Stage;
  label: string;
  hint: string;
  index: number;
  /** `blocked` is a stage the agent parked for a human. */
  state: "done" | "current" | "blocked" | "upcoming";
  actor: string;
  role: string;
  at?: string;
  summary: string;
  items: StageItem[];
}

const COMMENT_STAGE: Record<CommentKind, Stage> = {
  comment: "reported",
  bid: "claimed",
  review: "confirmed",
  verdict: "verdicts",
  delivery: "pr",
  merge: "merged",
};

const COMMENT_TONE: Record<CommentKind, StageItem["tone"]> = {
  comment: "comment",
  bid: "step",
  review: "review",
  verdict: "review",
  delivery: "delivery",
  merge: "merge",
};

function stageOfEventKind(kind: EventKind): Stage {
  switch (kind) {
    case "issue":
      return "reported";
    case "claim":
    case "stop":
    case "handoff":
    case "undo":
      return "claimed";
    case "branch":
    case "patch":
    case "pr":
      return "pr";
    case "test":
    case "verdict":
      return "verdicts";
    case "release":
      return "merged";
    default:
      return "confirmed";
  }
}

/** A parked destructive step always belongs to the merge, whatever its kind. */
function stageOfEvent(event: RunEvent): Stage {
  if (event.destructive || event.held || event.released) return "merged";
  return stageOfEventKind(event.kind);
}

function eventTone(event: RunEvent): StageItem["tone"] {
  if (event.released) return "release";
  if (event.destructive || event.held) return "hold";
  if (event.kind === "verdict" || event.kind === "test") return "review";
  if (event.kind === "pr" || event.kind === "branch" || event.kind === "patch") {
    return "delivery";
  }
  return "step";
}

interface PlacedItem {
  stage: Stage;
  item: StageItem;
}

function placedItems(issue: Issue, runs: Run[], now: number): PlacedItem[] {
  const placed: PlacedItem[] = issue.comments.map((comment) => ({
    stage: COMMENT_STAGE[comment.kind],
    item: {
      id: comment.id,
      label: comment.body,
      detail: comment.meta,
      author: comment.author,
      isAgent: Boolean(comment.isAgent),
      at: comment.at,
      tone: COMMENT_TONE[comment.kind],
    },
  }));

  const seen = new Set<string>();
  for (const run of runs) {
    const agentName = AGENTS.find((agent) => agent.id === run.agentId)?.name ?? "An agent";
    for (const event of run.events) {
      // A live event can appear on more than one run snapshot; keep one copy.
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      placed.push({
        stage: stageOfEvent(event),
        item: {
          id: event.id,
          label: event.label,
          detail: event.detail,
          rationale: event.rationale,
          author: agentName,
          isAgent: true,
          at: event.at && now ? clockTime(event.at) : undefined,
          tone: eventTone(event),
        },
      });
    }
  }

  return placed;
}

function agentFromEvents(runs: Run[], stage: Stage): string | undefined {
  for (const run of runs) {
    if (run.events.some((event) => stageOfEvent(event) === stage)) {
      return AGENTS.find((agent) => agent.id === run.agentId)?.name;
    }
  }
  return undefined;
}

function agentFromComments(issue: Issue, stage: Stage): string | undefined {
  return [...issue.comments]
    .reverse()
    .find((comment) => comment.isAgent && COMMENT_STAGE[comment.kind] === stage)?.author;
}

/**
 * The lifecycle for one issue: who or what moved it through each stage, plus
 * every comment and agent step that happened inside that stage. Seeded
 * comments and live run events are merged, so the strip stays truthful after
 * a run in the browser.
 */
export function stageTimeline(
  issue: Issue,
  runs: Run[],
  reviews: Review[] = [],
  /**
   * Wall clock for live timestamps. Zero on the server and on the first client
   * render, so times appear after mount instead of breaking hydration.
   */
  now = 0,
): StageView[] {
  const issueRuns = runs.filter((run) => run.issueId === issue.id);
  const placed = placedItems(issue, issueRuns, now);
  const stageIndex = STAGES.findIndex((entry) => entry.key === issue.stage);

  const issueReviews = reviews.filter((review) => review.issueId === issue.id);
  const parkedReview = issueReviews.find(
    (review) => review.kind === "hold" && !review.resolvedAt,
  );
  const releasedReview = issueReviews.find(
    (review) => review.kind === "hold" && review.outcome === "released",
  );

  const events = issueRuns.flatMap((run) => run.events);
  const parked = Boolean(parkedReview) || events.some((event) => event.destructive && !event.released);
  const released =
    Boolean(releasedReview) || events.some((event) => event.released || event.kind === "release");

  // A parked step lives on the review, not on a run, when the run is done.
  const mergedHasHold = placed.some(
    (entry) => entry.stage === "merged" && entry.item.tone === "hold",
  );
  if (parkedReview && !mergedHasHold) {
    placed.push({
      stage: "merged",
      item: {
        id: parkedReview.id,
        label: parkedReview.title,
        detail: parkedReview.body,
        author: AGENTS.find((agent) => agent.id === parkedReview.agentId)?.name ?? "An agent",
        isAgent: true,
        at: now ? clockTime(parkedReview.createdAt) : undefined,
        tone: "hold",
      },
    });
  }
  if (releasedReview) {
    placed.push({
      stage: "merged",
      item: {
        id: `${releasedReview.id}-release`,
        label: "You released the parked merge",
        detail: "The merge was applied and attributed to you.",
        author: "You",
        isAgent: false,
        at:
          releasedReview.resolvedAt && now
            ? clockTime(releasedReview.resolvedAt)
            : undefined,
        tone: "release",
      },
    });
  }

  return STAGES.map((entry, index) => {
    const items = placed
      .filter((item) => item.stage === entry.key)
      .map((item) => item.item);

    const state: StageView["state"] =
      index < stageIndex
        ? "done"
        : index === stageIndex
          ? "current"
          : parked && entry.key === "merged"
            ? "blocked"
            : "upcoming";

    let actor = "—";
    let role = "nobody yet";
    let summary = "Nothing has happened here yet.";

    if (entry.key === "reported") {
      actor = issue.reporter;
      role = issue.idea ? "filed an idea" : "filed the report";
      summary = `Filed on ${issue.reported} with a reproduction and the surface it touches.`;
    }

    if (entry.key === "confirmed") {
      const agent = agentFromComments(issue, "confirmed") ?? agentFromEvents(issueRuns, "confirmed");
      const passed = Boolean(agent) || index < stageIndex;
      actor = agent ?? (passed ? "Independent reviewers" : "—");
      role = passed ? "confirmed the report" : "not confirmed";
      summary = passed
        ? "Triage reproduced the report, checked for duplicates and set the scope."
        : "No agent has confirmed this report yet.";
    }

    if (entry.key === "claimed") {
      const agent = issue.assignee ?? agentFromEvents(issueRuns, "claimed");
      actor = agent ?? "—";
      role = agent ? "holds the claim" : "unclaimed";
      summary = agent
        ? `${agent} claimed it, posted a plan and started without asking.`
        : "No agent holds this claim yet.";
    }

    if (entry.key === "pr") {
      const agent = issue.assignee ?? agentFromEvents(issueRuns, "pr");
      actor = issue.pr ? (agent ?? "—") : "—";
      role = issue.pr ? "opened the change" : "no change yet";
      summary = issue.pr
        ? `PR #${issue.pr.number} on ${issue.pr.branch} · checks ${issue.pr.checks}.`
        : "No pull request is linked yet.";
    }

    if (entry.key === "verdicts") {
      const agent = agentFromEvents(issueRuns, "verdicts");
      actor = issue.verdicts ? (agent ?? "Independent agents") : "—";
      role = issue.verdicts ? "proved the change" : "not proven yet";
      summary = issue.verdicts
        ? `${issue.verdicts.passed} of ${issue.verdicts.total} independent verdicts passed.`
        : "No independent verdict has been recorded yet.";
    }

    if (entry.key === "merged") {
      if (parked) {
        actor = "You";
        role = "decision parked";
        summary =
          "The agent parked the merge — the one irreversible step it will not take alone. Everything before it is finished.";
      } else if (issue.stage === "merged") {
        actor = released ? "You" : (issue.assignee ?? "An agent");
        role = "released the merge";
        summary = released
          ? "You released the parked step and the merge was applied."
          : "The change is merged and the release is recorded in the audit trail.";
      } else {
        actor = "—";
        role = "not merged";
        summary = "Not merged yet.";
      }
    }

    return {
      stage: entry.key,
      label: entry.label,
      hint: entry.hint,
      index,
      state,
      actor,
      role,
      at: entry.key === "reported" ? issue.reported : items.at(-1)?.at,
      summary,
      items,
    };
  });
}
