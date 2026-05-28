"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { User } from "@/lib/api";

interface Props {
  user: User;
  /** Avatar diameter in px. */
  size?: number;
  /** Whether to show the hover "Change" overlay + file input. */
  editable?: boolean;
}

/** localStorage key for the optional user-uploaded avatar (data URL). */
const AVATAR_KEY = (userId: string) => `sk.avatar.${userId}`;

/** Pull the override (if any) for this user. Safe to call on the server too —
 * returns null when window is undefined. */
function readOverride(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AVATAR_KEY(userId));
  } catch {
    return null;
  }
}

/** Deterministic hash → small integer. */
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

// Warm-palette tones the avatar can be painted with. Picked to sit
// comfortably on the paper background — blue felt out of place against the
// rest of the brand, so it's intentionally absent. Order matters: the index
// is derived deterministically from the user id so the same user always
// gets the same color across sessions / devices.
const TONES: { bg: string; fg: string; accent: string }[] = [
  { bg: "#ff6a3d", fg: "#1a1814", accent: "#ffb89a" }, // coral
  { bg: "#f3b941", fg: "#1a1814", accent: "#fde2a1" }, // amber
  { bg: "#b5f23a", fg: "#1a1814", accent: "#e2fab1" }, // acid
  { bg: "#1a1814", fg: "#f6f1e6", accent: "#3a352d" }, // ink
];

/** Pick a tone deterministically from the user id. */
export function pickTone(userId: string) {
  return TONES[hashStr(userId) % TONES.length]!;
}

/** First grapheme of the display name, uppercased; "?" if empty. */
function firstChar(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // Splitting on Array handles wide chars (emoji) correctly.
  return [...trimmed][0]!.toUpperCase();
}

export function Avatar({ user, size = 96, editable = false }: Props) {
  const [override, setOverride] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Read the localStorage override after mount to avoid hydration mismatch.
  useEffect(() => {
    setOverride(readOverride(user.id));
  }, [user.id]);

  const tone = useMemo(() => pickTone(user.id), [user.id]);
  const letter = useMemo(() => firstChar(user.display_name), [user.display_name]);

  const onPick = useCallback(() => fileRef.current?.click(), []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-picking the same file later
      if (!file) return;
      // Hard cap so a misclick on a 10 MB photo doesn't blow up localStorage.
      if (file.size > 1_500_000) {
        window.alert("Pick an image under 1.5 MB.");
        return;
      }
      const data = await fileToDataUrl(file);
      try {
        window.localStorage.setItem(AVATAR_KEY(user.id), data);
        setOverride(data);
      } catch {
        window.alert("Couldn't save avatar — storage full?");
      }
    },
    [user.id],
  );

  const onReset = useCallback(() => {
    window.localStorage.removeItem(AVATAR_KEY(user.id));
    setOverride(null);
  }, [user.id]);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="overflow-hidden rounded-full ring-2 ring-paper shadow-md"
        style={{ width: size, height: size, background: tone.bg }}
      >
        {override ? (
          // Safe: data: URL we wrote ourselves; not user-fetched markup.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={override}
            alt={`${user.display_name}'s avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          <DefaultGlyph
            size={size}
            letter={letter}
            tone={tone}
            seed={hashStr(user.id)}
          />
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            onClick={onPick}
            title="Upload a new avatar"
            aria-label="Upload a new avatar"
            className={
              "absolute -bottom-1 -right-1 inline-flex items-center justify-center " +
              "rounded-full border-2 border-paper bg-ink text-paper shadow-md " +
              "transition hover:bg-coral focus:outline-none focus-visible:ring-2 " +
              "focus-visible:ring-coral/60"
            }
            style={{
              width: Math.round(size * 0.32),
              height: Math.round(size * 0.32),
            }}
          >
            <CameraIcon
              size={Math.max(12, Math.round(size * 0.18))}
            />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onFile}
            className="hidden"
          />
          {override && (
            <button
              type="button"
              onClick={onReset}
              title="Reset to default avatar"
              aria-label="Reset to default avatar"
              className={
                "absolute -top-1 -right-1 inline-flex h-6 w-6 items-center " +
                "justify-center rounded-full border-2 border-paper bg-white " +
                "text-ink-muted shadow-md transition hover:text-coral"
              }
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Default avatar glyph ────────────────────────────────────────────────────
// Geometric backdrop (a couple of arcs derived from the seed) + the user's
// initial. Reads like a brand mark rather than a stock silhouette.
function DefaultGlyph({
  size, letter, tone, seed,
}: {
  size: number;
  letter: string;
  tone: { bg: string; fg: string; accent: string };
  seed: number;
}) {
  // Two arc rotations derived from the seed → every user gets a unique mark.
  const angleA = (seed % 360);
  const angleB = ((seed >> 5) % 360);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
    >
      {/* Accent ring */}
      <circle cx="50" cy="50" r="48" fill={tone.bg} />
      <g transform={`rotate(${angleA} 50 50)`}>
        <path
          d="M 8,50 A 42,42 0 0 1 92,50"
          fill="none"
          stroke={tone.accent}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
      <g transform={`rotate(${angleB} 50 50)`}>
        <path
          d="M 18,72 A 32,32 0 0 1 82,72"
          fill="none"
          stroke={tone.accent}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontWeight="600"
        fontSize="42"
        fill={tone.fg}
        letterSpacing="-1"
      >
        {letter}
      </text>
    </svg>
  );
}

function CameraIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 4.5h2l1-1.5h3l1 1.5h2v6.5h-9v-6.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
