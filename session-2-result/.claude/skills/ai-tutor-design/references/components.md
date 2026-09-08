# Component recipes

The classes each primitive in `components/ui/` actually uses, plus the
reasoning. Every value is a token from SKILL.md — if you need something that is
not here, add a role to `globals.css` rather than inventing a colour in a
component.

Note what is *absent*: `dark:` variants. The semantic roles re-point themselves
under `prefers-color-scheme`, so one set of classes covers both themes. Reach
for `dark:` only when a value genuinely has no role, and prefer adding the role.

## Panel

The base container. Everything that holds content is one of these.

```
bg-surface border border-edge
```

No radius, no shadow, no ring. A panel on `bg-ground` reads as separate because
of the colour change; the border sharpens the edge. Two panels side by side
share a single `border-l` rather than each drawing its own.

## Button

Graphite, square, weight 600 — the brand's most distinctive control, and the
one most likely to get "fixed" back into a blue rounded button.

```
bg-button px-4 py-2 text-sm font-semibold text-white transition-colors
hover:bg-button-hover
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
disabled:cursor-not-allowed disabled:opacity-60
```

`button` is a role rather than a fixed `grey-700` because the dark theme has to
lift the fill to `#5a5a5a` — `#464646` disappears into the `#323232` surface.

A secondary button is the same geometry with
`border border-edge bg-transparent text-ink hover:bg-raised`. There is no third
button style; if you think you need one, you need a link.

## Link

```
text-accent hover:underline
```

Add `font-semibold` when the link is the primary, identifying item in a row —
that is how the forum marks the forum name against the topic title in the same
row. The underline appears on hover, not at rest: heise sets
`text-decoration: none` on content links and lets colour carry the affordance.

## Input

```
border border-edge bg-surface px-3 py-2 text-base text-ink
placeholder:text-ink-mute
focus-visible:border-accent focus-visible:outline-2
focus-visible:outline-offset-0 focus-visible:outline-accent
```

`outline-offset-0` so the ring hugs the square field. Labels sit above at
`text-sm font-semibold text-ink-soft`.

## Row (the forum pattern)

The workhorse for any list of records — todos, and anything data-heavy added
later.

```
flex items-baseline gap-2 border-b border-rule px-3 py-2 text-base
last:border-b-0 hover:bg-raised
```

- `last:border-b-0` so the list does not end on a dangling rule.
- Metadata (counts, timestamps) goes in a right-aligned column with
  `tabular-nums text-sm text-ink-mute`, never inline in the sentence.
- A done or inactive row is `text-ink-mute line-through`. State is never
  colour-only — the strike is what a colourblind reader gets.
- Do not give a row its own border, background card, or radius. The rule
  between rows *is* the structure.

## Column header

```
border-b border-edge px-3 py-2 text-sm text-ink-mute
```

Sentence case, weight 400. Explicitly not `uppercase tracking-wide font-semibold
text-xs` — heise's forum headers are plain sentence-case grey, and the uppercase
micro-label belongs to a different design system.

## Page header (app bar)

```
flex items-center justify-between gap-4 border-b border-edge bg-surface px-6 py-3
```

Title `text-base font-semibold text-ink`, subtitle `text-sm text-ink-soft`. The
header is chrome and must not out-shout the transcript beneath it, which is why
the title stays at body size rather than growing into a heading.

## Tool call — the signature

The row reporting what the agent did to the ledger. It sits inside the
transcript, so it has to be quieter than a message but still legible as a record.

```
my-1.5 flex max-w-fit items-center gap-2 border-l-2 bg-raised px-2.5 py-1.5 text-sm
running: border-accent    done: border-grey-300
```

The 2px left rule is the one piece of deliberate signature here: it marks "the
agent touched the ledger", the way the forum marks a thread you follow. Blue
while the call runs — so a running call is the only blue thing in the transcript
— then grey once it settles. Encode the state in the verb too ("Adding" →
"Added"); the colour is a second channel, not the only one.

## Auth card

A single panel centred on the ground, `max-w-sm`, `p-8`, title at
`text-2xl font-semibold`. The auth screens are the only place a 24px heading is
right, because there the form is the page and nothing competes with it.

## Error

```
border-l-2 border-danger bg-danger-surface px-3 py-2 text-sm text-danger
```

The left rule carries the alarm, matching the tool-call marker; the tint alone
would be colour-only state.

## The chat, which is not ours

`CopilotChat` ships its own theme, and bending it is fiddly enough to be worth
knowing before you start:

- Its tokens are shadcn-shaped and scoped to `[data-copilotkit]`. `globals.css`
  re-points them at our roles.
- Its dark theme is the class `[data-copilotkit].dark`, which this app never
  sets — pointing its tokens at our already-reactive variables is what makes it
  follow the OS.
- Its composer, send button and radii are **hardcoded utilities**
  (`cpk:bg-white`, `cpk:rounded-[28px]`, a drop shadow) that no token reaches,
  so they are overridden by hand. After a CopilotKit upgrade, check the
  composer: if it is pill-shaped or white on dark, new hardcoded classes have
  appeared and need the same treatment.
- Do not restyle its internals beyond that. Anything deeper belongs upstream.

## What not to build

- Card grids with images.
- Anything with a `shadow`.
- Coloured status pills — a teaser-card habit. Use a rule, a weight change, or
  a grey.
- A second accent colour. If something must stand out and blue is taken, the
  answer is weight 600 or a hairline, not a new hue.
