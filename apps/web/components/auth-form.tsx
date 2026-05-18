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

  // If the session check resolves to a logged-in user, bounce them off this page.
  useEffect(() => {
    if (!sessionLoading && user) router.replace("/");
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
      // TODO: route to /problems once Chunk C2 lands; for now back to landing.
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.18)_1px,transparent_0)] bg-[length:22px_22px] flex items-center justify-center px-7 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink"
        >
          <BrandMark />
          <span>sketchd</span>
        </Link>

        <h1 className="m-0 mb-2 text-[40px] font-semibold tracking-[-0.025em] leading-[1.05]">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-8 text-ink-soft">
          {isSignup
            ? "Save your designs, get AI feedback, climb the rubric."
            : "Sign in to keep building."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <Field
              label="Display name"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              required
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            hint={isSignup ? "Minimum 8 characters" : undefined}
            minLength={isSignup ? 8 : undefined}
          />

          {error && (
            <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-[10px] bg-ink px-4 py-3 text-sm font-medium text-paper shadow-md transition hover:-translate-y-px disabled:cursor-progress disabled:opacity-70"
          >
            {submitting
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-soft">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-coral hover:underline"
          >
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
  hint,
  minLength,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className="w-full rounded-[10px] border border-rule bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-ink focus:ring-2 focus:ring-coral/30"
      />
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}
