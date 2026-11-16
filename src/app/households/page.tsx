// Households home (#4): the households I belong to, and forms to create or join one.
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/server/auth";
import { listHouseholds } from "@/server/households";
import { bodyText } from "../ui";
import { HouseholdForms } from "./household-forms";

async function HouseholdsContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const households = await listHouseholds(session.user.id);
  return (
    <>
      <p className={bodyText}>Signed in as {session.user.name}</p>
      {households.length === 0 ? (
        <p className={bodyText}>You’re not in a household yet. Create one or join with a code.</p>
      ) : (
        <ul aria-label="Your households" className="flex flex-col gap-2">
          {households.map((h) => (
            <li key={h.id}>
              <Link
                href={`/households/${h.id}`}
                className="flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 font-medium break-words hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Households</h1>
      <Suspense fallback={<p className={bodyText}>Loading…</p>}>
        <HouseholdsContent />
      </Suspense>
    </main>
  );
}
