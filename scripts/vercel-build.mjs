// Vercel build entry: apply Prisma migrations for production builds only, then build.
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function shouldMigrate(env) {
  return env.VERCEL_ENV === "production";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (shouldMigrate(process.env)) {
    execSync("prisma migrate deploy", { stdio: "inherit" });
  }
  execSync("next build", { stdio: "inherit" });
}
