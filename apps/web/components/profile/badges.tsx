"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  ApiError,
  problems as problemsApi,
  submissions as submissionsApi,
  type Evaluation,
  type Problem,
  type Submission,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PASS_THRESHOLD } from "@/components/whiteboard/evaluation-panel";

// ─────────────────────────────────────────────────────────────────────────────
// Model: a Track is one "badge" that can progress through tiers. Locked = no
// threshold met; otherwise the *highest* met threshold is the current tier.
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIER_ORDER: Tier[] = ["bronze", "silver", "gold", "platinum"];

type BadgeTone = "coral" | "amber" | "acid" | "ink";

interface TierStep {
  tier: Tier;
  threshold: number;
  /** Short text shown next to the threshold in the modal. */
  label: string;
}

interface Track {
  id: string;
  title: string;
  description: string;
  tone: BadgeTone;
  Icon: () => ReactElement;
  /** Reads progress from aggregated stats. */
  progress: (i: BadgeInput) => number;
  /** Sorted ascending by threshold. */
  tiers: TierStep[];
  /** Optional formatter for the progress value shown in the modal. */
  formatValue?: (v: number) => string;
}

export interface BadgeInput {
  submissions: Submission[];
  problemById: Map<string, Problem>;
  attempted: number;
  passedCount: number;
  passedByDifficulty: { easy: number; medium: number; hard: number };
  bestScore: number;
  longestStreakDays: number;
  /** Passed-eval submissions with zero issues flagged. */
  flawlessCount: number;
  /** Passed-eval submissions where scalability scored 5/5. */
  scalabilityMaxCount: number;
  /** Submissions made between 11pm and 4am local time. */
  nightOwlCount: number;
  /** Submissions made on a Saturday or Sunday (local). */
  weekendCount: number;
}

const TRACKS: Track[] = [
  {
    id: "starter",
    title: "First Sketch",
    description: "Submit your first design. The hardest line on the canvas is the first one.",
    tone: "amber",
    Icon: PencilIcon,
    progress: (i) => i.submissions.length,
    tiers: [{ tier: "bronze", threshold: 1, label: "1 submission" }],
  },
  {
    id: "passes",
    title: "Passes Earned",
    description: "Designs that crossed the 80% pass threshold. The bedrock of the platform.",
    tone: "coral",
    Icon: TrophyIcon,
    progress: (i) => i.passedCount,
    tiers: [
      { tier: "bronze",   threshold: 1,  label: "1 pass" },
      { tier: "silver",   threshold: 5,  label: "5 passes" },
      { tier: "gold",     threshold: 10, label: "10 passes" },
      { tier: "platinum", threshold: 20, label: "20 passes" },
    ],
  },
  {
    id: "score",
    title: "High Scorer",
    description: "Single-design score on the 25-point rubric. The closer to 25, the cleaner the design.",
    tone: "coral",
    Icon: BullseyeIcon,
    progress: (i) => i.bestScore,
    formatValue: (v) => `${v}/25`,
    tiers: [
      { tier: "bronze", threshold: 15, label: "Score 15+" },
      { tier: "silver", threshold: 20, label: "Score 20+" },
      { tier: "gold",   threshold: 25, label: "Perfect 25" },
    ],
  },
  {
    id: "streak",
    title: "Streak",
    description: "Longest run of consecutive days you've sketched. Showing up is half the work.",
    tone: "amber",
    Icon: BoltIcon,
    progress: (i) => i.longestStreakDays,
    formatValue: (v) => `${v} day${v === 1 ? "" : "s"}`,
    tiers: [
      { tier: "bronze", threshold: 3,  label: "3 days" },
      { tier: "silver", threshold: 7,  label: "7 days" },
      { tier: "gold",   threshold: 14, label: "14 days" },
    ],
  },
  {
    id: "easy",
    title: "Easy Climber",
    description: "Passes on easy-tier problems. The fundamentals before the flourish.",
    tone: "acid",
    Icon: LeafIcon,
    progress: (i) => i.passedByDifficulty.easy,
    tiers: [
      { tier: "bronze", threshold: 1, label: "1 easy" },
      { tier: "silver", threshold: 3, label: "3 easy" },
      { tier: "gold",   threshold: 5, label: "5 easy" },
    ],
  },
  {
    id: "medium",
    title: "Medium Maven",
    description: "Passes on medium-tier problems. Where most interview loops actually live.",
    tone: "amber",
    Icon: FlameIcon,
    progress: (i) => i.passedByDifficulty.medium,
    tiers: [
      { tier: "bronze", threshold: 1, label: "1 medium" },
      { tier: "silver", threshold: 3, label: "3 mediums" },
      { tier: "gold",   threshold: 5, label: "5 mediums" },
    ],
  },
  {
    id: "hard",
    title: "Hard Mode",
    description: "Passes on hard-tier problems. Multi-region, multi-tenant, multi-headache.",
    tone: "coral",
    Icon: MountainIcon,
    progress: (i) => i.passedByDifficulty.hard,
    tiers: [
      { tier: "bronze", threshold: 1, label: "1 hard" },
      { tier: "silver", threshold: 3, label: "3 hards" },
      { tier: "gold",   threshold: 5, label: "5 hards" },
    ],
  },
  {
    id: "triple-threat",
    title: "Triple Threat",
    description: "Pass at least one problem at every difficulty. Breadth before depth.",
    tone: "ink",
    Icon: TriangleIcon,
    progress: (i) => Math.min(i.passedByDifficulty.easy, 1) + Math.min(i.passedByDifficulty.medium, 1) + Math.min(i.passedByDifficulty.hard, 1),
    formatValue: (v) => `${v}/3 difficulties`,
    tiers: [
      { tier: "gold", threshold: 3, label: "One of each" },
    ],
  },
  {
    id: "prolific",
    title: "Prolific Sketcher",
    description: "Total submissions across all problems. Iteration beats perfection.",
    tone: "amber",
    Icon: ScrollIcon,
    progress: (i) => i.submissions.length,
    formatValue: (v) => `${v} submissions`,
    tiers: [
      { tier: "bronze", threshold: 5,  label: "5 submissions" },
      { tier: "silver", threshold: 15, label: "15 submissions" },
      { tier: "gold",   threshold: 40, label: "40 submissions" },
    ],
  },
  {
    id: "explorer",
    title: "Catalog Explorer",
    description: "Unique problems you've taken a swing at. Breadth of repertoire.",
    tone: "acid",
    Icon: MapIcon,
    progress: (i) => i.attempted,
    formatValue: (v) => `${v} problems`,
    tiers: [
      { tier: "bronze", threshold: 3,  label: "3 problems" },
      { tier: "silver", threshold: 7,  label: "7 problems" },
      { tier: "gold",   threshold: 12, label: "12 problems" },
    ],
  },
  {
    id: "flawless",
    title: "Flawless Design",
    description: "Passes where the evaluator found zero issues to flag. Rare air.",
    tone: "coral",
    Icon: GemIcon,
    progress: (i) => i.flawlessCount,
    formatValue: (v) => `${v} clean passes`,
    tiers: [
      { tier: "bronze", threshold: 1, label: "1 spotless pass" },
      { tier: "silver", threshold: 3, label: "3 spotless passes" },
      { tier: "gold",   threshold: 5, label: "5 spotless passes" },
    ],
  },
  {
    id: "scalability-champ",
    title: "Scalability Champion",
    description: "Earn 5/5 on the scalability rubric. Horizontal everything.",
    tone: "ink",
    Icon: PillarsIcon,
    progress: (i) => i.scalabilityMaxCount,
    formatValue: (v) => `${v} max-scaled passes`,
    tiers: [
      { tier: "bronze", threshold: 1,  label: "1 perfect scalability" },
      { tier: "silver", threshold: 5,  label: "5 perfect" },
      { tier: "gold",   threshold: 10, label: "10 perfect" },
    ],
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Submit between 11pm and 4am. The whiteboard does not sleep.",
    tone: "ink",
    Icon: MoonIcon,
    progress: (i) => i.nightOwlCount,
    formatValue: (v) => `${v} late-night sketches`,
    tiers: [
      { tier: "bronze", threshold: 1, label: "1 late-night sketch" },
      { tier: "silver", threshold: 5, label: "5 late nights" },
    ],
  },
  {
    id: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Submit on a Saturday or Sunday. Engineers, but make it fun.",
    tone: "amber",
    Icon: SunIcon,
    progress: (i) => i.weekendCount,
    formatValue: (v) => `${v} weekend sketches`,
    tiers: [
      { tier: "bronze", threshold: 1,  label: "1 weekend sketch" },
      { tier: "silver", threshold: 5,  label: "5 weekend sessions" },
      { tier: "gold",   threshold: 10, label: "10 weekend sessions" },
    ],
  },
];

// ─── Global provider ─────────────────────────────────────────────────────────
// Lives at the app root. Fetches submissions+problems whenever a user is
// signed in, computes earned tracks, and surfaces unlock toasts + the detail
// modal globally — so finishing an evaluate on /problems/:id/draw triggers a
// toast without needing to visit /profile.

interface BadgesContextValue {
  earned: EarnedTrack[];
  loading: boolean;
  /** Re-fetch submissions; call after evaluate succeeds to surface new unlocks. */
  refresh: () => void;
  /** Open the detail modal for a track by id. */
  openTrack: (trackId: string) => void;
}

const BadgesContext = createContext<BadgesContextValue | null>(null);

export function BadgesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [subs, setSubs] = useState<Submission[]>([]);
  const [problemById, setProblemById] = useState<Map<string, Problem>>(() => new Map());
  const [loading, setLoading] = useState(false);
  const [fetchToken, setFetchToken] = useState(0);

  const [open, setOpen] = useState<EarnedTrack | null>(null);
  const [toasts, setToasts] = useState<UnlockToast[]>([]);

  // Refetch on user change OR explicit refresh() call.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSubs([]);
      setProblemById(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      submissionsApi.list({ limit: 100 }),
      problemsApi.list({ limit: 100 }),
    ])
      .then(([s, p]) => {
        if (cancelled) return;
        setSubs(s.items);
        const m = new Map<string, Problem>();
        for (const item of p.items) m.set(item.id, item);
        setProblemById(m);
      })
      .catch((err: unknown) => {
        // Silent failure — badges are best-effort. 401 means a session expired
        // between auth check and fetch; nothing to surface to the user.
        if (err instanceof ApiError && err.status === 401) return;
        console.warn("badges fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, fetchToken]);

  const input = useMemo(
    () => buildBadgeInput(subs, problemById),
    [subs, problemById],
  );
  const earned = useMemo(() => TRACKS.map((t) => earnedFor(t, input)), [input]);

  // Detect newly earned tiers; persist seen set per-user so refresh() doesn't
  // re-fire the same toast, but a brand-new unlock still surfaces immediately.
  //
  // First-load detection is anchored to *localStorage presence*, not a React
  // ref — refs are reset on every page load (so every sign-in would re-toast
  // every existing badge) and double-fire under React strict mode in dev.
  // A null `seenRaw` means "we've never written badges for this user on this
  // browser before"; in that case we silently seed the cache and skip toasts.
  useEffect(() => {
    if (loading || !user) return;
    const key = `sk.badges.seen.${user.id}`;
    const seenRaw = window.localStorage.getItem(key);
    const isFirstLoad = seenRaw === null;
    const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
    const currentTokens: string[] = [];
    const fresh: UnlockToast[] = [];

    for (const e of earned) {
      if (!e.currentTier) continue;
      for (const t of e.allEarnedTiers) currentTokens.push(`${e.track.id}:${t}`);
      const topToken = `${e.track.id}:${e.currentTier}`;
      if (!isFirstLoad && !seen.has(topToken)) {
        fresh.push({
          id: `${topToken}-${Date.now()}`,
          track: e.track,
          tier: e.currentTier,
        });
      }
    }
    window.localStorage.setItem(key, JSON.stringify(currentTokens));
    if (fresh.length > 0) setToasts((prev) => [...prev, ...fresh]);
  }, [earned, loading, user]);

  const refresh = useCallback(() => setFetchToken((n) => n + 1), []);

  const openTrack = useCallback(
    (trackId: string) => {
      const found = earned.find((e) => e.track.id === trackId);
      if (found) setOpen(found);
    },
    [earned],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <BadgesContext.Provider value={{ earned, loading, refresh, openTrack }}>
      {children}
      {open && <BadgeModal earned={open} onClose={() => setOpen(null)} />}
      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onClick={(t) => openTrack(t.track.id)}
      />
    </BadgesContext.Provider>
  );
}

export function useBadges(): BadgesContextValue {
  const ctx = useContext(BadgesContext);
  if (!ctx) {
    // Caller used the hook outside the provider — return a no-op so it stays
    // usable in test renderers or during SSR fallbacks.
    return { earned: [], loading: false, refresh: () => {}, openTrack: () => {} };
  }
  return ctx;
}

// ─── Panel (reads from context, no props) ────────────────────────────────────

export function BadgesPanel() {
  const { earned, loading, openTrack } = useBadges();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const earnedOnly = useMemo(
    () =>
      earned
        .filter((e) => e.currentTier !== null)
        .sort((a, b) => {
          // Highest tier first.
          const ai = a.currentTier ? TIER_ORDER.indexOf(a.currentTier) : -1;
          const bi = b.currentTier ? TIER_ORDER.indexOf(b.currentTier) : -1;
          return bi - ai;
        }),
    [earned],
  );

  const unlockedCount = earnedOnly.length;

  return (
    <>
      <div className="rounded-[14px] border border-rule bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Badges
            </div>
            <h3 className="m-0 mt-0.5 text-[17px] font-semibold tracking-tight">
              {loading
                ? "Loading badges…"
                : unlockedCount === 0
                  ? "No badges earned yet"
                  : `${unlockedCount} of ${TRACKS.length} unlocked`}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className={
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rule " +
              "bg-paper-2/60 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] " +
              "text-ink-soft transition hover:border-ink hover:bg-paper-2 hover:text-ink"
            }
          >
            Show all
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M3 2l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <BadgesSkeleton />
        ) : earnedOnly.length === 0 ? (
          <EmptyEarnedState onShowAll={() => setCatalogOpen(true)} />
        ) : (
          <div className="flex flex-wrap gap-3">
            {earnedOnly.map((e) => (
              <BadgeChip
                key={e.track.id}
                earned={e}
                onClick={() => openTrack(e.track.id)}
              />
            ))}
          </div>
        )}
      </div>

      {catalogOpen && (
        <BadgeCatalogModal
          earned={earned}
          onClose={() => setCatalogOpen(false)}
          onSelect={(id) => openTrack(id)}
        />
      )}
    </>
  );
}

// ─── Empty state (no earned badges) ──────────────────────────────────────────
function EmptyEarnedState({ onShowAll }: { onShowAll: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[12px] border border-dashed border-rule bg-paper-2/30 px-5 py-7 text-center">
      <div className="opacity-70">
        <Medallion track={TRACKS[0]!} tier={null} size={56} />
      </div>
      <p className="m-0 mt-3 max-w-[40ch] text-[13px] leading-[1.5] text-ink-soft">
        Submit your first sketch to earn your first badge. There are{" "}
        <span className="font-medium text-ink">{TRACKS.length}</span> to chase.
      </p>
      <button
        type="button"
        onClick={onShowAll}
        className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-coral hover:underline"
      >
        Browse catalog →
      </button>
    </div>
  );
}

// ─── Catalog modal (full list, earned + locked) ──────────────────────────────
function BadgeCatalogModal({
  earned, onClose, onSelect,
}: {
  earned: EarnedTrack[];
  onClose: () => void;
  onSelect: (trackId: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const unlocked = earned.filter((e) => e.currentTier !== null);
  const locked = earned.filter((e) => e.currentTier === null);

  // Highest tier first inside each group.
  unlocked.sort((a, b) => TIER_ORDER.indexOf(b.currentTier!) - TIER_ORDER.indexOf(a.currentTier!));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All badges"
      onClick={onClose}
      className="fixed inset-0 z-[55] flex items-center justify-center p-5"
      style={{ animation: "sk-fade-in 160ms ease-out" }}
    >
      <div aria-hidden className="absolute inset-0 bg-ink/55 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[640px] max-h-[85vh] flex-col overflow-hidden rounded-[18px] border border-rule bg-white shadow-lg"
        style={{ animation: "sk-pop-in 220ms cubic-bezier(0.2, 1.1, 0.4, 1)" }}
      >
        {/* Header */}
        <div className="relative flex items-start justify-between border-b border-rule bg-paper px-6 py-4">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.06)_1px,transparent_0)] bg-[length:18px_18px]"
          />
          <div className="relative">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Catalog
            </div>
            <h2 className="m-0 mt-0.5 text-[19px] font-semibold tracking-tight">
              All badges
            </h2>
            <p className="m-0 mt-1 text-[12px] text-ink-soft">
              {unlocked.length} unlocked · {locked.length} to chase
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close catalog"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {unlocked.length > 0 && (
            <CatalogSection
              title="Earned"
              items={unlocked}
              onSelect={onSelect}
            />
          )}
          {locked.length > 0 && (
            <div className={unlocked.length > 0 ? "mt-6" : ""}>
              <CatalogSection
                title="Locked"
                items={locked}
                onSelect={onSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogSection({
  title, items, onSelect,
}: {
  title: string;
  items: EarnedTrack[];
  onSelect: (trackId: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
          {title}
        </span>
        <span className="font-mono text-[10px] text-ink-muted">·</span>
        <span className="font-mono text-[10px] text-ink-muted">{items.length}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((e) => (
          <BadgeChip
            key={e.track.id}
            earned={e}
            onClick={() => onSelect(e.track.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Tile (small medallion + title only) ─────────────────────────────────────

function BadgeChip({ earned, onClick }: { earned: EarnedTrack; onClick: () => void }) {
  const unlocked = earned.currentTier !== null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={earned.track.title}
      aria-label={`${earned.track.title} — ${unlocked ? earned.currentTier : "locked"}`}
      className={
        "group relative flex w-[88px] flex-col items-center rounded-[12px] p-2 " +
        "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/60 " +
        (unlocked
          ? "hover:-translate-y-px"
          : "")
      }
    >
      <Medallion
        track={earned.track}
        tier={earned.currentTier}
        size={56}
      />
      <div
        className={
          "mt-1.5 max-w-full truncate text-[11px] font-semibold tracking-tight " +
          (unlocked ? "text-ink" : "text-ink-muted")
        }
      >
        {earned.track.title}
      </div>
      {unlocked && earned.currentTier && (
        <div className={`mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${TIER_STYLES[earned.currentTier].text}`}>
          {earned.currentTier}
        </div>
      )}
      {!unlocked && (
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-muted">
          locked
        </div>
      )}
    </button>
  );
}

// ─── Medallion ───────────────────────────────────────────────────────────────
// Two-layer disc: outer ring painted in tier metal, inner disc in the track's
// tone. Locked = paper-2 fill with grayed glyph and a lock chip overlay.

function Medallion({
  track, tier, size,
}: {
  track: Track;
  tier: Tier | null;
  size: number;
}) {
  const inner = tier ? TONE_FILL[track.tone] : "#efe8d6";
  const outer = tier ? TIER_STYLES[tier].metal : "#c9c0ab";
  const accent = tier ? TIER_STYLES[tier].accent : "#d8cfb8";
  const fg = tier ? TONE_FG[track.tone] : "#8a8273";
  const id = `m-${track.id}-${tier ?? "lock"}`;
  return (
    <span
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          {/* Outer ring gets a gentle paper-warm gradient instead of a chrome
              highlight — keeps the badge feeling stamped, not molded. */}
          <linearGradient id={`${id}-outer`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={outer} />
          </linearGradient>
        </defs>
        {/* Soft paper-warm cast shadow (was a hard black; now bone-tinted) */}
        <circle cx="32" cy="33.5" r="29" fill="rgba(112, 96, 60, 0.10)" />
        {/* Outer ring */}
        <circle
          cx="32" cy="32" r="30"
          fill={`url(#${id}-outer)`}
          stroke={outer}
          strokeWidth="1"
        />
        {/* Inner colored disc — flat, no glare */}
        <circle
          cx="32" cy="32" r="22"
          fill={inner}
          stroke={tier ? outer : "#bdb39b"}
          strokeOpacity={tier ? 0.35 : 0.6}
          strokeWidth="1"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ color: fg }}
      >
        <span
          className={tier ? "" : "opacity-50"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${size / 56})`,
          }}
        >
          <track.Icon />
        </span>
      </span>
      {!tier && (
        <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-paper bg-white text-ink-muted shadow-sm">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <rect x="1.5" y="4" width="6" height="4" rx="0.8" stroke="currentColor" strokeWidth="1" />
            <path d="M3 4V3a1.5 1.5 0 0 1 3 0v1" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </span>
      )}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function BadgeModal({ earned, onClose }: { earned: EarnedTrack; onClose: () => void }) {
  // Close on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { track, currentTier, value } = earned;
  const nextStep = useMemo(() => {
    const idx = track.tiers.findIndex((s) => s.tier === currentTier);
    if (currentTier === null) return track.tiers[0]!;
    return track.tiers[idx + 1] ?? null;
  }, [track.tiers, currentTier]);

  const display = track.formatValue ? track.formatValue(value) : String(value);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${track.title} badge details`}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-5"
      style={{ animation: "sk-fade-in 160ms ease-out" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] overflow-hidden rounded-[18px] border border-rule bg-white shadow-lg"
        style={{ animation: "sk-pop-in 220ms cubic-bezier(0.2, 1.1, 0.4, 1)" }}
      >
        {/* Top half — paper background with the big medallion centered */}
        <div className="relative flex flex-col items-center bg-paper px-6 pt-8 pb-6">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.08)_1px,transparent_0)] bg-[length:18px_18px]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-1/2 h-40 w-40 translate-x-1/2 rounded-full bg-coral/15 blur-2xl"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="relative">
            <Medallion track={track} tier={currentTier} size={132} />
          </div>
          <h2 className="relative m-0 mt-4 text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {track.title}
          </h2>
          {currentTier ? (
            <div
              className={
                "relative mt-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] " +
                TIER_STYLES[currentTier].chip
              }
            >
              {currentTier} tier
            </div>
          ) : (
            <div className="relative mt-1.5 rounded-full border border-rule bg-paper-2 px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              Locked
            </div>
          )}
        </div>

        {/* Bottom half — description, tier ladder, progress */}
        <div className="space-y-4 px-6 pt-5 pb-6">
          <p className="m-0 text-[13.5px] leading-[1.55] text-ink-soft">
            {track.description}
          </p>

          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              Tiers
            </div>
            <ol className="m-0 list-none space-y-2 p-0">
              {track.tiers.map((step) => {
                const reached = step.threshold <= value;
                return (
                  <li
                    key={step.tier}
                    className={
                      "flex items-center justify-between gap-3 rounded-md border px-3 py-2 " +
                      (reached
                        ? `${TIER_STYLES[step.tier].rowBg} ${TIER_STYLES[step.tier].rowBorder}`
                        : "border-rule bg-paper-2/40")
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: TIER_STYLES[step.tier].metal }}
                      />
                      <span className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${reached ? TIER_STYLES[step.tier].text : "text-ink-muted"}`}>
                        {step.tier}
                      </span>
                      <span className={`text-[12.5px] ${reached ? "text-ink" : "text-ink-muted"}`}>
                        {step.label}
                      </span>
                    </div>
                    {reached ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={TIER_STYLES[step.tier].text}>
                        <path d="M3 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="font-mono text-[10.5px] text-ink-muted">
                        {Math.max(0, step.threshold - value)} to go
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Progress bar to next tier */}
          {nextStep && (
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  Next: {nextStep.tier}
                </span>
                <span className="font-mono text-[10.5px] text-ink">
                  {display} / {track.formatValue ? track.formatValue(nextStep.threshold) : nextStep.threshold}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
                <div
                  className="h-full rounded-full bg-coral transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((value / nextStep.threshold) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Unlock toast ────────────────────────────────────────────────────────────

interface UnlockToast {
  id: string;
  track: Track;
  tier: Tier;
}

function ToastStack({
  toasts, onDismiss, onClick,
}: {
  toasts: UnlockToast[];
  onDismiss: (id: string) => void;
  onClick: (t: UnlockToast) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[70] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} onClick={onClick} />
      ))}
    </div>
  );
}

function ToastCard({
  toast, onDismiss, onClick,
}: {
  toast: UnlockToast;
  onDismiss: (id: string) => void;
  onClick: (t: UnlockToast) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => onClick(toast)}
      className={
        "pointer-events-auto relative flex w-[320px] cursor-pointer items-center gap-3 " +
        "overflow-hidden rounded-[14px] border border-rule bg-white p-3 shadow-lg " +
        "transition hover:-translate-y-px hover:shadow-md"
      }
      style={{ animation: "sk-toast-in 320ms cubic-bezier(0.2, 1.1, 0.4, 1)" }}
    >
      {/* Diagonal sweep */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
        style={{ background: TIER_STYLES[toast.tier].metal }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-coral/15 blur-xl"
      />
      <Medallion track={toast.track} tier={toast.tier} size={48} />
      <div className="min-w-0 flex-1">
        <div className={`font-mono text-[10px] uppercase tracking-[0.16em] ${TIER_STYLES[toast.tier].text}`}>
          New badge · {toast.tier}
        </div>
        <div className="truncate text-[13.5px] font-semibold text-ink">
          {toast.track.title}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-ink-soft">
          Tap to view details.
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        aria-label="Dismiss"
        className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Tier legend (tiny pips on the panel header) ─────────────────────────────

function TierLegend() {
  return (
    <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted sm:flex">
      {TIER_ORDER.map((t) => (
        <span key={t} className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: TIER_STYLES[t].metal }}
          />
          {t}
        </span>
      ))}
    </div>
  );
}

function BadgesSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex w-[88px] animate-pulse flex-col items-center p-2"
        >
          <div className="h-14 w-14 rounded-full bg-paper-2" />
          <div className="mt-1.5 h-3 w-16 rounded bg-paper-2" />
          <div className="mt-1 h-2 w-10 rounded bg-paper-2" />
        </div>
      ))}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// Soft, paper-tinted inner discs — the badge sits *on* the page, not on top of
// it like a chrome medal. Icon foreground colors are deeper variants of the
// same hue so the glyph reads as ink-on-cream rather than print-on-plastic.
const TONE_FILL: Record<BadgeTone, string> = {
  coral: "#ffd6c1",
  amber: "#f7e2a3",
  acid:  "#d8e6b8",
  ink:   "#d8cfb8",
};
const TONE_FG: Record<BadgeTone, string> = {
  coral: "#a83a16",
  amber: "#8a5b00",
  acid:  "#5a7d10",
  ink:   "#1a1814",
};

// Tier "metals" — pulled toward the warm paper palette. Silver/platinum
// borrow the existing bone-mute / ink-soft theme tokens so the badge feels
// drawn from the same palette as the rest of the site, not bolted on.
const TIER_STYLES: Record<Tier, {
  metal: string;
  accent: string;
  text: string;
  chip: string;
  rowBg: string;
  rowBorder: string;
}> = {
  bronze: {
    metal:  "#a06023",
    accent: "#e6c89a",
    text:   "text-[#7a3f0e]",
    chip:   "border-[#a06023]/40 bg-[#e6c89a]/30 text-[#7a3f0e]",
    rowBg:  "bg-[#e6c89a]/15",
    rowBorder: "border-[#a06023]/25",
  },
  silver: {
    metal:  "#8a8273",
    accent: "#c9c0ab",
    text:   "text-[#5a5346]",
    chip:   "border-[#8a8273]/40 bg-[#c9c0ab]/30 text-[#5a5346]",
    rowBg:  "bg-[#c9c0ab]/20",
    rowBorder: "border-[#8a8273]/30",
  },
  gold: {
    metal:  "#b07c10",
    accent: "#f3b941",
    text:   "text-[#7a5300]",
    chip:   "border-amber/50 bg-amber/20 text-[#7a5300]",
    rowBg:  "bg-amber/12",
    rowBorder: "border-amber/40",
  },
  platinum: {
    metal:  "#3a352d",
    accent: "#6b6457",
    text:   "text-ink",
    chip:   "border-ink/30 bg-ink/[0.05] text-ink",
    rowBg:  "bg-ink/[0.04]",
    rowBorder: "border-ink/25",
  },
};

// ─── Computation ─────────────────────────────────────────────────────────────

interface EarnedTrack {
  track: Track;
  /** Current value (e.g. number of passes, longest streak). */
  value: number;
  /** Highest tier the user has earned, or null if locked. */
  currentTier: Tier | null;
  /** All tier names the user has hit on this track. */
  allEarnedTiers: Tier[];
}

function earnedFor(track: Track, input: BadgeInput): EarnedTrack {
  const value = track.progress(input);
  const allEarnedTiers: Tier[] = [];
  let top: Tier | null = null;
  for (const step of track.tiers) {
    if (value >= step.threshold) {
      allEarnedTiers.push(step.tier);
      top = step.tier;
    }
  }
  return { track, value, currentTier: top, allEarnedTiers };
}

function buildBadgeInput(
  subs: Submission[],
  problemById: Map<string, Problem>,
): BadgeInput {
  const attemptedSet = new Set<string>();
  const passedSet = new Set<string>();
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  let best = 0;
  let flawless = 0;
  let scalabilityMax = 0;
  let nightOwl = 0;
  let weekend = 0;

  for (const s of subs) {
    attemptedSet.add(s.problem_id);

    // Time-of-day / day-of-week badges count every submission, evaluated or not.
    const t = new Date(s.created_at);
    if (!Number.isNaN(t.getTime())) {
      const h = t.getHours();
      if (h >= 23 || h < 4) nightOwl++;
      const dow = t.getDay(); // 0=Sun, 6=Sat
      if (dow === 0 || dow === 6) weekend++;
    }

    const ev = s.evaluation as Evaluation | null;
    if (!ev) continue;
    const score = scoreOf(ev);
    if (score > best) best = score;

    if (passedEval(ev)) {
      // "Flawless" and "scalability champ" count *every* qualifying pass, not
      // unique problems — repeated mastery is a feature, not double-counting.
      if (ev.issues.length === 0) flawless++;
      const scal = ev.scores.scalability;
      if (scal && scal.value >= scal.max) scalabilityMax++;

      if (!passedSet.has(s.problem_id)) {
        passedSet.add(s.problem_id);
        const p = problemById.get(s.problem_id);
        if (p) byDiff[p.difficulty]++;
      }
    }
  }

  return {
    submissions: subs,
    problemById,
    attempted: attemptedSet.size,
    passedCount: passedSet.size,
    passedByDifficulty: byDiff,
    bestScore: best,
    longestStreakDays: longestStreak(subs),
    flawlessCount: flawless,
    scalabilityMaxCount: scalabilityMax,
    nightOwlCount: nightOwl,
    weekendCount: weekend,
  };
}

function scoreOf(ev: Evaluation): number {
  let v = 0;
  for (const c of Object.values(ev.scores)) if (c) v += c.value;
  return v;
}
function maxOf(ev: Evaluation): number {
  let m = 0;
  for (const c of Object.values(ev.scores)) if (c) m += c.max;
  return m;
}
function passedEval(ev: Evaluation): boolean {
  const m = maxOf(ev);
  return m > 0 && scoreOf(ev) / m >= PASS_THRESHOLD;
}

function longestStreak(subs: Submission[]): number {
  if (subs.length === 0) return 0;
  const days = new Set<string>();
  for (const s of subs) {
    const d = new Date(s.created_at);
    if (Number.isNaN(d.getTime())) continue;
    days.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const sorted = [...days].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]!);
    const next = new Date(sorted[i]!);
    const diff = Math.round((next.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else if (diff > 1) {
      cur = 1;
    }
  }
  return best;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconBase = ({ children }: { children: React.ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden>
    {children}
  </svg>
);

function PencilIcon() {
  return (
    <IconBase>
      <path d="M2.5 15.5l1-3 8.5-8.5 2 2-8.5 8.5-3 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11 4l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}
function TrophyIcon() {
  return (
    <IconBase>
      <path d="M5 3h8v3a4 4 0 0 1-8 0V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 4H3v1a2 2 0 0 0 2 2M13 4h2v1a2 2 0 0 1-2 2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 11h4l-.5 3h-3L7 11zM6 15h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}
function BullseyeIcon() {
  return (
    <IconBase>
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </IconBase>
  );
}
function BoltIcon() {
  return (
    <IconBase>
      <path d="M10 1.5L4 10h4l-1 6.5 6-8.5h-4l1-6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.18" />
    </IconBase>
  );
}
function LeafIcon() {
  return (
    <IconBase>
      <path d="M3 15c0-6 4-11 12-11 0 6-4 11-12 11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
      <path d="M3 15c4-2 7-5 9-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}
function FlameIcon() {
  return (
    <IconBase>
      <path d="M9 2c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1.5-3 2.5-4S8.5 3.5 9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.18" />
    </IconBase>
  );
}
function MountainIcon() {
  return (
    <IconBase>
      <path d="M2.5 14.5l4-7 2.5 4.5 2-3 4.5 5.5h-13z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.16" />
    </IconBase>
  );
}
function TriangleIcon() {
  return (
    <IconBase>
      <path d="M9 2.5l6.5 12h-13L9 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.16" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </IconBase>
  );
}
function PillarsIcon() {
  return (
    <IconBase>
      <path d="M2 5l7-3 7 3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M2 5h14M3 15h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4 5v10M9 5v10M14 5v10" stroke="currentColor" strokeWidth="1.3" />
    </IconBase>
  );
}
function ScrollIcon() {
  return (
    <IconBase>
      <path d="M4 3h8a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2V3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.14" />
      <path d="M14 15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 7h5M6.5 9.5h5M6.5 12h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </IconBase>
  );
}
function MapIcon() {
  return (
    <IconBase>
      <path d="M2.5 4.5l4-1.5 5 1.5 4-1.5v10l-4 1.5-5-1.5-4 1.5v-10z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.14" />
      <path d="M6.5 3v11.5M11.5 4.5V16" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
    </IconBase>
  );
}
function GemIcon() {
  return (
    <IconBase>
      <path d="M9 1.5l5.5 4.5L9 16.5 3.5 6 9 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.18" />
      <path d="M3.5 6h11M6.5 6L9 16.5 11.5 6M6.5 6L9 1.5l2.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </IconBase>
  );
}
function MoonIcon() {
  return (
    <IconBase>
      <path d="M14.5 11A6 6 0 0 1 7 3.5a6 6 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.16" />
      <circle cx="13" cy="4.5" r="0.6" fill="currentColor" />
      <circle cx="15" cy="7" r="0.5" fill="currentColor" opacity="0.7" />
    </IconBase>
  );
}
function SunIcon() {
  return (
    <IconBase>
      <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.18" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.5 3.5l1.4 1.4M13.1 13.1l1.4 1.4M3.5 14.5l1.4-1.4M13.1 4.9l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </IconBase>
  );
}
