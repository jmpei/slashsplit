// Households home (#4): the households I belong to, and forms to create or join one.
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/server/auth";
import { listHouseholds } from "@/server/households";
import { HouseholdForms } from "./household-forms";
import { SignOutButton } from "./sign-out-button";

async function HouseholdsContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const households = await listHouseholds(session.user.id);
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p>Signed in as {session.user.name}</p>
        <SignOutButton />
      </div>
      {households.length === 0 ? (
        <p className="text-foreground/70">You’re not in a household yet. Create one or join with a code.</p>
      ) : (
        <ul aria-label="Your households" className="flex flex-col gap-2">
          {households.map((h) => (
            <li key={h.id}>
              <Link
                href={`/households/${h.id}`}
                className="flex min-h-11 items-center rounded-lg border border-foreground/15 px-4 font-medium"
              >
                {h.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <HouseholdForms />
    </>
  );
}

export default function HouseholdsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Households</h1>
      <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
        <HouseholdsContent />
      </Suspense>
    </main>
  );
}
