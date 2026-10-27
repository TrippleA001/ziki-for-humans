export type Autonomy = "ask" | "writes" | "auto";

export type Priority = "High" | "Medium" | "Low";
export type IssueType = "Bug" | "Fix" | "Feat";
export type IssueStatus = "open" | "in_progress" | "done";
export type Stage = "reported" | "confirmed" | "claimed" | "pr" | "verdicts" | "merged";
export type CommentKind = "comment" | "bid" | "review" | "delivery" | "merge";

export type Intent =
  | "report"
  | "triage"
  | "fix"
  | "review"
  | "plan"
  | "stop"
  | "why"
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
  | "approve";

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
  status: "queued" | "awaiting" | "running" | "done" | "declined" | "aborted";
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
  autoApproved?: boolean;
}

export interface Approval {
  id: string;
  kind: "plan" | "escalation" | "verdict";
  agentId: string;
  issueId?: number;
  title: string;
  body: string;
  plan?: Plan;
  directiveId?: string;
  options?: string[];
  createdAt: number;
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

export interface Toast {
  id: string;
  title: string;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
  undoEventId?: string;
  undoRunId?: string;
}

export interface Agent {
  id: string;
  name: string;
  short: string;
  model: string;
  level: string;
  scopes: string[];
  accent: string;
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
