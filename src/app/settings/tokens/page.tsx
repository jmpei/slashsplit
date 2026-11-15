// Personal API tokens (#13): create one for scripts (plaintext shown once), see when each was last
// used, and revoke them.
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/server/auth";
import { listTokens } from "@/server/tokens";
import { CreateTokenForm, RevokeTokenButton } from "./token-forms";

const card =
  "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900";
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

async function TokensContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const tokens = await listTokens(session.user.id);
  return (
    <>
      <section className={card}>
        <h2 className="text-lg font-semibold tracking-tight">New token</h2>
        <CreateTokenForm />
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold tracking-tight">Your tokens</h2>
        {tokens.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No API tokens yet.</p>
        ) : (
          <ul aria-label="Your API tokens" className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="break-words font-medium">{t.name}</span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    Created {dateFormat.format(new Date(t.createdAt))} ·{" "}
                    {t.lastUsedAt ? `Last used ${dateFormat.format(new Date(t.lastUsedAt))}` : "Never used"}
                  </span>
                </div>
                <RevokeTokenButton id={t.id} name={t.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Link href="/households" className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
        ← Households
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">API tokens</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Send a token as <code className="font-mono text-xs">Authorization: Bearer ss_…</code> to call the{" "}
          <Link href="/api/docs" className="underline underline-offset-4">
            SlashSplit API
          </Link>
          .
        </p>
      </div>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <TokensContent />
      </Suspense>
    </main>
  );
}
