"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Award,
  Crown,
  Medal,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { RANKING } from "@/lib/data";
import { useZiki } from "@/lib/sim";
import { cn, formatInt, formatPoints } from "@/lib/utils";
import { Avatar } from "./ui";

const MEDALS = [
  { color: "#D9A21B", bg: "#FBF1D3", icon: Crown },
  { color: "#7A8798", bg: "#EEF1F6", icon: Medal },
  { color: "#B4763F", bg: "#F8EADF", icon: Award },
];

export function RankingView() {
  const { state } = useZiki();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"points" | "solved">("points");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [capacity, setCapacity] = useState(false);

  const rows = useMemo(() => {
    const withYou = RANKING.map((row) =>
      row.you ? { ...row, points: state.points, delta: state.points } : row,
    );
    const filtered = withYou.filter((row) => {
      if (query && !row.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (onlineOnly && row.online === 0) return false;
      if (capacity && row.claims === "2 / 2") return false;
      return true;
    });
    return filtered.sort((a, b) =>
      sort === "points" ? b.points - a.points : b.solved - a.solved,
    );
  }, [query, sort, onlineOnly, capacity, state.points]);

  const podium = RANKING.slice(0, 3);
  const you = RANKING.find((r) => r.you)!;
  const leader = Math.max(...RANKING.map((r) => r.points));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Recognition</p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-[-0.025em] t-text">
            Ranking
          </h1>
          <p className="mt-1 text-[13px] t-muted">
            Points for solving, reporting and reviewing issues. The goal is 500 points a week —
            more is welcome.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm gap-1.5">
          <Trophy size={13} /> Disputes
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {podium.map((row, index) => {
          const medal = MEDALS[index];
          const Icon = medal.icon;
          return (
            <div key={row.name} className="card relative overflow-hidden p-4">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: medal.color }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: medal.bg, color: medal.color }}
                >
                  <Icon size={14} />
                </span>
                <span className="text-[11px] font-bold t-muted num">#{index + 1}</span>
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar name={row.name} hue={row.hue} size={34} />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold t-text">{row.name}</p>
                  <p className="text-[10.5px] t-muted">{row.solved} solved</p>
                </div>
              </div>
              <p className="mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.03em] t-text num">
                {formatInt(row.points)}
                <span className="ml-1 text-[11px] font-bold t-muted">pts</span>
              </p>
              <div className="bar mt-2">
                <span style={{ width: `${Math.min(100, (row.points / 500) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-[rgb(var(--ok-fg))]">
                Goal reached · +{formatInt(row.delta)}
              </p>
            </div>
          );
        })}

        <div className="relative overflow-hidden rounded-[20px] bg-[rgb(var(--navy))] p-4 text-white shadow-[var(--shadow)]">
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full opacity-40 blur-2xl"
            style={{ background: "radial-gradient(circle, #2E6FEF 0%, transparent 70%)" }}
          />
          <div className="relative">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-white/55">
              Your standing
            </p>
            <p className="mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.03em] num">
              #{you.rank}
              <span className="ml-1.5 text-[11px] font-semibold text-white/55">
                of 174 people
              </span>
            </p>
            <p className="mt-2 text-[11.5px] text-white/70 num">
              {formatPoints(state.points)} / 500 pts
              <span className="ml-2 rounded-full bg-[rgba(110,231,168,0.18)] px-1.5 py-0.5 text-[9.5px] font-bold text-[#8CF0BC]">
                Goal reached · +{formatPoints(state.points)}
              </span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
              <span className="block h-full w-full rounded-full bg-[#5B9BFF]" />
            </div>
            <p className="mt-2 text-[10.5px] text-white/55">
              {you.solved} issue{you.solved === 1 ? "" : "s"} solved · {you.agents} agents
            </p>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--divider))] px-4 py-3">
          <p className="text-[13px] font-bold t-text">Team</p>
          <span className="text-[11px] t-muted">246 people</span>
          <div className="relative ml-auto w-full sm:w-[230px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              className="input h-9 pl-8 text-[12.5px]"
            />
          </div>
          <button
            onClick={() => setOnlineOnly((v) => !v)}
            className={cn("btn btn-sm gap-1.5", onlineOnly ? "btn-soft" : "btn-ghost")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--ok-fg))]" /> Online now
          </button>
          <button
            onClick={() => setCapacity((v) => !v)}
            className={cn("btn btn-sm", capacity ? "btn-soft" : "btn-ghost")}
          >
            Has capacity
          </button>
          <div className="seg">
            <button data-active={sort === "points"} onClick={() => setSort("points")}>
              Points
            </button>
            <button data-active={sort === "solved"} onClick={() => setSort("solved")}>
              Solved
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="table-head grid grid-cols-[40px_minmax(0,1fr)_170px_64px_120px_74px_128px] items-center gap-2 px-4 py-2">
              <span>#</span>
              <span>Person</span>
              <span>Share of #1</span>
              <span>Solved</span>
              <span>Points</span>
              <span>Claims</span>
              <span>Agents</span>
            </div>

            <div className="divide-y divide-[rgb(var(--divider))]">
              {rows.map((row) => {
                const rank = RANKING.find((r) => r.name === row.name)?.rank ?? row.rank;
                return (
                  <div
                    key={row.name}
                    className={cn(
                      "grid grid-cols-[40px_minmax(0,1fr)_170px_64px_120px_74px_128px] items-center gap-2 px-4 py-2.5",
                      row.you
                        ? "bg-[rgb(var(--accent))] text-white"
                        : "hover:bg-[rgb(var(--rowsel))]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11.5px] font-bold num",
                        row.you ? "text-white/80" : "t-muted",
                      )}
                    >
                      {rank}
                    </span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={row.name} hue={row.hue} size={28} you={row.you} />
                      <span
                        className={cn(
                          "truncate text-[12.5px] font-bold",
                          row.you ? "text-white" : "t-text",
                        )}
                      >
                        {row.name}
                      </span>
                      {row.you ? (
                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "bar flex-1",
                          row.you && "bg-white/20",
                        )}
                      >
                        <span
                          style={{ width: `${Math.max(2, Math.round((row.points / leader) * 100))}%` }}
                          className={row.you ? "!bg-white" : ""}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold num",
                          row.you ? "text-white/80" : "t-muted",
                        )}
                      >
                        {Math.round((row.points / leader) * 100)}%
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[11.5px] font-semibold num",
                        row.you ? "text-white/85" : "t-2",
                      )}
                    >
                      {row.solved}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "text-[11.5px] font-bold num",
                          row.you ? "text-white" : "t-text",
                        )}
                      >
                        {formatPoints(row.points)} pts
                      </p>
                      <p
                        className={cn(
                          "text-[9.5px] num",
                          row.you ? "text-white/65" : "t-muted",
                        )}
                      >
                        +{formatPoints(row.delta)} in 30d
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] num",
                        row.you ? "text-white/80" : "t-muted",
                      )}
                    >
                      {row.claims}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
                        row.you ? "bg-white/15 text-white" : "bg-[rgb(var(--chip))] t-2",
                      )}
                    >
                      <Users size={10} /> {row.agents} agents
                      <span
                        className={cn(
                          "ml-0.5 h-1.5 w-1.5 rounded-full",
                          row.online > 0 ? "bg-[rgb(var(--ok-fg))]" : "bg-[rgb(var(--border))]",
                        )}
                      />
                      <span className={row.you ? "text-white/70" : "t-muted"}>
                        {row.online} online
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[12.5px] font-bold t-text">No one matches those filters</p>
                <button
                  onClick={() => {
                    setQuery("");
                    setOnlineOnly(false);
                    setCapacity(false);
                  }}
                  className="btn btn-ghost btn-sm mt-3"
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[rgb(var(--divider))] px-4 py-2.5 text-[10.5px] t-muted">
          <span>
            Only validated work earns points. The ledger is append-only, so every point stays
            attributable.
          </span>
          <a href="#" className="ml-auto inline-flex items-center gap-1 font-bold t-accent">
            How points work <ArrowUpRight size={11} />
          </a>
        </div>
      </section>
    </div>
  );
}
