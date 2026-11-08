// One household (#4): its invite code and members in join order. Non-members get a 404 page.
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/server/auth";
import { getHousehold, isMember, listMembers } from "@/server/households";

const roleLabel = { OWNER: "Owner", MEMBER: "Member" } as const;

async function HouseholdContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  if (!(await isMember(session.user.id, id))) notFound();
  const [household, members] = await Promise.all([getHousehold(id), listMembers(id)]);
  if (!household) notFound();

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
