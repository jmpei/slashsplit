// Preview E2E lookup (#14): wait until the Vercel preview deployment built from a commit is READY
// and print its own URL (https://<deployment>.vercel.app, not the branch alias, because preview
// auth uses VERCEL_URL). CI runs it with HEAD_SHA and VERCEL_TOKEN and reads `url` from
// GITHUB_OUTPUT. API: https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PROJECT_ID = "prj_9McdRm0FasqxQoZLRddb76uucZYf";
const TEAM_ID = "team_c4rmF3YoM5Pt4AbcDawJeehg";
const FAILED_STATES = ["ERROR", "CANCELED"];

// { status: "ready", url } when a deployment of `sha` is READY, { status: "failed", state } when
// every deployment of `sha` failed, otherwise null (none yet, or still building).
export function pickPreviewDeployment(deployments, sha) {
  const ofCommit = deployments.filter((d) => d.meta?.githubCommitSha === sha);
  const ready = ofCommit.find((d) => d.readyState === "READY");
  if (ready) return { status: "ready", url: `https://${ready.url}` };
  if (ofCommit.length > 0 && ofCommit.every((d) => FAILED_STATES.includes(d.readyState))) {
    return { status: "failed", state: ofCommit.at(-1).readyState };
  }
  return null;
}

export async function findPreviewUrl({
  sha,
  token,
  fetch = globalThis.fetch,
  intervalMs = 10_000,
  timeoutMs = 600_000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
}) {
  const url = new URL("https://api.vercel.com/v7/deployments");
  url.searchParams.set("projectId", PROJECT_ID);
  url.searchParams.set("teamId", TEAM_ID);
  url.searchParams.set("target", "preview");

  const start = now();
  while (now() - start < timeoutMs) {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Vercel API returned ${response.status} when listing preview deployments`);
    }
    const { deployments } = await response.json();
    const picked = pickPreviewDeployment(deployments, sha);
    if (picked?.status === "ready") return picked.url;
    if (picked?.status === "failed") {
      throw new Error(`Preview deployment for ${sha} ended in ${picked.state}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(
    `Timed out after ${timeoutMs / 1000} s waiting for a READY preview deployment of ${sha}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { HEAD_SHA, VERCEL_TOKEN, GITHUB_OUTPUT } = process.env;
  if (!HEAD_SHA || !VERCEL_TOKEN) {
    console.error("HEAD_SHA and VERCEL_TOKEN must be set");
    process.exit(1);
  }
  try {
    const url = await findPreviewUrl({ sha: HEAD_SHA, token: VERCEL_TOKEN });
    console.log(`Preview deployment ready: ${url}`);
    if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `url=${url}\n`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
