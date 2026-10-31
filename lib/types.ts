export type Priority = "High" | "Medium" | "Low";
export type IssueType = "Bug" | "Fix" | "Feat";
export type IssueStatus = "open" | "in_progress" | "done";
export type Stage = "reported" | "confirmed" | "claimed" | "pr" | "verdicts" | "merged";
export type CommentKind = "comment" | "bid" | "review" | "verdict" | "delivery" | "merge";

export type Intent =
  | "report"
  | "triage"
  | "fix"
  | "review"
  | "plan"
  | "stop"
  | "handoff";

export type EventKind =
  | "plan"
  | "read"
  | "dedupe"
  | "comment"
  | "branch"
  | "patch"
  | "test"
  | "pr"
  | "verdict"
  | "claim"
  | "issue"
  | "stop"
  | "undo"
  | "handoff"
  | "answer"
  | "release";

export interface Comment {
  id: string;
  author: string;
  initials: string;
  isAgent?: boolean;
  kind: CommentKind;
  at: string;
  body: string;
  meta?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  branch: string;
  checks: string;
  href: string;
}

export interface Issue {
  id: number;
  title: string;
  body: string;
  type: IssueType;
  priority: Priority;
  status: IssueStatus;
  stage: Stage;
  votes: number;
  reported: string;
  reporter: string;
  platform: "Product" | "Marketing" | "Security";
  labels: string[];
  comments: Comment[];
  pr?: PullRequest;
  verdicts?: { passed: number; total: number };
  assignee?: string;
  blockedOn?: string;
  idea?: boolean;
}

export interface RunEvent {
  id: string;
  kind: EventKind;
  label: string;
  detail?: string;
  rationale?: string;
  artifact?: { label: string; href: string };
  undoable?: boolean;
  undone?: boolean;
  /** Irreversible or destructive: the agent parks it instead of doing it. */
  destructive?: boolean;
  /** Parked and waiting for a human to release it. */
  held?: boolean;
  /** Released by a human after being held. */
  released?: boolean;
  delayMs: number;
  at?: number;
}

export interface Plan {
  approach: string;
  steps: string[];
  etaMinutes: number;
  risk: "low" | "medium" | "high";
  writes: boolean;
  files: string[];
}

export interface Directive {
  id: string;
  text: string;
  intent: Intent;
  issueId?: number;
  at: number;
  status: "queued" | "running" | "done" | "aborted";
  note?: string;
}

export type RunStatus = "proposed" | "running" | "paused" | "done" | "aborted";

export interface Run {
  id: string;
  directiveId: string;
  agentId: string;
  issueId: number;
  intent: Intent;
  title: string;
  plan: Plan;
  status: RunStatus;
  startedAt: number;
  endedAt?: number;
  steps: RunEvent[];
  events: RunEvent[];
}

/**
 * Something a human must know about — never a gate.
 * `hold`        the agent parked an irreversible action and kept working.
 * `escalation`  the agent changed scope or hit something critical, and logged it.
 */
export type ReviewKind = "hold" | "escalation";
export type Severity = "scope" | "critical";

export interface Review {
  id: string;
  kind: ReviewKind;
  /** Set on escalations: a widened scope or a critical surface. */
  severity?: Severity;
  agentId: string;
  issueId?: number;
  title: string;
  body: string;
  /** The call the agent already made, in its own words. */
  decision?: string;
  rationale?: string;
  plan?: Plan;
  directiveId?: string;
  runId?: string;
  eventId?: string;
  /** Overrides a human can choose instead. */
  options?: string[];
  /** Set once a human acts on it. */
  outcome?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface ActivityItem {
  id: string;
  kind: EventKind;
  label: string;
  detail?: string;
  agentId?: string;
  issueId?: number;
  at: number;
  href?: string;
  live?: boolean;
}

/** A message in the console thread — the two-way window into an agent. */
export interface ChatMessage {
  id: string;
  agentId: string;
  role: "you" | "agent";
  text: string;
  issueId?: number;
  /** Set on the agent side: a plan note, a finished result, or an escalation. */
  kind?: "note" | "result" | "escalation";
  at: number;
}

export interface AgentFinancialPeriod {
  income: number;
  spending: number;
  net: number;
}

export interface AgentFinancials {
  hourly: AgentFinancialPeriod;
  daily: AgentFinancialPeriod;
  weekly: AgentFinancialPeriod;
  monthly: AgentFinancialPeriod;
  allTime: AgentFinancialPeriod;
}

export interface AgentGoal {
  income: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  spending: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
}

export interface AgentGoalProgress {
  hourly: number;
  daily: number;
  weekly: number;
  monthly: number;
  allTime: number;
}

export interface AgentGoalColor {
  hourly: "green" | "yellow" | "red";
  daily: "green" | "yellow" | "red";
  weekly: "green" | "yellow" | "red";
  monthly: "green" | "yellow" | "red";
  allTime: "green" | "yellow" | "red";
}

export interface Agent {
  id: string;
  name: string;
  short: string;
  model: string;
  level: string;
  scopes: string[];
  accent: string;
  financials: AgentFinancials;
  goal: AgentGoal;
  goalProgress: AgentGoalProgress;
  goalColor: AgentGoalColor;
}

export interface RankingRow {
  rank: number;
  name: string;
  initials: string;
  solved: number;
  points: number;
  delta: number;
  claims: string;
  agents: number;
  online: number;
  hue: number;
  you?: boolean;
}
