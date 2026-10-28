"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Clock3, MessageCircleQuestion, X } from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useZiki } from "@/lib/sim";
import type { Review } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "./ui";

function kindChip(review: Review): { label: string; cls: string } {
  if (review.kind === "hold") return { label: "Destructive · parked", cls: "chip chip-bad" };
  if (review.severity === "critical") return { label: "Critical", cls: "chip chip-bad" };
  return { label: "Scope change", cls: "chip chip-warn" };
}

/**
 * Only escalations reach this card: a scope change, a critical surface, or a
 * destructive step the agent parked. The agent never waits on it.
 */
export function ReviewCard({
  review,
  variant = "console",
  selected,
  onSelect,
}: {
  review: Review;
  variant?: "console" | "inbox";
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { releaseHold, discardHold, overrideCall, acknowledge } = useZiki();
  const agent = AGENTS.find((a) => a.id === review.agentId) ?? AGENTS[0];
  const full = variant === "inbox";
  const open = !review.resolvedAt;
  const kind = kindChip(review);

  return (
    <article
      onClick={onSelect}
      className={cn(
        "rounded-2xl border bg-[rgb(var(--surface))] p-3.5 transition-shadow",
        selected
          ? "border-[rgb(var(--accent))] shadow-[0_0_0_3px_rgb(var(--accent)/0.12)]"
          : "border-[rgb(var(--border))] hover:shadow-[var(--shadow)]",
      )}
    >
      <header className="flex items-center gap-2">
        <Avatar name={agent.name} hue={214} size={24} />
        <span className={kind.cls}>{kind.label}</span>
        <span className="ml-auto text-[10.5px] t-muted">{timeAgo(review.createdAt)}</span>
      </header>

      <p className="mt-2 text-[12.5px] font-bold leading-snug t-text">{review.title}</p>
      <p
        className={cn(
          "mt-1 text-[11.5px] leading-relaxed t-muted",
          full ? "" : "line-clamp-2",
        )}
      >
        {review.body}
      </p>

      {review.decision ? (
        <div className="mt-2 rounded-xl border border-[rgb(var(--divider))] bg-[rgb(var(--surface-2))] px-2.5 py-2">
          <p className="label-muted text-[9.5px]">What the agent did</p>
          <p className="mt-0.5 text-[11px] leading-relaxed t-2">{review.decision}</p>
          {review.rationale ? (
            <p className="mt-1 text-[10.5px] leading-relaxed t-muted">{review.rationale}</p>
          ) : null}
        </div>
      ) : null}

      {open && review.kind === "hold" ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            onClick={(event) => {
              event.stopPropagation();
              releaseHold(review.id);
            }}
            className="btn btn-primary btn-sm flex-1"
          >
            <Check size={12} /> Release
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              discardHold(review.id);
            }}
            className="btn btn-ghost btn-sm gap-1"
          >
            <X size={12} /> Discard
          </button>
        </div>
      ) : null}

      {open && review.kind === "escalation" && review.options?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.options.map((option) => (
            <button
              key={option}
              onClick={(event) => {
                event.stopPropagation();
                overrideCall(review.id, option);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-[10.5px] font-bold t-2 transition-colors hover:border-[rgb(var(--accent))]/50 hover:bg-[rgb(var(--tint))]"
            >
              <MessageCircleQuestion size={11} className="t-accent" />
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {open && review.kind === "escalation" ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            acknowledge(review.id);
          }}
          className="btn btn-ghost btn-sm mt-2.5 w-full gap-1.5"
        >
          <Clock3 size={12} /> Acknowledge
        </button>
      ) : null}

      {!open ? (
        <p className="mt-2 text-[10px] t-muted">Resolved · {review.outcome ?? "acknowledged"}</p>
      ) : null}

      {review.issueId ? (
        <Link
          href={`/issues/${review.issueId}`}
          onClick={(event) => event.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
        >
          #{review.issueId} · open the thread <ArrowUpRight size={11} />
        </Link>
      ) : null}
    </article>
  );
}

export function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] px-4 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--ok-bg))] text-[rgb(var(--ok-fg))]">
        <Check size={16} strokeWidth={2.6} />
      </span>
      <p className="mt-2 text-[12.5px] font-bold t-text">No escalations</p>
      <p className="mt-0.5 max-w-[280px] text-[11px] t-muted">
        Nothing needs a human. Only scope changes, critical surfaces and parked destructive
        steps land here.
      </p>
    </div>
  );
}
