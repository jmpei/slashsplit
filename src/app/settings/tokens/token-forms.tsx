"use client";
// Create-a-token form that shows the new plaintext token once, and a revoke button that asks for
// confirmation first (#13).
import { useActionState, useState } from "react";
import { createTokenAction, revokeTokenAction, type CreateTokenState } from "./actions";

const field =
  "min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-950";
const primary =
  "min-h-11 rounded-lg bg-zinc-900 px-4 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const secondary =
  "min-h-11 rounded-lg border border-zinc-200 bg-white px-4 font-medium dark:border-zinc-800 dark:bg-zinc-900";
const initial: CreateTokenState = { error: "" };

export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(createTokenAction, initial);
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} aria-label="Create a token" className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Token name
          <input name="name" required maxLength={60} className={field} placeholder="Laptop script" />
        </label>
        <button type="submit" className={primary} disabled={pending}>
          Create token
        </button>
        <p role="status" className="min-h-5 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      </form>
      {state.token && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="text-sm font-medium">New token for {state.name}</p>
          <code data-testid="new-token" className="break-all font-mono text-xs">
            {state.token}
          </code>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You will not see this token again. Copy it now and keep it secret.
          </p>
          <button
            type="button"
            className={secondary}
            onClick={async () => {
              await navigator.clipboard.writeText(state.token!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy token"}
          </button>
        </div>
      )}
    </div>
  );
}

export function RevokeTokenButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  if (!confirming) {
    return (
      <button type="button" aria-label={`Revoke ${name}`} className={secondary} onClick={() => setConfirming(true)}>
        Revoke
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Scripts using it will stop working.</span>
      <button
        type="button"
        disabled={pending}
        className="min-h-11 rounded-lg border border-red-200 bg-red-50 px-4 font-medium text-red-700 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
        onClick={async () => {
          setPending(true);
          await revokeTokenAction(id);
        }}
      >
        Yes, revoke
      </button>
      <button type="button" className={secondary} onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
