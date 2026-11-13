"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "./AuthShell";

function Field(props: React.ComponentProps<"input"> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <input
        {...rest}
        className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm outline-none placeholder:text-faint focus:border-white"
      />
    </label>
  );
}

/** Only allow same-site relative redirects. */
function safeCallback(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/app";
}

export function AuthForm({ mode, googleEnabled, dbReady }: { mode: "login" | "signup"; googleEnabled: boolean; dbReady: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get("callbackUrl"));
  const [error, setError] = useState<string | null>(params.get("error") ? "Sign in failed. Please try again." : null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fd.get("name"), email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Could not create account");
          return;
        }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        setError(mode === "login" ? "Incorrect email or password" : "Account created, but sign in failed. Try logging in.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!dbReady && (
        <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
          Accounts are not available yet — the database is not configured. You can still use every tool without an account.
        </p>
      )}

      {googleEnabled && (
        <>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google", { callbackUrl })} disabled={!dbReady}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        {mode === "signup" && <Field label="Name" name="name" autoComplete="name" required maxLength={80} placeholder="Your name" />}
        <Field label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : 1}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading || !dbReady}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
