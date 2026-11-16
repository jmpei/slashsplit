// Landing page: what the app does and the way in.
import Link from "next/link";
import { buttonPrimary } from "./ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">SlashSplit</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Snap a receipt, slash the items you didn’t share, and see who owes whom.
      </p>
      <Link href="/sign-in" className={`${buttonPrimary} flex w-fit items-center`}>
        Sign in
      </Link>
    </main>
  );
}
