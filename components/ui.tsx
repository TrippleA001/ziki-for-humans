"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Issue, Priority, Stage, IssueStatus, IssueType } from "@/lib/types";
import { cn, hueFor } from "@/lib/utils";

export function Avatar({
  name,
  size = 32,
  hue,
  you,
}: {
  name: string;
  size?: number;
  hue?: number;
  you?: boolean;
}) {
  const h = hue ?? hueFor(name);
  return (
    <span
      className="avatar num"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        background: you
          ? "linear-gradient(135deg, rgb(46 111 239), rgb(31 79 184))"
          : `linear-gradient(135deg, hsl(${h} 66% 52%), hsl(${(h + 38) % 360} 62% 38%))`,
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.16)",
      }}
      aria-hidden
    >
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")}
    </span>
  );
}

export function PriorityChip({ value }: { value: Priority }) {
  const cls = value === "High" ? "chip-bad" : value === "Medium" ? "chip-warn" : "chip";
  return <span className={cn("chip", cls)}>{value}</span>;
}

export function StatusChip({ value }: { value: IssueStatus }) {
  const map: Record<IssueStatus, { label: string; cls: string }> = {
    open: { label: "Open", cls: "chip-info" },
    in_progress: { label: "In progress", cls: "chip-warn" },
    done: { label: "Done", cls: "chip-ok" },
  };
  return <span className={cn("chip", map[value].cls)}>{map[value].label}</span>;
}

export function StageChip({ value }: { value: Stage }) {
  const map: Record<Stage, { label: string; cls: string }> = {
    reported: { label: "Reported", cls: "" },
    confirmed: { label: "Confirmed", cls: "chip-ok" },
    claimed: { label: "Claimed", cls: "chip-info" },
    pr: { label: "PR linked", cls: "chip-accent" },
    verdicts: { label: "Proven", cls: "chip-ok" },
    merged: { label: "Merged", cls: "chip-accent" },
  };
  return <span className={cn("chip", map[value].cls)}>{map[value].label}</span>;
}

export function TypeChip({ value }: { value: IssueType }) {
  return <span className="chip">{value}</span>;
}

export function IssueRow({
  issue,
  votes,
  live,
}: {
  issue: Issue;
  votes?: number;
  live?: boolean;
}) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="grid grid-cols-[64px_1fr_auto] items-start gap-x-3 gap-y-2 rounded-2xl px-4 py-3.5 transition-colors hover:bg-[rgb(var(--rowsel))] sm:grid-cols-[64px_1fr_90px_110px_110px_90px]"
    >
      <div className="flex items-center gap-1.5 pt-0.5 text-[13px] font-bold t-2">
        <span className="text-[10px] t-muted">▲</span>
        <span className="num">{votes ?? issue.votes}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13.5px] font-semibold t-text">{issue.title}</p>
          {live ? (
            <span className="chip chip-live shrink-0 gap-1.5">
              <span className="live-dot" /> agent
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] t-muted">
          <span className="num font-semibold t-2">#{issue.id}</span>
          <span>·</span>
          <span>{issue.reported}</span>
          <span>·</span>
          <span>{issue.platform}</span>
          {issue.assignee ? (
            <>
              <span>·</span>
              <span>{issue.assignee}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="hidden sm:block">
        <TypeChip value={issue.type} />
      </div>
      <div className="hidden sm:block">
        <PriorityChip value={issue.priority} />
      </div>
      <div className="col-start-2 flex items-center gap-2 sm:col-start-auto sm:block">
        <StatusChip value={issue.status} />
      </div>
      <div className="hidden sm:block">
        <StageChip value={issue.stage} />
      </div>
    </Link>
  );
}
