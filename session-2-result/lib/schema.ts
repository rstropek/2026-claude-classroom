import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "@/lib/auth-schema";

// The single schema entry point: drizzle-kit, the Drizzle adapter in
// lib/auth-config.ts, and tests all read the auth tables through here.
export * from "@/lib/auth-schema";

// Kept free of the `server-only` marker in lib/db.ts so drizzle-kit and tests
// can import the table definitions without pulling in a connection.
export const todos = sqliteTable(
  "todos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("todos_user_id_idx").on(table.userId)],
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
