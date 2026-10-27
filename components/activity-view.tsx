"use client";

import { useMemo, useState } from "react";
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
import { AGENTS } from "@/lib/data";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { EventKind } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "./ui";

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
  approve: Check,
};

const FILTERS = [
  { id: "all", label: "All", kinds: null as EventKind[] | null },
  { id: "claims", label: "Claims", kinds: ["claim", "handoff", "approve"] },
  { id: "issues", label: "Issues", kinds: ["issue", "comment", "dedupe"] },
  { id: "prs", label: "PRs", kinds: ["pr", "branch", "patch"] },
  { id: "verdicts", label: "Verdicts", kinds: ["verdict", "test"] },
];

export function ActivityView() {
  const { state, activeRun } = useZiki();
  const now = useNow(1000);
  const [filter, setFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const list = useMemo(() => {
    const active = FILTERS.find((f) => f.id === filter);
    return state.activity.filter((item) => {
      if (active?.kinds && !active.kinds.includes(item.kind)) return false;
      if (agentFilter !== "all" && item.agentId !== agentFilter) return false;
      return true;
    });
  }, [state.activity, filter, agentFilter]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Audit trail</p>
          <h1 className="mt-1 flex items-center gap-2 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Agent activity
            <span className="chip chip-live gap-1.5 text-[10px]">
              <span className="live-dot" /> live
            </span>
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Every action your agents take, in order, with the artifact it produced.
          </p>
        </div>
        <Link href="/console" className="btn btn-primary btn-sm">
          Open console
        </Link>
      </div>

      {activeRun && activeRun.status === "running" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[rgb(var(--navy))] px-4 py-3 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Sparkles size={14} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold">
              {AGENTS.find((a) => a.id === activeRun.agentId)?.name} is{" "}
              {activeRun.issueId ? `working on #${activeRun.issueId}` : "filing a new report"}
            </p>
            <p className="truncate text-[10.5px] text-white/60">
              {activeRun.events.at(-1)?.label ?? "Starting up"} ·{" "}
              {activeRun.events.length}/{activeRun.steps.length} steps
            </p>
          </div>
          <Link
            href={activeRun.issueId ? `/console?issue=${activeRun.issueId}` : "/console"}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold text-[#0B1733]"
          >
            Watch it live
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3">
            <div className="seg">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  data-active={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="input ml-auto h-9 w-auto text-[12px] font-semibold"
            >
              <option value="all">All agents</option>
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <ol className="px-4 py-3">
            {list.map((item, index) => {
              const Icon = ICONS[item.kind] ?? Check;
              const agent = AGENTS.find((a) => a.id === item.agentId);
              const fresh = now > 0 && item.at > now - 9000;
              const last = index === list.length - 1;
              return (
                <li key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border",
                        fresh
                          ? "border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent-soft))] t-accent"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] t-2",
                      )}
                    >
                      <Icon size={13} />
                    </span>
                    {last ? null : <span className="w-px flex-1 bg-[rgb(var(--divider))]" />}
                  </div>
                  <div className={cn("min-w-0 flex-1", last ? "pb-1" : "pb-4")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-bold t-text">{item.label}</p>
                      {fresh ? (
                        <span className="chip chip-live h-[18px] gap-1 text-[9px]">
                          <span className="live-dot" /> just now
                        </span>
                      ) : null}
                      <span className="ml-auto text-[10px] t-muted">
                        {now ? timeAgo(item.at, now) : "just now"}
                      </span>
                    </div>
                    {item.detail ? (
                      <p className="mt-0.5 text-[11.5px] t-muted">{item.detail}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {agent ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Avatar name={agent.name} hue={agent.id === "reviewer" ? 214 : 262} size={16} />
                          <span className="text-[10px] font-semibold t-2">{agent.name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold t-2">You</span>
                      )}
                      {item.issueId ? (
                        <Link
                          href={item.href ?? `/issues/${item.issueId}`}
                          className="text-[10px] font-bold t-accent"
                        >
                          #{item.issueId} ↗
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-[12.5px] font-bold t-text">Nothing in this filter yet</p>
              <p className="mt-1 text-[11.5px] t-muted">
                Run a command in the console and the actions appear here in real time.
              </p>
              <Link href="/console" className="btn btn-primary btn-sm mt-3">
                Dispatch a command
              </Link>
            </div>
          ) : null}

          <div className="border-t border-[rgb(var(--divider))] px-4 py-2.5 text-[10.5px] t-muted">
            Streamed from the run trace. Every entry is attributed to an agent, an owner and a
            directive.
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <p className="label">Right now</p>
            <div className="mt-2 space-y-2.5">
              {AGENTS.map((agent) => {
                const running =
                  activeRun?.status === "running" && activeRun.agentId === agent.id;
                return (
                  <div key={agent.id} className="flex items-start gap-2.5">
                    <Avatar name={agent.name} hue={agent.id === "reviewer" ? 214 : 262} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold t-text">{agent.name}</p>
                      <p className="truncate text-[10.5px] t-muted">
                        {running
                          ? activeRun?.issueId
                            ? `Working #${activeRun.issueId}`
                            : "Filing a report"
                          : "Standing by"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        running ? "live-dot" : "bg-[rgb(var(--border))]",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <p className="label">This session</p>
            <div className="mt-2 space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="t-muted">Actions</span>
                <span className="font-bold t-text num">{state.activity.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-muted">Runs started</span>
                <span className="font-bold t-text num">{state.runs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-muted">Waiting on you</span>
                <span className="font-bold t-text num">{state.approvals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-muted">Points</span>
                <span className="font-bold t-text num">
                  {state.points.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] t-accent">
              Why this matters
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed t-2">
              An agent you cannot watch is an agent you cannot trust with a production
              repository. This feed is the receipt.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
