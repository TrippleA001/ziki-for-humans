"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Clock3,
  GitPullRequest,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { AGENTS, STAGE_ORDER, STAGES } from "@/lib/data";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { CommentKind } from "@/lib/types";
import { cn, hueFor, timeAgo } from "@/lib/utils";
import { Avatar, PriorityChip, StageChip, StatusChip, TypeChip } from "./ui";
import { RunTimeline } from "./run-timeline";

const COMMENT_STYLES: Record<
  CommentKind,
  { label: string; border: string; chip: string }
> = {
  comment: { label: "Comment", border: "border-l-[rgb(var(--border))]", chip: "" },
  bid: { label: "Bid", border: "border-l-[#E5A63A]", chip: "chip-warn" },
  review: { label: "Review", border: "border-l-[rgb(var(--accent))]", chip: "chip-info" },
  delivery: { label: "Delivery", border: "border-l-[#2FA36B]", chip: "chip-ok" },
  merge: { label: "Merge request", border: "border-l-[#D6537A]", chip: "chip-bad" },
};

export function IssueDetail({ id }: { id: number }) {
  const { state, issues, vote, comment: sendComment } = useZiki();
  const issue = issues.find((i) => i.id === id);
  const now = useNow(1000);
  const [draft, setDraft] = useState("");

  if (!issue) {
    return (
      <div className="card mx-auto max-w-[560px] p-8 text-center">
        <p className="text-[13px] font-bold t-text">Issue not found</p>
        <p className="mt-1 text-[12px] t-muted">
          #{id} is not in this workspace. It may have been filed in another project.
        </p>
        <Link href="/issues" className="btn btn-primary btn-sm mt-4">
          Back to issues
        </Link>
      </div>
    );
  }

  const agent = AGENTS.find((a) => a.name === issue.assignee) ?? AGENTS[0];
  const extra = state.votes[issue.id] ?? 0;
  const votes = issue.votes + extra;
  const voted = extra > 0;
  const run = state.runs.find((r) => r.issueId === issue.id);
  const directive = state.directives.find((d) => d.issueId === issue.id);
  const offer = state.approvals.find(
    (a) => a.issueId === issue.id && a.kind === "plan",
  );
  const secondsLeft = offer
    ? Math.max(0, 60 - Math.floor(((now || Date.now()) - offer.createdAt) / 1000))
    : null;
  const stageIndex = STAGE_ORDER.indexOf(issue.stage);

  return (
    <div>
      <Link
        href="/issues"
        className="mb-4 inline-flex items-center gap-1 text-[11.5px] font-bold t-muted hover:t-text"
      >
        <ChevronLeft size={13} /> All issues
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="chip num font-mono">#{issue.id}</span>
            <TypeChip value={issue.type} />
            <PriorityChip value={issue.priority} />
            <StatusChip value={issue.status} />
            <StageChip value={issue.stage} />
            <span className="chip">{issue.platform}</span>
          </div>
          <h1 className="mt-2 max-w-[760px] text-[24px] font-extrabold leading-tight tracking-[-0.02em] t-text">
            {issue.title}
          </h1>
          <p className="mt-1.5 text-[11.5px] t-muted">
            Reported by <span className="font-semibold t-2">{issue.reporter}</span> ·{" "}
            {issue.reported} · {votes} votes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => vote(issue.id)}
            disabled={voted}
            className={cn("btn btn-sm gap-1.5", voted ? "btn-soft" : "btn-ghost")}
          >
            <ArrowUp size={13} /> {voted ? "Voted" : "Vote"} · {votes}
          </button>
          <Link
            href={`/console?issue=${issue.id}&cmd=${encodeURIComponent(`/triage #${issue.id}`)}`}
            className="btn btn-primary btn-sm"
          >
            Ask agent to triage <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="card mb-4 overflow-x-auto p-3 sm:p-4">
        <div className="flex min-w-[660px] items-start">
          {STAGES.map((stage, index) => {
            const done = index < stageIndex;
            const active = index === stageIndex;
            return (
              <div key={stage.key} className="flex min-w-0 flex-1 items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[10.5px] font-extrabold",
                        done
                          ? "border-[rgb(var(--ok-fg))]/30 bg-[rgb(var(--ok-bg))] text-[rgb(var(--ok-fg))]"
                          : active
                            ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white"
                            : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] t-muted",
                      )}
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : index + 1}
                    </span>
                    {index < STAGES.length - 1 ? (
                      <span
                        className={cn(
                          "mx-1.5 h-px flex-1",
                          done ? "bg-[rgb(var(--ok-fg))]/35" : "bg-[rgb(var(--divider))]",
                        )}
                      />
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-1.5 truncate text-[11px] font-bold",
                      active ? "t-text" : done ? "t-2" : "t-muted",
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="truncate text-[10px] t-muted">{stage.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {issue.blockedOn ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[rgb(var(--warn-border))]/60 bg-[rgb(var(--warn-bg))] px-4 py-2.5">
          <Clock3 size={14} className="text-[rgb(var(--warn-fg))]" />
          <p className="text-[11.5px] font-bold text-[rgb(var(--warn-fg))]">
            Blocked on: {issue.blockedOn}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_312px]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="card p-4 sm:p-5">
            <p className="label">Description</p>
            <div className="mt-2 space-y-3">
              {issue.body.split("\n\n").map((paragraph) => (
                <p key={paragraph} className="text-[12.5px] leading-relaxed t-2">
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {issue.labels.map((label) => (
                <span key={label} className="chip gap-1 text-[10.5px]">
                  <Tag size={10} /> {label}
                </span>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3 sm:px-5">
              <Sparkles size={13} className="t-accent" />
              <p className="text-[12.5px] font-bold t-text">Agent activity</p>
              {run ? (
                <span className="chip chip-accent text-[10px]">{agent.name}</span>
              ) : (
                <span className="chip text-[10px]">idle</span>
              )}
              <Link
                href={`/console?issue=${issue.id}`}
                className="ml-auto text-[11px] font-bold t-accent"
              >
                Open in console →
              </Link>
            </div>
            {run ? (
              <RunTimeline run={run} />
            ) : (
              <div className="flex flex-col items-center px-5 py-7 text-center">
                <p className="text-[12px] font-bold t-text">No agent on this issue yet</p>
                <p className="mt-1 max-w-[380px] text-[11.5px] t-muted">
                  Send {agent.name} a brief. It will reproduce the report, then come back with a
                  plan before it writes anything.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Link
                    href={`/console?issue=${issue.id}&cmd=${encodeURIComponent(`/triage #${issue.id}`)}`}
                    className="btn btn-soft btn-sm"
                  >
                    /triage #{issue.id}
                  </Link>
                  <Link
                    href={`/console?issue=${issue.id}&cmd=${encodeURIComponent(`/fix #${issue.id}`)}`}
                    className="btn btn-ghost btn-sm"
                  >
                    /fix #{issue.id}
                  </Link>
                </div>
              </div>
            )}
          </section>

          {issue.pr ? (
            <section className="card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--accent-soft))] t-accent">
                  <GitPullRequest size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold t-text">
                    PR #{issue.pr.number} · {issue.pr.title}
                  </p>
                  <p className="font-mono text-[10.5px] t-muted">
                    {issue.pr.branch} · checks {issue.pr.checks}
                  </p>
                </div>
                <span className="chip chip-ok ml-auto">linked</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[rgb(var(--surface-2))] px-3 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] t-muted">
                    Independent verdicts
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold t-text">
                    {issue.verdicts ? `${issue.verdicts.passed} / ${issue.verdicts.total} passed` : "0 / 2 assigned"}
                  </p>
                </div>
                <div className="rounded-xl bg-[rgb(var(--surface-2))] px-3 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] t-muted">
                    Merge gate
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold t-text">
                    {issue.stage === "merged" ? "Merged by you" : "Waiting on you"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="t-accent" />
              <p className="text-[12.5px] font-bold t-text">
                Conversation
                <span className="ml-1.5 text-[11px] font-semibold t-muted">
                  {issue.comments.length}
                </span>
              </p>
            </div>

            <div className="mt-3 space-y-2.5">
              {issue.comments.length === 0 ? (
                <p className="text-[11.5px] t-muted">
                  No comments yet. The first triage note will land here.
                </p>
              ) : (
                issue.comments.map((item) => {
                  const style = COMMENT_STYLES[item.kind];
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "rounded-r-xl border-y border-r border-l-4 border-y-[rgb(var(--divider))] border-r-[rgb(var(--divider))] bg-[rgb(var(--surface-2))] px-3 py-2.5",
                        style.border,
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Avatar name={item.author} size={22} hue={item.isAgent ? 214 : hueFor(item.author)} />
                        <span className="text-[11.5px] font-bold t-text">{item.author}</span>
                        {item.isAgent ? (
                          <span className="chip chip-accent h-[18px] text-[9px]">agent</span>
                        ) : null}
                        <span className={cn("chip h-[18px] text-[9px]", style.chip)}>
                          {style.label}
                        </span>
                        <span className="ml-auto text-[10px] t-muted">{item.at}</span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed t-2">{item.body}</p>
                      {item.meta ? (
                        <p className="mt-1 text-[10px] t-muted">{item.meta}</p>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>

            <div className="mt-3 rounded-xl border border-[rgb(var(--border))] p-2.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Add context for your agent — it reads this thread before it acts."
                className="textarea border-0 p-0 text-[11.5px] shadow-none focus:shadow-none"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] t-muted">Markdown · visible to your agents</span>
                <button
                  onClick={() => {
                    if (draft.trim()) {
                      sendComment(issue.id, draft);
                      setDraft("");
                    }
                  }}
                  disabled={!draft.trim()}
                  className="btn btn-primary btn-sm h-7"
                >
                  Comment
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <p className="label">Assignment</p>
            <div className="mt-2 flex items-center gap-2.5">
              {issue.assignee ? (
                <Avatar name={agent.name} size={32} hue={214} />
              ) : (
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-dashed border-[rgb(var(--border))] t-muted">
                  <UserRound size={14} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold t-text">
                  {issue.assignee ?? "Unassigned"}
                </p>
                <p className="truncate text-[10.5px] t-muted">
                  {issue.assignee ? `${agent.level} · ${agent.model}` : "No agent holds this claim"}
                </p>
              </div>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  run?.status === "running" ? "live-dot" : "bg-[rgb(var(--border))]",
                )}
              />
            </div>

            <div className="my-3 divider" />

            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] t-muted">
                Offer window
              </span>
              {offer ? (
                <span
                  className={cn(
                    "chip num",
                    secondsLeft === 0 ? "text-[rgb(var(--bad-fg))]" : "chip-warn",
                  )}
                >
                  {secondsLeft === 0
                    ? "expired"
                    : `00:${String(secondsLeft ?? 60).padStart(2, "0")}`}
                </span>
              ) : (
                <span className="chip">none</span>
              )}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed t-muted">
              {offer
                ? secondsLeft === 0
                  ? "The window closed. Approve the plan again to reopen it."
                  : "The agent only submits a bid after you approve the plan."
                : "No approval is pending on this issue."}
            </p>

            <div className="my-3 divider" />

            <div className="flex items-center justify-between text-[11px]">
              <span className="t-muted">Votes</span>
              <span className="font-bold t-text num">{votes}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="t-muted">Comments</span>
              <span className="font-bold t-text num">{issue.comments.length}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className="t-muted">Last agent step</span>
              <span className="font-bold t-text">
                {run?.events.at(-1)?.at && now
                  ? timeAgo(run.events.at(-1)!.at!, now)
                  : "—"}
              </span>
            </div>
          </section>

          <section className="card p-4">
            <p className="label">Trace</p>
            {directive ? (
              <div className="mt-2 rounded-xl border border-[rgb(var(--divider))] p-2.5">
                <p className="font-mono text-[11px] font-semibold t-text">{directive.text}</p>
                <p className="mt-1 text-[10px] t-muted">
                  {directive.status === "done"
                    ? "Completed"
                    : directive.status === "awaiting"
                      ? "Waiting on your approval"
                      : directive.note ?? directive.status}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] t-muted">
                No directive from you on this issue yet.
              </p>
            )}
            <Link
              href={`/console?issue=${issue.id}`}
              className="btn btn-ghost btn-sm mt-2.5 w-full"
            >
              Open in console
            </Link>
          </section>

          <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="t-accent" />
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] t-accent">
                Independence
              </p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed t-2">
              The agent that fixes this issue cannot verify it. An owner&apos;s other agents are
              excluded from the verdict, and only a human merges.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
