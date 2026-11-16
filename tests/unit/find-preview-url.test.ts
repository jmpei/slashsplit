// The lookup behind preview E2E (#14): find this commit's Vercel preview deployment through the
// Vercel REST API and wait until it is READY. fetch, sleep and the clock are injected.
import { describe, expect, test, vi } from "vitest";
import { findPreviewUrl, pickPreviewDeployment } from "../../scripts/find-preview-url.mjs";

const sha = "1111111111111111111111111111111111111111";
const otherSha = "2222222222222222222222222222222222222222";

function deployment(url: string, commitSha: string, readyState: string) {
  return { url, readyState, meta: { githubCommitSha: commitSha } };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// A clock that only moves when the code under test sleeps.
function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("pickPreviewDeployment", () => {
  test("returns the READY deployment whose githubCommitSha matches", () => {
    const picked = pickPreviewDeployment(
      [
        deployment("slashsplit-other.vercel.app", otherSha, "READY"),
        deployment("slashsplit-abc123.vercel.app", sha, "READY"),
      ],
      sha,
    );
    expect(picked).toEqual({ status: "ready", url: "https://slashsplit-abc123.vercel.app" });
  });

  test("ignores READY deployments of other commits", () => {
    expect(
      pickPreviewDeployment([deployment("slashsplit-other.vercel.app", otherSha, "READY")], sha),
    ).toBeNull();
  });

  test("waits while this commit's deployment is still building", () => {
    expect(
      pickPreviewDeployment([deployment("slashsplit-abc123.vercel.app", sha, "BUILDING")], sha),
    ).toBeNull();
  });

  test("prefers a READY deployment over a failed one for the same commit", () => {
    const picked = pickPreviewDeployment(
      [
        deployment("slashsplit-old.vercel.app", sha, "ERROR"),
        deployment("slashsplit-new.vercel.app", sha, "READY"),
      ],
      sha,
    );
    expect(picked).toEqual({ status: "ready", url: "https://slashsplit-new.vercel.app" });
  });

  test("reports the newest failed state when this commit's deployments all errored or were canceled", () => {
    // The Vercel API lists deployments newest first.
    expect(
      pickPreviewDeployment(
        [
          deployment("slashsplit-new.vercel.app", sha, "ERROR"),
          deployment("slashsplit-old.vercel.app", sha, "CANCELED"),
        ],
        sha,
      ),
    ).toEqual({ status: "failed", state: "ERROR" });
  });
});

describe("findPreviewUrl", () => {
  test("queries this project's preview deployments with the bearer token", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ deployments: [deployment("slashsplit-abc123.vercel.app", sha, "READY")] }),
    );
    await findPreviewUrl({ sha, token: "test-token", fetch, ...fakeClock() });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [input, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const url = new URL(input);
    expect(url.origin).toBe("https://api.vercel.com");
    expect(url.pathname).toMatch(/^\/v\d+\/deployments$/);
    expect(url.searchParams.get("projectId")).toBe("prj_9McdRm0FasqxQoZLRddb76uucZYf");
    expect(url.searchParams.get("teamId")).toBe("team_c4rmF3YoM5Pt4AbcDawJeehg");
    expect(url.searchParams.get("target")).toBe("preview");
    // The default page is 20 deployments; a busy day could push this commit's off it.
    expect(Number(url.searchParams.get("limit"))).toBeGreaterThanOrEqual(100);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-token");
  });

  test("polls until this commit's deployment is READY and returns its own URL", async () => {
    const responses = [
      { deployments: [deployment("slashsplit-other.vercel.app", otherSha, "READY")] },
      { deployments: [deployment("slashsplit-abc123.vercel.app", sha, "BUILDING")] },
      { deployments: [deployment("slashsplit-abc123.vercel.app", sha, "READY")] },
    ];
    const fetch = vi.fn(async () => jsonResponse(responses.shift()));

    const url = await findPreviewUrl({ sha, token: "t", fetch, intervalMs: 10_000, ...fakeClock() });

    expect(url).toBe("https://slashsplit-abc123.vercel.app");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  test("times out with a clear error when no READY deployment appears", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ deployments: [deployment("slashsplit-abc123.vercel.app", sha, "BUILDING")] }),
    );

    await expect(
      findPreviewUrl({
        sha,
        token: "t",
        fetch,
        intervalMs: 10_000,
        timeoutMs: 600_000,
        ...fakeClock(),
      }),
    ).rejects.toThrow(/timed out.*1111111/i);
    expect(fetch.mock.calls.length).toBeGreaterThan(1);
    expect(fetch.mock.calls.length).toBeLessThanOrEqual(61);
  });

  test("fails at once when this commit's deployment failed", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ deployments: [deployment("slashsplit-abc123.vercel.app", sha, "ERROR")] }),
    );

    await expect(findPreviewUrl({ sha, token: "t", fetch, ...fakeClock() })).rejects.toThrow(
      /ERROR/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("fails on a rejected request without echoing the token", async () => {
    const fetch = vi.fn(async () => jsonResponse({ error: { code: "forbidden" } }, 403));

    const error = await findPreviewUrl({ sha, token: "secret-token-value", fetch, ...fakeClock() })
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/403/);
    expect((error as Error).message).not.toContain("secret-token-value");
  });
});
