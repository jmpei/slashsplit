"use client";
// Sign-in buttons and the test-login form. Errors are announced in a live region.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonPrimary, buttonSecondary, card, errorText, field, label, NETWORK_ERROR } from "../ui";

const primary = `${buttonPrimary} w-full`;
const secondary = `${buttonSecondary} w-full`;


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
    let result: Awaited<ReturnType<typeof action>>;
    try {
      result = await action();
    } catch {
      result = { error: { message: NETWORK_ERROR } };
    }
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "That didn’t work. Try again.");
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
      {!google && !testLogin && <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign-in isn’t set up yet.</p>}

      {testLogin && (
        <form onSubmit={signIn} className={card}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Test login. Not available in production.</p>
          <label className={label}>
            Name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className={label}>
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
          <label className={label}>
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

      <p role="status" aria-live="polite" className={errorText}>
        {error}
      </p>
    </div>
  );
}
