# Project instructions

Never use the em dash character. Keep updates factual and concise.

This is a standalone application. Its frontend, tests, data generation and local service must work without the portfolio repository. Use only synthetic or public sample data. Keep measured results separate from proposals and human review.

Run `npm run build` and `npm run test:server` for relevant changes. Live evaluation is opt-in through `npm run evaluate:live`; the validated default is Qwen3 8B and both question sets must pass. Preserve failed cases and provenance rather than hiding them or inventing measurements. A changed live report requires fresh source-by-source agent review and updated hash bindings. Keep human review separate and require actual reviewer evidence before marking it complete. Do not add model calls to the normal build.
