"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Coins,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Moon,
  Radio,
  RotateCcw,
  Sun,
  Trophy,
} from "lucide-react";
import { AGENTS } from "@/lib/data";
import { useZiki } from "@/lib/sim";
import { cn, formatPoints } from "@/lib/utils";
import { Avatar } from "./ui";

const NAV = [
  { href: "/console", label: "Console", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/issues", label: "Issues", icon: ListChecks },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/activity", label: "Activity", icon: Radio },
];

export function TopBar() {
  const pathname = usePathname();
  const { state, agent, activeRun, setAgent, reset } = useZiki();
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [platform, setPlatform] = useState("Product");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const agentsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (agentsRef.current && !agentsRef.current.contains(e.target as Node)) setAgentsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("ziki-theme", next);
    } catch {
      /* storage can be blocked; the toggle still works for this session */
    }
  }

  const queue = state.reviews.filter((review) => !review.resolvedAt).length;
  const running = state.runs.filter((run) => run.status === "running").length;

  return (
    <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] w-full max-w-shell items-center gap-3 px-4 sm:px-6">
        <Link href="/console" className="flex items-center gap-2" aria-label="Ziki home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ziki-mark.svg" alt="" width={26} height={26} />
          <span className="text-[19px] font-extrabold tracking-[-0.02em] t-text">ziki</span>
        </Link>

        <span className="mx-1 hidden h-6 w-px bg-[rgb(var(--divider))] md:block" />

        <button className="hidden items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5 text-[12.5px] font-bold t-text transition-colors hover:bg-[rgb(var(--chip))] md:inline-flex">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgb(var(--navy))] text-[9px] font-black text-white">
            Z
          </span>
          Zedu
          <ChevronDown size={13} className="t-muted" />
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Platform">
          {["Product", "Marketing", "Security"].map((item) => (
            <button
              key={item}
              onClick={() => setPlatform(item)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                platform === item
                  ? "bg-[rgb(var(--accent-soft))] t-accent"
                  : "t-muted hover:bg-[rgb(var(--chip))] hover:t-text",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  platform === item ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--border))]",
                )}
              />
              {item}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={agentsRef}>
            <button
              onClick={() => {
                setAgentsOpen((v) => !v);
                setUserOpen(false);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-[12.5px] font-bold t-text transition-colors hover:bg-[rgb(var(--chip))]"
              aria-expanded={agentsOpen}
            >
              <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--accent-soft))] t-accent">
                <Radio size={11} />
                {activeRun?.status === "running" ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[rgb(var(--ok-fg))]" />
                ) : null}
              </span>
              <span className="hidden sm:inline">Agents</span>
              <ChevronDown size={13} className="t-muted" />
            </button>
            {agentsOpen ? (
              <div className="pop-in absolute right-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2 shadow-[var(--shadow-pop)]">
                <p className="px-2 pb-1.5 pt-1 label-muted">Your agents</p>
                {AGENTS.map((a) => {
                  const running = activeRun?.status === "running" && activeRun.agentId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setAgent(a.id);
                        setAgentsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[rgb(var(--chip))]",
                        state.agentId === a.id && "bg-[rgb(var(--tint))]",
                      )}
                    >
                      <Avatar name={a.name} hue={a.id === "reviewer" ? 214 : 262} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold t-text">{a.name}</span>
                        <span className="block truncate text-[11px] t-muted">
                          {running
                            ? activeRun?.issueId
                              ? `Working on #${activeRun.issueId}`
                              : "Filing a report"
                            : a.model}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          running ? "bg-[rgb(var(--ok-fg))]" : "bg-[rgb(var(--border))]",
                        )}
                      />
                    </button>
                  );
                })}
                <div className="my-1.5 divider" />
                <Link
                  href="/console"
                  onClick={() => setAgentsOpen(false)}
                  className="block rounded-xl px-2 py-2 text-[12.5px] font-bold t-accent hover:bg-[rgb(var(--chip))]"
                >
                  Open the agent console →
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            href="/ranking"
            className="hidden h-9 items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-[12.5px] font-bold t-text transition-colors hover:bg-[rgb(var(--chip))] sm:inline-flex"
            title="Points this week"
          >
            <Coins size={14} className="text-[#C9921A]" />
            <span className="num">{formatPoints(state.points)}</span>
            <span className="text-[11px] font-semibold t-muted">pts</span>
          </Link>

          <Link href="/inbox" className="relative icon-btn" aria-label={`Inbox, ${queue} open escalations`}>
            <Bell size={17} />
            {queue > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[rgb(var(--bad-fg))] px-1 text-[10px] font-bold text-white">
                {queue}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setUserOpen((v) => !v);
                setAgentsOpen(false);
              }}
              className="flex h-9 items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] pl-1 pr-2.5 transition-colors hover:bg-[rgb(var(--chip))]"
              aria-expanded={userOpen}
            >
              <Avatar name="AbdulSamad" you size={27} />
              <span className="hidden text-[12.5px] font-bold t-text sm:inline">AbdulSamad</span>
              <ChevronDown size={13} className="t-muted" />
            </button>
            {userOpen ? (
              <div className="pop-in absolute right-0 top-full z-50 mt-2 w-[300px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow-pop)]">
                <div className="flex items-center gap-3 border-b border-[rgb(var(--divider))] p-3.5">
                  <Avatar name="AbdulSamad" you size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold t-text">AbdulSamad</p>
                    <p className="truncate text-[11.5px] t-muted">Owner · Zedu workspace</p>
                    <p className="mt-0.5 text-[11px] font-bold t-accent num">
                      {formatPoints(state.points)} pts
                    </p>
                  </div>
                </div>
                <div className="p-1.5">
                  <p className="px-2 pb-1 pt-1 label-muted">This session</p>
                  <Link
                    href="/console"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center justify-between rounded-xl px-2 py-2 text-[12.5px] font-semibold t-text hover:bg-[rgb(var(--chip))]"
                  >
                    Agent console
                    <span className="text-[10px] t-muted">{agent.name}</span>
                  </Link>
                  <Link
                    href="/activity"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center rounded-xl px-2 py-2 text-[12.5px] font-semibold t-text hover:bg-[rgb(var(--chip))]"
                  >
                    Live activity
                  </Link>
                  <div className="my-1 divider" />
                  <div className="flex items-center justify-between rounded-xl px-2 py-2">
                    <span className="text-[12.5px] font-semibold t-2">Theme</span>
                    <button
                      onClick={toggleTheme}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-[11.5px] font-bold t-2 hover:bg-[rgb(var(--chip))]"
                    >
                      {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
                      {theme === "dark" ? "Dark" : "Light"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      reset();
                      setUserOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[12.5px] font-semibold t-muted hover:bg-[rgb(var(--chip))]"
                  >
                    <RotateCcw size={13} /> Reset demo
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--divider))] bg-[rgb(var(--surface-2))]">
        <div className="mx-auto flex h-[50px] w-full max-w-shell items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-bold transition-colors",
                  active
                    ? "bg-[rgb(var(--accent-soft))] t-accent"
                    : "t-muted hover:bg-[rgb(var(--chip))] hover:t-text",
                )}
              >
                <Icon size={13} />
                {item.label}
                {item.href === "/inbox" && queue > 0 ? (
                  <span className="ml-0.5 rounded-full bg-[rgb(var(--accent))] px-1.5 text-[10px] font-bold text-white">
                    {queue}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="ml-auto flex items-center gap-2 pl-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 py-1 text-[11px] font-bold t-2 md:inline-flex">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  running ? "bg-[rgb(var(--ok-fg))]" : "bg-[rgb(var(--border))]",
                )}
              />
              {running === 0
                ? "Agents idle"
                : running === 1
                  ? "1 run in progress"
                  : `${running} runs in progress`}
            </span>
            <button onClick={toggleTheme} className="icon-btn h-8 w-8" aria-label="Toggle theme">
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
