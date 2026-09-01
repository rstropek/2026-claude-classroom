---
name: writing-guide
description: Voice and anti-slop rules for the storybook. Load before drafting or reviewing chapter text, including the prompts and exercise steps inside it.
---

# Writing Guide

Write like you are **pairing**. A practitioner has pulled a chair up next to the
student and is talking about the code on the screen the way they would actually
say it out loud. Everything below serves that, and catches the **tells** that
give away a machine instead.

`AGENTS.md` defines the audience: what they already know, what language they read
in, what still needs teaching. Calibrate against it before drafting a line. If a
project defines no audience, ask for one instead of guessing.

## Process

1. Apply every rule below. Draft from `## Voice`, then hunt `## The chant` and
   `## The keynote voice` before anything else, because those two survive every
   other edit.
2. Audit. Run the three commands over the changed files and read the hits, then
   settle the judgment checks. Every one of them comes back clean before the text
   ships.
   - `grep -nP '[\x{2014}\x{2013}\x{2018}\x{2019}\x{201C}\x{201D}]'` returns
     nothing.
   - `grep -nE '([^,]+, ){2,}(and|or) '` returns only lists whose third item
     survives the trial in `## The chant`.
   - `grep -nE '\bnot [^.;:!?]{2,50}[.,] (It|That|This)\b'` returns nothing.
   - No sentence tells the story of the material itself: how it was drafted,
     verified, or changed over time. The subject's current state and the
     reader's own work are the only narratives on the page.
   - Every heading is sentence case.
   - Every colon left in prose announces something, at most one per paragraph.
   - Two sections picked at random still make sense read alone.
   - Every term is calibrated. Nothing explained that the audience uses daily,
     nothing used that the text has not defined yet.
   - Every one-sentence paragraph carries an instruction or a result.
   - No two bulleted lists in a row hold the same number of bullets.
3. Read the passage aloud, and mark every sentence where you hear a beat rather
   than a fact. Fix those, then read it aloud once more. The pass ends when a full
   read produces no marks, not when the marks get fewer.

## Voice

Warm and opinionated, the way you talk while pairing. Not a manual, and never a
press release.

- **Talk like a person.** Write it the way you would say it aloud, contractions
  and all. Read it back, and rewrite whatever sounds stiff.
- **Take a position.** Engineering choices carry trade-offs, so pick one and say
  why. "Running the end-to-end tests in the hook is too slow, so they stay out"
  beats a neutral list of considerations. React to what actually happened,
  including when a tool did something dumb.
- **Vary the rhythm.** Short sentences land. Then a longer one that carries the
  reasoning and gives the reader room to follow it. Uniform sentence length reads
  as a machine metronome.
- **Name the mechanism.** A sentence that reports a feeling ("this significantly
  improves quality") becomes a sentence that reports a mechanism or a number
  ("the analyzer turns the unused-variable warning into a build error, so
  the agent has to fix it before it can claim success"). Sharpest version of the
  test: a sentence that would sit unchanged in another project's documentation
  says nothing about this one, so cut it.
- **Second person, active voice, present tense.** Name the actor. "The compiler
  validates the queries", not "the queries are validated". "You add the hook and
  the agent runs it after every session", not "the hook is added and is then run".
- **State the target.** "Pin the analyzer to warnings as errors" carries further
  than a warning about what happens if you forget.
- **Admit the mess.** Tools fail, versions change, a step sometimes needs a second
  run. Write that down. Material that pretends everything worked the first time
  teaches nothing about engineering.
- **The material has no history.** The text teaches the subject as it is now.
  How the material got that way stays out: drafts, revisions, and whatever the
  authors ran, tried, or observed while producing it are a history lesson the
  reader never asked for. Write outcomes as what the reader will see ("this
  commit probably carries..."), and variance as what the reader's own attempt
  may do ("some runs never hit this corner"), never as a comparison with
  something the authors did ("in our run...", "an earlier draft of this
  chapter...").

## The chant

The **chant** is a set of three: three adjectives, three clauses joined by a
serial comma, three bullets under a heading, three sentences per paragraph. The
reader stops hearing the content and starts hearing the meter. Engineering rarely
hands you exactly three of anything, so a chant is usually a pair with a third
item invented to fill the slot. It is the loudest tell in the book.

- **Let the subject set the count.** Two facts carry the point, so write two, and
  when one fact carries it, write one and stop. The number comes from the
  subject, never from the rhythm.
- **Put the third item on trial.** Read it alone and ask what the reader loses
  when it goes. Nothing lost means it was padding, so cut it. "Fast and correct"
  beats "fast, correct, and maintainable" when nobody measured maintainability,
  and "the hook formats the code" beats "the hook formats, checks, and validates
  the code" when formatting is the only thing it does.
- **Distrust matched grammar most of all.** Three items in identical dress ("it
  builds the project, it runs the tests, it reports the result") is the chant at
  its purest. Real triads rarely arrive that evenly matched.
- **Break the chant when all three items are real.** Three genuine items do turn
  up. Give them different shapes: "The hook runs the formatter, then the
  analyzer. On a clean tree it runs the tests too." rather than "The hook runs the
  formatter, the analyzer, and the tests."
- **Watch the paragraph and the page.** Claim, elaboration, tidy closing line,
  repeated down the page, is the chant one level up. So is a page where every
  bulleted list happens to hold three bullets. Vary the length of lists across a
  section even when each list is correct on its own.
- **Catch the near-misses.** "X, Y, and even Z", and a pair rescued by a vague
  third ("and more", "among others"), are the chant wearing a different coat.

## The keynote voice

The **keynote** voice borrows moves that only work on a stage, where a pause and
a speaker's face carry weight the page cannot supply. Written down they read as
performance, and the student watches the performance instead of learning the
material.

The keynote move to hunt hardest is the negation-reframe couplet. One sentence
says what something is not, and a short second sentence renames it with a more
dramatic word. "That is not engineering. That is gambling." "A check nobody runs
is not a weaker version of a check. It is zero." The shape promises a revelation
and pays out a synonym, because the second beat carries a label where the reader
expected a fact.

- **Test the second beat for content.** Ask what the reader can now check or
  predict that they could not before reading it. A more dramatic noun is not an
  answer. When the beat only renames, put the mechanism there instead: "That is
  not engineering. That is gambling." becomes "Nothing in that loop tells you
  whether the code works."
- **Keep the negation when a real misconception blocks the reader,** and let it
  run as one sentence rather than two. "The agent did not skip the check, the
  harness ran it whether the agent wanted to or not" teaches something. The same
  content chopped into two clipped fragments only adds drama.
- **Reserve the one-sentence paragraph** for an instruction the reader acts on or
  a result they just produced. Parking a short abstract sentence alone is a
  keynote drumroll, using whitespace to supply emphasis the words did not earn.
- **Vary the opener.** "That is not engineering. That is gambling." leans on the
  matched "That is" the way a speaker leans on a pause. Change the second opener,
  or merge the sentences.
- **Answer instead of asking.** "So what does that actually buy you?" is a
  presenter filling the gap before a slide. Write the answer, which is the
  sentence you wanted anyway.
- **Escalate once, or not at all.** "Not just X, but Y" and "not only A and B but
  also C" build to a climax the material rarely has. State the point once.
- **End on the artifact.** "And that is harness engineering." restates the
  heading. Close on what the reader now has running, or on the next command.

## Chunk safety

Students come back mid-chapter between lessons, and a search hit or a rendered
fragment shows one section with nothing around it, so each section stands alone.

- **Name the subject in every section.** "The session idle hook runs the
  formatter", not "This runs the formatter". A pronoun inside the same paragraph
  is fine, the rule catches references that break when the section is read alone.
  Cross-heading pointers ("as mentioned above", "the former", "the latter") always
  break.
- **Introduce before you use.** Students read a chapter top to bottom, once, and
  they see a file only when a step tells them to open it. Keep the reader's eyes
  on code and terms already in front of them. When a section needs something the
  text defines later, reorder the sections.

## Words

- **The plain word wins.** Use, not utilize. Help, not facilitate. Many, not
  numerous. If, not in the event that. To, not in order to. Because, not due to
  the fact that.
- **The concrete word beats the abstract metaphor noun.** Base, not substrate.
  Add, not wedge in. Method, not vector. More than the job needs, not
  gold-plating. Same for locus, nexus, bedrock, modality, paradigm, flywheel,
  north star, endgame, primitive as a noun, surface as in "API surface", and
  scaffolding as a metaphor. A project may claim some of these as its own teaching
  vocabulary, in which case `AGENTS.md` says so and the text is free to use them
  once it has defined them.
- **Say the plain thing a teacher would say out loud,** which rules out the slop
  vocabulary: additionally, crucial, delve, leverage, seamless, robust, unlock,
  empower, streamline, elevate, enhance, foster, garner, intricate, interplay,
  pivotal, showcase, tapestry, testament, underscore, vibrant, and landscape in
  the abstract sense. A sentence that opens with "it is worth noting", "in the
  realm of", or "it is important to note that" starts at its second clause
  instead.
- **Literal beats idiomatic.** Sports references and culture-bound jokes cost a
  second-language reader more than they give. A transparent metaphor explained in
  the same breath is fine ("the agent is the engine, the harness is everything
  else").
- **Spell out Latin abbreviations.** "For example", not "e.g.". "That is", not
  "i.e.". "And so on", not "etc.".
- **American English, consistently.** Behavior and color, never behaviour or
  colour, and no British form mixed in within or across chapters. Proper nouns, model ids, field
  names, and CLI flags stay exactly as the source writes them.
- **Define a term in place, on first use,** and expand an acronym the first time
  it appears.
- **Repeat the noun.** One name per thing, reused. Cycling through agent,
  assistant, model, and tool for one subject costs a second-language reader real
  effort.

## Mechanics

- **Sentence-style capitalization** for every heading. "Adding a code analysis
  gate", not "Adding a Code Analysis Gate".
- **Serial comma** when a list genuinely runs to three or more items: "Windows,
  macOS, and Linux". The comma rule is about punctuation, never a license to pad
  a list up to three.
- **Numbers:** words for zero to nine in ordinary prose, numerals for 10 and up,
  and numerals always for versions, exit codes, counts, and anything technical.
- **Straight quotes,** and headings and bullets free of decorative emoji.
- **Bold that earns it.** A bold lead-in naming an item, followed by genuinely new
  detail, works ("**Session idle hook.** It runs after the agent stops."). A bold
  label whose colon restates the line is a tell, so turn that one into prose.
  Product names and acronyms carry themselves.
- **Short blocks.** One idea per sentence, and short paragraphs with plenty of
  headings. A student skims between lessons and comes back mid-chapter, and a
  sentence that needs a second pass to parse has already lost. Split it.
- **Real commands, real output.** Every command in the text is one that was
  actually run, and the output quoted is what came back, failures included.

## Tells

Each of these has a fix. Apply the fix, do not just delete the symptom.

- **Puffery** ("pivotal moment", "testament to", "evolving landscape", "sets the
  stage for") becomes what happened. **Formulaic tension** ("despite these
  challenges, the approach continues to deliver") becomes the specific failure and
  the specific fix.
- **Superficial -ing tails** ("...ensuring correctness", "...allowing the agent
  to") become the concrete effect, or nothing.
- **Fancy ways to say "is"** ("serves as", "stands as", "boasts", "features")
  become "is" or "has".
- **False ranges** ("from configuration to deployment", where the ends sit on no
  scale) become a list of the items.
- **Vague attribution** ("experts recommend", "best practice suggests") becomes
  the document that says so, or the tool whose output proves it. When neither can
  be named, the claim goes.
- **Hedge stacks** ("could potentially be considered somewhat unreliable") become
  "is unreliable" or "sometimes fails".
- **Adverbs propping up weak verbs** ("runs quickly", "significantly improves")
  become the stronger verb or the measured number.
- **Generic endings** ("the future looks bright") become the next concrete step,
  or what the reader now has working.
