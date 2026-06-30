# Real-runtime integration check

The unit tests (`pnpm test`) verify `DurableObjectStore` against `MemoryKVStorage`,
which mirrors Durable Object semantics. This folder verifies the same store
inside an **actual Durable Object on real workerd**, end to end.

`worker.ts` is a self-testing Worker: each request drives the store (save/get a
thread, append + read ordered messages, the `last` window, persist/load a
snapshot) through a real `MEMORY` Durable Object binding and returns the result.

## Run

```bash
# from the @redtuma/store-do package root
pnpm verify:workerd
```

This boots the Worker with `wrangler dev` (downloaded via `npx` on first run;
needs network), polls it, asserts the observed behavior, and shuts down. Expected:

```
✓ ok flag
✓ thread persisted
✓ message order
✓ last window
✓ snapshot persisted

PASS — DurableObjectStore verified on real workerd.
```

It is intentionally **not** part of `pnpm test` / CI's default run, because it
requires the workerd toolchain. Wire it into a dedicated CI job if you want it
gated on every push.
