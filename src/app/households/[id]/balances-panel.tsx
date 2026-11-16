"use client";
// Balances and greedy settlement plan (#7): shows each member's net balance and lets roommates mark
// any recommended transfer as paid with one click. A failed mark is announced in a status region.
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { formatCents } from "@/lib/schemas/expenses";
import { formatSignedCents } from "@/lib/schemas/settlements";
import type { Balance, Transfer } from "@/lib/split/balances";
import type { Member } from "@/server/households";
import { bodyText, buttonSecondary, card, errorText, h2, NETWORK_ERROR } from "../../ui";
import { markTransferPaidAction } from "./actions";

export function BalancesPanel(props: {
  householdId: string;
  members: Member[];
  balances: Balance[];
  transfers: Transfer[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const nameById = new Map(props.members.map((m) => [m.userId, m.name]));

  function markPaid(t: Transfer) {
    setError("");
    startTransition(async () => {
      try {
        const res = await markTransferPaidAction(props.householdId, {
          fromUserId: t.fromUserId,
          toUserId: t.toUserId,
          amountCents: t.amountCents,
        });
        if (res.error) setError(res.error);
      } catch (err) {
        unstable_rethrow(err);
        setError(NETWORK_ERROR);
      }
    });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className={card}>
        <h2 className={h2}>Balances</h2>
        <ul aria-label="Balances" className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {props.balances.map((b) => (
            <li key={b.userId} className="flex min-h-11 items-center justify-between gap-4">
              <span className="min-w-0 break-words">{nameById.get(b.userId) ?? b.userId}</span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  b.netCents > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : b.netCents < 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {formatSignedCents(b.netCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className={h2}>Settlement plan</h2>
        {props.transfers.length === 0 ? (
          <p className={bodyText}>Everyone is settled up.</p>
        ) : (
          <ul aria-label="Settlement plan" className="flex flex-col gap-2">
            {props.transfers.map((t) => {
              const fromName = nameById.get(t.fromUserId) ?? t.fromUserId;
              const toName = nameById.get(t.toUserId) ?? t.toUserId;
              return (
                <li
                  key={`${t.fromUserId}-${t.toUserId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
                >
                  <span className="min-w-0 text-sm tabular-nums">
                    {`${fromName} pays ${toName} ${formatCents(t.amountCents)}`}
                  </span>
                  <button type="button" disabled={pending} onClick={() => markPaid(t)} className={buttonSecondary}>
                    Mark paid
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p role="status" aria-live="polite" className={errorText}>
          {error}
        </p>
      </section>
    </div>
  );
}
