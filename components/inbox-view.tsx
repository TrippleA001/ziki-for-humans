"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CornerDownLeft,
  Inbox,
  Keyboard,
  Lightbulb,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { IDEAS } from "@/lib/data";
import { useZiki } from "@/lib/sim";
import { cn } from "@/lib/utils";
import { ApprovalCard, EmptyQueue } from "./approvals";
import { StageChip, TypeChip } from "./ui";

const TABS = [
  { id: "input", label: "Need your input" },
  { id: "design", label: "Design feedback" },
  { id: "ideas", label: "New ideas" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function InboxView() {
  const { state, approve, decline, reset } = useZiki();
  const [tab, setTab] = useState<Tab>("input");
  const [selected, setSelected] = useState(0);
  const [help, setHelp] = useState(false);

  const escalations = state.approvals.filter((a) => a.kind === "escalation");
  const plans = state.approvals.filter((a) => a.kind === "plan");
  const list = tab === "design" ? escalations : state.approvals;
  const current = list[selected];

  useEffect(() => {
    setSelected(0);
  }, [tab, state.approvals.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }
      if (help && e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (tab === "ideas" || list.length === 0) return;

      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, list.length - 1));
      }
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      const active = list[selected];
      if (!active) return;
      if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (active.kind === "plan") approve(active.id);
      }
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        decline(active.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approve, decline, help, list, selected, tab]);

  const stats = useMemo(
    () => [
      { label: "Waiting", value: state.approvals.length },
      { label: "Plans", value: plans.length },
      { label: "Questions", value: escalations.length },
    ],
    [state.approvals.length, plans.length, escalations.length],
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Human gate</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Inbox
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Everything your agents need a person to decide. Nothing moves without you.
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="seg">
              {TABS.map((item) => {
                const count =
                  item.id === "input"
                    ? state.approvals.length
                    : item.id === "design"
                      ? escalations.length
                      : IDEAS.length;
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
            <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] t-muted sm:flex">
              <span className="kbd">J</span>
              <span className="kbd">K</span> move
              <span className="kbd ml-1.5">A</span> approve
              <span className="kbd">D</span> decline
            </span>
          </div>

          {tab === "ideas" ? (
            <div className="card divide-y divide-[rgb(var(--divider))] overflow-hidden">
              {IDEAS.map((idea) => (
                <Link
                  key={idea.id}
                  href={`/issues/${idea.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[rgb(var(--rowsel))]"
                >
                  <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[rgb(var(--warn-bg))] text-[rgb(var(--warn-fg))]">
                    <Lightbulb size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold t-text">{idea.title}</p>
                    <p className="mt-0.5 text-[11.5px] t-muted">
                      #{idea.id} · {idea.reporter} · {idea.reported}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-1.5">
                    <TypeChip value={idea.type} />
                    <StageChip value={idea.stage} />
                  </div>
                </Link>
              ))}
              <div className="flex items-center gap-2 bg-[rgb(var(--surface-2))] px-4 py-3 text-[11.5px] t-muted">
                <Sparkles size={13} className="t-accent" />
                Ideas are where agents are allowed to disagree with the roadmap — you decide
                whether they become work.
              </div>
            </div>
          ) : list.length === 0 ? (
            <div className="card p-5">
              <EmptyQueue />
              <div className="mt-4 flex justify-center">
                <button onClick={reset} className="btn btn-ghost btn-sm gap-1.5">
                  <RefreshCcw size={12} /> Restore the demo queue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((approval, index) => (
                <div key={approval.id} className="flex gap-2">
                  <div
                    className={cn(
                      "mt-1 w-1 shrink-0 rounded-full",
                      index === selected ? "bg-[rgb(var(--accent))]" : "bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <ApprovalCard
                      approval={approval}
                      variant="inbox"
                      selected={index === selected}
                      onSelect={() => setSelected(index)}
                    />
                  </div>
                  <span className="mt-3 hidden w-5 text-right text-[10px] t-muted sm:block num">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-[11.5px] t-muted">
            <ShieldCheck size={14} className="t-accent" />
            <span className="font-semibold t-2">Your decision is the only way forward.</span>
            <span className="hidden sm:inline">
              Approving starts the run and records the authorization in the audit trail.
            </span>
            <Link href="/activity" className="ml-auto font-bold t-accent">
              See the audit trail →
            </Link>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card p-4">
            <p className="label">Queue</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-[rgb(var(--surface-2))] px-2.5 py-2 text-center"
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
            <div className="space-y-2 text-[11.5px] t-muted">
              <div className="flex items-center justify-between">
                <span>Median decision</span>
                <span className="font-bold t-2">38s</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-approved this week</span>
                <span className="font-bold t-2">11</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expired offers</span>
                <span className="font-bold t-2">0</span>
              </div>
            </div>
          </section>

          <section className="card p-4">
            <p className="label">How it works</p>
            <ol className="mt-2 space-y-2.5">
              {[
                "An agent finds work and writes a plan — approach, estimate, risk, files.",
                "You approve, edit or decline. Nothing is written before you decide.",
                "The run streams in the console. Every action is attributable and undoable.",
                "Independent agents prove the fix; you get the merge gate, not the busywork.",
              ].map((line, index) => (
                <li key={line} className="flex gap-2.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[rgb(var(--accent-soft))] text-[10px] font-extrabold t-accent">
                    {index + 1}
                  </span>
                  <span className="text-[11.5px] leading-relaxed t-2">{line}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl bg-[rgb(var(--navy))] p-4 text-white">
            <div className="flex items-center gap-2">
              <Inbox size={14} className="text-white/70" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60">
                Inbox zero
              </p>
            </div>
            <p className="mt-2 text-[13px] font-bold leading-snug">
              An empty queue is the goal, not a failure.
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
              Your agents can confirm, comment and open PRs inside their permissions. You only
              appear where judgment is required.
            </p>
            <Link
              href="/console"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-bold text-[#0B1733]"
            >
              Brief an agent <CornerDownLeft size={12} />
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
            onClick={(e) => e.stopPropagation()}
          >
            <p className="label">Keyboard</p>
            <h2 className="mt-1 text-[17px] font-extrabold t-text">Decide without the mouse</h2>
            <div className="mt-3 space-y-2">
              {[
                ["J / K", "Move down / up the queue"],
                ["A", "Approve the selected plan"],
                ["D", "Decline the selected item"],
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
