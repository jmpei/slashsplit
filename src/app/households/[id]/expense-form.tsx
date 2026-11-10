"use client";
// Expense entry form (#6): itemized by default (every member ticked on every item; untick to slash),
// or click "Split equally" to divide the whole bill evenly.
import { useState, useTransition } from "react";
import { formatCents, localCalendarDay, parseDollarsToCents } from "@/lib/schemas/expenses";
import type { Member } from "@/server/households";
import { recordExpensePayloadAction } from "./actions";

const field =
  "min-h-11 w-full rounded-lg border border-foreground/20 bg-background px-3 text-base outline-none focus:border-foreground/60";
const buttonPrimary =
  "min-h-11 rounded-lg bg-foreground px-4 font-medium text-background disabled:opacity-50";
const buttonSecondary =
  "min-h-11 rounded-lg border border-foreground/20 px-3 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50";

type DraftItem = {
  name: string;
  priceDollars: string;
  taxCodes: string[];
  participantIds: string[];
};

type DraftTax = {
  code: string;
  amountDollars: string;
};

export function ExpenseForm(props: {
  householdId: string;
  currentUserId: string;
  members: Member[];
}) {
  const allMemberIds = props.members.map((m) => m.userId);
  const [payerId, setPayerId] = useState(props.currentUserId);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(() => localCalendarDay());
  const [splitMode, setSplitMode] = useState<"ITEMIZED" | "EQUAL">("ITEMIZED");
  const [equalTotalDollars, setEqualTotalDollars] = useState("");
  const [items, setItems] = useState<DraftItem[]>(() => [
    { name: "", priceDollars: "", taxCodes: [], participantIds: allMemberIds },
  ]);
  const [taxes, setTaxes] = useState<DraftTax[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const computedTotalCents =
    splitMode === "EQUAL"
      ? (parseDollarsToCents(equalTotalDollars) ?? 0)
      : items.reduce((sum, item) => sum + (parseDollarsToCents(item.priceDollars) ?? 0), 0) +
        taxes.reduce((sum, tax) => sum + (parseDollarsToCents(tax.amountDollars) ?? 0), 0);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { name: "", priceDollars: "", taxCodes: [], participantIds: allMemberIds },
    ]);
  }

  function addTax() {
    setTaxes((prev) => [...prev, { code: "GST", amountDollars: "" }]);
  }

  function toggleParticipant(itemIndex: number, userId: string) {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const has = item.participantIds.includes(userId);
        return {
          ...item,
          participantIds: has
            ? item.participantIds.filter((id) => id !== userId)
            : [...item.participantIds, userId],
        };
      }),
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (splitMode === "EQUAL") {
      const totalCents = parseDollarsToCents(equalTotalDollars);
      if (totalCents === null || totalCents <= 0) {
        setError("Enter a valid dollar total.");
        return;
      }
      startTransition(async () => {
        const res = await recordExpensePayloadAction(props.householdId, {
          payerId,
          merchant,
          date,
          splitMode: "EQUAL",
          totalCents,
          items: [],
          taxes: [],
          weights: [],
        });
        if (res.error) {
          setError(res.error);
          return;
        }
        setMerchant("");
        setEqualTotalDollars("");
        setSplitMode("ITEMIZED");
        setItems([{ name: "", priceDollars: "", taxCodes: [], participantIds: allMemberIds }]);
      });
      return;
    }

    const parsedItems: {
      name: string;
      priceCents: number;
      taxCodes: string[];
      participantIds: string[];
    }[] = [];
    for (let i = 0; i < items.length; i++) {
      const priceCents = parseDollarsToCents(items[i].priceDollars);
      if (priceCents === null) {
        setError(`Enter a valid price for Item ${i + 1}.`);
        return;
      }
      parsedItems.push({
        name: items[i].name,
        priceCents,
        taxCodes: items[i].taxCodes,
        participantIds: items[i].participantIds,
      });
    }

    const parsedTaxes: { code: string; amountCents: number }[] = [];
    for (let i = 0; i < taxes.length; i++) {
      const amountCents = parseDollarsToCents(taxes[i].amountDollars);
      if (amountCents === null || amountCents < 0) {
        setError(`Enter a valid amount for tax ${i + 1}.`);
        return;
      }
      parsedTaxes.push({ code: taxes[i].code, amountCents });
    }

    const totalCents =
      parsedItems.reduce((a, it) => a + it.priceCents, 0) +
      parsedTaxes.reduce((a, t) => a + t.amountCents, 0);

    startTransition(async () => {
      const res = await recordExpensePayloadAction(props.householdId, {
        payerId,
        merchant,
        date,
        splitMode: "ITEMIZED",
        totalCents,
        items: parsedItems,
        taxes: parsedTaxes,
        weights: [],
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMerchant("");
      setItems([{ name: "", priceDollars: "", taxCodes: [], participantIds: allMemberIds }]);
      setTaxes([]);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Record an expense"
      className="flex flex-col gap-4 rounded-xl border border-foreground/15 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Record an expense</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSplitMode("ITEMIZED")}
            className={buttonSecondary}
            aria-pressed={splitMode === "ITEMIZED"}
          >
            Itemized
          </button>
          <button
            type="button"
            onClick={() => setSplitMode("EQUAL")}
            className={buttonSecondary}
            aria-pressed={splitMode === "EQUAL"}
          >
            Split equally
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Payer
          <select
            name="payerId"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className={field}
          >
            {props.members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Merchant
          <input
            name="merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={field}
          />
        </label>
      </div>

      {splitMode === "EQUAL" ? (
        <label className="flex flex-col gap-1 text-sm">
          Total ($)
          <input
            name="total"
            inputMode="decimal"
            value={equalTotalDollars}
            onChange={(e) => setEqualTotalDollars(e.target.value)}
            required
            className={field}
          />
        </label>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <fieldset
                key={idx}
                className="flex flex-col gap-2 rounded-lg border border-foreground/15 p-3"
              >
                <legend className="px-1 text-xs font-medium text-foreground/70">
                  {`Item ${idx + 1}`}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Item name
                    <input
                      value={item.name}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it)),
                        )
                      }
                      required
                      className={field}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Price ($)
                    <input
                      inputMode="decimal"
                      value={item.priceDollars}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, priceDollars: e.target.value } : it,
                          ),
                        )
                      }
                      required
                      className={field}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {props.members.map((m) => {
                    const checked = item.participantIds.includes(m.userId);
                    return (
                      <label
                        key={m.userId}
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${
                          checked
                            ? "border-foreground/40 bg-foreground/5"
                            : "border-foreground/15 text-foreground/50 line-through"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(idx, m.userId)}
                        />
                        {m.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {taxes.map((tax, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Tax code
                <input
                  value={tax.code}
                  onChange={(e) =>
                    setTaxes((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, code: e.target.value } : t)),
                    )
                  }
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Tax ($)
                <input
                  inputMode="decimal"
                  value={tax.amountDollars}
                  onChange={(e) =>
                    setTaxes((prev) =>
                      prev.map((t, i) =>
                        i === idx ? { ...t, amountDollars: e.target.value } : t,
                      ),
                    )
                  }
                  className={field}
                />
              </label>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addItem} className={buttonSecondary}>
              Add item
            </button>
            <button type="button" onClick={addTax} className={buttonSecondary}>
              Add tax
            </button>
          </div>
        </>
      )}

      <div className="flex items-center justify-between border-t border-foreground/10 pt-3">
        <span className="text-sm font-medium">Total: {formatCents(computedTotalCents)}</span>
        <button type="submit" disabled={pending} className={buttonPrimary}>
          Save expense
        </button>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    </form>
  );
}
