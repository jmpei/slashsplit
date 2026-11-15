"use client";
// Receipt drafts (#10): scan a receipt into a DRAFT (#9 endpoint), then review it here. The editor
// adds, edits and deletes items and taxes, compares items + taxes with the receipt total live, and
// only enables "Confirm expense" when they match. Confirming calls the confirm endpoint.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCents, parseDollarsToCents, type DraftEdits } from "@/lib/schemas/expenses";
import type { ExpenseRecord } from "@/server/expenses";
import type { Member } from "@/server/households";

const card =
  "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900";
const field =
  "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
const buttonPrimary =
  "min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const buttonSecondary =
  "min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
const chip = "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-medium";

// Integer cents to an editable dollar string ("12.05"), without floats.
function centsToInput(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error ?? "Something went wrong. Try again.";
}

export function DraftExpenses(props: {
  householdId: string;
  members: Member[];
  drafts: ExpenseRecord[];
}) {
  return (
    <>
      <ScanForm householdId={props.householdId} />
      <section aria-labelledby="drafts-heading" className="flex flex-col gap-4">
        <h2 id="drafts-heading" className="text-lg font-semibold tracking-tight">
          Draft receipts to confirm
        </h2>
        {props.drafts.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No receipts waiting for review.</p>
        ) : (
          props.drafts.map((draft) => (
            <DraftEditor
              key={draft.id}
              householdId={props.householdId}
              members={props.members}
              draft={draft}
            />
          ))
        )}
      </section>
    </>
  );
}

function ScanForm(props: { householdId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a receipt image first.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/v1/households/${props.householdId}/receipts/scan`, {
        method: "POST",
        body: data,
      });
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Scan a receipt" className={card}>
      <h2 className="text-lg font-semibold tracking-tight">Scan a receipt</h2>
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Receipt image
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/heic,image/webp"
          className={`${field} py-2 text-sm`}
        />
      </label>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        JPG, PNG, HEIC or WebP up to 10 MB. The scan becomes a draft you review before it counts.
      </p>
      <div>
        <button type="submit" disabled={pending} className={buttonPrimary}>
          Scan receipt
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-red-700 dark:text-red-400">
        {error}
      </p>
    </form>
  );
}

type EditItem = {
  key: number;
  name: string;
  priceDollars: string;
  taxKeys: number[]; // keys of the tax rows this item carries, so renaming a code keeps the ticks
  participantIds: string[];
};

type EditTax = { key: number; code: string; amountDollars: string };

function DraftEditor(props: { householdId: string; members: Member[]; draft: ExpenseRecord }) {
  const { draft } = props;
  const router = useRouter();
  const allMemberIds = props.members.map((m) => m.userId);
  const nextKey = useRef(draft.items.length + draft.taxes.length);
  const [merchant, setMerchant] = useState(draft.merchant);
  const [date, setDate] = useState(draft.date);
  const [totalDollars, setTotalDollars] = useState(centsToInput(draft.totalCents));
  const [taxes, setTaxes] = useState<EditTax[]>(() =>
    draft.taxes.map((t, i) => ({ key: i, code: t.code, amountDollars: centsToInput(t.amountCents) })),
  );
  const [items, setItems] = useState<EditItem[]>(() =>
    draft.items.map((item, i) => ({
      key: draft.taxes.length + i,
      name: item.name,
      priceDollars: centsToInput(item.priceCents),
      taxKeys: draft.taxes.flatMap((t, k) => (item.taxCodes.includes(t.code) ? [k] : [])),
      participantIds: item.participantIds,
    })),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const itemCents = items.map((item) => parseDollarsToCents(item.priceDollars));
  const taxCents = taxes.map((tax) => parseDollarsToCents(tax.amountDollars));
  const totalCents = parseDollarsToCents(totalDollars);
  const sumCents =
    itemCents.reduce<number>((a, c) => a + (c ?? 0), 0) + taxCents.reduce<number>((a, c) => a + (c ?? 0), 0);

  let problem = "";
  const badItem = itemCents.findIndex((c) => c === null);
  const badTax = taxCents.findIndex((c) => c === null || c < 0);
  if (badItem >= 0) problem = `Enter a valid price for Item ${badItem + 1}.`;
  else if (badTax >= 0) problem = `Enter a valid amount for Tax ${badTax + 1}.`;
  else if (totalCents === null) problem = "Enter a valid receipt total.";
  else if (items.length === 0) problem = "Add at least one item.";
  const mismatch = totalCents !== null && sumCents !== totalCents;

  function updateItem(index: number, change: Partial<EditItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...change } : it)));
  }

  function addItem() {
    const key = nextKey.current++;
    setItems((prev) => [...prev, { key, name: "", priceDollars: "", taxKeys: [], participantIds: allMemberIds }]);
  }

  function addTax() {
    const key = nextKey.current++;
    setTaxes((prev) => [...prev, { key, code: "GST", amountDollars: "" }]);
  }

  function deleteTax(key: number) {
    setTaxes((prev) => prev.filter((t) => t.key !== key));
    setItems((prev) => prev.map((it) => ({ ...it, taxKeys: it.taxKeys.filter((k) => k !== key) })));
  }

  function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (problem || mismatch || totalCents === null) return;
    setError("");
    const codeByKey = new Map(taxes.map((t) => [t.key, t.code.trim()]));
    const edits: DraftEdits = {
      merchant,
      date,
      totalCents,
      items: items.map((item, i) => ({
        name: item.name,
        priceCents: itemCents[i]!,
        taxCodes: [...new Set(item.taxKeys.map((k) => codeByKey.get(k) ?? "").filter(Boolean))],
        participantIds: item.participantIds,
      })),
      taxes: taxes.map((tax, i) => ({ code: tax.code, amountCents: taxCents[i]! })),
    };
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/households/${props.householdId}/expenses/${draft.id}/confirm`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(edits) },
      );
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleConfirm}
      aria-label={`Review ${draft.merchant || "receipt"} draft`}
      className={card}
    >
      {draft.scanError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {draft.scanError} Fill in the receipt by hand.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Merchant
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Receipt total ($)
          <input
            inputMode="decimal"
            value={totalDollars}
            onChange={(e) => setTotalDollars(e.target.value)}
            className={`${field} tabular-nums`}
          />
        </label>
      </div>

      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Items</h3>
      {items.map((item, idx) => (
        <fieldset
          key={item.key}
          className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <legend className="px-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">{`Item ${idx + 1}`}</legend>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Item name
              <input
                value={item.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                className={field}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              Price ($)
              <input
                inputMode="decimal"
                value={item.priceDollars}
                onChange={(e) => updateItem(idx, { priceDollars: e.target.value })}
                className={`${field} tabular-nums`}
              />
            </label>
            <button
              type="button"
              aria-label={`Delete item ${idx + 1}`}
              onClick={() => setItems((prev) => prev.filter((it) => it.key !== item.key))}
              className={buttonSecondary}
            >
              Delete
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.members.map((m) => {
              const checked = item.participantIds.includes(m.userId);
              return (
                <label
                  key={m.userId}
                  className={`${chip} ${
                    checked
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 bg-white text-zinc-400 line-through dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      updateItem(idx, { participantIds: toggle(item.participantIds, m.userId) })
                    }
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
          {taxes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Taxes</span>
              {taxes.map((tax, t) => (
                <label
                  key={tax.key}
                  className={`${chip} border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100`}
                >
                  <input
                    type="checkbox"
                    checked={item.taxKeys.includes(tax.key)}
                    onChange={() => updateItem(idx, { taxKeys: toggle(item.taxKeys, tax.key) })}
                  />
                  <span className="font-mono">{tax.code.trim() || `Tax ${t + 1}`}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}

      {taxes.length > 0 && <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Taxes</h3>}
      {taxes.map((tax, idx) => (
        <fieldset
          key={tax.key}
          className="grid gap-2 rounded-md border border-zinc-200 p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end dark:border-zinc-800"
        >
          <legend className="px-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">{`Tax ${idx + 1}`}</legend>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tax code
            <input
              value={tax.code}
              onChange={(e) =>
                setTaxes((prev) => prev.map((t) => (t.key === tax.key ? { ...t, code: e.target.value } : t)))
              }
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tax ($)
            <input
              inputMode="decimal"
              value={tax.amountDollars}
              onChange={(e) =>
                setTaxes((prev) =>
                  prev.map((t) => (t.key === tax.key ? { ...t, amountDollars: e.target.value } : t)),
                )
              }
              className={`${field} tabular-nums`}
            />
          </label>
          <button
            type="button"
            aria-label={`Delete tax ${idx + 1}`}
            onClick={() => deleteTax(tax.key)}
            className={buttonSecondary}
          >
            Delete
          </button>
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addItem} className={buttonSecondary}>
          Add item
        </button>
        <button type="button" onClick={addTax} className={buttonSecondary}>
          Add tax
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={
          mismatch
            ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium tabular-nums text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
            : "min-h-5 text-sm tabular-nums text-zinc-600 dark:text-zinc-400"
        }
      >
        {mismatch
          ? `Items plus taxes (${formatCents(sumCents)}) do not match the receipt total (${formatCents(totalCents)}).`
          : totalCents !== null && items.length > 0 && !problem
            ? `Items plus taxes match the receipt total (${formatCents(totalCents)}).`
            : ""}
      </p>

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-red-700 dark:text-red-400">
          {error || problem}
        </p>
        <button type="submit" disabled={pending || !!problem || mismatch} className={buttonPrimary}>
          Confirm expense
        </button>
      </div>
    </form>
  );
}
