"use client";
// Create-a-token form that shows the new plaintext token once, and a revoke button that asks for
// confirmation first (#13). Escape cancels the confirmation; failures are announced in status regions.
import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { buttonDanger, buttonPrimary, buttonSecondary, errorText, field, label, NETWORK_ERROR } from "../../ui";
import { createTokenAction, revokeTokenAction, type CreateTokenState } from "./actions";

const initial: CreateTokenState = { error: "" };

export function CreateTokenForm() {
  const [state, formAction, pending] = useActionState(
    async (prev: CreateTokenState, form: FormData): Promise<CreateTokenState> => {
      try {
        return await createTokenAction(prev, form);
      } catch (error) {
        unstable_rethrow(error);
        return { error: NETWORK_ERROR };
      }
    },
    initial,
  );
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} aria-label="Create a token" className="flex flex-col gap-2">
        <label className={label}>
          Token name
          <input name="name" required maxLength={60} className={field} placeholder="Laptop script" />
        </label>
        <button type="submit" className={buttonPrimary} disabled={pending}>
          Create token
        </button>
        <p role="status" aria-live="polite" className={errorText}>
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
            className={buttonSecondary}
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
  const [error, setError] = useState("");
  const revokeRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  // Keep keyboard focus in place: on Cancel when the confirmation opens, back on Revoke when it closes.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (wasConfirming.current) revokeRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (!confirming) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming]);

  if (!confirming) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          ref={revokeRef}
          type="button"
          aria-label={`Revoke ${name}`}
          className={buttonSecondary}
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
        >
          Revoke
        </button>
        <p role="status" aria-live="polite" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">Scripts using it will stop working.</span>
      <button
        type="button"
        disabled={pending}
        className={buttonDanger}
        onClick={async () => {
          setPending(true);
          try {
            await revokeTokenAction(id);
          } catch (err) {
            unstable_rethrow(err);
            setPending(false);
            setError(NETWORK_ERROR);
            setConfirming(false);
          }
        }}
      >
        Yes, revoke
      </button>
      <button ref={cancelRef} type="button" className={buttonSecondary} onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
