"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCheck,
  Keyboard,
  RefreshCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useZiki } from "@/lib/sim";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyQueue, ReviewCard } from "./review-queue";

const TABS = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function InboxView() {
  const {
    state,
    releaseHold,
    discardHold,
    acknowledge,
    overrideCall,
    clearReviews,
    reset,
  } = useZiki();
  const [tab, setTab] = useState<Tab>("open");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [help, setHelp] = useState(false);

  const open = state.reviews.filter((review) => !review.resolvedAt);
  const resolved = state.reviews.filter((review) => review.resolvedAt);
  const list: Review[] = tab === "resolved" ? resolved : open;

  useEffect(() => {
    setSelectedId(undefined);
  }, [tab]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setHelp((value) => !value);
        return;
      }
      if (event.key === "Escape") {
        setHelp(false);
        return;
      }

      const index = list.findIndex((review) => review.id === selectedId);

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setSelectedId(list[Math.min(index + 1, list.length - 1)]?.id);
        return;
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSelectedId(list[Math.max(index - 1, 0)]?.id);
        return;
      }

      const active = list.find((review) => review.id === selectedId);
      if (!active || active.resolvedAt) return;

      if (event.key.toLowerCase() === "r" && active.kind === "hold") {
        event.preventDefault();
        releaseHold(active.id);
      }
      if (event.key.toLowerCase() === "d" && active.kind === "hold") {
        event.preventDefault();
        discardHold(active.id);
      }
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        acknowledge(active.id);
      }
      if (
        event.key.toLowerCase() === "o" &&
        active.kind === "escalation" &&
        active.options?.length
      ) {
        event.preventDefault();
        overrideCall(active.id, active.options[0]);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [acknowledge, discardHold, list, overrideCall, releaseHold, selectedId]);

  const stats = useMemo(
    () => [
      {
        label: "Destructive",
        value: open.filter((review) => review.kind === "hold").length,
      },
      {
        label: "Scope",
        value: open.filter((review) => review.severity === "scope").length,
      },
      {
        label: "Critical",
        value: open.filter((review) => review.severity === "critical").length,
      },
    ],
    [open],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Escalations</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Inbox
          </h1>
          <p className="mt-1 max-w-[620px] text-[13px] t-muted">
            Only what a human must know: a change of scope, a critical surface, or a
            destructive step the agent parked. Everything else the agents handle on their own.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHelp(true)} className="btn btn-ghost btn-sm gap-1.5">
            <Keyboard size={13} /> Shortcuts
          </button>
          <Link href="/console" className="btn btn-primary btn-sm">
            Agent console <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="seg">
              {TABS.map((item) => {
                const count = item.id === "open" ? open.length : resolved.length;
                return (
                  <button
                    key={item.id}
                    data-active={tab === item.id}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                    <span className="ml-1.5 text-[10.5px] opacity-60 num">{count}</span>
                  </button>
                );
              })}
            </div>
            {tab === "open" && open.length > 0 ? (
              <button
                onClick={clearReviews}
                className="btn btn-ghost btn-sm hidden gap-1.5 sm:inline-flex"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            ) : null}
            <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] t-muted sm:flex">
              <span className="kbd">J</span>
              <span className="kbd">K</span> move
              <span className="kbd ml-1.5">R</span> release
              <span className="kbd">D</span> discard
              <span className="kbd ml-1.5">A</span> read
              <span className="kbd ml-1.5">?</span> help
            </span>
          </div>

          {list.length === 0 ? (
            <div className="card p-4">
              {tab === "open" ? (
                <EmptyQueue />
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <p className="text-[12.5px] font-bold t-text">Nothing resolved yet</p>
                  <p className="mt-0.5 max-w-[300px] text-[11px] t-muted">
                    Releases, discards, overrides and acknowledgements land here as a record
                    of what you decided.
                  </p>
                </div>
              )}
              {tab === "open" ? (
                <div className="mt-4 flex justify-center">
                  <button onClick={reset} className="btn btn-ghost btn-sm gap-1.5">
                    <RefreshCcw size={12} /> Restore the demo queue
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((review) => (
                <div key={review.id} className="flex gap-2">
                  <div
                    className={cn(
                      "mt-1 w-1 shrink-0 rounded-full",
                      review.id === selectedId ? "bg-[rgb(var(--accent))]" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <ReviewCard
                      review={review}
                      variant="inbox"
                      selected={review.id === selectedId}
                      onSelect={() => setSelectedId(review.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-[11.5px] t-muted">
            <ShieldCheck size={14} className="t-accent" />
            <span className="font-semibold t-2">Nothing here is a gate.</span>
            <span className="hidden sm:inline">
              Agents keep working while you read. Releasing a hold applies the parked step;
              discarding drops it and keeps the branch open.
            </span>
            <Link href="/activity" className="ml-auto font-bold t-accent">
              See the audit trail →
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <p className="label">Open escalations</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-[rgb(var(--surface-2))] px-2 py-2 text-center"
                >
                  <p className="text-[19px] font-extrabold leading-none t-text num">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.08em] t-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="my-3 divider" />
            <div className="space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="t-muted">Waiting on a human</span>
                <span className="font-bold t-2">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-muted">Runs in progress</span>
                <span className="font-bold t-2 num">
                  {state.runs.filter((run) => run.status === "running").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="t-muted">Decisions you made</span>
                <span className="font-bold t-2 num">{resolved.length}</span>
              </div>
            </div>
          </section>

          <section className="card p-4">
            <p className="label">What lands here</p>
            <ul className="mt-2 space-y-2.5">
              {[
                "A destructive step — a merge — parked instead of applied.",
                "A scope change: the agent widened the work and says why.",
                "A critical surface: the change touched something you should know about.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <TriangleAlert size={13} className="mt-0.5 flex-none t-muted" />
                  <span className="text-[11.5px] leading-relaxed t-2">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[10.5px] leading-relaxed t-muted">
              Reported, triaged, fixed, tested, reviewed — none of that reaches you. It stays
              in the activity feed.
            </p>
          </section>

          <section className="rounded-2xl bg-[rgb(var(--navy))] p-4 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-white/60" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60">
                Exceptions only
              </p>
            </div>
            <p className="mt-2 text-[13px] font-bold leading-snug">
              Agents own the work. You own the exceptions.
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
              Close this page and the agents keep shipping. The only thing that waits is a
              merge you have not released yet.
            </p>
            <Link
              href="/console"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-bold text-[#0B1733]"
            >
              Brief an agent <ArrowRight size={12} />
            </Link>
          </section>
        </aside>
      </div>

      {help ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(11_23_51/0.45)] p-4"
          onClick={() => setHelp(false)}
        >
          <div
            className="pop-in w-full max-w-[420px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-pop)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="label">Keyboard</p>
            <h2 className="mt-1 text-[17px] font-extrabold t-text">Clear the inbox without the mouse</h2>
            <div className="mt-3 space-y-2">
              {[
                ["J / K", "Move down / up the list"],
                ["R", "Release a parked step"],
                ["D", "Discard a parked step"],
                ["A", "Acknowledge an escalation"],
                ["O", "Take the agent's alternative"],
                ["?", "Toggle this panel"],
                ["Esc", "Close"],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="kbd min-w-[42px]">{key}</span>
                  <span className="text-[12px] t-2">{action}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setHelp(false)} className="btn btn-primary btn-sm mt-4 w-full">
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
