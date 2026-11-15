// Vercel build entry: apply Prisma migrations for production builds, and for preview builds that
// run on their own Neon branch (#15); then build.
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Every URL Prisma or the app may connect to. prisma.config.ts migrates through the first one set
// of DIRECT_URL, DATABASE_URL_UNPOOLED (the Neon integration's name), DATABASE_URL.
const DATABASE_URL_NAMES = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "DATABASE_URL"];

// Neon's pooled host is the direct host with "-pooler" after the endpoint id; compare endpoints.
function endpointHost(host) {
  return host.toLowerCase().replace(/^([^.]+)-pooler\./, "$1.");
}

export function shouldMigrate(env) {
  if (env.VERCEL_ENV === "production") return true;
  if (env.VERCEL_ENV !== "preview" || !env.PRODUCTION_DB_HOST) return false;
  const urls = DATABASE_URL_NAMES.map((name) => env[name]).filter(Boolean);
  if (urls.length === 0) return false;
  const productionHost = endpointHost(env.PRODUCTION_DB_HOST);
  return urls.every((url) => endpointHost(new URL(url).hostname) !== productionHost);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (shouldMigrate(process.env)) {
    execSync("prisma migrate deploy", { stdio: "inherit" });
  }
  execSync("next build", { stdio: "inherit" });
}
