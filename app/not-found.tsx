import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center py-16 text-center">
      <p className="chip chip-accent">404</p>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.02em] t-text">
        Nothing claimed this route
      </h1>
      <p className="mt-1.5 text-[13px] t-muted">
        The page is not part of this workspace. Your agents are still standing by.
      </p>
      <Link href="/console" className="btn btn-primary btn-sm mt-5">
        <ArrowLeft size={13} /> Back to the console
      </Link>
    </div>
  );
}
