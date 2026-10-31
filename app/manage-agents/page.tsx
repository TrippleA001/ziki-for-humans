"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/data";
import { getAccountFinancialTotals } from "@/lib/agent";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";

type Period = "hourly" | "daily" | "weekly" | "monthly" | "allTime";

const PERIODS: { key: Period; label: string }[] = [
  { key: "hourly", label: "Hourly" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "allTime", label: "All time" },
];

const TONE_TEXT = {
  green: "text-[rgb(var(--ok-fg))]",
  yellow: "text-[rgb(var(--warn-fg))]",
  red: "text-[rgb(var(--bad-fg))]",
} as const;

const TONE_BAR = {
  green: "bg-[rgb(var(--ok-fg))]",
  yellow: "bg-[rgb(var(--warn-fg))]",
  red: "bg-[rgb(var(--bad-fg))]",
} as const;

function usd(value: number, signed = false): string {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export default function ManageAgentsPage() {
  const [period, setPeriod] = useState<Period>("allTime");
  const [selectedId, setSelectedId] = useState(AGENTS[0]?.id ?? "");

  const totals = getAccountFinancialTotals(AGENTS);
  const account = totals[period];
  const selected = AGENTS.find((item) => item.id === selectedId) ?? AGENTS[0];

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] t-text">
            Manage agents
          </h1>
          <p className="mt-0.5 text-[11.5px] t-muted">
            What each agent earns and spends, against its goals.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              onClick={() => setPeriod(item.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                period === item.key
                  ? "bg-[rgb(var(--accent-soft))] t-accent"
                  : "t-muted hover:bg-[rgb(var(--chip))]",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="card mb-4 grid grid-cols-1 gap-4 px-4 py-3 sm:grid-cols-3">
        <Figure label="Account income" value={usd(account.income)} tone="green" />
        <Figure label="Account spending" value={usd(account.spending)} tone="yellow" />
        <Figure
          label="Net profit"
          value={usd(account.net, true)}
          tone={account.net >= 0 ? "green" : "red"}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {AGENTS.map((agent) => {
          const financials = agent.financials[period];
          const progress = agent.goalProgress[period];
          const tone = agent.goalColor[period];
          const active = agent.id === selected?.id;

          return (
            <button
              key={agent.id}
              onClick={() => setSelectedId(agent.id)}
              aria-pressed={active}
              className={cn(
                "card px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--tint))]",
                active && "ring-1 ring-[rgb(var(--accent))]/40",
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar name={agent.name} hue={agent.id === "reviewer" ? 214 : 262} size={28} />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold t-text">{agent.name}</p>
                  <p className="truncate text-[10.5px] t-muted">{agent.level}</p>
                </div>
                <span className={cn("ml-auto text-[11px] font-bold num", TONE_TEXT[tone])}>
                  {progress}% of goal
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Figure label="Income" value={usd(financials.income)} tone="green" compact />
                <Figure label="Spending" value={usd(financials.spending)} tone="yellow" compact />
                <Figure
                  label="Net"
                  value={usd(financials.net, true)}
                  tone={financials.net >= 0 ? "green" : "red"}
                  compact
                />
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--chip))]">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-500",
                    TONE_BAR[tone],
                  )}
                  style={{ width: `${Math.max(progress, 2)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <section className="card mt-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12.5px] font-bold t-text">{selected.name}</p>
            <span className="chip text-[9.5px]">{selected.model}</span>
            <span className="ml-auto text-[10.5px] t-muted">
              {PERIODS.find((item) => item.key === period)?.label} · against goal
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure
              label={`Income · goal ${usd(selected.goal.income[period])}`}
              value={usd(selected.financials[period].income)}
              tone="green"
            />
            <Figure
              label={`Spending · cap ${usd(selected.goal.spending[period])}`}
              value={usd(selected.financials[period].spending)}
              tone={
                selected.financials[period].spending > selected.goal.spending[period]
                  ? "red"
                  : "yellow"
              }
            />
            <Figure
              label="Net"
              value={usd(selected.financials[period].net, true)}
              tone={selected.financials[period].net >= 0 ? "green" : "red"}
            />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[10.5px] t-muted">
              <span>Income goal</span>
              <span className="num">
                {usd(selected.financials[period].income)} / {usd(selected.goal.income[period])}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--chip))]">
              <span
                className={cn(
                  "block h-full rounded-full",
                  TONE_BAR[selected.goalColor[period]],
                )}
                style={{ width: `${Math.max(selected.goalProgress[period], 2)}%` }}
              />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: "green" | "yellow" | "red";
  compact?: boolean;
}) {
  return (
    <div>
      <p className="truncate text-[10px] t-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-extrabold num",
          compact ? "text-[13px]" : "text-[18px]",
          TONE_TEXT[tone],
        )}
      >
        {value}
      </p>
    </div>
  );
}
