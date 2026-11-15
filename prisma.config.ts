// Prisma CLI config: schema path, migrations path, and the database URL from .env.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection; the app uses the pooled DATABASE_URL. Vercel previews
    // get the Neon integration's DATABASE_URL_UNPOOLED instead of DIRECT_URL. `||`, not `??`:
    // .env.example ships DIRECT_URL="", and an empty string must fall back too.
    url:
      process.env["DIRECT_URL"] ||
      process.env["DATABASE_URL_UNPOOLED"] ||
      process.env["DATABASE_URL"],
  },
});
