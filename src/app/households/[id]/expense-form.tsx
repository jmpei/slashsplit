"use client";
// Expense entry form (#6): itemized by default (every member ticked on every item; untick to slash),
// or click "Split equally" to divide the whole bill evenly. Each item ticks the taxes it carries.
import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { formatCents, localCalendarDay, parseDollarsToCents } from "@/lib/schemas/expenses";
import type { Member } from "@/server/households";
import {
  buttonPrimary,
  buttonSecondary,
  card,
  chipIncluded,
  chipPlain,
  chipSlashed,
  errorText,
  field,
  h2,
  label,
  NETWORK_ERROR,
} from "../../ui";
import { recordExpensePayloadAction } from "./actions";

// Runs a server action; a request that never reaches the server comes back as an error message.
async function send(run: () => Promise<{ error?: string }>): Promise<{ error?: string }> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    return { error: NETWORK_ERROR };
  }
}

type DraftItem = {
  name: string;
  priceDollars: string;
  taxRows: number[]; // indexes into the tax rows, so renaming a tax code keeps the ticks
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
    { name: "", priceDollars: "", taxRows: [], participantIds: allMemberIds },
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
      { name: "", priceDollars: "", taxRows: [], participantIds: allMemberIds },
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

  function toggleTax(itemIndex: number, taxRow: number) {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const has = item.taxRows.includes(taxRow);
        return {
          ...item,
          taxRows: has ? item.taxRows.filter((r) => r !== taxRow) : [...item.taxRows, taxRow],
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
        const res = await send(() =>
          recordExpensePayloadAction(props.householdId, {
            payerId,
            merchant,
            date,
            splitMode: "EQUAL",
            totalCents,
            items: [],
            taxes: [],
            weights: [],
          }),
        );
        if (res.error) {
          setError(res.error);
          return;
        }
        setMerchant("");
        setEqualTotalDollars("");
        setSplitMode("ITEMIZED");
        setItems([{ name: "", priceDollars: "", taxRows: [], participantIds: allMemberIds }]);
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
      const taxCodes = items[i].taxRows.map((r) => taxes[r].code.trim()).filter(Boolean);
      parsedItems.push({
        name: items[i].name,
        priceCents,
        taxCodes: [...new Set(taxCodes)],
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
      if (amountCents > 0 && !items.some((item) => item.taxRows.includes(i))) {
        setError(`Tick the items that carry ${taxes[i].code.trim() || `tax ${i + 1}`}.`);
        return;
      }
      parsedTaxes.push({ code: taxes[i].code, amountCents });
    }

    const totalCents =
      parsedItems.reduce((a, it) => a + it.priceCents, 0) +
      parsedTaxes.reduce((a, t) => a + t.amountCents, 0);

    startTransition(async () => {
      const res = await send(() =>
        recordExpensePayloadAction(props.householdId, {
          payerId,
          merchant,
          date,
          splitMode: "ITEMIZED",
          totalCents,
          items: parsedItems,
          taxes: parsedTaxes,
          weights: [],
        }),
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setMerchant("");
      setItems([{ name: "", priceDollars: "", taxRows: [], participantIds: allMemberIds }]);
      setTaxes([]);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Record an expense"
      className={card}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={h2}>Record an expense</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSplitMode("ITEMIZED")}
            className={splitMode === "ITEMIZED" ? buttonPrimary : buttonSecondary}
            aria-pressed={splitMode === "ITEMIZED"}
          >
            Itemized
          </button>
          <button
            type="button"
            onClick={() => setSplitMode("EQUAL")}
            className={splitMode === "EQUAL" ? buttonPrimary : buttonSecondary}
            aria-pressed={splitMode === "EQUAL"}
          >
            Split equally
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={label}>
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
        <label className={label}>
          Merchant
          <input
            name="merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            required
            className={field}
          />
        </label>
        <label className={label}>
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
        <label className={label}>
          Total ($)
          <input
            name="total"
            inputMode="decimal"
            value={equalTotalDollars}
            onChange={(e) => setEqualTotalDollars(e.target.value)}
            required
            className={`${field} tabular-nums`}
          />
        </label>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => (
              <fieldset
                key={idx}
                className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <legend className="px-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {`Item ${idx + 1}`}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={label}>
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
                  <label className={label}>
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
                      className={`${field} tabular-nums`}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {props.members.map((m) => {
                    const checked = item.participantIds.includes(m.userId);
                    return (
                      <label
                        key={m.userId}
                        className={checked ? chipIncluded : chipSlashed}
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
                {taxes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Taxes</span>
                    {taxes.map((tax, taxRow) => {
                      const checked = item.taxRows.includes(taxRow);
                      return (
                        <label
                          key={taxRow}
                          className={chipPlain}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTax(idx, taxRow)}
                          />
                          <span className="font-mono">{tax.code.trim() || `Tax ${taxRow + 1}`}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            ))}
          </div>

          {taxes.map((tax, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-2">
              <label className={label}>
                Tax code
                <input
                  value={tax.code}
                  onChange={(e) =>
                    setTaxes((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, code: e.target.value } : t)),
                    )
                  }
                  className={`${field} font-mono`}
                />
              </label>
              <label className={label}>
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
                  className={`${field} tabular-nums`}
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="text-sm font-semibold tabular-nums">Total: {formatCents(computedTotalCents)}</span>
        <button type="submit" disabled={pending} className={buttonPrimary}>
          Save expense
        </button>
      </div>

      <p role="status" aria-live="polite" className={errorText}>
        {error}
      </p>
    </form>
  );
}
