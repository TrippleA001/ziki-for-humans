"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  Code2,
  CopyCheck,
  FilePlus2,
  FlaskConical,
  GitBranch,
  GitPullRequest,
  Hand,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Square,
  Undo2,
  UserCheck,
} from "lucide-react";
import type { EventKind, Run, RunEvent } from "@/lib/types";
import { cn, clockTime } from "@/lib/utils";
import { useMounted } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";

const ICONS: Record<EventKind, typeof Check> = {
  plan: Sparkles,
  read: BookOpen,
  dedupe: CopyCheck,
  comment: MessageSquare,
  branch: GitBranch,
  patch: Code2,
  test: FlaskConical,
  pr: GitPullRequest,
  verdict: ShieldCheck,
  claim: Hand,
  issue: FilePlus2,
  stop: Square,
  undo: Undo2,
  handoff: UserCheck,
  answer: MessageCircle,
  release: Check,
};

export function TimelineEvent({
  event,
  last,
  onUndo,
  compact,
}: {
  event: RunEvent;
  last?: boolean;
  onUndo?: () => void;
  /** One line per step: no detail, no rationale. Used by the console rail. */
  compact?: boolean;
}) {
  const Icon = ICONS[event.kind] ?? Check;
  const mounted = useMounted();

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span
          className={cn(
            "flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border",
            event.undone
              ? "border-[rgb(var(--warn-border))] bg-[rgb(var(--warn-bg))] text-[rgb(var(--warn-fg))]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] t-accent",
          )}
        >
          <Icon size={10} strokeWidth={2.4} />
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-[11.5px]",
            event.undone ? "t-muted line-through" : "t-2",
          )}
        >
          {event.label}
        </p>
        {event.held ? (
          <span className="chip chip-warn h-[17px] flex-none text-[9px]">parked</span>
        ) : null}
        {event.released ? (
          <span className="chip chip-ok h-[17px] flex-none text-[9px]">released</span>
        ) : null}
        {event.undoable && !event.undone ? (
          <button
            onClick={onUndo}
            title="Undo this step"
            aria-label="Undo this step"
            className="flex-none rounded-md p-1 t-muted transition-colors hover:t-text"
          >
            <Undo2 size={11} />
          </button>
        ) : null}
        <span className="w-[32px] flex-none text-right text-[9.5px] t-muted num">
          {event.at && mounted ? clockTime(event.at) : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="fade-in relative flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "z-10 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border",
            event.undone
              ? "border-[rgb(var(--warn-border))] bg-[rgb(var(--warn-bg))] text-[rgb(var(--warn-fg))]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] t-accent",
          )}
        >
          <Icon size={13} strokeWidth={2.2} />
        </span>
        {last ? null : (
          <span className="w-px flex-1 bg-[rgb(var(--divider))]" aria-hidden />
        )}
      </div>
      <div className={cn("min-w-0 flex-1", last ? "pb-1" : "pb-4")}>
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "text-[12.5px] font-bold leading-5",
              event.undone ? "t-muted line-through" : "t-text",
            )}
          >
            {event.label}
          </p>
          <span className="ml-auto shrink-0 pt-0.5 text-[10.5px] t-muted num">
            {event.at && mounted ? clockTime(event.at) : ""}
          </span>
        </div>
        {event.detail ? (
          <p className="mt-0.5 text-[11.5px] leading-relaxed t-muted">{event.detail}</p>
        ) : null}
        {event.rationale ? (
          <p className="mt-1.5 rounded-lg bg-[rgb(var(--tint))] px-2.5 py-1.5 text-[11px] leading-relaxed t-2">
            <span className="font-extrabold t-accent">Why · </span>
            {event.rationale}
          </p>
        ) : null}
        {event.held || event.released ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {event.held ? (
              <>
                <span className="chip chip-warn">parked · not applied</span>
                <Link href="/inbox" className="text-[11px] font-bold t-accent">
                  Release it in the queue ↗
                </Link>
              </>
            ) : (
              <span className="chip chip-ok">released by you</span>
            )}
          </div>
        ) : null}
        {event.artifact || (event.undoable && !event.undone) || event.undone ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {event.artifact ? (
              <Link href={event.artifact.href} className="chip chip-accent">
                {event.artifact.label} ↗
              </Link>
            ) : null}
            {event.undone ? (
              <span className="chip chip-warn">Reverted</span>
            ) : event.undoable ? (
              <button
                onClick={onUndo}
                className="text-[11px] font-bold t-muted underline decoration-[rgb(var(--border))] underline-offset-2 hover:t-text"
              >
                Undo this
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RunTimeline({ run, compact }: { run: Run; compact?: boolean }) {
  const { undoEvent } = useZiki();
  const next = run.steps[run.events.length];

  if (compact) {
    return (
      <div className="px-4 py-2">
        {run.events.length === 0 ? (
          <p className="py-1 text-[11.5px] t-muted">Starting…</p>
        ) : null}
        {run.events.map((event, index) => (
          <TimelineEvent
            key={event.id}
            event={event}
            last={index === run.events.length - 1 && !next}
            onUndo={() => undoEvent(run.id, event.id)}
            compact
          />
        ))}
        {run.status === "running" && next ? (
          <div className="flex items-center gap-2 py-1.5">
            <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent-soft))]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--accent))]" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[11.5px] font-bold t-2">{next.label}</p>
            <span className="text-[9.5px] t-muted">working…</span>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip chip-accent">
          {run.issueId ? `#${run.issueId}` : "new report"}
        </span>
        <p className="min-w-0 truncate text-[12.5px] font-bold t-text">{run.title}</p>
        <span className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "chip",
              run.status === "running"
                ? "chip-ok"
                : run.status === "paused"
                  ? "chip-warn"
                  : run.status === "aborted"
                    ? "chip-bad"
                    : "chip-accent",
            )}
          >
            {run.status === "running" ? (
              <>
                <span className="live-dot" /> running
              </>
            ) : run.status === "paused" ? (
              "paused"
            ) : run.status === "aborted" ? (
              "stopped"
            ) : (
              "complete"
            )}
          </span>
          <Link
            href={run.issueId ? `/issues/${run.issueId}` : "/issues"}
            className="text-[11.5px] font-bold t-accent"
          >
            {run.issueId ? "Open issue ↗" : "Open issues ↗"}
          </Link>
        </span>
      </div>

      {run.events.length === 0 ? (
        <p className="pb-2 text-[12px] t-muted">
          Starting… the first step will appear here the moment it begins.
        </p>
      ) : null}

      {run.events.map((event, index) => (
        <TimelineEvent
          key={event.id}
          event={event}
          last={index === run.events.length - 1 && !next}
          onUndo={() => undoEvent(run.id, event.id)}
        />
      ))}

      {run.status === "running" && next ? (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="z-10 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent-soft))]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--accent))]" />
            </span>
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2">
              <p className="text-[12.5px] font-bold t-2">{next.label}</p>
              <span className="text-[10.5px] t-muted">working…</span>
            </div>
            <div className="sweep mt-2 h-1.5 w-full max-w-[220px] rounded-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
