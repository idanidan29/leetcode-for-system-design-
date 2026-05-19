"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { BrandMark } from "@/components/brand-mark";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Mode = "signup" | "login";

interface Props {
  mode: Mode;
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const { user, loading: sessionLoading, signup, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionLoading && user) router.replace("/problems");
  }, [sessionLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({ email, password, display_name: displayName });
      } else {
        await login(email, password);
      }
      router.push("/problems");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen md:grid md:grid-cols-[1fr_1.05fr]">
      <MarketingPanel />
      <FormPanel
        isSignup={isSignup}
        email={email}
        password={password}
        displayName={displayName}
        error={error}
        submitting={submitting}
        onEmail={setEmail}
        onPassword={setPassword}
        onDisplayName={setDisplayName}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

// ─── Marketing panel (left) ───────────────────────────────────────────────────
function MarketingPanel() {
  return (
    <aside
      className="relative hidden flex-col overflow-hidden px-12 py-10 text-bone md:flex bg-night bg-[radial-gradient(circle_at_1px_1px,rgba(239,231,211,0.06)_1px,transparent_0)] bg-[length:28px_28px]"
    >
      {/* Subtle accent glow in the corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,106,61,0.18), transparent 60%)" }}
      />

      <Link href="/" className="relative flex items-center gap-2.5 font-semibold tracking-tight text-bone">
        <BrandMark invert />
        <span>sketchd</span>
      </Link>

      <div className="relative my-auto">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-mute">
          <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
          PRACTICE LAB
        </span>
        <h2 className="mt-3 text-[clamp(30px,3.8vw,46px)] font-semibold leading-[1.05] tracking-[-0.025em]">
          Drill the questions your interview will{" "}
          <span className="font-script font-medium italic text-coral">actually</span> ask.
        </h2>

        <ul className="mt-8 flex flex-col gap-5">
          <Bullet
            title="Sketch, don’t write."
            body="Real architectures on a real whiteboard. Pan, zoom, connect."
          />
          <Bullet
            title="Reviewed across six rubric categories."
            body="Correctness, scalability, reliability, performance, security, cost — with rationales."
          />
          <Bullet
            title="Free while it’s in beta."
            body="No card, no trial timer. Backed by Groq’s free tier."
          />
        </ul>

        {/* Hand-drawn-feeling mini diagram */}
        <MiniArchitecture />
      </div>

      <p className="relative font-mono text-[10px] uppercase tracking-[0.14em] text-bone-mute">
        built with FastAPI · Next.js · Groq
      </p>
    </aside>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-acid/20 text-[#b5f23a]">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div className="text-[15px] font-semibold text-bone leading-tight">{title}</div>
        <p className="mt-0.5 text-[13.5px] leading-[1.5] text-bone-soft">{body}</p>
      </div>
    </li>
  );
}

function MiniArchitecture() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 360 90"
      className="mt-10 w-full max-w-[360px] opacity-80"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="auth-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--color-bone-soft)" />
        </marker>
      </defs>
      {/* boxes */}
      <g stroke="var(--color-bone-soft)" strokeWidth="1.5" fill="none">
        <rect x="8"   y="32" width="60" height="26" rx="4" />
        <rect x="105" y="32" width="68" height="26" rx="4" />
        <rect x="210" y="6"  width="60" height="26" rx="4" stroke="var(--color-coral)" />
        <rect x="210" y="58" width="60" height="26" rx="4" />
        <rect x="305" y="58" width="46" height="26" rx="4" />
      </g>
      {/* labels */}
      <g fontFamily="var(--font-mono)" fontSize="8" fill="var(--color-bone-mute)" letterSpacing="0.05em">
        <text x="38"  y="48" textAnchor="middle">CLIENT</text>
        <text x="139" y="48" textAnchor="middle">API GW</text>
        <text x="240" y="22" textAnchor="middle" fill="var(--color-coral)">ID GEN</text>
        <text x="240" y="74" textAnchor="middle">CACHE</text>
        <text x="328" y="74" textAnchor="middle">DB</text>
      </g>
      {/* arrows */}
      <g stroke="var(--color-bone-soft)" strokeWidth="1.4" fill="none" markerEnd="url(#auth-arrow)">
        <path d="M 68 45 L 105 45" />
        <path d="M 173 42 C 190 32, 200 22, 210 19" />
        <path d="M 173 48 C 190 58, 200 68, 210 71" />
        <path d="M 270 71 L 305 71" />
      </g>
    </svg>
  );
}

// ─── Form panel (right) ───────────────────────────────────────────────────────
interface FormPanelProps {
  isSignup: boolean;
  email: string;
  password: string;
  displayName: string;
  error: string | null;
  submitting: boolean;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onDisplayName: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

function FormPanel({
  isSignup, email, password, displayName, error, submitting,
  onEmail, onPassword, onDisplayName, onSubmit,
}: FormPanelProps) {
  const [showPw, setShowPw] = useState(false);

  return (
    <section className="relative flex items-center justify-center bg-paper px-7 py-12 bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.16)_1px,transparent_0)] bg-[length:22px_22px]">
      <div className="w-full max-w-[420px]">
        {/* Mobile-only brand (desktop has it on the left) */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink md:hidden"
        >
          <BrandMark />
          <span>sketchd</span>
        </Link>

        <h1 className="m-0 text-[clamp(30px,3.5vw,38px)] font-semibold leading-[1.1] tracking-[-0.025em]">
          {isSignup ? (
            <>
              <span className="font-script font-medium italic text-coral">Start</span> drilling.
            </>
          ) : (
            <>Welcome <span className="font-script font-medium italic text-coral">back</span>.</>
          )}
        </h1>
        <p className="mb-9 mt-3 text-[15px] text-ink-soft">
          {isSignup
            ? "Save your designs, get AI feedback, climb the rubric."
            : "Sign in to keep building."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {isSignup && (
            <Field
              label="Display name"
              type="text"
              value={displayName}
              onChange={onDisplayName}
              required
              autoComplete="name"
              placeholder="What should we call you?"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={onEmail}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <PasswordField
            value={password}
            onChange={onPassword}
            show={showPw}
            onToggleShow={() => setShowPw((s) => !s)}
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
            hint={isSignup ? "At least 8 characters" : undefined}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red/40 bg-red/10 px-3 py-2.5 text-[13px] text-red">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 4v3.5M7 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group relative mt-1 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] bg-ink px-4 py-3 text-[14px] font-medium text-paper shadow-md transition hover:-translate-y-px disabled:cursor-progress disabled:opacity-75"
          >
            {submitting ? (
              <>
                <Spinner />
                <span>{isSignup ? "Creating account…" : "Signing in…"}</span>
              </>
            ) : (
              <>
                <span>{isSignup ? "Create my account" : "Sign in"}</span>
                <svg className="transition-transform group-hover:translate-x-[3px]" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </>
            )}
          </button>

          {isSignup && (
            <p className="text-center text-[11px] text-ink-muted">
              No card. No trial timer. Free while we&apos;re in beta.
            </p>
          )}
        </form>

        <p className="mt-7 text-center text-[13.5px] text-ink-soft">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-coral underline-offset-2 hover:underline"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── Form field primitives ────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  minLength?: number;
}

function Field({
  label, type, value, onChange,
  required, autoComplete, placeholder, hint, minLength,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full rounded-[10px] border border-rule bg-white px-3.5 py-3 text-[14px] text-ink shadow-sm outline-none placeholder:text-ink-muted/60 transition focus:border-ink focus:ring-2 focus:ring-coral/40"
      />
      {hint && <span className="mt-1 block text-[11.5px] text-ink-muted">{hint}</span>}
    </label>
  );
}

interface PasswordFieldProps {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  minLength?: number;
  hint?: string;
}

function PasswordField({
  value, onChange, show, onToggleShow, autoComplete, minLength, hint,
}: PasswordFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">Password</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder="••••••••"
          className="w-full rounded-[10px] border border-rule bg-white px-3.5 py-3 pr-11 text-[14px] text-ink shadow-sm outline-none placeholder:text-ink-muted/60 transition focus:border-ink focus:ring-2 focus:ring-coral/40"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-muted transition hover:bg-ink/5 hover:text-ink"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint && <span className="mt-1 block text-[11.5px] text-ink-muted">{hint}</span>}
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l14 14" />
      <path d="M6 6c-2 1.4-5 5-5 5s2.5 4 7 4c1.3 0 2.4-.3 3.4-.7" />
      <path d="M10 10c-.5 1-1.2 1.6-2 1.6S6.5 11 6 10" />
      <path d="M15 8s-1.4-2.8-4.4-4.2" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 rounded-full border-2 border-paper/40 border-t-paper"
      style={{ animation: "spin 0.7s linear infinite" }}
    />
  );
}
