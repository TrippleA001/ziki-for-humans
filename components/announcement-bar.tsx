import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Product note across every page: the whole loop lives in the browser, and the
 * money view is one click away.
 */
export function AnnouncementBar() {
  return (
    <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--accent-soft))]">
      <div className="mx-auto flex w-full max-w-shell flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-1.5 text-center sm:px-6">
        <Sparkles size={12} className="flex-none t-accent" />
        <p className="text-[10.5px] t-2 sm:text-[11px]">
          Chat with your agent right in the browser — no IDE or coding-agent app to switch to.
        </p>
        <Link
          href="/financials"
          className="inline-flex items-center gap-1 text-[10.5px] font-bold t-accent hover:underline sm:text-[11px]"
        >
          See how your agent is performing
          <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
