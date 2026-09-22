import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
    // The list's order: insertion order, which created_at cannot give because
    // it is whole seconds and two adds often share one. Assigned inside the
    // INSERT itself (SQLite serializes writers, so the max is never stale),
    // and unique, so a colliding insert fails instead of tying.
    seq: integer("seq")
      .notNull()
      .$defaultFn(() => sql`(select coalesce(max("seq"), 0) + 1 from "todos")`),
  },
  (table) => [
    index("todos_user_id_idx").on(table.userId),
    uniqueIndex("todos_seq_uidx").on(table.seq),
  ],
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
