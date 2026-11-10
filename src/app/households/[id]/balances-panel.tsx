"use client";
// Balances and greedy settlement plan (#7): shows each member's net balance and lets roommates mark
// any recommended transfer as paid with one click.
import { useTransition } from "react";
import { formatCents } from "@/lib/schemas/expenses";
import { formatSignedCents } from "@/lib/schemas/settlements";
import type { Balance, Transfer } from "@/lib/split/balances";
import type { Member } from "@/server/households";
import { markTransferPaidAction } from "./actions";

const buttonSmall =
  "min-h-11 rounded-lg border border-foreground/20 px-3 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50";

export function BalancesPanel(props: {
  householdId: string;
  members: Member[];
  balances: Balance[];
  transfers: Transfer[];
}) {
  const [pending, startTransition] = useTransition();
  const nameById = new Map(props.members.map((m) => [m.userId, m.name]));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Balances</h2>
        <ul aria-label="Balances" className="flex flex-col divide-y divide-foreground/10">
          {props.balances.map((b) => (
            <li key={b.userId} className="flex min-h-11 items-center justify-between gap-4">
              <span>{nameById.get(b.userId) ?? b.userId}</span>
              <span
                className={`font-mono text-sm ${
                  b.netCents > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : b.netCents < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground/70"
                }`}
              >
                {formatSignedCents(b.netCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Settlement plan</h2>
        {props.transfers.length === 0 ? (
          <p className="text-sm text-foreground/70">You don’t owe anyone.</p>
        ) : (
          <ul aria-label="Settlement plan" className="flex flex-col divide-y divide-foreground/10">
            {props.transfers.map((t) => {
              const fromName = nameById.get(t.fromUserId) ?? t.fromUserId;
              const toName = nameById.get(t.toUserId) ?? t.toUserId;
              return (
                <li
                  key={`${t.fromUserId}-${t.toUserId}`}
                  className="flex min-h-11 items-center justify-between gap-3 py-1"
                >
                  <span className="text-sm">
                    {`${fromName} pays ${toName} ${formatCents(t.amountCents)}`}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await markTransferPaidAction(props.householdId, {
                          fromUserId: t.fromUserId,
                          toUserId: t.toUserId,
                          amountCents: t.amountCents,
                        });
                      })
                    }
                    className={buttonSmall}
                  >
                    Mark paid
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
