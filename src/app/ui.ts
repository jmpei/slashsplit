// Shared DESIGN.md class strings for cards, inputs, buttons and member chips, plus the message shown
// when a request never reaches the server.
export const card =
  "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900";
export const field =
  "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-base text-zinc-900 focus:border-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";
export const label = "flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400";
export const buttonPrimary =
  "min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";
export const buttonSecondary =
  "min-h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
export const buttonDanger =
  "min-h-11 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950";
export const errorText = "min-h-5 text-sm text-red-700 dark:text-red-400";
export const bodyText = "text-sm text-zinc-600 dark:text-zinc-400";
export const h2 = "text-lg font-semibold tracking-tight";

const chip = "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-medium";
export const chipIncluded = `${chip} border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900`;
export const chipSlashed = `${chip} border-zinc-300 bg-white text-zinc-500 line-through dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400`;
export const chipPlain = `${chip} border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-100`;

export const NETWORK_ERROR = "Couldn’t reach the server. Check your connection and try again.";
