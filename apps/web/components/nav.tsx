"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Avatar } from "@/components/profile/avatar";
import { useAuth } from "@/lib/auth";

interface Props {
  /** Show the landing-page in-section anchors (How it works / Problems / Why sketchd). */
  showAnchors?: boolean;
}

export function Nav({ showAnchors = false }: Props) {
  const { user, loading, logout } = useAuth();
  return (
    <nav className="sticky top-0 z-50 border-b border-rule bg-paper/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-7 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <BrandMark />
          <span>sketchd</span>
        </Link>

        <div className="hidden gap-7 text-sm text-ink-soft md:flex">
          {showAnchors ? (
            <>
              <a href="#sk-pipeline" className="hover:text-ink">How it works</a>
              <a href="#sk-problems" className="hover:text-ink">Problems</a>
              <a href="#sk-benefits" className="hover:text-ink">Why sketchd</a>
            </>
          ) : (
            <Link href="/problems" className="hover:text-ink">Problems</Link>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {loading ? (
            <div className="h-9 w-32" aria-hidden />
          ) : user ? (
            <>
              <Link
                href="/profile"
                title={`View ${user.display_name}'s profile`}
                className="group flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition hover:bg-ink/5"
              >
                <Avatar user={user} size={30} />
                <span className="hidden text-sm font-medium text-ink sm:inline">
                  {user.display_name}
                </span>
              </Link>
              <button
                onClick={() => void logout()}
                className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-md transition hover:-translate-y-px"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
