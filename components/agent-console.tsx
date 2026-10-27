"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Hand,
  Pause,
  Play,
  Sparkles,
  Square,
  Users,
} from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { Autonomy } from "@/lib/types";
import { cn, clock, formatPoints, timeAgo } from "@/lib/utils";
import { Avatar } from "./ui";
import { ApprovalCard, EmptyQueue } from "./approvals";
import { Composer } from "./composer";
import { RunTimeline } from "./run-timeline";

const AUTONOMY: { id: Autonomy; label: string; hint: string }[] = [
  { id: "ask", label: "Ask every time", hint: "Every write returns a plan first" },
  { id: "writes", label: "Ask before writes", hint: "Triage and reviews run free" },
  { id: "auto", label: "Autonomous", hint: "Runs immediately · undo stays on" },
];

export function ConsoleView() {
  const {
    state,
    agent,
    activeRun,
    setAutonomy,
    setAgent,
    pause,
    resume,
    stop,
    takeOver,
  } = useZiki();
  const now = useNow(1000);
  const [contextIssueId, setContextIssueId] = useState<number | undefined>(1387);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const issue = params.get("issue");
    const cmd = params.get("cmd");
    if (issue) setContextIssueId(Number(issue));
    if (cmd) {
      setPrefill(cmd);
      setSeed(1);
    }
  }, []);

  const running = activeRun?.status === "running";
  const paused = activeRun?.status === "paused";
  const done = activeRun?.status === "done";
  const steps = activeRun?.steps.length ?? 0;
  const doneSteps = activeRun?.events.length ?? 0;
  const progress = steps ? Math.round((doneSteps / steps) * 100) : 0;
  const current = activeRun?.events[activeRun.events.length - 1];
  const nextStep = activeRun?.steps[activeRun.events.length];
  const elapsed =
    activeRun && now
      ? clock(activeRun.startedAt, activeRun.endedAt ?? now)
      : "00:00";

  function pick(text: string) {
    setPrefill(text);
    setSeed((s) => s + 1);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Supervision</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Agent console
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Brief your agent, watch every step, and stay the only person who can merge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/activity" className="btn btn-ghost btn-sm">
            Live activity
          </Link>
          <Link href="/inbox" className="btn btn-primary btn-sm">
            Needs you
            <span className="rounded-full bg-white/20 px-1.5 text-[10.5px]">
              {state.approvals.length}
            </span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[286px_minmax(0,1fr)] xl:grid-cols-[286px_minmax(0,1fr)_330px]">
        {/* ---------------------------------------------------------- scope */}
        <aside className="order-2 flex flex-col gap-4 lg:order-1">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <p className="label">Scope</p>
              <span className="chip chip-live gap-1.5">
                <span className="live-dot" /> session
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              {AGENTS.map((item) => {
                const isActive = state.agentId === item.id;
                const isRunning =
                  activeRun?.status === "running" && activeRun.agentId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setAgent(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors",
                      isActive
                        ? "border-[rgb(var(--accent))]/45 bg-[rgb(var(--tint))]"
                        : "border-transparent hover:bg-[rgb(var(--chip))]",
                    )}
                  >
                    <Avatar
                      name={item.name}
                      hue={item.id === "reviewer" ? 214 : 262}
                      size={30}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold t-text">
                        {item.name}
                      </span>
                      <span className="block truncate text-[10.5px] t-muted">
                        {isRunning
                          ? activeRun?.issueId
                            ? `Working #${activeRun.issueId}`
                            : "Filing a report"
                          : item.model}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 flex-none rounded-full",
                        isRunning ? "live-dot" : isActive ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--border))]",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[rgb(var(--surface-2))] p-2.5">
              <Hand size={13} className="mt-0.5 t-accent" />
              <div>
                <p className="text-[11px] font-bold t-text">Acting for AbdulSamad</p>
                <p className="text-[10.5px] t-muted">
                  You own every action it takes. Nothing merges without you.
                </p>
              </div>
            </div>

            <div className="mt-3">
              <p className="label-muted text-[10px]">Permissions</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {["read", "comment", "bid", "branch", "pr", "verdict"].map((scope) => (
                  <span
                    key={scope}
                    className={cn(
                      "chip h-[22px] font-mono text-[10px]",
                      agent.scopes.includes(scope) ? "chip-accent" : "opacity-45",
                    )}
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="my-3 divider" />

            <div>
              <p className="label-muted text-[10px]">Autonomy</p>
              <div className="mt-1.5 space-y-1">
                {AUTONOMY.map((option) => {
                  const active = state.autonomy === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setAutonomy(option.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
                        active
                          ? "border-[rgb(var(--accent))]/45 bg-[rgb(var(--tint))]"
                          : "border-transparent hover:bg-[rgb(var(--chip))]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full border",
                          active
                            ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]"
                            : "border-[rgb(var(--border))]",
                        )}
                      >
                        {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11.5px] font-bold t-text">
                          {option.label}
                        </span>
                        <span className="block text-[10.5px] leading-snug t-muted">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="my-3 divider" />

            <div>
              <div className="flex items-center justify-between">
                <p className="label-muted text-[10px]">Points this week</p>
                <span className="text-[10.5px] font-bold t-2 num">450 / 500</span>
              </div>
              <div className="bar mt-1.5">
                <span style={{ width: "90%" }} />
              </div>
              <p className="mt-1 text-[10px] t-muted">50 pts to the weekly requirement.</p>
            </div>
          </section>

          <section className="card p-4">
            <div className="flex items-center justify-between">
              <p className="label">Directives</p>
              <span className="text-[10px] t-muted">{state.directives.length} today</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {state.directives.slice(0, 4).map((directive) => {
                const statusMap: Record<string, { label: string; cls: string }> = {
                  queued: { label: "queued", cls: "" },
                  awaiting: { label: "needs you", cls: "chip-warn" },
                  running: { label: "running", cls: "chip-ok" },
                  done: { label: "done", cls: "chip-accent" },
                  declined: { label: "declined", cls: "" },
                  aborted: { label: "stopped", cls: "chip-bad" },
                };
                const status = statusMap[directive.status];
                return (
                  <div
                    key={directive.id}
                    className="rounded-xl border border-[rgb(var(--divider))] px-2.5 py-2"
                  >
                    <p className="truncate font-mono text-[11px] font-semibold t-text">
                      {directive.text}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={cn("chip h-[20px] text-[9.5px]", status?.cls)}>
                        {status?.label}
                      </span>
                      <span className="truncate text-[10px] t-muted">
                        {directive.note ?? "Dispatched"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {state.directives.length === 0 ? (
                <p className="text-[11px] t-muted">Nothing dispatched yet.</p>
              ) : null}
            </div>
          </section>
        </aside>

        {/* ---------------------------------------------------------- center */}
        <section className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <div className="relative overflow-hidden rounded-2xl bg-[rgb(var(--navy))] p-4 text-white shadow-[var(--shadow)] sm:p-5">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-40 blur-2xl"
              style={{ background: "radial-gradient(circle, #2E6FEF 0%, transparent 70%)" }}
            />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]",
                    running
                      ? "bg-[rgba(110,231,168,0.16)] text-[#8CF0BC]"
                      : paused
                        ? "bg-[rgba(246,207,107,0.16)] text-[#F6CF6B]"
                        : "bg-white/10 text-white/70",
                  )}
                >
                  {running ? <span className="live-dot" /> : null}
                  {running ? "Running now" : paused ? "Paused" : state.pending ? "Planning" : done ? "Complete" : "Standing by"}
                </span>
                {activeRun ? (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10.5px] font-bold text-white/70">
                    {activeRun.issueId ? `#${activeRun.issueId}` : "new report"}
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] font-semibold text-white/60 num">
                  {activeRun ? `${doneSteps}/${steps} steps · ${elapsed}` : "no active run"}
                </span>
              </div>

              {state.pending ? (
                <p className="mt-3 text-[17px] font-extrabold tracking-[-0.01em] sm:text-[19px]">
                  Drafting a plan<span className="caret" />
                </p>
              ) : activeRun ? (
                <>
                  <p className="mt-3 text-[17px] font-extrabold leading-snug tracking-[-0.01em] sm:text-[19px]">
                    {activeRun.intent === "fix" ? "Fix" : activeRun.intent === "review" ? "Review" : activeRun.intent === "report" ? "Report" : activeRun.intent === "plan" ? "Plan" : "Triage"}{" "}
                    {activeRun.issueId ? `#${activeRun.issueId} — ` : ""}
                    {activeRun.title}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-white/65">
                    <span className="font-semibold text-white/85">
                      {running ? nextStep?.label ?? current?.label ?? "Starting up" : current?.label ?? "Waiting for you"}
                    </span>
                    <span>·</span>
                    <span>{agent.name}</span>
                    <span>·</span>
                    <span>{activeRun.plan.etaMinutes} min estimate</span>
                    {current?.at && now ? (
                      <>
                        <span>·</span>
                        <span>last step {timeAgo(current.at, now)}</span>
                      </>
                    ) : null}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-[17px] font-extrabold leading-snug tracking-[-0.01em] sm:text-[19px]">
                    Nothing is running.
                  </p>
                  <p className="mt-1 text-[12px] text-white/65">
                    Give {agent.name} a brief below. It comes back with a plan before it writes anything.
                  </p>
                </>
              )}

              {activeRun ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                  <span
                    className="block h-full rounded-full bg-[#5B9BFF] transition-[width] duration-500"
                    style={{ width: `${Math.max(progress, 4)}%` }}
                  />
                </div>
              ) : null}

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {running || paused ? (
                  <>
                    {running ? (
                      <button
                        onClick={pause}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-[11.5px] font-bold text-white hover:bg-white/15"
                      >
                        <Pause size={12} /> Pause
                      </button>
                    ) : (
                      <button
                        onClick={resume}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-[11.5px] font-bold text-white hover:bg-white/15"
                      >
                        <Play size={12} /> Resume
                      </button>
                    )}
                    <button
                      onClick={stop}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-[11.5px] font-bold text-white hover:bg-white/15"
                    >
                      <Square size={11} /> Stop
                    </button>
                    <button
                      onClick={takeOver}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-[11.5px] font-bold text-white hover:bg-white/15"
                    >
                      <Hand size={12} /> Take over
                    </button>
                  </>
                ) : (
                  <Link
                    href={activeRun?.issueId ? `/issues/${activeRun.issueId}` : "/issues"}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-bold text-[#0B1733] hover:bg-white/90"
                  >
                    {activeRun ? (activeRun.issueId ? "Open the issue" : "Open the backlog") : "Browse the backlog"}{" "}
                    <ArrowUpRight size={12} />
                  </Link>
                )}
                <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-white/50 sm:flex">
                  <Clock3 size={11} /> streamed from the run trace
                </span>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[rgb(var(--divider))] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <p className="text-[12.5px] font-bold t-text">Run timeline</p>
                <span className="chip h-[20px] text-[9.5px]">every action is logged</span>
              </div>
              <span className="text-[10.5px] t-muted">{agent.name}</span>
            </div>
            <div className="max-h-[46vh] min-h-[260px] overflow-y-auto scroll-soft">
              {activeRun ? (
                <RunTimeline run={activeRun} />
              ) : (
                <div className="flex flex-col items-center px-5 py-9 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--accent-soft))] t-accent">
                    <Sparkles size={17} />
                  </span>
                  <p className="mt-2.5 text-[13px] font-bold t-text">No run yet</p>
                  <p className="mt-0.5 max-w-[320px] text-[11.5px] t-muted">
                    Dispatch a command and this becomes a live trace: reads, comments,
                    branches, PRs, verdicts.
                  </p>
                  <div className="mt-3 grid w-full max-w-[340px] gap-1.5">
                    {[
                      { cmd: "/triage #1387", hint: "confirm + dedupe" },
                      { cmd: "/fix #1384", hint: "patch + PR" },
                      { cmd: "/review #1355", hint: "checks + verdict" },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => pick(item.cmd)}
                        className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-2.5 py-2 text-left transition-colors hover:border-[rgb(var(--accent))]/50 hover:bg-[rgb(var(--tint))]"
                      >
                        <span className="font-mono text-[11px] font-bold t-text">
                          {item.cmd}
                        </span>
                        <span className="ml-auto text-[10px] t-muted">{item.hint}</span>
                        <ArrowRight size={11} className="t-muted" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Composer
            key={seed}
            contextIssueId={contextIssueId}
            initial={prefill}
            onSent={() => setPrefill(undefined)}
          />
        </section>

        {/* ----------------------------------------------------------- queue */}
        <aside className="order-3 flex flex-col gap-4">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <p className="label">Needs you</p>
              <span className="chip chip-warn">{state.approvals.length}</span>
            </div>
            <p className="mt-1 text-[11px] t-muted">
              Nothing moves until you decide. Approvals expire after 60 seconds.
            </p>
            <div className="mt-3 space-y-2.5">
              {state.approvals.length === 0 ? (
                <EmptyQueue />
              ) : (
                state.approvals.map((approval) => (
                  <ApprovalCard key={approval.id} approval={approval} />
                ))
              )}
            </div>
            <Link
              href="/inbox"
              className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-[rgb(var(--border))] py-2 text-[11.5px] font-bold t-accent hover:bg-[rgb(var(--tint))]"
            >
              Open the decision queue <ArrowRight size={12} />
            </Link>
          </section>

          <section className="card p-4">
            <div className="flex items-center justify-between">
              <p className="label">Your agents</p>
              <span className="flex items-center gap-1 text-[10px] t-muted">
                <Users size={11} /> 2 online
              </span>
            </div>
            <div className="mt-2.5 space-y-2.5">
              {AGENTS.map((item) => {
                const isRunning =
                  activeRun?.status === "running" && activeRun.agentId === item.id;
                return (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <Avatar
                      name={item.name}
                      hue={item.id === "reviewer" ? 214 : 262}
                      size={28}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold t-text">{item.name}</p>
                      <p className="truncate text-[10.5px] t-muted">
                        {isRunning
                          ? activeRun?.issueId
                            ? `Step ${doneSteps}/${steps} on #${activeRun.issueId}`
                            : `Step ${doneSteps}/${steps} on a new report`
                          : "Standing by"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        isRunning ? "live-dot" : "bg-[rgb(var(--border))]",
                      )}
                    />
                  </div>
                );
              })}
            </div>
            <div className="my-3 divider" />
            <div className="flex items-center justify-between text-[10.5px] t-muted">
              <span>Your points</span>
              <span className="font-bold t-2 num">{formatPoints(state.points)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10.5px] t-muted">
              <span>Weekly goal</span>
              <span className="font-bold t-2">450 / 500</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
