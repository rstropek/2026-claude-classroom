<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ai-tutor

AI tutoring web app on Next.js 16 App Router + React 19 + Tailwind v4: a Mastra agent served to a CopilotKit chat over AG-UI, behind Better Auth email/password sign-in, over a Drizzle/SQLite persistence layer, with a Vitest + Playwright test harness.

## Commands

- `npm run dev` / `npm run build` / `npm run start`.
- `npm run lint` is `biome check` and `npm run format` is `biome format --write` — Biome only, so never add ESLint or Prettier config.
- `npm test` (Vitest, single run), `npm run test:watch`, `npm run test:e2e` (Playwright), `npm run test:e2e:llm` (the one spec that spends OpenRouter credit).
- `npm run db:generate` writes a migration from the schema and `npm run db:migrate` applies it to `DATABASE_URL`.
- `npm run auth:generate` regenerates `lib/auth-schema.ts` from the Better Auth config; follow it with `db:generate` + `db:migrate`.

## App code — `app/layout.tsx`, `app/page.tsx`, `components/`

- `PageProps<'/route'>` and `LayoutProps<'/route'>` are globals generated into `.next/types`, so a typecheck on a clean checkout fails until `next dev` or `next build` has run once.
- TypeScript is v7, so `next build` type-checks by shelling out to the project-local `tsc` and prints plain `tsc` diagnostics without Next.js code frames.
- Import across the repo with the `@/*` alias (rooted at this directory), not deep relative paths.
- `components/ui/` holds the presentational primitives (`auth-card`, `field`, `button`, `form-error`, `page-header`, `tool-call`); extend one instead of repeating its class string.
- The primitives are the design system's only implementation, so a colour, size or radius that is not already in one of them belongs in the `ai-tutor-design` skill first.
- `/` is the chat page: a Server Component that gates on the session, then renders `PageHeader` plus the client-only `components/chat.tsx`.
- `components/chat.tsx` owns the `CopilotKit` provider and lays out the chat beside `components/todos-sidebar.tsx`, which must stay inside that provider to reach `useAgent`.
- The sidebar is read-only because the agent is the write path: it renders the server-rendered `initialTodos`, then refetches `GET /api/todos` (session-gated, no POST) whenever the run it subscribes to yields a tool result or ends.
- It is also `hidden` below `md`, where its fixed 288px would leave the transcript about 90px; the tool-call rows report every change to the list anyway.
- `CopilotChat` binds by `agentId` alone, so the sidebar's `useAgent({ agentId })` is that same instance — adding a `threadId` there would register a private proxied agent watching nothing.
- A tool call is invisible in the transcript until something renders it: `components/todo-tool-calls.tsx` registers one `useRenderTool` per tool (status is camelCase `inProgress`/`executing`/`complete`, and `parameters` is partial until the arguments finish streaming).
- `lib/tool-result.ts` decodes the JSON text AG-UI puts on a tool result; it stays out of the component because importing `@copilotkit/react-core/v2` in a Vitest file fails on that package's CSS side effect.

## Persistence — `lib/db.ts`, `lib/schema.ts`, `lib/auth-schema.ts`, `drizzle.config.ts`, `drizzle/`

- `lib/db.ts` is `server-only` and the single place that opens the database; import `db` from it rather than constructing another `drizzle()`.
- Table definitions live in `lib/schema.ts` so drizzle-kit and tests can import them without tripping the `server-only` marker.
- `lib/todo-tools.ts` is the only code that touches `todos`: `createTodoTools(db)` for the agent and `listTodosFor(db, userId)` for the page and `/api/todos`, with the db injected so a test can pass one on a temp file.
- `lib/auth-schema.ts` is overwritten wholesale by `auth:generate`, so app tables belong in `lib/schema.ts`, which re-exports it as the one entry point drizzle-kit and the Drizzle adapter read.
- The driver is `drizzle-orm/libsql/node` over a `file:` URL, and drizzle-kit picks `@libsql/client` on its own — do not install `better-sqlite3`.
- `drizzle/` is generated (edit the schema and re-run `db:generate`), and the SQLite file under the git-ignored `data/` is disposable — recreate it with `db:migrate`.

## Auth — `lib/auth.ts`, `lib/auth-config.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/`

- `lib/auth-config.ts` exports `authOptions(db)`, which every entry point that needs plugins spreads with its own literal `plugins` array — Better Auth only infers plugin helpers such as `ctx.test` from literal arrays.
- `lib/auth.ts` is the app instance (`server-only` via `lib/db.ts`, `nextCookies()` last); `lib/auth-cli.ts` exists only because the Better Auth CLI refuses to load a module graph containing `server-only`.
- Gate pages server-side with `auth.api.getSession({ headers: await headers() })` and `redirect()`; there is deliberately no `proxy.ts`, whose cookie check would not validate anything.
- Email/password only: adding a provider or plugin means re-running `auth:generate` and the migration flow.

## Agent — `lib/tutor.ts`, `components/chat.tsx`, `app/api/copilotkit/[...all]/`

- `lib/tutor.ts` is the whole agent: one `Agent` (`TUTOR_AGENT_ID`, a butler who only keeps the user's to-do list) on `openrouter/z-ai/glm-5.3-flash`, held on a `Mastra` instance.
- Only the `LibSQLStore` is cached on `globalThis` the way `lib/db.ts` caches its connection; the `Mastra` instance around it is rebuilt on every module evaluation outside production, so a `next dev` hot reload picks up an edited `instructions` without a restart.
- Mastra's model router reads `OPENROUTER_API_KEY` itself, so no AI SDK provider package is installed and the model string keeps its `provider/vendor/model` shape.
- Memory is `@mastra/memory` over a `LibSQLStore` on `DATABASE_URL`; the same store is passed to the `Mastra` instance too, or it warns and silently falls back to a non-durable in-memory one.
- Mastra creates and owns its `mastra_*` tables in that file — they are not in `lib/schema.ts` and `db:generate` must not try to manage them.
- The route builds the AG-UI bridge per request with `MastraAgent.getLocalAgent({ resourceId: session.user.id })`, so memory is scoped by the verified user id and never by anything in the request.
- The same route hands the todo tools that id through `requestContext`, and every statement in `lib/todo-tools.ts` filters on it — the AG-UI bridge forwards client context under a separate `ag-ui` key, so `userId` cannot be overwritten from the wire.
- Each tool declares `requestContextSchema`, so a call arriving without a `userId` returns a validation error object instead of throwing or running unscoped.
- Thread ids are `tutor:<userId>` (`tutorThreadId`), rendered into the page from the session so a reload rejoins the same conversation; a forged one fails on Mastra's `AGENT_MEMORY_THREAD_RESOURCE_MISMATCH`, which is what actually keeps user A out of user B's thread.
- The route answers 401 before touching Mastra, and that is the only auth gate — the runtime endpoint is otherwise public.
- Use `createCopilotRuntimeHandler` from `@copilotkit/runtime/v2`; the package's own `skills/runtime/` docs flag the Express and Hono adapters as "avoid at all costs".
- `@copilotkit/react-core/v2` is the whole client surface (`CopilotKit`, `CopilotChat`, `styles.css`) — `@copilotkit/react-ui` and the package roots are v1 and do not work with it.
- The CopilotKit Inspector is on by default in development (`enableInspector` stays unset; `showDevConsole` is deprecated and controls nothing). Its `<cpk-web-inspector>` launcher would sit on the header's sign-out button, so `app/globals.css` shifts the host down with a margin.
- `OPENROUTER_BASE_URL` (optional, see `.env.example`) routes the model traffic through a local proxy; with a custom `url` Mastra's model router no longer reads `OPENROUTER_API_KEY` itself, which is why `lib/tutor.ts` passes `apiKey` explicitly.
- Threads only persist inside Mastra's memory — the runtime runs on the default `InMemoryAgentRunner`, so the browser's own transcript still starts empty on reload.
- `@copilotkit/runtime` drags in a zod-3 dependency tree while Better Auth is on zod 4, which npm resolves by nesting the zod 3 copy under `@copilotkit/runtime/node_modules` — no `.npmrc` or `--legacy-peer-deps` is involved.

## Tests — `tests/unit` (Vitest), `tests/e2e` (Playwright)

- Vitest is jsdom + Testing Library and only picks up `tests/unit/**/*.test.{ts,tsx}`; async Server Components are unsupported there, so cover those with e2e instead.
- `vitest.config.mts` resolves `@/*` through `resolve.tsconfigPaths` — the `vite-tsconfig-paths` plugin the Next.js guide recommends is deprecated, so don't reinstall it.
- Playwright runs Chromium only against its own `next dev` on port 3100 (override with `E2E_PORT`).
- `next dev` refuses to start twice against one dist dir, so `next.config.ts` reads `NEXT_DIST_DIR` and the e2e server sets it to `.next-e2e`; that dir also needs a `tsconfig.json` include entry, which `next dev` adds itself.
- Every file in `tests/unit` currently opts back out of that jsdom default with a `// @vitest-environment node` first line; the db, auth, and tutor tests point at a temp file, so they never touch `data/app.db`.
- The auth test builds its own instance from `authOptions` with the `testUtils()` plugin and an explicit `secret`/`baseURL`, because Vitest does not load `.env`.
- `tests/e2e/auth.spec.ts` does hit `data/app.db`, so it signs up a `Date.now()`-stamped email; `playwright.config.ts` also overrides `BETTER_AUTH_URL` onto its own port.
- `tests/unit/copilotkit-route.test.ts` mocks `@/lib/auth`, `@/lib/tutor`, and both CopilotKit/AG-UI modules, so it covers the 401 gate and the `resourceId`/`requestContext` wiring without a model call.
- `tests/unit/todo-tools.test.ts` runs the real executors against a migrated temp database; `createTool` types `execute` as optional and unions in a validation error, so its `run` helper casts once rather than at every call.
- `tests/e2e/todos.llm.spec.ts` is the only thing in the repo that calls OpenRouter, so `playwright.config.ts` ignores `*.llm.spec.ts` unless `E2E_LLM` is set — `npm run test:e2e:llm`, not `npm run test:e2e`.
- The chat composer does not submit on Enter; click `getByTestId("copilot-send-button")`.
- `tests/unit/todo-tool-calls.test.tsx` is the one unit test that keeps the jsdom default, because it renders.
- `tests/unit/tutor.test.ts` mocks `server-only` (which otherwise resolves to its throwing build) and re-imports `lib/tutor` under `vi.resetModules()` to cover that reload split in both `NODE_ENV`s.
- Better Auth's optional `vitest` peer still stops at 4, so `package.json` pins it to the root copy through `overrides`; drop that and `npm install` fails on ERESOLVE.

## Styling — `app/globals.css`, `postcss.config.mjs`

- The design system is the `ai-tutor-design` skill in `.claude/skills/`; read it before touching anything visual, and update it in the same change set when a rule here changes.
- Tailwind v4 has no `tailwind.config.*`: the static ramp is a plain `@theme` block in `globals.css`, and the semantic roles are `@theme inline` aliases of `:root` custom properties that the `prefers-color-scheme` block re-points, so components carry almost no `dark:` classes.
- `Source_Sans_3` at weights 400/600 is the only face loaded, so there is no `--font-mono` and no `font-mono` utility to reach for.
- The chat's own theme is bridged onto those roles under `:root [data-copilotkit]`; `:root` is there only to outrank its `[data-copilotkit].dark` rules, whose class this app never sets.
- Its composer, send button and radii are hardcoded utilities rather than tokens, so `globals.css` overrides them by hand — a CopilotKit upgrade can silently restore the rounded white default, and the giveaway is a pill-shaped composer.
- Percentage heights collapse under `<main>` because its height comes from stretching: the chat column is sized by flex the whole way down instead.

## Secrets — `.env`

- Holds `DATABASE_URL` (SQLite, read by both `lib/db.ts` and drizzle-kit, which loads `.env` itself), `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` read by Better Auth itself, and `OPENROUTER_API_KEY`, which Mastra's model router reads directly.
- `.gitignore` covers `.env*`; never commit the file or print its values.

## Tooling — `biome.json`

- Biome ignores `.claude/` because its vendored skill assets fail `biome check .`, `drizzle/` because drizzle-kit's generated JSON does not match its formatter, and `public/` because Biome lints SVGs and the create-next-app artwork has no `<title>`.
- `npm run format` skips assist actions such as import sorting; use `npx biome check --write <path>` to fix those.

## Maintenance — for you, the agent

- Update this file in the same change set whenever a change invalidates a line here or teaches a costly lesson.
- Prefer deleting over adding and pointers over prose; drop anything a reader would learn just by opening the file a bullet points to.
- One sentence per bullet, current state only, no history or changelog.
