"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Hand,
  Inbox,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { ChatMessage } from "@/lib/types";
import { cn, clock, clockTime } from "@/lib/utils";
import { Avatar } from "./ui";
import { Composer } from "./composer";
import { RunTimeline } from "./run-timeline";

export function ConsoleView() {
  const { state, agent, activeRun, openReviews, setAgent, pause, resume, stop, takeOver } =
    useZiki();
  const now = useNow(1000);
  const [contextIssueId, setContextIssueId] = useState<number | undefined>(1387);
  const [prefill, setPrefill] = useState<string | undefined>();
  const [seed, setSeed] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);

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

  const messages = useMemo(
    () => state.messages.filter((message) => message.agentId === state.agentId),
    [state.messages, state.agentId],
  );

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, state.agentId, activeRun?.id]);

  const running = activeRun?.status === "running";
  const paused = activeRun?.status === "paused";
  const steps = activeRun?.steps.length ?? 0;
  const doneSteps = activeRun?.events.length ?? 0;
  const progress = steps ? Math.round((doneSteps / steps) * 100) : 0;
  const current = activeRun?.events[activeRun.events.length - 1];
  const nextStep = activeRun?.steps[activeRun.events.length];
  const elapsed =
    activeRun && now ? clock(activeRun.startedAt, activeRun.endedAt ?? now) : "00:00";
  const runAgent = activeRun
    ? (AGENTS.find((item) => item.id === activeRun.agentId) ?? AGENTS[0])
    : undefined;
  const elsewhere = activeRun && activeRun.agentId !== state.agentId;

  function pick(text: string) {
    setPrefill(text);
    setSeed((value) => value + 1);
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="label">Console</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Your agent
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Talk to it here. The actions it takes stream beside the conversation — whichever
            surface you briefed it from.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1">
          {AGENTS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAgent(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-bold transition-colors",
                state.agentId === item.id
                  ? "bg-[rgb(var(--accent-soft))] t-accent"
                  : "t-muted hover:bg-[rgb(var(--chip))]",
              )}
            >
              <Avatar name={item.name} hue={item.id === "reviewer" ? 214 : 262} size={20} />
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_370px]">
        {/* ------------------------------------------------------------ chat */}
        <section className="card flex min-h-[520px] flex-col overflow-hidden lg:h-[calc(100vh-268px)]">
          <header className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3">
            <Avatar
              name={agent.name}
              hue={state.agentId === "reviewer" ? 214 : 262}
              size={30}
            />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold t-text">{agent.name}</p>
              <p className="truncate text-[10.5px] t-muted">
                {running
                  ? activeRun?.issueId
                    ? `Working on #${activeRun.issueId}`
                    : "Working on a new report"
                  : paused
                    ? "Paused mid-run"
                    : "Idle · ready for a brief"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-1">
              {running || paused ? (
                <>
                  {running ? (
                    <button
                      onClick={pause}
                      className="btn btn-ghost btn-sm gap-1"
                      title="Pause after the current step"
                    >
                      <Pause size={11} /> Pause
                    </button>
                  ) : (
                    <button onClick={resume} className="btn btn-ghost btn-sm gap-1">
                      <Play size={11} /> Resume
                    </button>
                  )}
                  <button onClick={stop} className="btn btn-ghost btn-sm gap-1">
                    <Square size={10} /> Stop
                  </button>
                  <button onClick={takeOver} className="btn btn-ghost btn-sm gap-1">
                    <Hand size={11} /> Take over
                  </button>
                </>
              ) : (
                <span className="chip h-[21px] gap-1 text-[9.5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--border))]" />
                  idle
                </span>
              )}
            </div>
          </header>

          <div
            ref={threadRef}
            className="min-h-0 flex-1 overflow-y-auto scroll-soft px-4 py-4"
          >
            <div className="flex min-h-full flex-col justify-end space-y-3">
              {messages.length === 0 ? (
                <div className="mx-auto my-auto max-w-[360px] py-8 text-center">
                  <p className="text-[13px] font-bold t-text">A blank conversation</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed t-muted">
                    Ask {agent.name} for a triage, a fix, or what it is working on. It answers
                    here and the steps show up beside the thread.
                  </p>
                  <div className="mt-3 grid gap-1.5">
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
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatBubble key={message.id} message={message} now={now} />
                ))
              )}
              {state.pending ? (
                <div className="flex items-center gap-2 pl-9 text-[11px] t-muted">
                  <span className="caret" /> {agent.name} is claiming the work…
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[rgb(var(--divider))] p-3">
            <Composer
              key={seed}
              contextIssueId={contextIssueId}
              initial={prefill}
              compact
              onSent={() => setPrefill(undefined)}
            />
          </div>
        </section>

        {/* --------------------------------------------------------- actions */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="card overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3">
              <p className="text-[12.5px] font-bold t-text">Actions</p>
              <span
                className={cn(
                  "chip h-[20px] text-[9.5px]",
                  running ? "chip-ok" : paused ? "chip-warn" : "",
                )}
              >
                {running ? (
                  <>
                    <span className="live-dot mr-1" /> live
                  </>
                ) : paused ? (
                  "paused"
                ) : (
                  "idle"
                )}
              </span>
              {activeRun ? (
                <span className="ml-auto text-[10px] t-muted num">
                  {doneSteps}/{steps} steps · {elapsed}
                </span>
              ) : null}
            </header>

            {activeRun ? (
              <>
                <div className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip num font-mono text-[9.5px]">
                      {activeRun.issueId ? `#${activeRun.issueId}` : "new report"}
                    </span>
                    <span className="text-[10.5px] font-bold t-2">{runAgent?.name}</span>
                    {elsewhere ? (
                      <span className="chip h-[19px] text-[9px]">from another surface</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[12px] font-bold leading-snug t-text">
                    {running
                      ? (nextStep?.label ?? current?.label ?? "Starting up")
                      : (current?.label ?? "Paused mid-run")}
                  </p>
                  {current?.detail ? (
                    <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed t-muted">
                      {current.detail}
                    </p>
                  ) : null}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--chip))]">
                    <span
                      className="block h-full rounded-full bg-[rgb(var(--accent))] transition-[width] duration-500"
                      style={{ width: `${Math.max(progress, 4)}%` }}
                    />
                  </div>
                </div>
                <div className="max-h-[46vh] overflow-y-auto scroll-soft border-t border-[rgb(var(--divider))]">
                  <RunTimeline run={activeRun} />
                </div>
                <div className="border-t border-[rgb(var(--divider))] px-4 py-2.5">
                  <Link
                    href={activeRun.issueId ? `/issues/${activeRun.issueId}` : "/issues"}
                    className="inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
                  >
                    {activeRun.issueId ? `Open #${activeRun.issueId}` : "Open the backlog"}{" "}
                    <ArrowUpRight size={11} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] font-bold t-text">Nothing is running</p>
                <p className="mt-1 text-[11px] leading-relaxed t-muted">
                  Send a brief in the conversation. The plan, the patch and every check will
                  stream here.
                </p>
              </div>
            )}
          </section>

          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Inbox size={13} className="t-accent" />
              <p className="text-[11px] font-bold t-2">
                {openReviews.length === 0
                  ? "No escalations"
                  : `${openReviews.length} escalation${openReviews.length === 1 ? "" : "s"} in the inbox`}
              </p>
              <Link href="/inbox" className="ml-auto text-[10px] font-bold t-accent">
                Open →
              </Link>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed t-muted">
              Scope changes, critical surfaces and parked merges. Nothing else interrupts the
              conversation.
            </p>
            <div className="my-2.5 divider" />
            <div className="flex items-center gap-2 text-[10.5px] t-muted">
              <Clock3 size={11} />
              <span>{running ? "The run keeps going while you read." : "Every step is in the activity feed."}</span>
              <Link href="/activity" className="ml-auto font-bold t-accent">
                Audit →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ChatBubble({ message, now }: { message: ChatMessage; now: number }) {
  if (message.role === "you") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%]">
          <div className="rounded-2xl rounded-br-md bg-[rgb(var(--navy))] px-3.5 py-2.5 text-[12px] leading-relaxed text-white">
            {message.text}
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[9.5px] t-muted">
            {message.issueId ? (
              <Link href={`/issues/${message.issueId}`} className="font-bold t-accent">
                #{message.issueId}
              </Link>
            ) : null}
            {/* Rendered only after mount so the clock never hydrates differently. */}
            <span>You{now ? ` · ${clockTime(message.at)}` : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  const agent = AGENTS.find((item) => item.id === message.agentId) ?? AGENTS[0];
  const tone =
    message.kind === "escalation"
      ? "border-[rgb(var(--warn-border))]/60 bg-[rgb(var(--warn-bg))]"
      : "border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]";

  return (
    <div className="flex gap-2">
      <Avatar name={agent.name} hue={message.agentId === "reviewer" ? 214 : 262} size={26} />
      <div className="min-w-0 max-w-[86%]">
        <p className="mb-1 text-[10px] font-bold t-muted">
          {agent.name}
          {now ? ` · ${clockTime(message.at)}` : ""}
        </p>
        <div className={cn("rounded-2xl rounded-tl-md border px-3.5 py-2.5", tone)}>
          <p className="text-[12px] leading-relaxed t-2">{message.text}</p>
          {message.kind === "escalation" ? (
            <Link
              href="/inbox"
              className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
            >
              Open the inbox <ArrowUpRight size={10} />
            </Link>
          ) : null}
        </div>
        {message.issueId && message.kind !== "note" ? (
          <Link
            href={`/issues/${message.issueId}`}
            className="mt-1 inline-block text-[9.5px] font-bold t-accent"
          >
            #{message.issueId} · open the thread
          </Link>
        ) : null}
      </div>
    </div>
  );
}
