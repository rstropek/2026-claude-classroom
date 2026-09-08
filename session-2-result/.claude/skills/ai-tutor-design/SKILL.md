---
name: ai-tutor-design
description: The visual design system for the ai-tutor app — a heise.de-derived identity (Source Sans, graphite ramp, signal blue, square corners) adapted for a chat bot with data-heavy pages rather than a news portal. Use this whenever you touch anything the user sees in this repo: editing app/globals.css, any file under components/ or components/ui/, any page.tsx or layout.tsx, adding a new UI primitive, restyling an existing one, choosing a colour, a font size, a border, a spacing value, or writing button labels, empty states and error copy. Use it even for a change that looks like a one-line class tweak, because the value you would reach for by habit (rounded-md, zinc-*, a shadow, pure black text) is exactly what this system replaces.
---

# ai-tutor design system

The brand reference is **heise.de**. The values below were measured off the live
site, not recalled — they are the real tokens, so use them literally.

The app is not a news portal, so most of what makes heise.de *look* like
heise.de on its front page is wrong here. This skill exists to keep the brand
and drop the newspaper.

## The thesis: build the forum, not the front page

heise.de has two design languages, and picking the right one is the whole job.

The **front page** is a scan surface: teaser cards with 16:9 images, kickers,
deks, comment counts, 30px headlines competing for a reader who leaves in
ninety seconds, ad slots, a twelve-topic nav.

The **forum** is an inhabited surface: dense rows on a hairline grid, no card
chrome per row, blue on the one thing you actually click, metadata in tabular
columns on the right, graphite tabs. A user sits in it and content accumulates
under them.

ai-tutor is the second kind. One user, their own data, a session that stays
open while a to-do ledger fills up. So when you need a precedent for a
component, picture `heise.de/forum`, not `heise.de`. This is the single most
useful sentence in this document — a mistake here is not recoverable by
picking better colours later.

The practical consequence: heise's density reads as *efficient* on a news
portal because everything on screen is competing for a click. Here the same
tight metrics have to read as *calm*, because nothing is competing — the
user's own content is the only thing that matters. Keep heise's measurements;
cut heise's element count.

## Carries over from the brand

- **One typeface: Source Sans.** The site loads Source Sans VF at 200–900 and
  then uses exactly two weights, 400 and 600. No serif, no display face, and
  no monospace anywhere on the site — including in tables of numbers.
- **The blue is a signal, not a decoration.** `#0056A4` appears on links and
  almost nothing else. It is never a background wash, a gradient, or a hero
  colour.
- **Buttons are graphite, not blue.** `--brand-button: #464646`, hover
  `#323232`, white text. This is unusual and it is genuinely heise — keeping
  it is most of what makes the app look like the brand rather than like
  Bootstrap. Blue stays reserved for links so that the one blue thing on a
  screen is always the thing you navigate to.
- **Square corners.** 97.7% of visible elements on the live site have
  `border-radius: 0`. Where a radius exists at all it is 3px. Nothing in this
  app should be more rounded than 3px, and the default is 0.
- **Ground versus surface.** The page ground is a cool blue-grey `#e8edf0` and
  content sits on white panels on top of it. That two-tone split is the
  strongest single colour cue the brand has.
- **Hairlines instead of shadows.** Separation is done with 1px rules
  (`#e8e9eb` inside a panel, `#c7c7c7` at its edge). Shadows are nearly absent
  and never used to lift a card off the page.
- **Text is `#323232`, never `#000`.** The whole grey ramp is warm-neutral
  graphite, and pure black is not in it.
- **Density.** 16px body on a 24px line, 14px for secondary, and 4px cell
  padding in the forum's tables. Small type doing real work is the house style.

## Does not carry over

Each of these is a *news portal* solution to a problem this app does not have.

- **Teaser cards** — image, kicker, headline, dek, comment count. There are no
  articles here. A to-do is a row, not a teaser.
- **Editorial headline hierarchy.** 30px display headlines exist to sell one
  story over another. In a chat, the chrome must recede and the user's own
  words are the largest thing on screen. Cap chrome headings at 20px.
- **The broad topic nav and the masthead grid.** The app has three routes.
- **Ad slots, sponsored rails, and the `heise+` gold paywall badge.** No
  commercial layer exists, so the gold `#ca8a04` accent has no job and must
  not be borrowed as a generic "highlight" colour.
- **The red `#ff0000` "new since your last visit" marker.** It works on a page
  you visit twice a day. In a chat where content streams continuously,
  everything is new and a red marker becomes noise.
- **The 1104px fixed editorial column.** A chat needs full-height fluid layout
  that fills the viewport; a fixed centred column would strand the composer.
  Constrain the *reading measure* of the transcript instead (see below).
- **Blue links in dark mode.** heise drops to `#e0e0e0` for links on dark,
  because `#0056A4` fails contrast there. This app needs a visible accent in
  both themes, so it uses a lightened blue on dark instead — the one place
  this system deliberately departs from the measured brand.

> A note for whoever reads this later: square corners + hairline rules is also
> a generic AI-design default, so it is worth being clear that here it is
> derived, not defaulted. It comes from a measured 97.7% zero-radius rate on a
> specific site, and it arrives with Source Sans, a graphite button, and a
> blue-grey ground — none of which belong to that default look. Do not "soften"
> it back toward rounded cards on the grounds that it looks austere. Austere is
> the brand.

## Tokens

They already exist in `app/globals.css` — read it rather than re-deriving them,
and add to it rather than hardcoding a hex in a component. Tailwind v4 has no
config file, so the token names *are* the utility names (`bg-surface`,
`text-ink-mute`, `border-rule`).

The file is deliberately two layers, and knowing which layer you are in is the
difference between a one-line change and a broken dark theme:

1. **The static ramp**, a plain `@theme` block. Graphite and the signal blue
   are fixed values that mean the same thing in either theme:
   `brand`, `brand-hover`, `brand-on-dark`, and `grey-50/200/300/400/600/700/800/900`.
2. **The reactive roles**, plain custom properties on `:root` that the
   `prefers-color-scheme: dark` block re-points, exposed as utilities through
   `@theme inline`. Because the *variable* flips rather than the utility, a
   component written with `bg-surface text-ink` is already correct in both
   themes — **so a `dark:` class is almost always a sign of a missing role
   rather than a missing variant.**

| Role | Light | Dark | For |
|---|---|---|---|
| `ground` | `#e8edf0` | `#202020` | the page behind everything |
| `surface` | `#ffffff` | `#323232` | panels on the ground |
| `raised` | `#f2f2f2` | `#464646` | row hover, inset fields |
| `rule` | `#e8e9eb` | `#464646` | hairline inside a panel |
| `edge` | `#c7c7c7` | `#5a5a5a` | a panel's own border |
| `ink` | `#323232` | `#e0e0e0` | primary text |
| `ink-soft` | `#5a5a5a` | `#c7c7c7` | secondary text |
| `ink-mute` | `#767676` | `#aeaeae` | metadata, placeholders |
| `accent` | `#0056a4` | `#63a8e8` | links and focus rings |
| `button` | `#464646` | `#5a5a5a` | the graphite button fill |
| `danger` | `#a11212` | `#ef9a9a` | errors |

The underlying property for `accent` is `--signal`, not `--accent`: the chat's
stylesheet defines its own `--accent` on `[data-copilotkit]`, which would shadow
ours for everything rendered inside the transcript — including the tool-call
rows. Watch for that class of collision when adding a role.

### Contrast, because this app is small text on white

`#aeaeae` is 2.2:1 on white — it is legible only on the dark ground, where it
is 7.3:1. That asymmetry is the easiest mistake to make in this palette. In
light mode the lightest grey that passes for body text is `#767676`; if you
find yourself wanting `grey-300` or `grey-400` for text on white, you want
`ink-mute`. Reserve `grey-300`/`grey-400` for rules, icons and disabled states.

## Type

One family, two weights. Load **Source Sans 3** from `next/font/google` — it
is the open-source release of the face the site actually serves.

```
weight 400  body, labels, data
weight 600  headings, the primary link in a row, button labels
```

Never reach for 500 or 700; the brand's whole voice is the 400/600 pair, and a
third weight reads as a different site.

The measured scale, in the proportion the site uses it:

| px | Tailwind | Use |
|---|---|---|
| 12 | `text-xs` | rare — timestamps, tool-call chrome |
| 14 | `text-sm` | secondary text, column headers, metadata, dense rows |
| 16 | `text-base` | body, chat messages, inputs, list items — the workhorse |
| 20 | `text-xl` | section and panel headings |
| 24 | `text-2xl` | the one page title on auth screens |

Body is 16/24 (`leading-6`) — not 1.5-by-accident, an actual 24px grid that
row heights should land on. Letter-spacing stays `normal` everywhere; heise
tracks nothing, and `tracking-tight` on a 600-weight Source Sans heading looks
like a different brand.

Numbers in aligned columns get `tabular-nums`. heise doesn't set it and their
columns wobble slightly; this is a small, free improvement that costs nothing
in brand fidelity.

## Geometry and space

- `rounded-none` is the default. `rounded-[3px]` is the maximum, and it is for
  small inline chips only — never a panel, never a button, never an input.
- No `shadow-*`. If two things need separating, use a rule or the
  ground/surface colour change.
- Borders are 1px. A 2px border is a focus ring, nothing else.
- Focus is visible and brand-coloured: `outline-2 outline-offset-2
  outline-brand`. Never remove it, and never rely on colour alone for state.
- Spacing uses the 4px grid Tailwind already gives you. Panels get `p-4`/`p-6`;
  dense rows get `px-3 py-2`. Resist padding a data row past `py-2` — the
  density is the point.
- The chat transcript is constrained to `max-w-3xl` for reading measure, but
  its *container* fills the viewport height. Panels stretch; text does not.

## Components

Recipes for the existing primitives — the exact classes, and the reasoning for
each — are in `references/components.md`. Read it before editing anything in
`components/ui/`, because those primitives are shared and a change to
`button.tsx` lands on every screen.

The short version:

- **Panel** — `bg-surface border border-edge` on a `bg-ground` page. No radius,
  no shadow.
- **Button** — graphite fill `bg-button hover:bg-button-hover text-white`, square.
- **Link** — `text-brand hover:underline`, 600 weight when it is the primary
  link in a row.
- **Input** — square, `border-edge`, focus flips the border to `accent` and
  adds the outline.
- **Row** — `border-b border-rule`, `px-3 py-2`, 14–16px, no radius, hover
  `bg-raised`.
- **Column header** — `text-sm text-ink-mute`, sentence case, over a rule.
  Not uppercase: heise uses plain sentence case for its table headers, and the
  uppercase-tracked-micro-label is a different design system's tic.

## Copy

The agent is a butler called **Bartholomew**, so the interface is understated
and never chirpy. Sentence case everywhere, including buttons.

- Name the action, not the mechanism: "Sign out", not "Submit".
- Keep a verb stable through its whole flow. If the button says "Add", the
  transcript says "Added".
- Empty states invite: "Nothing on the list yet. Ask Bartholomew to note
  something down."
- Errors state what happened and what to do, in the interface's voice, without
  apologising: "That email and password don't match an account."
- No exclamation marks, no emoji.

## Before you call it done

Run through this — these are the failure modes this system actually sees:

1. Is there a `rounded-md`, a `shadow`, or a `zinc-*`/`gray-*` class left
   anywhere? All three are the create-next-app defaults this replaces.
2. Is anything blue that is not a link or a focus ring?
3. Is any grey lighter than `#767676` being used as text on white?
4. Is there a font weight that isn't 400 or 600?
5. Does the page still work at 375px wide, with a visible focus ring on every
   interactive element, and with the dark ramp applied?
6. Take one thing away. The brief is austere; the last 10% of restraint is
   what separates this from a generic dense UI.
