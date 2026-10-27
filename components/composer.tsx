"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  CornerDownLeft,
  FilePlus2,
  GitPullRequest,
  Hand,
  HelpCircle,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Square,
} from "lucide-react";
import { useZiki } from "@/lib/sim";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { cmd: "/triage", icon: ShieldCheck, hint: "Confirm a report, check duplicates, advance the stage" },
  { cmd: "/fix", icon: GitPullRequest, hint: "Reproduce, patch, test and open a linked PR" },
  { cmd: "/review", icon: ScanSearch, hint: "Run checks and post an independent verdict" },
  { cmd: "/report", icon: FilePlus2, hint: "File a new issue from a short brief" },
  { cmd: "/plan", icon: ListChecks, hint: "Investigate and return a plan — write nothing" },
  { cmd: "/stop", icon: Square, hint: "Stop the active run where it stands" },
  { cmd: "/handoff", icon: Hand, hint: "Take the claim yourself" },
  { cmd: "/why", icon: HelpCircle, hint: "Explain the last step from the trace" },
];

export function Composer({
  contextIssueId,
  initial,
  onSent,
  compact,
}: {
  contextIssueId?: number;
  initial?: string;
  onSent?: () => void;
  compact?: boolean;
}) {
  const { state, sendCommand, agent } = useZiki();
  const [value, setValue] = useState(initial ?? "");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initial) {
      setValue(initial);
      inputRef.current?.focus();
    }
  }, [initial]);

  const slash = value.startsWith("/") && !value.includes(" ");
  const query = slash ? value.slice(1).toLowerCase() : "";
  const filtered = slash
    ? COMMANDS.filter((c) => c.cmd.slice(1).startsWith(query))
    : [];

  function submit() {
    const text = value.trim();
    if (!text) return;
    sendCommand(text, contextIssueId);
    setValue("");
    setOpen(false);
    onSent?.();
  }

  function applyCommand(cmd: string) {
    setValue(`${cmd} `);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow)]">
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        {contextIssueId ? (
          <span className="chip chip-accent">#{contextIssueId}</span>
        ) : (
          <span className="chip">no issue context</span>
        )}
        <span className="text-[11px] t-muted">
          {agent.name} · acting for AbdulSamad
        </span>
        <span className="ml-auto hidden items-center gap-1 text-[10.5px] t-muted sm:flex">
          <span className="kbd">⌘</span>
          <span className="kbd">↵</span>
          to dispatch
        </span>
      </div>

      <div className="relative">
        {open && filtered.length > 0 ? (
          <div className="pop-in absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1.5 shadow-[var(--shadow-pop)]">
            <p className="px-2 pb-1 pt-1 label-muted">Commands</p>
            {filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.cmd}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyCommand(item.cmd)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors",
                    index === cursor ? "bg-[rgb(var(--tint))]" : "hover:bg-[rgb(var(--chip))]",
                  )}
                >
                  <Icon size={14} className="t-accent" />
                  <span className="w-[74px] shrink-0 font-mono text-[12px] font-bold t-text">
                    {item.cmd}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] t-muted">
                    {item.hint}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <textarea
          ref={inputRef}
          rows={compact ? 2 : 3}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(e.target.value.startsWith("/") && !e.target.value.includes(" "));
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (open && filtered.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => (c + 1) % filtered.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => (c - 1 + filtered.length) % filtered.length);
                return;
              }
              if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey)) {
                e.preventDefault();
                applyCommand(filtered[cursor].cmd);
                return;
              }
              if (e.key === "Escape") {
                setOpen(false);
                return;
              }
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            contextIssueId
              ? `Tell ${agent.name} what to do with #${contextIssueId} — or type / for commands`
              : `Tell ${agent.name} what to do — try “fix #1384” or type / for commands`
          }
          className="textarea pr-3"
          aria-label="Command your agent"
        />

        <div className="mt-2 flex items-center gap-2">
          <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
            {[
              { label: "/triage #1387", cmd: "/triage #1387" },
              { label: "/fix #1384", cmd: "/fix #1384" },
              { label: "/review #1355", cmd: "/review #1355" },
            ].map((item) => (
              <button
                key={item.cmd}
                onClick={() => {
                  setValue(item.cmd);
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 font-mono text-[10.5px] font-semibold t-2 transition-colors hover:border-[rgb(var(--accent))]/50 hover:bg-[rgb(var(--tint))]"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[10.5px] t-muted md:inline">
              {state.autonomy === "ask"
                ? "Every write needs your approval"
                : state.autonomy === "writes"
                  ? "Reads run free · writes need approval"
                  : "Runs without asking — undo stays available"}
            </span>
            <button
              onClick={submit}
              disabled={!value.trim()}
              className="btn btn-primary btn-sm"
            >
              <ArrowUp size={13} strokeWidth={2.6} /> Dispatch
              <CornerDownLeft size={12} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
