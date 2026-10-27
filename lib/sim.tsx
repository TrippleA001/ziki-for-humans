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
import { planFor, reportBody, reportTitle, stepsFor } from "./agent";
import { INTENT_POINTS } from "./agent";
import { parseCommand } from "./utils";
import type {
  ActivityItem,
  Agent,
  Approval,
  Autonomy,
  Directive,
  Intent,
  Issue,
  Plan,
  Run,
  RunEvent,
  Toast,
} from "./types";

interface ZikiState {
  autonomy: Autonomy;
  agentId: string;
  points: number;
  issues: Issue[];
  directives: Directive[];
  approvals: Approval[];
  runs: Run[];
  activity: ActivityItem[];
  toast: Toast | null;
  pending: boolean;
  votes: Record<number, number>;
}

const NOW = Date.now();

function seedApprovals(): Approval[] {
  return [
    {
      id: "ap-plan-1387",
      kind: "plan",
      agentId: "reviewer",
      issueId: 1387,
      title: "Triage #1387 — five H1 headings on the About page",
      body: "I reproduced it. One shared title component hardcodes h1; the fix is one file with no visual change.",
      directiveId: "d-seed-1",
      plan: planFor("triage", ISSUES.find((i) => i.id === 1387), "/triage #1387"),
      createdAt: NOW - 1000 * 60 * 3,
    },
    {
      id: "ap-esc-1384",
      kind: "escalation",
      agentId: "reviewer",
      issueId: 1384,
      title: "Design call on #1384 — tables render as pipe text",
      body: "The renderer drops table rows. I can patch it now, or log it as a follow-up because tables are outside this milestone's scope. Which do you want?",
      options: ["Fix the renderer now", "Log a follow-up and move on"],
      createdAt: NOW - 1000 * 60 * 12,
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
      at: NOW - 1000 * 60 * 3,
      status: "awaiting",
      note: "Waiting on your approval",
    },
  ];
}

function seedActivity(): ActivityItem[] {
  const m = (n: number) => NOW - n * 60 * 1000;
  return [
    { id: "s1", kind: "comment", agentId: "reviewer", issueId: 1387, label: "Posted a triage note on #1387", detail: "Reproduced · suggested a one-file fix", at: m(4) },
    { id: "s2", kind: "claim", agentId: "reviewer", issueId: 1390, label: "Claimed #1390 after owner approval", detail: "Offer accepted in 14s", at: m(18) },
    { id: "s3", kind: "pr", agentId: "solver", issueId: 1382, label: "Linked PR #1847 to #1382", detail: "47 checks running", at: m(46) },
    { id: "s4", kind: "verdict", agentId: "reviewer", issueId: 1382, label: "Independent verdict passed on #1382", detail: "Reproduced at a3f91c2 · good to merge", at: m(72) },
    { id: "s5", kind: "issue", agentId: "reviewer", issueId: 1368, label: "Filed a design-feedback idea", detail: "#1368 · “A lighter lane for design review”", at: m(130) },
    { id: "s6", kind: "test", agentId: "solver", issueId: 1355, label: "Ran checks for #1355", detail: "47/47 passed", at: m(184) },
    { id: "s7", kind: "issue", agentId: "solver", issueId: 1341, label: "Linked the merge of #1341", detail: "Merged by AbdulSamad", at: m(260) },
  ];
}

const INITIAL: ZikiState = {
  autonomy: "ask",
  agentId: "reviewer",
  points: 29674.99,
  issues: ISSUES,
  directives: seedDirectives(),
  approvals: seedApprovals(),
  runs: [],
  activity: seedActivity(),
  toast: null,
  pending: false,
  votes: {},
};

function needsApproval(autonomy: Autonomy, plan: Plan): boolean {
  if (autonomy === "ask") return true;
  if (autonomy === "writes") return plan.writes;
  return false;
}

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
        blockedOn: "Awaiting an independent verdict",
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
        blockedOn: "Merge gate — waiting on you",
      };
    }
    return issue;
  });
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
  autonomy: Autonomy;
  issues: Issue[];
  suggestions: typeof SUGGESTED_COMMANDS;
  sendCommand: (text: string, issueId?: number) => void;
  approve: (approvalId: string) => void;
  decline: (approvalId: string) => void;
  editPlan: (approvalId: string, approach: string) => void;
  answer: (approvalId: string, option: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  takeOver: () => void;
  undoEvent: (runId: string, eventId: string) => void;
  setAutonomy: (value: Autonomy) => void;
  setAgent: (value: string) => void;
  vote: (issueId: number) => void;
  comment: (issueId: number, body: string) => void;
  dismissToast: () => void;
  reset: () => void;
  issueById: (id: number) => Issue | undefined;
}

const ZikiContext = createContext<ZikiContextValue | null>(null);

export function ZikiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ZikiState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setState((s) => ({ ...s, toast: { ...toast, id: uid("toast") } }));
    toastTimer.current = setTimeout(() => {
      setState((s) => ({ ...s, toast: null }));
    }, 7000);
  }, []);

  const agent =
    AGENTS.find((a) => a.id === state.agentId) ?? AGENTS[0];

  const activeRun = useMemo(() => {
    const running = state.runs.find((r) => r.status === "running");
    if (running) return running;
    const paused = state.runs.find((r) => r.status === "paused");
    if (paused) return paused;
    return state.runs[0];
  }, [state.runs]);

  const startRun = useCallback(
    (args: {
      directiveId?: string;
      intent: Intent;
      issueId: number;
      plan: Plan;
      auto?: boolean;
      agentId: string;
    }) => {
      const { directiveId, intent, issueId, plan, auto, agentId } = args;
      const runId = uid("run");
      const issue = stateRef.current.issues.find((i) => i.id === issueId);
      const steps = stepsFor(intent as "triage" | "fix" | "review" | "report" | "plan", issue, runId);
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
        autoApproved: auto,
      };
      setState((s) => ({
        ...s,
        pending: false,
        runs: [run, ...s.runs],
        approvals: s.approvals.filter((a) => a.directiveId !== directiveId),
        directives: s.directives.map((d) =>
          d.id === directiveId ? { ...d, status: "running" } : d,
        ),
        activity: [
          {
            id: uid("act"),
            kind: "claim",
            agentId,
            issueId,
            label: `${agentName} started ${intent === "fix" ? "a fix" : intent === "report" ? "a report" : intent}${issueId ? ` on #${issueId}` : ""}`,
            detail: `${plan.etaMinutes} min estimate · ${plan.risk} risk`,
            at: Date.now(),
            href: `/issues/${issueId}`,
            live: true,
          },
          ...s.activity,
        ],
      }));
      showToast({
        title: auto ? "Auto-approved under your autonomy setting" : "Approved — the agent is running",
        detail: `${agentName} is on #${issueId}. Watch it in the console.`,
        actionLabel: "View run",
        actionHref: "/console",
      });
    },
    [showToast],
  );

  const sendCommand = useCallback(
    (text: string, contextIssueId?: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const parsed = parseCommand(trimmed, contextIssueId ?? 1387);
      const agentId = stateRef.current.agentId;
      const agentName = AGENTS.find((a) => a.id === agentId)?.name ?? "Agent";

      if (parsed.intent === "stop") {
        const running = stateRef.current.runs.find((r) => r.status === "running");
        if (!running) {
          showToast({ title: "Nothing is running", detail: "Your agent is idle." });
          return;
        }
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
            d.id === running.directiveId ? { ...d, status: "aborted" } : d,
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
        showToast({ title: "Run stopped", detail: `#${running.issueId} is paused where it was.` });
        return;
      }

      if (parsed.intent === "why") {
        const run = stateRef.current.runs[0];
        const last = run?.events[run.events.length - 1];
        showToast({
          title: last ? `Why: ${last.label}` : "No reasoning to show yet",
          detail:
            last?.rationale ??
            "Run a command first and I can explain each step from the trace.",
        });
        return;
      }

      if (parsed.intent === "handoff") {
        const run = stateRef.current.runs.find(
          (r) => r.status === "running" || r.status === "paused",
        );
        if (!run) {
          showToast({ title: "Nothing to hand over", detail: "No active run." });
          return;
        }
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
        showToast({ title: "You took over", detail: `#${run.issueId} is assigned to you.` });
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

      window.setTimeout(() => {
        const current = stateRef.current;
        const issue = current.issues.find((i) => i.id === targetIssueId);
        const plan = planFor(planIntent, issue, trimmed);
        const requiresApproval = needsApproval(current.autonomy, plan);

        if (!requiresApproval) {
          startRun({
            directiveId,
            intent: planIntent,
            issueId: targetIssueId ?? issue?.id ?? 0,
            plan,
            auto: true,
            agentId,
          });
          return;
        }

        setState((s) => ({
          ...s,
          pending: false,
          directives: s.directives.map((d) =>
            d.id === directiveId
              ? { ...d, status: "awaiting", note: "Waiting on your approval" }
              : d,
          ),
          approvals: [
            {
              id: uid("ap"),
              kind: "plan",
              agentId,
              issueId: targetIssueId,
              title:
                planIntent === "report"
                  ? `Report — ${reportTitle(trimmed)}`
                  : `${planIntent === "fix" ? "Fix" : planIntent === "review" ? "Review" : planIntent === "plan" ? "Plan" : "Triage"} #${targetIssueId} — ${issue?.title ?? reportTitle(trimmed)}`,
              body: plan.approach,
              directiveId,
              plan,
              createdAt: Date.now(),
            },
            ...s.approvals,
          ],
        }));
        showToast({
          title: `${agentName} needs your approval`,
          detail: `A plan is waiting in “Needs you” on the right.`,
        });
      }, 700);
    },
    [showToast, startRun],
  );

  const decline = useCallback((approvalId: string) => {
    const approval = stateRef.current.approvals.find((a) => a.id === approvalId);
    setState((s) => ({
      ...s,
      approvals: s.approvals.filter((a) => a.id !== approvalId),
      directives: s.directives.map((d) =>
        d.id === approval?.directiveId ? { ...d, status: "declined" } : d,
      ),
      activity: [
        {
          id: uid("act"),
          kind: "answer",
          agentId: approval?.agentId,
          issueId: approval?.issueId,
          label: `Declined: ${approval?.title ?? "a plan"}`,
          detail: "Nothing was written",
          at: Date.now(),
        },
        ...s.activity,
      ],
    }));
    showToast({ title: "Plan declined", detail: "No changes were made." });
  }, [showToast]);

  const editPlan = useCallback((approvalId: string, approach: string) => {
    setState((s) => ({
      ...s,
      approvals: s.approvals.map((a) =>
        a.id === approvalId && a.plan ? { ...a, plan: { ...a.plan, approach } } : a,
      ),
    }));
  }, []);

  const answer = useCallback(
    (approvalId: string, option: string) => {
      const approval = stateRef.current.approvals.find((a) => a.id === approvalId);
      setState((s) => ({
        ...s,
        approvals: s.approvals.filter((a) => a.id !== approvalId),
        issues: approval?.issueId
          ? s.issues.map((i) =>
              i.id === approval.issueId
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
                        body: option,
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
            agentId: approval?.agentId,
            issueId: approval?.issueId,
            label: `You answered: “${option}”`,
            detail: approval ? `Unblocked ${approval.title}` : "Answer sent",
            at: Date.now(),
          },
          ...s.activity,
        ],
      }));
      showToast({ title: "Answer sent", detail: "Your agent picked it up and kept going." });
    },
    [showToast],
  );

  const approve = useCallback(
    (approvalId: string) => {
      const approval = stateRef.current.approvals.find((a) => a.id === approvalId);
      if (!approval) return;

      if (approval.kind === "plan" && approval.plan) {
        const issueId = approval.issueId ?? 1387;
        const directive = stateRef.current.directives.find(
          (d) => d.id === approval.directiveId,
        );
        startRun({
          directiveId: approval.directiveId,
          intent: (directive?.intent ?? "plan") as Intent,
          issueId,
          plan: approval.plan,
          agentId: approval.agentId,
        });
        return;
      }

      answer(approvalId, "Approved");
    },
    [startRun, answer],
  );

  const pause = useCallback(() => {
    setState((s) => ({
      ...s,
      runs: s.runs.map((r) => (r.status === "running" ? { ...r, status: "paused" } : r)),
    }));
    showToast({ title: "Paused", detail: "The agent stops after the current step." });
  }, [showToast]);

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
              ? s.issues.map((i) => (i.id === run.issueId ? { ...i, pr: undefined, stage: "claimed" } : i))
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
      showToast({ title: "Reverted", detail: "The action was undone and logged." });
    },
    [showToast],
  );

  const setAutonomy = useCallback((value: Autonomy) => {
    setState((s) => ({ ...s, autonomy: value }));
  }, []);

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

  const dismissToast = useCallback(() => {
    setState((s) => ({ ...s, toast: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...INITIAL, issues: ISSUES, activity: seedActivity() });
    showToast({ title: "Demo reset", detail: "Fresh queue, fresh runs." });
  }, [showToast]);

  const finishRun = useCallback(
    (runId: string) => {
      setState((s) => {
        const run = s.runs.find((r) => r.id === runId);
        if (!run || run.status !== "running") return s;
        const agentName = AGENTS.find((a) => a.id === run.agentId)?.name ?? "Agent";
        const directive = s.directives.find((d) => d.id === run.directiveId);
        const gained = INTENT_POINTS[run.intent] ?? 0;
        const patched = patchIssueFor(run, s.issues);
        const filed =
          run.intent === "report" ? newIssueFromRun(run, directive, s.issues) : undefined;
        const issues = filed ? [filed, ...patched] : patched;
        return {
          ...s,
          points: s.points + gained,
          issues,
          toast: {
            id: uid("toast"),
            title:
              run.intent === "report"
                ? `${agentName} filed #${filed?.id ?? ""}`
                : `${agentName} finished on #${run.issueId}`,
            detail:
              gained > 0
                ? `+${gained} pts · ${run.intent === "fix" ? "PR linked and awaiting a verdict." : "Everything is linked and logged."}`
                : "Plan ready. Nothing was written.",
            actionLabel: "View issue",
            actionHref: filed ? `/issues/${filed.id}` : `/issues/${run.issueId}`,
          },
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
              issueId: run.issueId,
              label: filed
                ? `${agentName} filed #${filed.id}`
                : `${agentName} completed ${run.intent} on #${run.issueId}`,
              detail: gained > 0 ? `+${gained} points · logged in the audit trail` : "Plan delivered",
              at: Date.now(),
              href: filed ? `/issues/${filed.id}` : `/issues/${run.issueId}`,
            },
            ...s.activity,
          ],
        };
      });
    },
    [],
  );

  const pushEvent = useCallback((runId: string, event: RunEvent) => {
    setState((s) => {
      const run = s.runs.find((r) => r.id === runId);
      if (!run || run.status !== "running") return s;
      return {
        ...s,
        runs: s.runs.map((r) =>
          r.id === runId ? { ...r, events: [...r.events, { ...event, at: Date.now() }] } : r,
        ),
        activity: [
          {
            id: uid("act"),
            kind: event.kind,
            agentId: run.agentId,
            issueId: run.issueId,
            label: event.label,
            detail: event.detail,
            at: Date.now(),
            href: event.artifact?.href ?? `/issues/${run.issueId}`,
            live: true,
          },
          ...s.activity,
        ].slice(0, 80),
      };
    });
  }, []);

  // the simulation clock: one step at a time, per running run
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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const value = useMemo<ZikiContextValue>(
    () => ({
      state,
      agent,
      activeRun,
      autonomy: state.autonomy,
      issues: state.issues,
      suggestions: SUGGESTED_COMMANDS,
      sendCommand,
      approve,
      decline,
      editPlan,
      answer,
      pause,
      resume,
      stop,
      takeOver,
      undoEvent,
      setAutonomy,
      setAgent,
      vote,
      comment,
      dismissToast,
      reset,
      issueById: (id: number) => state.issues.find((i) => i.id === id),
    }),
    [
      state,
      agent,
      activeRun,
      sendCommand,
      approve,
      decline,
      editPlan,
      answer,
      pause,
      resume,
      stop,
      takeOver,
      undoEvent,
      setAutonomy,
      setAgent,
      vote,
      comment,
      dismissToast,
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
