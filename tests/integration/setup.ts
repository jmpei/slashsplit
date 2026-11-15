// Point integration tests at the test database, never the dev one.
import "dotenv/config";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (!process.env.DATABASE_URL) {
  throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL in CI) before running integration tests.");
}

// Better Auth needs a secret and base URL; CI has no .env, so give tests fixed ones.
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-at-least-32-chars";
process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
