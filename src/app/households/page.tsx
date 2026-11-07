// Households home. For now it shows who is signed in; the household list lands with #4.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/server/auth";
import { SignOutButton } from "./sign-out-button";

async function SignedInUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return (
    <div className="flex items-center justify-between gap-4">
      <p>Signed in as {session.user.name}</p>
      <SignOutButton />
    </div>
  );
}

export default function HouseholdsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Households</h1>
      <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
        <SignedInUser />
      </Suspense>
    </main>
  );
}
