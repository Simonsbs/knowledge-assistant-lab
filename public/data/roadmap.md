# Knowledge Lab roadmap

The standalone application demonstrates source inspection, lexical retrieval, evaluation and optional local inference. It uses synthetic data throughout.

Completed capabilities include the independent React frontend, Markdown ingestion, import validation, two retrieval profiles, role-filter simulations, labelled conflicts, exact quotations, six recorded retrieval configurations, local Ollama integration, context-admission checks and cited model answers.

Known work:

- Investigate the two false retrieval abstentions without tuning only to this development set.
- Add an independently labelled, held-out question set before making broader quality claims.
- Review generated answers semantically with a human reviewer; citation and pattern checks are limited evidence.
- Compare lexical retrieval with embeddings only after the larger dataset provides a useful test.
- Keep public static hosting separate from the optional local model service.

This project is developed and deployed independently from the portfolio. `knowledge.bestdev.co.il` is the intended custom hostname, subject to deployment and DNS verification.
