"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  FilePlus2,
  GitPullRequest,
  Hand,
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
];

export function Composer({
  contextIssueId,
  initial,
  onSent,
}: {
  contextIssueId?: number;
  initial?: string;
  onSent?: () => void;
}) {
  const { sendMessage, agent } = useZiki();
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

  function grow(node: HTMLTextAreaElement) {
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }

  function submit() {
    const text = value.trim();
    if (!text) return;
    sendMessage(text, contextIssueId);
    setValue("");
    setOpen(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }
    onSent?.();
  }

  function applyCommand(cmd: string) {
    setValue(`${cmd} `);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
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

      <div className="flex items-end gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 transition-colors focus-within:border-[rgb(var(--accent))]/50">
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(e.target.value.startsWith("/") && !e.target.value.includes(" "));
            setCursor(0);
            grow(e.target);
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            contextIssueId
              ? `Message ${agent.name} about #${contextIssueId}…`
              : `Message ${agent.name}…`
          }
          aria-label="Message your agent"
          className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent text-[12.5px] leading-6 outline-none placeholder:t-muted"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          title="Send"
          aria-label="Send message"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[rgb(var(--accent))] text-white transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          <ArrowUp size={14} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  );
}
