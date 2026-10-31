"use client";

import { useState } from "react";
import { AGENTS } from "@/lib/data";
import { getAccountFinancialTotals, modelRates } from "@/lib/agent";
import type { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui";

type Period = "hourly" | "daily" | "weekly" | "monthly" | "allTime";

const PERIODS: { key: Period; label: string; short: string }[] = [
  { key: "hourly", label: "Hourly", short: "H" },
  { key: "daily", label: "Daily", short: "D" },
  { key: "weekly", label: "Weekly", short: "W" },
  { key: "monthly", label: "Monthly", short: "M" },
  { key: "allTime", label: "All time", short: "All" },
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

function toneFor(value: number): "green" | "yellow" | "red" {
  return value >= 100 ? "green" : value >= 70 ? "yellow" : "red";
}

export default function AgentFinancialsPage() {
  const [period, setPeriod] = useState<Period>("allTime");
  const [selectedId, setSelectedId] = useState(AGENTS[0]?.id ?? "");

  const totals = getAccountFinancialTotals(AGENTS);
  const account = totals[period];
  const selected = AGENTS.find((item) => item.id === selectedId) ?? AGENTS[0];
  const periodLabel = PERIODS.find((item) => item.key === period)?.label ?? "";

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] t-text">
            Agent financials
          </h1>
          <p className="mt-0.5 text-[11.5px] t-muted">
            What each agent earns and spends, against the goals you set.
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
            <Avatar
              name={selected.name}
              hue={selected.id === "reviewer" ? 214 : 262}
              size={22}
            />
            <p className="text-[12.5px] font-bold t-text">{selected.name}</p>
            <span className="chip text-[9.5px]">{selected.model}</span>
            <span className="ml-auto text-[10.5px] t-muted">{periodLabel} · income vs spending</span>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
            <PeriodChart agent={selected} period={period} />
            <AgentFacts agent={selected} period={period} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Income against its goal and spending against its cap, for every period. */
function PeriodChart({ agent, period }: { agent: Agent; period: Period }) {
  const data = PERIODS.map((item) => {
    const financials = agent.financials[item.key];
    return {
      ...item,
      income: Math.round((financials.income / agent.goal.income[item.key]) * 100),
      spending: Math.round((financials.spending / agent.goal.spending[item.key]) * 100),
    };
  });
  const max = Math.max(100, ...data.flatMap((item) => [item.income, item.spending])) * 1.08;
  const height = (value: number) => `${Math.max((value / max) * 100, 1.5)}%`;

  return (
    <div>
      <div className="h-[130px]">
        <div className="relative flex h-full items-end gap-2">
          {data.map((item) => (
            <div key={item.key} className="flex h-full flex-1 items-end justify-center gap-1">
              <span
                title={`${item.label}: income ${item.income}% of goal`}
                className={cn(
                  "w-3 rounded-t transition-opacity",
                  period === item.key ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--accent))]/40",
                )}
                style={{ height: height(item.income) }}
              />
              <span
                title={`${item.label}: spending ${item.spending}% of cap`}
                className={cn(
                  "w-3 rounded-t transition-opacity",
                  period === item.key
                    ? "bg-[rgb(var(--warn-fg))]"
                    : "bg-[rgb(var(--warn-fg))]/35",
                )}
                style={{ height: height(item.spending) }}
              />
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[rgb(var(--border))]"
            style={{ bottom: `${(100 / max) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-1 flex gap-2">
        {data.map((item) => (
          <span
            key={item.key}
            className={cn(
              "flex-1 text-center text-[9.5px]",
              period === item.key ? "font-bold t-text" : "t-muted",
            )}
          >
            {item.short}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[9.5px] t-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[rgb(var(--accent))]" /> income, % of goal
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[rgb(var(--warn-fg))]" /> spending, % of cap
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0 w-3 border-t border-dashed border-[rgb(var(--border))]" /> goal
        </span>
      </div>
    </div>
  );
}

/** The numbers the summary cards do not carry. */
function AgentFacts({ agent, period }: { agent: Agent; period: Period }) {
  const financials = agent.financials[period];
  const margin = financials.income > 0 ? (financials.net / financials.income) * 100 : 0;
  const spendShare = Math.round((financials.spending / agent.goal.spending[period]) * 100);
  const rates = modelRates(agent.model);

  return (
    <dl className="space-y-2.5 border-t border-[rgb(var(--divider))] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
      <Row label="Income goal" value={usd(agent.goal.income[period])} />
      <Row label="Spending cap" value={usd(agent.goal.spending[period])} />
      <Row
        label="Net margin"
        value={`${margin > 0 ? "+" : ""}${margin.toFixed(1)}%`}
        tone={margin >= 30 ? "green" : margin >= 0 ? "yellow" : "red"}
      />
      <Row
        label="Spending vs cap"
        value={`${spendShare}%`}
        tone={toneFor(spendShare)}
      />
      <Row
        label="Model rate"
        value={`$${rates.input} / $${rates.output} per 1M`}
      />
    </dl>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "yellow" | "red";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10.5px] t-muted">{label}</dt>
      <dd className={cn("text-[11px] font-bold num", tone ? TONE_TEXT[tone] : "t-2")}>
        {value}
      </dd>
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
