"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock3, MessageCircleQuestion, Pencil, X } from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useZiki } from "@/lib/sim";
import type { Approval } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "./ui";

function riskChip(risk: "low" | "medium" | "high") {
  if (risk === "high") return "chip chip-bad";
  if (risk === "medium") return "chip chip-warn";
  return "chip chip-ok";
}

export function ApprovalCard({
  approval,
  variant = "console",
  selected,
  onSelect,
}: {
  approval: Approval;
  variant?: "console" | "inbox";
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { approve, decline, editPlan, answer } = useZiki();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(approval.plan?.approach ?? "");
  const agent = AGENTS.find((a) => a.id === approval.agentId) ?? AGENTS[0];
  const full = variant === "inbox";

  if (approval.kind === "escalation") {
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
          <span className="label text-[10px]">Question</span>
          <span className="ml-auto text-[10.5px] t-muted">{timeAgo(approval.createdAt)}</span>
        </header>
        <p className="mt-2 text-[12.5px] font-bold leading-snug t-text">{approval.title}</p>
        <p
          className={cn(
            "mt-1 text-[11.5px] leading-relaxed t-muted",
            full ? "" : "line-clamp-2",
          )}
        >
          {approval.body}
        </p>
        <div className="mt-2.5 space-y-1.5">
          {(approval.options ?? ["Approve", "Decline"]).map((option) => (
            <button
              key={option}
              onClick={(e) => {
                e.stopPropagation();
                answer(approval.id, option);
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-2.5 py-2 text-left text-[11.5px] font-semibold t-2 transition-colors hover:border-[rgb(var(--accent))]/50 hover:bg-[rgb(var(--tint))] hover:t-text"
            >
              <MessageCircleQuestion size={13} className="t-accent" />
              <span className="min-w-0 flex-1">{option}</span>
              <ArrowUpRight size={12} className="t-muted" />
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] t-muted">
          Answering unblocks {agent.name} — it keeps its claim.
        </p>
      </article>
    );
  }

  const plan = approval.plan;
  if (!plan) return null;

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
        <span className="label text-[10px]">Plan approval</span>
        <span className="ml-auto text-[10.5px] t-muted">{timeAgo(approval.createdAt)}</span>
      </header>

      <p className="mt-2 text-[12.5px] font-bold leading-snug t-text">{approval.title}</p>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={full ? 5 : 4}
          className="textarea mt-2 text-[11.5px]"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p
          className={cn(
            "mt-1 text-[11.5px] leading-relaxed t-muted",
            full ? "" : "line-clamp-3",
          )}
        >
          {plan.approach}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="chip gap-1">
          <Clock3 size={10} /> {plan.etaMinutes} min
        </span>
        <span className={riskChip(plan.risk)}>{plan.risk} risk</span>
        <span className="chip">{plan.writes ? "writes" : "read-only"}</span>
        {full ? (
          <span className="chip">
            {plan.files.length} {plan.files.length === 1 ? "surface" : "surfaces"}
          </span>
        ) : null}
      </div>

      {full ? (
        <div className="mt-2 space-y-1 rounded-xl bg-[rgb(var(--surface-2))] p-2.5">
          <p className="label-muted text-[9.5px]">Touches</p>
          {plan.files.map((file) => (
            <p key={file} className="truncate font-mono text-[11px] t-2">
              {file}
            </p>
          ))}
          <p className="label-muted pt-1 text-[9.5px]">Steps</p>
          <p className="text-[11px] t-2">{plan.steps.join(" → ")}</p>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-1.5">
        {editing ? (
          <>
            <button
              className="btn btn-primary btn-sm flex-1"
              onClick={(e) => {
                e.stopPropagation();
                editPlan(approval.id, draft);
                setEditing(false);
              }}
            >
              Save plan
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(plan.approach);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary btn-sm flex-1"
              onClick={(e) => {
                e.stopPropagation();
                approve(approval.id);
              }}
            >
              <Check size={13} /> Approve
            </button>
            <button
              className="btn btn-ghost btn-sm gap-1"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(plan.approach);
                setEditing(true);
              }}
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              className="icn-btn btn btn-ghost btn-sm px-2.5"
              aria-label="Decline plan"
              onClick={(e) => {
                e.stopPropagation();
                decline(approval.id);
              }}
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>

      {approval.issueId ? (
        <Link
          href={`/issues/${approval.issueId}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
        >
          #{approval.issueId} · read the thread <ArrowUpRight size={11} />
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
      <p className="mt-2 text-[12.5px] font-bold t-text">Nothing needs you</p>
      <p className="mt-0.5 text-[11px] t-muted">
        Agents are working inside their permissions. You&apos;ll be paged only at a gate.
      </p>
    </div>
  );
}
