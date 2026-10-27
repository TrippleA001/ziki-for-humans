import type { Intent } from "./types";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const pointsFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPoints(value: number): string {
  return pointsFormatter.format(value);
}

export function formatInt(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  return hash;
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function clock(timestamp: number, now = Date.now()): string {
  const total = Math.max(0, Math.round((now - timestamp) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function clockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const INTENTS: Intent[] = ["report", "triage", "fix", "review", "plan", "stop", "why", "handoff"];

const INTENT_ALIASES: Record<string, Intent> = {
  report: "report",
  file: "report",
  issue: "report",
  triage: "triage",
  confirm: "triage",
  dedupe: "triage",
  fix: "fix",
  solve: "fix",
  patch: "fix",
  implement: "fix",
  review: "review",
  verdict: "review",
  check: "review",
  plan: "plan",
  brief: "plan",
  stop: "stop",
  abort: "stop",
  why: "why",
  handoff: "handoff",
  takeover: "handoff",
};

export interface ParsedCommand {
  intent: Intent;
  issueId?: number;
  raw: string;
}

export function parseCommand(input: string, fallbackIssueId?: number): ParsedCommand {
  const raw = input.trim();
  const lowered = raw.toLowerCase();
  let intent: Intent | undefined;

  if (lowered.startsWith("/")) {
    const word = lowered.slice(1).split(/\s+/)[0];
    intent = INTENTS.includes(word as Intent) ? (word as Intent) : INTENT_ALIASES[word];
  }

  if (!intent) {
    if (/\b(triage|confirm|dedupe|duplicate)\b/.test(lowered)) intent = "triage";
    else if (/\b(fix|solve|patch|implement|ship)\b/.test(lowered)) intent = "fix";
    else if (/\b(review|verdict|checks?)\b/.test(lowered)) intent = "review";
    else if (/\b(report|file|new issue|bug)\b/.test(lowered)) intent = "report";
    else if (/\b(stop|abort|cancel)\b/.test(lowered)) intent = "stop";
    else if (/\b(why|explain|reason)\b/.test(lowered)) intent = "why";
    else if (/\b(take over|handoff|hand over)\b/.test(lowered)) intent = "handoff";
    else intent = "plan";
  }

  const explicit = raw.match(/#(\d{3,4})/);
  const loose = raw.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
  const issueId = explicit
    ? Number(explicit[1])
    : loose
      ? Number(loose[1])
      : fallbackIssueId;

  return { intent, issueId, raw };
}

export const INTENT_COPY: Record<Intent, { verb: string; noun: string; points: number }> = {
  report: { verb: "Filing", noun: "report", points: 50 },
  triage: { verb: "Triaging", noun: "triage", points: 40 },
  fix: { verb: "Fixing", noun: "fix", points: 120 },
  review: { verb: "Reviewing", noun: "review", points: 60 },
  plan: { verb: "Planning", noun: "plan", points: 0 },
  stop: { verb: "Stopping", noun: "stop", points: 0 },
  why: { verb: "Explaining", noun: "explanation", points: 0 },
  handoff: { verb: "Handing off", noun: "handoff", points: 0 },
};

export function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    plan: "Plan",
    read: "Read",
    dedupe: "Dedupe",
    comment: "Comment",
    branch: "Branch",
    patch: "Patch",
    test: "Test",
    pr: "Pull request",
    verdict: "Verdict",
    claim: "Claim",
    issue: "Issue",
    stop: "Stopped",
    undo: "Reverted",
    handoff: "Handoff",
    answer: "Answer",
    approve: "Approved",
  };
  return map[kind] ?? kind;
}
