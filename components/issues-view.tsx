"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Search, SlidersHorizontal } from "lucide-react";
import { useZiki } from "@/lib/sim";
import { cn, formatInt } from "@/lib/utils";
import { IssueRow } from "./ui";

const STATUSES = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

type StatusFilter = (typeof STATUSES)[number]["id"];

export function IssuesView() {
  const { state } = useZiki();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [platform, setPlatform] = useState("All");

  const counts = useMemo(
    () => ({
      all: state.issues.length,
      open: state.issues.filter((i) => i.status === "open").length,
      in_progress: state.issues.filter((i) => i.status === "in_progress").length,
      done: state.issues.filter((i) => i.status === "done").length,
    }),
    [state.issues],
  );

  const list = useMemo(() => {
    const filtered = state.issues.filter((issue) => {
      if (status !== "all" && issue.status !== status) return false;
      if (platform !== "All" && issue.platform !== platform) return false;
      if (query.trim()) {
        const haystack = `${issue.title} #${issue.id} ${issue.labels.join(" ")}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "votes") return b.votes - a.votes;
      return b.id - a.id;
    });
  }, [state.issues, status, platform, query, sort]);

  const activeRun = state.runs.find((r) => r.status === "running");
  const escalations = state.reviews.filter((review) => !review.resolvedAt).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Zedu workspace</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Issues
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Everything your team and its agents are working on, ranked by what the community
            votes up.
          </p>
        </div>
        <Link href="/console" className="btn btn-primary btn-sm">
          New issue <ArrowUp size={13} />
        </Link>
      </div>

      {escalations > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[rgb(var(--accent))]/25 bg-[rgb(var(--accent-soft))] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--accent))] text-white">
            <ArrowRight size={14} />
          </span>
          <p className="text-[12.5px] font-bold text-[rgb(var(--accent-text))]">
            {escalations} {escalations === 1 ? "escalation is" : "escalations are"} waiting
          </p>
          <p className="hidden text-[11.5px] text-[rgb(var(--accent-text))]/80 sm:block">
            Scope changes, critical surfaces and parked merges. Everything else the agents
            handled themselves.
          </p>
          <Link href="/inbox" className="btn btn-primary btn-sm ml-auto">
            Open the inbox
          </Link>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3">
          <div className="seg">
            {STATUSES.map((item) => (
              <button
                key={item.id}
                data-active={status === item.id}
                onClick={() => setStatus(item.id)}
              >
                {item.label}
                <span className="ml-1.5 text-[10.5px] opacity-60 num">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-full sm:w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or tag — press /"
              className="input h-9 pl-8 text-[12.5px]"
              aria-label="Search issues"
            />
          </div>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="input h-9 w-auto text-[12.5px] font-semibold"
            aria-label="Platform"
          >
            {["All", "Product", "Marketing", "Security"].map((item) => (
              <option key={item} value={item}>
                Platform: {item}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSort(sort === "votes" ? "newest" : "votes")}
            className="btn btn-ghost btn-sm gap-1.5"
          >
            <SlidersHorizontal size={12} />
            {sort === "votes" ? "Top votes" : "Newest"}
          </button>
        </div>

        <div className="hidden grid-cols-[64px_1fr_90px_110px_110px_90px] gap-x-3 px-4 py-2 sm:grid table-head">
          <span>Votes</span>
          <span>Issue</span>
          <span>Type</span>
          <span>Priority</span>
          <span>Status</span>
          <span>Stage</span>
        </div>

        <div className="divide-y divide-[rgb(var(--divider))]">
          {list.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              votes={
                (state.votes[issue.id] ?? 0) > 0 ? issue.votes + (state.votes[issue.id] ?? 0) : undefined
              }
              live={activeRun?.issueId === issue.id}
            />
          ))}
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <p className="text-[13px] font-bold t-text">No issues match</p>
            <p className="mt-1 text-[11.5px] t-muted">
              Try clearing the search or switching the stage filter.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPlatform("All");
              }}
              className="btn btn-ghost btn-sm mt-3"
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[rgb(var(--divider))] px-4 py-2.5">
          <span className="text-[11px] t-muted">
            Showing <span className="font-bold t-2 num">{formatInt(list.length)}</span> of{" "}
            {formatInt(state.issues.length)} issues
          </span>
          <span className={cn("chip h-[20px] text-[9.5px]", activeRun ? "chip-live" : "")}>
            {activeRun ? `agent on #${activeRun.issueId}` : "agents idle"}
          </span>
        </div>
      </div>
    </div>
  );
}
