// Landing page. Replaced by the household dashboard once login lands.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">SlashSplit</h1>
      <p className="text-lg text-foreground/70">
        Snap a receipt, slash the items you didn’t share, and see who owes whom.
      </p>
    </main>
  );
}
