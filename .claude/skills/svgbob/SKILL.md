---
name: svgbob
description: >-
  Create and edit ASCII-art diagrams for this Quarto book and convert them to
  SVG with svgbob. Use this whenever you author, edit, or fix a `.bob` file, an
  `images/*.svg` diagram, or an ASCII diagram/figure in a chapter — and whenever
  the user mentions svgbob, ascii diagrams, ascii-to-svg, box-and-arrow figures,
  or adding/updating a diagram or illustration in the course. The most important
  rule: after touching any `.bob` file you MUST regenerate its sibling `.svg`,
  because Quarto builds assume the SVGs are already converted and committed.
---

# svgbob: ASCII diagrams → SVG

This book illustrates concepts with hand-drawn ASCII diagrams that are converted
to SVG by [svgbob](https://github.com/ivanceras/svgbob). Each diagram is stored
as a plain-text `.bob` source file next to the `.svg` it produces, so the source
stays editable and diffable while the built SVG is what chapters actually embed.

## The one rule that matters most

**A `.bob` file and its `.svg` are a pair that must never drift apart.** Quarto
does *not* run svgbob at build time — it assumes every SVG is already generated
and committed. So the moment you create or change a `.bob`, regenerate its
`.svg` in the same edit. If you skip this, the book will render a stale diagram
that no longer matches the source, and no build step will catch it.

## Converting a `.bob` to `.svg`

The binary is `svgbob_cli` (installed via `cargo`). It usually lives in
`~/.cargo/bin`, which is often **not** on the PATH of a non-login shell, so
either add it or call it by full path. The bundled helper handles this for you:

```bash
# Convert one or more .bob files to sibling .svg files (recommended):
.claude/skills/svgbob/scripts/bob2svg.sh path/to/diagram.bob [more.bob ...]

# Or convert every .bob under a directory:
.claude/skills/svgbob/scripts/bob2svg.sh --all 0010-introduction/images
```

The script writes each `<name>.svg` next to its `<name>.bob` using the project's
standard flags. If you ever call svgbob directly instead, this is the exact
command the project uses (it reproduces the committed SVGs byte-for-byte):

```bash
svgbob_cli diagram.bob -o diagram.svg --font-family "Iosevka Fixed, monospace"
```

The `--font-family "Iosevka Fixed, monospace"` flag is the house style — always
pass it so diagrams match the rest of the book. Do not hand-edit the generated
`.svg`; change the `.bob` and re-run the converter.

## Where diagrams live and how chapters use them

- Source and output sit together in the chapter's `images/` folder, sharing a
  base name: `images/canvas-coordinates.bob` → `images/canvas-coordinates.svg`.
- Chapters (`.qmd`) embed the **SVG**, never the `.bob`, and set a display width:

  ```markdown
  ![The canvas coordinate system: the origin sits in the top left corner, x
  grows to the right, and y grows down.](images/canvas-coordinates.svg){width=320}
  ```

- Choose `width` for how the figure should appear in the book; it is independent
  of the SVG's intrinsic pixel size. Give every figure a real caption.

## Writing good svgbob ASCII

svgbob reads a character grid and turns recognized shapes into clean vector art,
so **alignment is everything** — diagrams are drawn in a fixed-width mindset and
a single misplaced space breaks a line or corner. Draft diagrams in a monospace
view and keep columns lined up.

The essentials, enough for most course diagrams:

| You type | You get |
|----------|---------|
| `-` `|` | horizontal / vertical lines |
| `+` | corner or T/cross junction |
| `->` `<-` `^` `v` | arrowheads (also `<->`) |
| `o` | small open-circle junction/marker |
| `*` | small filled dot |
| `/` `\` | diagonal lines |
| `.` `'` | rounded corners (top / bottom) |
| `"like this"` | force literal text (see below) |

**Quote text that looks like drawing.** Any label containing characters svgbob
treats as art — parentheses, digits next to symbols, commas in coordinates — can
get mangled into lines or dots. Wrap such labels in double quotes to render them
verbatim. This is why coordinate labels in the existing diagrams are written
`"(0,0)"` and `"(200,260)"` rather than bare.

**Worked example** — the canvas coordinate diagram source:

```
 "(0,0)"
    o------------------------+------->  x
    |                        |
    |                        |
    |            *           |
    |            |           |
    |       "(200,260)"      |
    |                        |
    |         canvas         |
    |                        |
    +------------------------+
    |               "(400,500)"
    v
    y
```

For anything beyond the table above — filled shapes, styled/dashed lines,
markers, blocks, emphasized text, escaping rules, and the full grid semantics —
consult the authoritative, up-to-date specification:

**https://ivanceras.github.io/content/Svgbob/Specification.html**

Prefer it over guessing: svgbob's shape recognition has many specific rules, and
the spec is the source of truth for exactly which character patterns produce
which shapes.

## Workflow checklist

When adding or changing a diagram:

1. Write or edit the `.bob` source in the chapter's `images/` folder, keeping the
   grid aligned and quoting any literal-text labels.
2. Regenerate the sibling `.svg` with `scripts/bob2svg.sh` (never hand-edit SVG).
3. Confirm the `.qmd` embeds the `.svg` with a sensible caption and `width`.
4. Commit the `.bob` and `.svg` together so they stay in sync.
