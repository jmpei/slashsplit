"use client";
// Sign-in buttons and the test-login form. Errors are announced in a live region.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const field =
  "min-h-11 w-full rounded-lg border border-foreground/20 bg-background px-3 text-base outline-none focus:border-foreground/60";
const primary =
  "min-h-11 w-full rounded-lg bg-foreground px-4 font-medium text-background disabled:opacity-50";
const secondary =
  "min-h-11 w-full rounded-lg border border-foreground/20 px-4 font-medium disabled:opacity-50";

export function SignInForm({ google, testLogin }: { google: boolean; testLogin: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ error: { message?: string } | null }>) {
    setBusy(true);
    setError("");
    const { error } = await action();
    setBusy(false);
    if (error) {
      setError(error.message ?? "That didn’t work. Try again.");
      return;
    }
    router.push("/households");
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    run(() => authClient.signIn.email({ email, password }));
  }

  function createAccount() {
    if (!name.trim()) {
      setError("Enter a name to create an account.");
      return;
    }
    run(() => authClient.signUp.email({ name: name.trim(), email, password }));
  }

  return (
    <div className="flex flex-col gap-6">
      {google && (
        <button
          type="button"
          className={primary}
          disabled={busy}
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/households" })}
        >
          Continue with Google
        </button>
      )}
      {!google && !testLogin && <p>Sign-in isn’t set up yet.</p>}

      {testLogin && (
        <form onSubmit={signIn} className="flex flex-col gap-3 rounded-xl border border-foreground/15 p-4">
          <p className="text-sm text-foreground/70">Test login. Not available in production.</p>
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              className={field}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              className={field}
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className={primary} disabled={busy}>
            Sign in with test account
          </button>
          <button type="button" className={secondary} disabled={busy} onClick={createAccount}>
            Create test account
          </button>
        </form>
      )}

      <p aria-live="polite" className="min-h-6 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    </div>
  );
}
