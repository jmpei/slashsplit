// Shared header for every signed-in page (#3): a link home, API tokens, and Sign out.
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { buttonSecondary } from "./ui";

export function SignedInHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/households" className="flex min-h-11 items-center font-semibold tracking-tight">
          SlashSplit
        </Link>
        <nav aria-label="Account" className="flex flex-wrap gap-2">
          <Link href="/settings/tokens" className={`${buttonSecondary} flex items-center`}>
            API tokens
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
