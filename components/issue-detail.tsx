"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Clock3,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { AGENTS, STAGE_ORDER } from "@/lib/data";
import { stageTimeline, type StageItem, type StageView } from "@/lib/stages";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { Stage } from "@/lib/types";
import { cn, hueFor, timeAgo } from "@/lib/utils";
import { Avatar, PriorityChip, StageChip, StatusChip, TypeChip } from "./ui";

const TONE_CHIP: Record<StageItem["tone"], { label: string; cls: string }> = {
  comment: { label: "Comment", cls: "" },
  review: { label: "Review", cls: "chip-info" },
  delivery: { label: "Delivery", cls: "chip-ok" },
  merge: { label: "Merge", cls: "chip-bad" },
  step: { label: "Agent step", cls: "chip-accent" },
  hold: { label: "Parked", cls: "chip-warn" },
  release: { label: "Released", cls: "chip-ok" },
};

export function IssueDetail({ id }: { id: number }) {
  const {
    state,
    issues,
    vote,
    comment: sendComment,
    releaseHold,
    discardHold,
  } = useZiki();
  const issue = issues.find((i) => i.id === id);
  const now = useNow(1000);
  const [draft, setDraft] = useState("");
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  // Deep link straight to a stage: /issues/1355?stage=merged
  useEffect(() => {
    const stage = new URLSearchParams(window.location.search).get("stage");
    if (stage && STAGE_ORDER.includes(stage as Stage)) {
      setSelectedStage(stage as Stage);
    }
  }, []);

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
  const hold = state.reviews.find(
    (review) =>
      review.issueId === issue.id && review.kind === "hold" && !review.resolvedAt,
  );
  const timeline = stageTimeline(issue, state.runs, state.reviews, now);
  const activeStage =
    timeline.find((entry) => entry.stage === selectedStage) ??
    timeline.find((entry) => entry.stage === issue.stage) ??
    timeline[0];
  // The lifecycle shows everything that actually happened; untouched future
  // stages stay out of the way until there is something to read.
  const visibleStages = timeline.filter(
    (entry) =>
      entry.items.length > 0 ||
      entry.state === "done" ||
      entry.state === "current" ||
      entry.state === "blocked",
  );
  const filtered = Boolean(selectedStage);
  // A stat box is 90px wide, so a full "Oct 20, 3:40 PM" stamp would wrap.
  const lastActivity =
    run?.events.at(-1)?.at && now
      ? timeAgo(run.events.at(-1)!.at!, now)
      : (activeStage.at?.split(",")[0] ?? "—");
  // The next useful brief depends on how far the issue has got.
  const ask =
    issue.stage === "reported"
      ? { label: "Ask agent to triage", cmd: `/triage #${issue.id}` }
      : issue.stage === "merged"
        ? { label: "Open in console", cmd: undefined }
        : issue.stage === "pr" || issue.stage === "verdicts"
          ? { label: "Ask agent to review", cmd: `/review #${issue.id}` }
          : { label: "Ask agent to fix", cmd: `/fix #${issue.id}` };

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
            href={
              ask.cmd
                ? `/console?issue=${issue.id}&cmd=${encodeURIComponent(ask.cmd)}`
                : `/console?issue=${issue.id}`
            }
            className="btn btn-primary btn-sm"
          >
            {ask.label} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* -------------------------------------------------------- stage strip */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-5">
          <p className="label !mb-0">Lifecycle</p>
          <span className="text-[10.5px] t-muted">
            {filtered ? "Filtered to one stage" : "Click a stage to filter the history"}
          </span>
          {filtered ? (
            <button
              onClick={() => setSelectedStage(null)}
              className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
            >
              <X size={11} /> Clear filter
            </button>
          ) : (
            <span className="ml-auto text-[10.5px] font-bold t-accent">All activity</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="flex min-w-[660px] items-start p-3 sm:p-4">
            {timeline.map((entry, index) => {
              const selected = selectedStage === entry.stage;
              return (
                <div key={entry.stage} className="flex min-w-0 flex-1 items-start">
                  <button
                    onClick={() =>
                      setSelectedStage(selected ? null : entry.stage)
                    }
                    aria-pressed={selected}
                    className={cn(
                      "group min-w-0 flex-1 rounded-xl px-1.5 pt-1 text-left transition-colors",
                      selected ? "bg-[rgb(var(--tint))]" : "hover:bg-[rgb(var(--tint))]/60",
                    )}
                  >
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[10.5px] font-extrabold transition-shadow",
                          entry.state === "done"
                            ? "border-[rgb(var(--ok-fg))]/30 bg-[rgb(var(--ok-bg))] text-[rgb(var(--ok-fg))]"
                            : entry.state === "current"
                              ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white"
                              : entry.state === "blocked"
                                ? "border-[rgb(var(--warn-border))] bg-[rgb(var(--warn-bg))] text-[rgb(var(--warn-fg))]"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] t-muted",
                          selected && "shadow-[0_0_0_3px_rgb(var(--accent)/0.16)]",
                        )}
                      >
                        {entry.state === "done" ? (
                          <Check size={12} strokeWidth={3} />
                        ) : entry.state === "blocked" ? (
                          <Clock3 size={11} strokeWidth={2.6} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {index < timeline.length - 1 ? (
                        <span
                          className={cn(
                            "mx-1.5 h-px flex-1",
                            entry.state === "done"
                              ? "bg-[rgb(var(--ok-fg))]/35"
                              : "bg-[rgb(var(--divider))]",
                          )}
                        />
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 truncate text-[11px] font-bold",
                        selected
                          ? "t-accent"
                          : entry.state === "current"
                            ? "t-text"
                            : entry.state === "done"
                              ? "t-2"
                              : "t-muted",
                      )}
                    >
                      {entry.label}
                    </p>
                    <p className="truncate text-[10px] t-muted">{entry.hint}</p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {issue.blockedOn ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[rgb(var(--warn-border))]/60 bg-[rgb(var(--warn-bg))] px-4 py-2.5">
          <Clock3 size={14} className="text-[rgb(var(--warn-fg))]" />
          <p className="text-[11.5px] font-bold text-[rgb(var(--warn-fg))]">
            Parked: {issue.blockedOn}
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

          {/* ------------------------------------------------------ lifecycle */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3 sm:px-5">
              <Sparkles size={13} className="t-accent" />
              <p className="text-[12.5px] font-bold t-text">
                {filtered ? activeStage.label : "All activity"}
              </p>
              <span className="chip text-[10px]">
                {issue.comments.length} comment{issue.comments.length === 1 ? "" : "s"}
              </span>
              {filtered ? (
                <span className="chip chip-accent text-[10px]">
                  {activeStage.actor} · {activeStage.role}
                </span>
              ) : (
                <span className="chip text-[10px]">{visibleStages.length} stages</span>
              )}
              {filtered ? (
                <button
                  onClick={() => setSelectedStage(null)}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
                >
                  <X size={11} /> All activity
                </button>
              ) : (
                <Link
                  href={`/console?issue=${issue.id}`}
                  className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
                >
                  Open in console <ArrowUpRight size={11} />
                </Link>
              )}
            </div>

            {filtered ? (
              <div className="px-4 py-3.5 sm:px-5">
                <p className="text-[11.5px] leading-relaxed t-2">{activeStage.summary}</p>
                {activeStage.items.length > 0 ? (
                  <div className="mt-3">
                    <StageItems items={activeStage.items} />
                  </div>
                ) : (
                  <p className="mt-3 text-[10.5px] t-muted">
                    No comments or agent steps recorded in this stage.
                  </p>
                )}
                {activeStage.state === "blocked" && hold ? (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => releaseHold(hold.id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={12} /> Release the merge
                    </button>
                    <button
                      onClick={() => discardHold(hold.id)}
                      className="btn btn-ghost btn-sm"
                    >
                      Discard
                    </button>
                    <Link href="/inbox" className="btn btn-ghost btn-sm">
                      Open the inbox
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="divide-y divide-[rgb(var(--divider))]">
                {visibleStages.map((entry) => (
                  <StageSection key={entry.stage} entry={entry} />
                ))}
              </div>
            )}

            <div className="border-t border-[rgb(var(--divider))] px-4 py-3 sm:px-5">
              <div className="rounded-xl border border-[rgb(var(--border))] p-2.5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Add context for your agent — it reads this thread before it acts."
                  className="textarea border-0 p-0 text-[11.5px] shadow-none focus:shadow-none"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] t-muted">
                    Markdown · visible to your agents
                  </span>
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
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <p className="label">Claim</p>
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
                  {issue.assignee
                    ? `${agent.level} · ${agent.model}`
                    : "No agent holds this claim"}
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

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-xl bg-[rgb(var(--surface-2))] px-1 py-1.5">
                <p className="text-[14px] font-extrabold leading-none t-text num">{votes}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] t-muted">
                  Votes
                </p>
              </div>
              <div className="rounded-xl bg-[rgb(var(--surface-2))] px-1 py-1.5">
                <p className="text-[14px] font-extrabold leading-none t-text num">
                  {issue.comments.length}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] t-muted">
                  Comments
                </p>
              </div>
              <div className="rounded-xl bg-[rgb(var(--surface-2))] px-1 py-1.5">
                <p className="truncate text-[14px] font-extrabold leading-none t-text">
                  {lastActivity}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] t-muted">
                  Last activity
                </p>
              </div>
            </div>

            <div className="my-3 divider" />

            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] t-muted">
                Held action
              </span>
              {hold ? (
                <span className="chip chip-warn">parked</span>
              ) : (
                <span className="chip">none</span>
              )}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed t-muted">
              {hold
                ? hold.title
                : "Nothing parked. Reversible steps are applied by the agent, not queued."}
            </p>
            {hold ? (
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  onClick={() => releaseHold(hold.id)}
                  className="btn btn-primary btn-sm flex-1"
                >
                  <Check size={12} /> Release
                </button>
                <button onClick={() => discardHold(hold.id)} className="btn btn-ghost btn-sm">
                  Discard
                </button>
              </div>
            ) : null}

            {directive ? (
              <>
                <div className="my-3 divider" />
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] t-muted">
                  Last directive
                </p>
                <p className="mt-1 font-mono text-[10.5px] t-2">{directive.text}</p>
              </>
            ) : null}

            <Link
              href={`/console?issue=${issue.id}`}
              className="btn btn-ghost btn-sm mt-3 w-full"
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
              The agent that fixes this issue cannot verify it. Its own agents are excluded
              from the verdict, and the merge is the one step an agent parks rather than
              performs.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StageSection({ entry }: { entry: StageView }) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[9px] font-extrabold",
            entry.state === "done"
              ? "border-[rgb(var(--ok-fg))]/30 bg-[rgb(var(--ok-bg))] text-[rgb(var(--ok-fg))]"
              : entry.state === "blocked"
                ? "border-[rgb(var(--warn-border))] bg-[rgb(var(--warn-bg))] text-[rgb(var(--warn-fg))]"
                : "border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white",
          )}
        >
          {entry.state === "done" ? (
            <Check size={10} strokeWidth={3} />
          ) : entry.state === "blocked" ? (
            <Clock3 size={10} strokeWidth={2.6} />
          ) : (
            entry.index + 1
          )}
        </span>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] t-muted">
          {entry.label}
        </p>
        <p className="text-[11px] font-bold t-2">{entry.actor}</p>
        <p className="text-[10px] t-muted">· {entry.role}</p>
        {entry.at ? (
          <span className="ml-auto text-[9.5px] t-muted">{entry.at}</span>
        ) : null}
      </div>
      <p className="mt-1.5 pl-7 text-[11.5px] leading-relaxed t-muted">{entry.summary}</p>
      {entry.items.length > 0 ? (
        <div className="mt-2 pl-7">
          <StageItems items={entry.items} />
        </div>
      ) : null}
    </div>
  );
}

function StageItems({ items }: { items: StageItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const tone = TONE_CHIP[item.tone];
        const isYou = item.author === "You";
        return (
          <div
            key={item.id}
            className="rounded-xl border border-[rgb(var(--divider))] bg-[rgb(var(--surface-2))] px-2.5 py-2"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {isYou ? (
                <Avatar name="AbdulSamad" you size={18} />
              ) : (
                <Avatar
                  name={item.author}
                  size={18}
                  hue={item.isAgent ? 214 : hueFor(item.author)}
                />
              )}
              <span className="text-[10.5px] font-bold t-text">{item.author}</span>
              <span className={cn("chip h-[17px] text-[9px]", tone.cls)}>{tone.label}</span>
              {item.at ? (
                <span className="ml-auto text-[9.5px] t-muted">{item.at}</span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed t-2">{item.label}</p>
            {item.detail ? (
              <p className="mt-0.5 text-[10.5px] leading-relaxed t-muted">{item.detail}</p>
            ) : null}
            {item.rationale ? (
              <p className="mt-1 border-l-2 border-[rgb(var(--accent))]/30 pl-2 text-[10px] leading-relaxed t-muted">
                <span className="font-bold t-accent">Why</span> · {item.rationale}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
