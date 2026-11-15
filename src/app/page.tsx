// Landing page: what the app does and the way in.
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">SlashSplit</h1>
      <p className="text-lg text-foreground/70">
        Snap a receipt, slash the items you didn’t share, and see who owes whom.
      </p>
      <Link
        href="/sign-in"
        className="flex min-h-11 w-fit items-center rounded-lg bg-foreground px-5 font-medium text-background"
      >
        Sign in
      </Link>
    </main>
  );
}
