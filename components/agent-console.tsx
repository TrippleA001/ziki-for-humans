"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Hand, Inbox, Pause, Play, Square } from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useNow } from "@/lib/use-now";
import { useZiki } from "@/lib/sim";
import type { ChatMessage } from "@/lib/types";
import { cn, clock } from "@/lib/utils";
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
    <div className="mx-auto max-w-[1120px]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] t-text">
          Your agent
        </h1>
        <div className="flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------------------------------------ chat */}
        <section className="card flex min-h-[520px] flex-col overflow-hidden lg:h-[calc(100vh-232px)]">
          <header className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-2.5">
            <Avatar
              name={agent.name}
              hue={state.agentId === "reviewer" ? 214 : 262}
              size={26}
            />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold t-text">{agent.name}</p>
              <p className="truncate text-[10.5px] t-muted">
                {running && !elsewhere
                  ? activeRun?.issueId
                    ? `Working on #${activeRun.issueId}`
                    : "Filing a report"
                  : paused && !elsewhere
                    ? "Paused"
                    : "Idle"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-0.5">
              {running || paused ? (
                <>
                  {running ? (
                    <button
                      onClick={pause}
                      title="Pause after the current step"
                      aria-label="Pause"
                      className="rounded-lg p-1.5 t-muted transition-colors hover:bg-[rgb(var(--chip))] hover:t-text"
                    >
                      <Pause size={13} />
                    </button>
                  ) : (
                    <button
                      onClick={resume}
                      title="Resume"
                      aria-label="Resume"
                      className="rounded-lg p-1.5 t-muted transition-colors hover:bg-[rgb(var(--chip))] hover:t-text"
                    >
                      <Play size={13} />
                    </button>
                  )}
                  <button
                    onClick={stop}
                    title="Stop"
                    aria-label="Stop"
                    className="rounded-lg p-1.5 t-muted transition-colors hover:bg-[rgb(var(--chip))] hover:t-text"
                  >
                    <Square size={12} />
                  </button>
                  <button
                    onClick={takeOver}
                    title="Take over"
                    aria-label="Take over"
                    className="rounded-lg p-1.5 t-muted transition-colors hover:bg-[rgb(var(--chip))] hover:t-text"
                  >
                    <Hand size={13} />
                  </button>
                </>
              ) : (
                <span className="chip h-[20px] gap-1 text-[9.5px]">
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
            <div className="flex min-h-full flex-col justify-end space-y-4">
              {messages.length === 0 ? (
                <div className="mx-auto my-auto max-w-[320px] py-6 text-center">
                  <p className="text-[12.5px] font-bold t-text">Say something</p>
                  <p className="mt-1 text-[11.5px] t-muted">
                    A brief, a question, or a slash command.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {["/fix #1384", "/review #1355", "/plan #1390"].map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => pick(cmd)}
                        className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 font-mono text-[10.5px] font-semibold t-2 transition-colors hover:border-[rgb(var(--accent))]/50 hover:bg-[rgb(var(--tint))]"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessageView key={message.id} message={message} />
                ))
              )}
              {state.pending ? (
                <div className="flex items-center gap-2 text-[11px] t-muted">
                  <span className="caret" /> Claiming the work…
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[rgb(var(--divider))] p-3">
            <Composer
              key={seed}
              contextIssueId={contextIssueId}
              initial={prefill}
              onSent={() => setPrefill(undefined)}
            />
          </div>
        </section>

        {/* --------------------------------------------------------- actions */}
        <aside className="flex min-w-0 flex-col gap-3">
          <section className="card overflow-hidden">
            <header className="flex items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-2.5">
              <p className="text-[11.5px] font-bold t-text">Actions</p>
              <span
                className={cn(
                  "chip h-[19px] text-[9px]",
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
                <span className="ml-auto text-[9.5px] t-muted num">
                  {doneSteps}/{steps} · {elapsed}
                </span>
              ) : null}
            </header>

            {activeRun ? (
              <>
                <div className="px-4 pb-2 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="chip num font-mono text-[9.5px]">
                      {activeRun.issueId ? `#${activeRun.issueId}` : "new report"}
                    </span>
                    <span className="truncate text-[10.5px] font-bold t-2">
                      {runAgent?.name}
                    </span>
                    {elsewhere ? (
                      <span className="ml-auto shrink-0 text-[9px] t-muted">elsewhere</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-snug t-text">
                    {running
                      ? (nextStep?.label ?? current?.label ?? "Starting up")
                      : (current?.label ?? "Paused")}
                  </p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[rgb(var(--chip))]">
                    <span
                      className="block h-full rounded-full bg-[rgb(var(--accent))] transition-[width] duration-500"
                      style={{ width: `${Math.max(progress, 4)}%` }}
                    />
                  </div>
                </div>
                <div className="max-h-[46vh] overflow-y-auto scroll-soft border-t border-[rgb(var(--divider))]">
                  <RunTimeline run={activeRun} compact />
                </div>
                <div className="border-t border-[rgb(var(--divider))] px-4 py-2">
                  <Link
                    href={activeRun.issueId ? `/issues/${activeRun.issueId}` : "/issues"}
                    className="inline-flex items-center gap-1 text-[10px] font-bold t-accent"
                  >
                    {activeRun.issueId ? `Open #${activeRun.issueId}` : "Open the backlog"}{" "}
                    <ArrowUpRight size={10} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="px-4 py-7 text-center">
                <p className="text-[11.5px] font-bold t-text">Nothing is running</p>
                <p className="mt-1 text-[10.5px] t-muted">Send a brief to start one.</p>
              </div>
            )}
          </section>

          <Link
            href="/inbox"
            className="card flex items-center gap-2 px-3.5 py-2.5 transition-colors hover:bg-[rgb(var(--tint))]"
          >
            <Inbox size={13} className="t-accent" />
            <span className="text-[11px] font-bold t-2">
              {openReviews.length === 0
                ? "No escalations"
                : `${openReviews.length} escalation${openReviews.length === 1 ? "" : "s"}`}
            </span>
            <span className="ml-auto text-[10px] font-bold t-accent">Open →</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ChatMessageView({ message }: { message: ChatMessage }) {
  if (message.role === "you") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[rgb(var(--navy))] px-3.5 py-2 text-[12.5px] leading-relaxed text-white">
          {message.text}
        </div>
      </div>
    );
  }

  if (message.kind === "escalation") {
    return (
      <div className="max-w-[88%] rounded-2xl border border-[rgb(var(--warn-border))]/60 bg-[rgb(var(--warn-bg))] px-3.5 py-2.5">
        <p className="text-[12.5px] leading-relaxed text-[rgb(var(--warn-fg))]">
          {message.text}
        </p>
        <Link
          href="/inbox"
          className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold t-accent"
        >
          Open the inbox <ArrowUpRight size={10} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[88%]">
      <p className="text-[12.5px] leading-relaxed t-2">{message.text}</p>
      {message.kind === "result" && message.issueId ? (
        <Link
          href={`/issues/${message.issueId}`}
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold t-accent"
        >
          #{message.issueId} <ArrowUpRight size={10} />
        </Link>
      ) : null}
    </div>
  );
}
