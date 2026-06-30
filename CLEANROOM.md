# Clean-Room Development Process

Redtuma is an **independent, clean-room** reimplementation of the *public API
surface* of the Mastra framework. This document defines the process that keeps
that claim true and defensible. Everyone who contributes code, tests, or docs
must follow it.

> This is an engineering process document, not legal advice. Its goal is to make
> Redtuma a genuinely independent work so that there is no copied expression to
> dispute in the first place.

## Why a clean room

Ideas, architectures, API shapes, and the *functionality* a library provides are
generally not protectable — but a specific **expression** (source code,
comments, test code, prose) is. A clean room produces an independent expression
by separating *what the software must do* (the specification) from *who writes
the code* (the implementation), and by drawing the spec only from sources we are
allowed to use.

## The two sides of the wall

```
   ALLOWED (specification side)              FORBIDDEN (implementation side)
   ─────────────────────────────            ────────────────────────────────
   • Public documentation (mastra.ai)        • Mastra source code (any file in
   • Published .d.ts / type signatures         the mastra-ai/mastra repo)
     from the public npm packages            • Anything under ee/ (NOT Apache —
   • Observed runtime behavior (run it,        proprietary; never read it)
     log inputs/outputs as a black box)      • Mastra's *.test.ts files
   • Public blog posts, talks, examples      • Mastra marketing copy, README
   • Error messages it emits                    prose, logos, the name in our
   • Standards it implements (MCP, OTel)        own branding/marketing
```

**Golden rule:** you may read what Mastra *does* and what its *types* are. You
may not read *how* its code does it, and you may not copy its words.

## Permitted, with care

- **Type signatures.** Reading a published `.d.ts` to match a function shape is
  fine — type signatures are facts about the interface. Do not copy the
  accompanying implementation or doc-comments.
- **Apache-2.0 reuse is legal but is NOT clean-room.** Mastra core is Apache-2.0,
  so you *could* legally vendor it with attribution + NOTICE + change notes. If
  you ever choose to do that for a specific file, it must be done openly (keep
  the upstream license header, list it in NOTICE) and that file is then a
  *derivative*, not clean-room. **Do not mix the two silently.** Default: stay
  clean-room.

## Forbidden, always

1. **Never open `ee/`** or any Mastra Enterprise-licensed file. Not to read, not
   to "get unstuck," not for tests.
2. **Never copy test files** and rewrite imports. Conformance tests are authored
   from documented behavior (see below).
3. **Never paste** Mastra source, comments, or docs into Redtuma — even
   "temporarily" or "to refactor later." Git history is forever.
4. **Never use the Mastra name/logo** in Redtuma branding or marketing. A single
   nominative line ("a clean-room reimplementation of the Mastra API surface")
   for honest description is fine; positioning Redtuma *as* Mastra is not.

## Writing conformance tests (the quality gate)

Behavioral conformance — proving Redtuma behaves like the spec — is our
equivalent of vinext's ported test suites, and our strongest credibility signal.
Author them like this:

1. Write the test from the **documented contract** ("`agent.generate(input)`
   returns `{ text, toolCalls, usage, ... }`") and from **black-box
   observation** (call the real thing, record I/O, assert Redtuma matches).
2. Put them in `spec/` with our own naming and structure.
3. Do **not** open Mastra's test files to write them. If a behavior is only
   discoverable by reading their tests, treat it as undocumented and either skip
   it or derive it by running the public package.

## Contributor checklist (PR gate)

Every PR touching `packages/`, `stores/`, or `spec/` must confirm:

- [ ] I did **not** read Mastra source code or `ee/` while writing this.
- [ ] No code/comments/tests/prose were copied from Mastra.
- [ ] New behavior was derived from public docs, public type signatures, or
      observed runtime behavior only.
- [ ] No Mastra trademark use beyond the single nominative description.
- [ ] Tests are independently authored under `spec/` or colocated `*.test.ts`.

## If you slip

If you accidentally read forbidden material (e.g. clicked into a source file or
`ee/`): stop, do not write or modify the corresponding area for a cooling-off
period, and have **someone who did not see it** implement that part. Note it in
the PR so the provenance is honest. Tainted code is cheaper to rewrite than to
defend.

## Maintainer notes

- Keep `NOTICE` in sync with this file.
- Periodically audit: `git log --all -S "@mastra/"` (must be empty) and
  `grep -rIni mastra packages stores --include='*.ts'` (must be empty outside
  intentional nominative references).
