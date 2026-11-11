# Knowledge Lab roadmap

The standalone application demonstrates source inspection, lexical retrieval, evaluation and optional local inference. It uses synthetic data throughout.

Completed capabilities include the independent React frontend, Markdown ingestion, import validation, two retrieval profiles, role-filter simulations, labelled conflicts, exact quotations, six recorded retrieval configurations, local Ollama integration, context-admission checks and cited model answers.

Version 1 implementation and agent validation:

- Q12/Q13 are fixed with general English inflection normalization, while a vocabulary guard prevents an undocumented storage question becoming a false answer.
- All 40 development and 28 additional verification decisions pass. The additional labels were frozen before the fix, but remain agent-authored regression coverage, not an independent human benchmark.
- Qwen3 8B replaces the smaller acceptance model after repeated permission errors. The full live run passes 68/68 cases, 46/46 generated-answer checks and 7/7 context-admission probes.
- All 46 generated answers have a recorded source-by-source agent review, bound to the exact report and answer hashes. The public comparison exposes the actual answer and cited source text.
- Build checks, 14 Node tests, 19 Python tests and Windows/Linux CI cover the standalone application. Browser checks cover both datasets, the original failure cases and responsive layouts.
- Human review is a separate remaining sign-off. It must be supplied by an actual reviewer of the answer comparison and verification labels; agent review is not relabelled as human review.

Future research, outside version 1: obtain an externally authored, held-out benchmark before making broader quality claims; compare embeddings on that larger dataset if useful. Public static hosting remains separate from local inference.

This project is developed and deployed independently from the portfolio. [knowledge.bestdev.co.il](https://knowledge.bestdev.co.il/) is public without sign-in, with its custom domain and HTTPS verified on 11 November 2026. The portfolio links to this application and its source.
