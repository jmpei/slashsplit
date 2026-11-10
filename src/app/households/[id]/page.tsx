// One household (#4, #6, #7): invite code, members in join order, net balances, greedy settlement
// plan, expense entry form, and recorded expenses. Non-members get a 404 page.
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { formatCents } from "@/lib/schemas/expenses";
import { planSettlement } from "@/lib/split/balances";
import { auth } from "@/server/auth";
import { getHouseholdBalances } from "@/server/balances";
import { listExpenses } from "@/server/expenses";
import { getHousehold, isMember, listMembers } from "@/server/households";
import { BalancesPanel } from "./balances-panel";
import { ExpenseForm } from "./expense-form";

const roleLabel = { OWNER: "Owner", MEMBER: "Member" } as const;

async function HouseholdContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!(await isMember(session.user.id, id))) notFound();
  const [household, members, expenses, balances] = await Promise.all([
    getHousehold(id),
    listMembers(id),
    listExpenses(id),
    getHouseholdBalances(id),
  ]);
  if (!household) notFound();

  const transfers = planSettlement(balances);
  const nameById = new Map(members.map((m) => [m.userId, m.name]));

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{household.name}</h1>
      <section className="flex flex-col gap-1">
        <h2 className="text-sm text-foreground/70">Invite code</h2>
        <code data-testid="invite-code" className="font-mono text-2xl tracking-widest">
          {household.inviteCode}
        </code>
        <p className="text-sm text-foreground/70">Share it with roommates so they can join.</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Members</h2>
        <ul aria-label="Members" className="flex flex-col divide-y divide-foreground/10">
          {members.map((m) => (
            <li key={m.userId} className="flex min-h-11 items-center justify-between gap-4">
              <span>{m.name}</span>
              <span className="text-sm text-foreground/70">{roleLabel[m.role]}</span>
            </li>
          ))}
        </ul>
      </section>

      <BalancesPanel
        householdId={id}
        members={members}
        balances={balances}
        transfers={transfers}
      />

      <ExpenseForm householdId={id} currentUserId={session.user.id} members={members} />

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-foreground/70">No expenses recorded yet.</p>
        ) : (
          <ul aria-label="Expenses" className="flex flex-col divide-y divide-foreground/10">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{expense.merchant}</span>
                  <span className="font-mono">{formatCents(expense.totalCents)}</span>
                </div>
                <p className="text-xs text-foreground/70">
                  Paid by {nameById.get(expense.payerId) ?? "Member"} on {expense.date}
                </p>
                <p className="text-sm text-foreground/80">
                  {expense.shares
                    .map((s) => `${nameById.get(s.userId) ?? s.userId}: ${formatCents(s.amountCents)}`)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function HouseholdPage({ params }: PageProps<"/households/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Link href="/households" className="text-sm text-foreground/70 underline">
        All households
      </Link>
      <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
        <HouseholdContent params={params} />
      </Suspense>
    </main>
  );
}
