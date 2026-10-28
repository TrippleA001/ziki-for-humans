"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AGENTS, ISSUES, SUGGESTED_COMMANDS } from "./data";
import {
  INTENT_POINTS,
  escalationFor,
  planFor,
  reportBody,
  reportTitle,
  stepsFor,
} from "./agent";
import { parseCommand } from "./utils";
import type {
  ActivityItem,
  Agent,
  ChatMessage,
  Directive,
  Intent,
  Issue,
  Plan,
  Review,
  Run,
  RunEvent,
} from "./types";

interface ZikiState {
  agentId: string;
  points: number;
  issues: Issue[];
  directives: Directive[];
  /** Escalations only: scope changes, critical calls and parked destructive steps. */
  reviews: Review[];
  runs: Run[];
  activity: ActivityItem[];
  /** The console thread. Per agent, so switching agents switches conversations. */
  messages: ChatMessage[];
  pending: boolean;
  votes: Record<number, number>;
}

const NOW = Date.now();
const SEED_RUN_ID = "run-seed-1387";

function seedRuns(): Run[] {
  const issue = ISSUES.find((i) => i.id === 1387);
  const steps = stepsFor("triage", issue, SEED_RUN_ID);
  // The workspace is already alive: this run started 40 seconds ago and is
  // mid-flight, so the first thing you see is an agent working.
  return [
    {
      id: SEED_RUN_ID,
      directiveId: "d-seed-1",
      agentId: "reviewer",
      issueId: 1387,
      intent: "triage",
      title: issue?.title ?? "Triage #1387",
      plan: planFor("triage", issue, "/triage #1387"),
      status: "running",
      startedAt: NOW - 40_000,
      steps,
      events: steps.slice(0, 2).map((step, index) => ({
        ...step,
        at: NOW - 40_000 + index * 4000,
      })),
    },
  ];
}

function seedDirectives(): Directive[] {
  return [
    {
      id: "d-seed-1",
      text: "/triage #1387",
      intent: "triage",
      issueId: 1387,
      at: NOW - 40_000,
      status: "running",
      note: "Streaming now",
    },
    {
      id: "d-seed-2",
      text: "/fix #1355",
      intent: "fix",
      issueId: 1355,
      at: NOW - 1000 * 60 * 34,
      status: "done",
      note: "Done · merge parked",
    },
    {
      id: "d-seed-3",
      text: "/triage #1390",
      intent: "triage",
      issueId: 1390,
      at: NOW - 1000 * 60 * 52,
      status: "done",
      note: "Completed",
    },
  ];
}

function seedReviews(): Review[] {
  return [
    {
      id: "rv-hold-1355",
      kind: "hold",
      agentId: "reviewer",
      issueId: 1355,
      title: "Parked the merge on PR #1849",
      body: "The keyboard focus fix is linked, 47/47 checks are green and an independent agent reproduced it at a3f91c2. Landing it is the one irreversible step, so it is parked. Everything else on #1355 is finished.",
      decision: "Left the merge unapplied and kept the branch open.",
      rationale:
        "A revert is cheap before a merge and expensive after one. I will hold the destructive step and keep working on anything else.",
      runId: SEED_RUN_ID.replace("1387", "1355"),
      createdAt: NOW - 1000 * 60 * 33,
    },
    {
      id: "rv-scope-1384",
      kind: "escalation",
      severity: "scope",
      agentId: "reviewer",
      issueId: 1384,
      title: "Scope change on #1384",
      body: "The report names one page, but five pages render the same broken heading through one shared component. I patched the shared component and left the page-level markup alone.",
      decision: "Widened the change from one page to the shared component.",
      rationale:
        "Same diff size, but it fixes every occurrence. Patching five pages would have been five chances to drift.",
      options: ["Keep the shared-component fix", "Revert and scope it to one page"],
      createdAt: NOW - 1000 * 60 * 18,
    },
    {
      id: "rv-critical-1382",
      kind: "escalation",
      severity: "critical",
      agentId: "solver",
      issueId: 1382,
      title: "Critical call on #1382",
      body: "The count fix touches the shared issue query that every facet and every export reads. I verified it against 1,380 fixtures and shipped it, but this is the kind of surface you want to know about.",
      decision: "Changed a shared query rather than patching the tab count.",
      rationale:
        "A local patch would have hidden the same off-by-340 in three other surfaces. The shared query is the real bug.",
      createdAt: NOW - 1000 * 60 * 96,
    },
    {
      id: "rv-hold-1382",
      kind: "hold",
      agentId: "solver",
      issueId: 1382,
      title: "Parked the merge on PR #1847",
      body: "The count now agrees with the API on every tab, and 47/47 checks are green. The merge itself is the only irreversible step, so it waited for you.",
      decision: "Left the merge unapplied and kept the branch open.",
      rationale:
        "A revert is cheap before a merge and expensive after one. The agent finished everything else and moved on.",
      runId: SEED_RUN_ID.replace("1387", "1382"),
      createdAt: NOW - 1000 * 60 * 122,
      resolvedAt: NOW - 1000 * 60 * 118,
      outcome: "released",
    },
  ];
}

function seedActivity(): ActivityItem[] {
  const m = (n: number) => NOW - n * 60 * 1000;
  return [
    {
      id: "s0",
      kind: "read",
      agentId: "reviewer",
      issueId: 1387,
      label: "Reading #1387 and the full thread",
      detail: "2 comments · no linked pull request",
      at: NOW - 30_000,
      live: true,
    },
    {
      id: "s1",
      kind: "dedupe",
      agentId: "reviewer",
      issueId: 1387,
      label: "Checked 1,380 issues for near-duplicates",
      detail: "2 near matches, both closed. Nothing overlaps this report.",
      at: NOW - 20_000,
      live: true,
    },
    {
      id: "s2",
      kind: "patch",
      agentId: "reviewer",
      issueId: 1384,
      label: "Patched the markdown renderer",
      detail: "Decided to fix it now rather than log a follow-up",
      at: m(18),
    },
    {
      id: "s3",
      kind: "pr",
      agentId: "solver",
      issueId: 1355,
      label: "Linked PR #1849 to #1355",
      detail: "47 checks running · merge parked",
      at: m(33),
    },
    {
      id: "s4",
      kind: "verdict",
      agentId: "reviewer",
      issueId: 1355,
      label: "Independent verdict passed on #1355",
      detail: "Reproduced at a3f91c2 · good to merge",
      at: m(34),
    },
    {
      id: "s5",
      kind: "comment",
      agentId: "reviewer",
      issueId: 1390,
      label: "Posted a triage note on #1390",
      detail: "Reproduced · suggested a one-file fix",
      at: m(52),
    },
    {
      id: "s6",
      kind: "test",
      agentId: "solver",
      issueId: 1382,
      label: "Ran checks for #1382",
      detail: "47/47 passed",
      at: m(184),
    },
    {
      id: "s7",
      kind: "issue",
      agentId: "reviewer",
      issueId: 1368,
      label: "Filed a design-feedback idea",
      detail: "#1368 · “A lighter lane for design review”",
      at: m(260),
    },
  ];
}

function seedMessages(): ChatMessage[] {
  const m = (n: number) => NOW - n * 60 * 1000;
  return [
    {
      id: "msg-1",
      agentId: "reviewer",
      role: "you",
      text: "/triage #1387 — the About page ships five h1 headings. Confirm it and tell me what it touches.",
      issueId: 1387,
      at: m(6),
    },
    {
      id: "msg-2",
      agentId: "reviewer",
      role: "agent",
      text: "On it. Reading #1387 and the shared marketing layout first, then checking 1,380 issues for duplicates.",
      issueId: 1387,
      kind: "note",
      at: m(5),
    },
    {
      id: "msg-3",
      agentId: "reviewer",
      role: "agent",
      text: "It is one component — the About page composes five section headings through it. I am confirming the report now; the fix can land as its own run.",
      issueId: 1387,
      kind: "note",
      at: m(2),
    },
  ];
}

const INITIAL: ZikiState = {
  agentId: "reviewer",
  points: 29674.99,
  issues: ISSUES,
  directives: seedDirectives(),
  reviews: seedReviews(),
  runs: seedRuns(),
  activity: seedActivity(),
  messages: seedMessages(),
  pending: false,
  votes: {},
};

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function patchIssueFor(run: Run, issues: Issue[]): Issue[] {
  return issues.map((issue) => {
    if (issue.id !== run.issueId) return issue;
    if (run.intent === "triage") {
      return { ...issue, stage: "confirmed", blockedOn: undefined };
    }
    if (run.intent === "fix") {
      const prNumber = issue.pr?.number ?? 1851;
      return {
        ...issue,
        stage: "pr",
        status: "in_progress",
        blockedOn: `Merge parked on PR #${prNumber} — release it from the inbox`,
        pr: {
          number: prNumber,
          title: `fix: ${issue.title.replace(/^[A-Za-z]+:\s*/, "")}`,
          branch: `fix/${issue.id}-gfm-tables`,
          checks: "47/47",
          href: `/issues/${issue.id}`,
        },
      };
    }
    if (run.intent === "review") {
      return {
        ...issue,
        stage: "verdicts",
        verdicts: { passed: 2, total: 2 },
        blockedOn: "Merge parked — verdicts are in",
      };
    }
    return issue;
  });
}

function merged(issues: Issue[], issueId?: number): Issue[] {
  if (!issueId) return issues;
  return issues.map((issue) =>
    issue.id === issueId
      ? {
          ...issue,
          stage: "merged",
          status: "done",
          blockedOn: undefined,
          verdicts: issue.verdicts ?? { passed: 2, total: 2 },
        }
      : issue,
  );
}

function newIssueFromRun(
  run: Run,
  directive: Directive | undefined,
  issues: Issue[],
): Issue {
  const maxId = Math.max(...issues.map((i) => i.id), 1390);
  return {
    id: maxId + 1,
    title: reportTitle(directive?.text ?? "Untitled report"),
    body: reportBody(directive?.text ?? ""),
    type: "Bug",
    priority: "Medium",
    status: "open",
    stage: "reported",
    votes: 1,
    reported: "just now",
    reporter: "AbdulSamad",
    platform: "Product",
    labels: ["agent-filed"],
    comments: [
      {
        id: uid("cm"),
        author: AGENTS.find((a) => a.id === run.agentId)?.name ?? "Agent",
        initials: "ZR",
        isAgent: true,
        kind: "comment",
        at: "just now",
        body: "Filed from your brief. Repro steps and expected/actual are in the description.",
      },
    ],
  };
}

interface ZikiContextValue {
  state: ZikiState;
  agent: Agent;
  activeRun?: Run;
  issues: Issue[];
  reviews: Review[];
  /** Escalations a human has not touched yet. Nothing waits on them. */
  openReviews: Review[];
  suggestions: typeof SUGGESTED_COMMANDS;
  sendCommand: (text: string, issueId?: number) => void;
  /** Send a chat message to the selected agent and dispatch whatever it asks for. */
  sendMessage: (text: string, issueId?: number) => void;
  releaseHold: (reviewId: string) => void;
  discardHold: (reviewId: string) => void;
  overrideCall: (reviewId: string, option: string) => void;
  acknowledge: (reviewId: string) => void;
  clearReviews: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  takeOver: () => void;
  undoEvent: (runId: string, eventId: string) => void;
  setAgent: (value: string) => void;
  vote: (issueId: number) => void;
  comment: (issueId: number, body: string) => void;
  reset: () => void;
  issueById: (id: number) => Issue | undefined;
}

const ZikiContext = createContext<ZikiContextValue | null>(null);

export function ZikiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ZikiState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const agent = AGENTS.find((a) => a.id === state.agentId) ?? AGENTS[0];

  const activeRun = useMemo(() => {
    const running = state.runs.find((r) => r.status === "running");
    if (running) return running;
    const paused = state.runs.find((r) => r.status === "paused");
    if (paused) return paused;
    return state.runs[0];
  }, [state.runs]);

  const openReviews = useMemo(
    () => state.reviews.filter((r) => !r.resolvedAt),
    [state.reviews],
  );

  const startRun = useCallback(
    (args: {
      directiveId?: string;
      intent: Intent;
      issueId: number;
      plan: Plan;
      agentId: string;
    }) => {
      const { directiveId, intent, issueId, plan, agentId } = args;
      const runId = uid("run");
      const issue = stateRef.current.issues.find((i) => i.id === issueId);
      const steps = stepsFor(
        intent as "triage" | "fix" | "review" | "report" | "plan",
        issue,
        runId,
      );
      const agentName = AGENTS.find((a) => a.id === agentId)?.name ?? "Agent";
      const run: Run = {
        id: runId,
        directiveId: directiveId ?? uid("d"),
        agentId,
        issueId,
        intent,
        title: issue?.title ?? reportTitle("New report"),
        plan,
        status: "running",
        startedAt: Date.now(),
        steps,
        events: [],
      };
      setState((s: ZikiState): ZikiState => ({
        ...s,
        pending: false,
        runs: [run, ...s.runs],
        directives: s.directives.map((d) =>
          d.id === directiveId ? { ...d, status: "running", note: "Streaming now" } : d,
        ),
        activity: [
          {
            id: uid("act"),
            kind: "claim",
            agentId,
            issueId,
            label: `${agentName} claimed ${issueId ? `#${issueId}` : "a new report"} and started`,
            detail: `${plan.etaMinutes} min estimate · ${plan.risk} risk · no gate`,
            at: Date.now(),
            href: issueId ? `/issues/${issueId}` : "/issues",
            live: true,
          } as ActivityItem,
          ...s.activity,
        ].slice(0, 80),
      }));
    },
    [],
  );

  const sendCommand = useCallback(
    (text: string, contextIssueId?: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const parsed = parseCommand(trimmed, contextIssueId ?? 1387);
      const agentId = stateRef.current.agentId;

      if (parsed.intent === "stop") {
        const running = stateRef.current.runs.find((r) => r.status === "running");
        if (!running) return;
        setState((s) => ({
          ...s,
          runs: s.runs.map((r) =>
            r.id === running.id
              ? {
                  ...r,
                  status: "aborted",
                  endedAt: Date.now(),
                  events: [
                    ...r.events,
                    {
                      id: uid("e"),
                      kind: "stop",
                      label: "Stopped by you",
                      detail: "Work halted. The claim is still held until you release it.",
                      delayMs: 0,
                      at: Date.now(),
                    },
                  ],
                }
              : r,
          ),
          directives: s.directives.map((d) =>
            d.id === running.directiveId ? { ...d, status: "aborted", note: "Stopped" } : d,
          ),
          activity: [
            {
              id: uid("act"),
              kind: "stop",
              agentId: running.agentId,
              issueId: running.issueId,
              label: `Run on #${running.issueId} stopped`,
              detail: "Stopped from the console",
              at: Date.now(),
            },
            ...s.activity,
          ],
        }));
        return;
      }

      if (parsed.intent === "handoff") {
        const run = stateRef.current.runs.find(
          (r) => r.status === "running" || r.status === "paused",
        );
        if (!run) return;
        setState((s) => ({
          ...s,
          runs: s.runs.map((r) =>
            r.id === run.id
              ? {
                  ...r,
                  status: "aborted",
                  endedAt: Date.now(),
                  events: [
                    ...r.events,
                    {
                      id: uid("e"),
                      kind: "handoff",
                      label: "Handed the claim to AbdulSamad",
                      detail: "You are the assignee now. The agent is standing by.",
                      delayMs: 0,
                      at: Date.now(),
                    },
                  ],
                }
              : r,
          ),
          issues: s.issues.map((i) =>
            i.id === run.issueId ? { ...i, assignee: "You" } : i,
          ),
          activity: [
            {
              id: uid("act"),
              kind: "handoff",
              agentId: run.agentId,
              issueId: run.issueId,
              label: `Took over #${run.issueId}`,
              detail: "Claim transferred to you",
              at: Date.now(),
            },
            ...s.activity,
          ],
        }));
        return;
      }

      const planIntent = parsed.intent as "triage" | "fix" | "review" | "report" | "plan";
      const directiveId = uid("d");
      const targetIssueId = planIntent === "report" ? undefined : parsed.issueId;
      const directive: Directive = {
        id: directiveId,
        text: trimmed,
        intent: planIntent,
        issueId: targetIssueId,
        at: Date.now(),
        status: "queued",
      };

      setState((s) => ({
        ...s,
        pending: true,
        directives: [directive, ...s.directives].slice(0, 12),
      }));

      // The agent does not ask. It states the plan it is following and starts.
      window.setTimeout(() => {
        const current = stateRef.current;
        const issue = current.issues.find((i) => i.id === targetIssueId);
        const plan = planFor(planIntent, issue, trimmed);

        startRun({
          directiveId,
          intent: planIntent,
          issueId: targetIssueId ?? issue?.id ?? 0,
          plan,
          agentId,
        });
      }, 700);
    },
    [startRun],
  );

  /**
   * The console thread is two-way. A message is both a chat entry and a
   * directive: the agent answers here, and the run streams in the action rail.
   */
  const sendMessage = useCallback(
    (text: string, contextIssueId?: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const agentId = stateRef.current.agentId;
      const parsed = parseCommand(trimmed, contextIssueId ?? 1387);
      const issueId = parsed.issueId;

      setState((s) => ({
        ...s,
        messages: [
          ...s.messages,
          {
            id: uid("msg"),
            agentId,
            role: "you" as const,
            text: trimmed,
            issueId,
            at: Date.now(),
          },
        ].slice(-120),
      }));

      sendCommand(trimmed, contextIssueId);

      const reply =
        parsed.intent === "stop"
          ? "Stopping where I stand. Anything already written stays on the record."
          : parsed.intent === "handoff"
            ? "Handing it over — the claim is yours now."
            : issueId
              ? `On it. I'll work #${issueId} and post the result here when it lands.`
              : "On it. I'll file the report and post the result here when it lands.";

      window.setTimeout(() => {
        setState((s) => ({
          ...s,
          messages: [
            ...s.messages,
            {
              id: uid("msg"),
              agentId,
              role: "agent" as const,
              text: reply,
              issueId,
              kind: "note" as const,
              at: Date.now(),
            },
          ].slice(-120),
        }));
      }, 600);
    },
    [sendCommand],
  );

  /** Reversible change to a single review's resolution state. */
  const resolve = useCallback(
    (reviewId: string, outcome: string) => {
      setState((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === reviewId ? { ...r, outcome, resolvedAt: Date.now() } : r,
        ),
      }));
    },
    [],
  );

  const releaseHold = useCallback(
    (reviewId: string) => {
      const review = stateRef.current.reviews.find((r) => r.id === reviewId);
      if (!review) return;
      setState((s) => {
        const reviews = s.reviews.map((r) =>
          r.id === reviewId ? { ...r, outcome: "released", resolvedAt: Date.now() } : r,
        );
        const runs = s.runs.map((run) =>
          run.id === review.runId
            ? {
                ...run,
                events: run.events.map((e) =>
                  e.id === review.eventId ? { ...e, held: false, released: true } : e,
                ),
              }
            : run,
        );
        return {
          ...s,
          reviews,
          runs,
          issues: merged(s.issues, review.issueId),
          activity: [
            {
              id: uid("act"),
              kind: "release",
              agentId: review.agentId,
              issueId: review.issueId,
              label: review.issueId
                ? `You released the merge on #${review.issueId}`
                : `You released ${review.title}`,
              detail: "Landed by you from the inbox · logged",
              at: Date.now(),
              href: review.issueId ? `/issues/${review.issueId}` : "/inbox",
            },
            ...s.activity,
          ],
        };
      });
    },
    [],
  );

  const discardHold = useCallback(
    (reviewId: string) => {
      const review = stateRef.current.reviews.find((r) => r.id === reviewId);
      if (!review) return;
      setState((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === reviewId ? { ...r, outcome: "discarded", resolvedAt: Date.now() } : r,
        ),
        runs: s.runs.map((run) =>
          run.id === review.runId
            ? {
                ...run,
                events: run.events.map((e) =>
                  e.id === review.eventId
                    ? { ...e, held: false, label: `${e.label} — discarded` }
                    : e,
                ),
              }
            : run,
        ),
        issues: review.issueId
          ? s.issues.map((i) =>
              i.id === review.issueId
                ? {
                    ...i,
                    blockedOn: undefined,
                    status: "open",
                    stage: "confirmed",
                  }
                : i,
            )
          : s.issues,
        activity: [
          {
            id: uid("act"),
            kind: "undo",
            agentId: review.agentId,
            issueId: review.issueId,
            label: `You discarded the parked action on ${review.issueId ? `#${review.issueId}` : "the run"}`,
            detail: "Nothing was landed. The branch stays open.",
            at: Date.now(),
            href: review.issueId ? `/issues/${review.issueId}` : "/inbox",
          },
          ...s.activity,
        ],
      }));
    },
    [],
  );

  const overrideCall = useCallback(
    (reviewId: string, option: string) => {
      const review = stateRef.current.reviews.find((r) => r.id === reviewId);
      if (!review) return;
      setState((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, outcome: `overridden: ${option}`, resolvedAt: Date.now() }
            : r,
        ),
        issues: review.issueId
          ? s.issues.map((i) =>
              i.id === review.issueId
                ? {
                    ...i,
                    comments: [
                      ...i.comments,
                      {
                        id: uid("cm"),
                        author: "You",
                        initials: "AS",
                        kind: "comment" as const,
                        at: "just now",
                        body: `Override: ${option}. The agent re-ran the affected step with your call.`,
                        meta: `overriding “${review.decision ?? review.title}”`,
                      },
                    ],
                  }
                : i,
            )
          : s.issues,
        activity: [
          {
            id: uid("act"),
            kind: "answer",
            agentId: review.agentId,
            issueId: review.issueId,
            label: `You overrode a call on ${review.issueId ? `#${review.issueId}` : "the run"}`,
            detail: `“${option}” · the agent picked it up`,
            at: Date.now(),
            href: review.issueId ? `/issues/${review.issueId}` : "/inbox",
          },
          ...s.activity,
        ],
      }));
    },
    [],
  );

  const acknowledge = useCallback((reviewId: string) => {
    resolve(reviewId, "acknowledged");
  }, [resolve]);

  const clearReviews = useCallback(() => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.resolvedAt ? r : { ...r, outcome: "acknowledged", resolvedAt: Date.now() },
      ),
    }));
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({
      ...s,
      runs: s.runs.map((r) => (r.status === "running" ? { ...r, status: "paused" } : r)),
    }));
  }, []);

  const resume = useCallback(() => {
    setState((s) => ({
      ...s,
      runs: s.runs.map((r) => (r.status === "paused" ? { ...r, status: "running" } : r)),
    }));
  }, []);

  const stop = useCallback(() => {
    sendCommand("/stop");
  }, [sendCommand]);

  const takeOver = useCallback(() => {
    sendCommand("/handoff");
  }, [sendCommand]);

  const undoEvent = useCallback(
    (runId: string, eventId: string) => {
      setState((s) => {
        const run = s.runs.find((r) => r.id === runId);
        const target = run?.events.find((e) => e.id === eventId);
        if (!run || !target) return s;
        return {
          ...s,
          runs: s.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  events: r.events.map((e) =>
                    e.id === eventId ? { ...e, undone: true } : e,
                  ),
                }
              : r,
          ),
          issues:
            target.kind === "pr"
              ? s.issues.map((i) =>
                  i.id === run.issueId ? { ...i, pr: undefined, stage: "confirmed" } : i,
                )
              : s.issues,
          activity: [
            {
              id: uid("act"),
              kind: "undo",
              agentId: run.agentId,
              issueId: run.issueId,
              label: `Reverted: ${target.label}`,
              detail: "Undone by you from the run timeline",
              at: Date.now(),
            },
            ...s.activity,
          ],
        };
      });
    },
    [],
  );

  const setAgent = useCallback((value: string) => {
    setState((s) => ({ ...s, agentId: value }));
  }, []);

  const vote = useCallback((issueId: number) => {
    setState((s) => ({
      ...s,
      votes: { ...s.votes, [issueId]: (s.votes[issueId] ?? 0) + 1 },
    }));
  }, []);

  const comment = useCallback((issueId: number, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      issues: s.issues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              comments: [
                ...issue.comments,
                {
                  id: uid("cm"),
                  author: "You",
                  initials: "AS",
                  kind: "comment" as const,
                  at: "just now",
                  body: trimmed,
                },
              ],
            }
          : issue,
      ),
      activity: [
        {
          id: uid("act"),
          kind: "comment",
          issueId,
          label: `You commented on #${issueId}`,
          detail: trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed,
          at: Date.now(),
          href: `/issues/${issueId}`,
        },
        ...s.activity,
      ],
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      ...INITIAL,
      issues: ISSUES,
      reviews: seedReviews(),
      directives: seedDirectives(),
      runs: seedRuns(),
      activity: seedActivity(),
      messages: seedMessages(),
    });
  }, []);

  const finishRun = useCallback((runId: string) => {
    setState((s: ZikiState): ZikiState => {
      const run = s.runs.find((r) => r.id === runId);
      if (!run || run.status !== "running") return s;
      const agentName = AGENTS.find((a) => a.id === run.agentId)?.name ?? "Agent";
      const directive = s.directives.find((d) => d.id === run.directiveId);
      const gained = INTENT_POINTS[run.intent] ?? 0;
      const patched = patchIssueFor(run, s.issues);
      const filed =
        run.intent === "report" ? newIssueFromRun(run, directive, s.issues) : undefined;
      const issues = filed ? [filed, ...patched] : patched;
      const issue = s.issues.find((i) => i.id === run.issueId);
      const escalation = escalationFor(
        run.intent as "report" | "triage" | "fix" | "review" | "plan",
        issue,
      );

      const newReviews: Review[] = escalation
        ? [
            {
              id: uid("rv"),
              kind: "escalation",
              severity: escalation.severity,
              agentId: run.agentId,
              issueId: run.issueId,
              title: escalation.title,
              body: escalation.body,
              decision: escalation.decision,
              rationale: escalation.rationale,
              options: escalation.options,
              runId: run.id,
              directiveId: run.directiveId,
              createdAt: Date.now(),
            },
          ]
        : [];

      return {
        ...s,
        points: s.points + gained,
        issues,
        reviews: [...newReviews, ...s.reviews].slice(0, 40),
        messages: [
          ...s.messages,
          {
            id: uid("msg"),
            agentId: run.agentId,
            role: "agent" as const,
            issueId: filed?.id ?? run.issueId,
            kind: escalation ? ("escalation" as const) : ("result" as const),
            text: filed
              ? `Filed #${filed.id} — ${filed.title}. It is in the backlog and open for confirmation.`
              : escalation
                ? `Finished #${run.issueId}. ${escalation.title} — it is in your inbox, but nothing is waiting on it.`
                : `Done with #${run.issueId}. ${gained > 0 ? `+${gained} points, everything logged.` : "Nothing was written."}`,
            at: Date.now(),
          },
        ].slice(-120),
        runs: s.runs.map((r) =>
          r.id === runId ? { ...r, status: "done", endedAt: Date.now() } : r,
        ),
        directives: s.directives.map((d) =>
          d.id === run.directiveId ? { ...d, status: "done", note: "Completed" } : d,
        ),
        activity: [
          {
            id: uid("act"),
            kind: run.intent === "fix" ? "pr" : run.intent === "triage" ? "comment" : "verdict",
            agentId: run.agentId,
            issueId: filed?.id ?? run.issueId,
            label: filed
              ? `${agentName} filed #${filed.id}`
              : `${agentName} completed ${run.intent} on #${run.issueId}`,
            detail: gained > 0 ? `+${gained} points · logged in the audit trail` : "Completed",
            at: Date.now(),
            href: filed ? `/issues/${filed.id}` : `/issues/${run.issueId}`,
          } as ActivityItem,
          ...s.activity,
        ].slice(0, 80),
      };
    });
  }, []);

  const pushEvent = useCallback(
    (runId: string, event: RunEvent) => {
      const run = stateRef.current.runs.find((r) => r.id === runId);
      if (!run) return;

      // The one thing an agent will not do alone: something irreversible.
      if (event.destructive) {
        const staged: RunEvent = {
          ...event,
          held: true,
          label: event.label,
          at: Date.now(),
        };
        setState((s: ZikiState): ZikiState => ({
          ...s,
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, events: [...r.events, staged] } : r,
          ),
          reviews: [
            {
              id: uid("rv"),
              kind: "hold",
              agentId: run.agentId,
              issueId: run.issueId,
              title: event.label,
              body:
                event.detail ??
                "This step is irreversible, so the agent parked it instead of doing it.",
              decision: "Parked the destructive step and moved on to everything else.",
              rationale: event.rationale,
              runId,
              eventId: event.id,
              directiveId: run.directiveId,
              createdAt: Date.now(),
            } as Review,
            ...s.reviews,
          ].slice(0, 40),
          messages: [
            ...s.messages,
            {
              id: uid("msg"),
              agentId: run.agentId,
              role: "agent" as const,
              issueId: run.issueId,
              kind: "escalation" as const,
              text: run.issueId
                ? `I parked the merge on #${run.issueId}. It is in your inbox — everything else on it is finished.`
                : "I parked a destructive step. It is in your inbox.",
              at: Date.now(),
            },
          ].slice(-120),
          activity: [
            {
              id: uid("act"),
              kind: event.kind,
              agentId: run.agentId,
              issueId: run.issueId,
              label: event.label,
              detail: "Parked for you · the run continued",
              at: Date.now(),
              href: "/inbox",
              live: true,
            },
            ...s.activity,
          ].slice(0, 80),
        }));
        return;
      }

      setState((s) => {
        const current = s.runs.find((r) => r.id === runId);
        if (!current || current.status !== "running") return s;
        return {
          ...s,
          runs: s.runs.map((r) =>
            r.id === runId ? { ...r, events: [...r.events, { ...event, at: Date.now() }] } : r,
          ),
          activity: [
            {
              id: uid("act"),
              kind: event.kind,
              agentId: current.agentId,
              issueId: current.issueId,
              label: event.label,
              detail: event.detail,
              at: Date.now(),
              href: event.artifact?.href ?? `/issues/${current.issueId}`,
              live: true,
            },
            ...s.activity,
          ].slice(0, 80),
        };
      });
    },
    [],
  );

  // The simulation clock: one step at a time, per running run.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const run of state.runs) {
      if (run.status !== "running") continue;
      const next = run.steps[run.events.length];
      if (!next) {
        timers.push(setTimeout(() => finishRun(run.id), 500));
        continue;
      }
      timers.push(setTimeout(() => pushEvent(run.id, next), next.delayMs));
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [state.runs, pushEvent, finishRun]);

  const value = useMemo<ZikiContextValue>(
    () => ({
      state,
      agent,
      activeRun,
      issues: state.issues,
      reviews: state.reviews,
      openReviews,
      suggestions: SUGGESTED_COMMANDS,
      sendCommand,
      sendMessage,
      releaseHold,
      discardHold,
      overrideCall,
      acknowledge,
      clearReviews,
      pause,
      resume,
      stop,
      takeOver,
      undoEvent,
      setAgent,
      vote,
      comment,
      reset,
      issueById: (id: number) => state.issues.find((i) => i.id === id),
    }),
    [
      state,
      agent,
      activeRun,
      openReviews,
      sendCommand,
      sendMessage,
      releaseHold,
      discardHold,
      overrideCall,
      acknowledge,
      clearReviews,
      pause,
      resume,
      stop,
      takeOver,
      undoEvent,
      setAgent,
      vote,
      comment,
      reset,
    ],
  );

  return <ZikiContext.Provider value={value}>{children}</ZikiContext.Provider>;
}

export function useZiki(): ZikiContextValue {
  const ctx = useContext(ZikiContext);
  if (!ctx) throw new Error("useZiki must be used inside ZikiProvider");
  return ctx;
}
