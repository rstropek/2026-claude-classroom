import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — see .env");
}

// drizzle-kit loads .env itself and picks @libsql/client over better-sqlite3.
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url,
  },
});
