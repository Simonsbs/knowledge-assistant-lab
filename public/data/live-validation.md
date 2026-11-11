# Live Ollama validation

Validated on 11 November 2026 in the independent Knowledge Lab. The public application uses browser evidence mode. Actual model inference was tested locally through the Python/LangChain adapter and Ollama 0.40.16.

## Current accepted run

| Check | Recorded result |
| --- | --- |
| Model | qwen3:8b |
| Retrieval decisions | 68 / 68 |
| Development pipeline cases | 40 / 40 |
| Verification pipeline cases | 28 / 28 |
| Accepted cited answers and targeted content checks | 46 / 46 |
| Invalid-context probes rejected | 7 / 7 |
| Source-by-source agent review | 46 / 46 |
| Human review | Not performed. Version 1 was accepted on agent validation. |
| Median accepted generation time | 640 ms |
| 95th percentile accepted generation time | 1032 ms |
| Model-reported input tokens | 18,235 |
| Model-reported output tokens | 1,932 |
| Responses missing usage metadata | 0 |

The model digest is 500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41. The recorded run uses Q4_K_M quantisation, thinking disabled, temperature zero and a 4,096-token context on an RTX 3070 with 8 GB of VRAM. Ollama reported the loaded model entirely in GPU memory, about 5.6 GB. This machine has 64 GB of system RAM.

The complete run started at 2026-11-11T11:47:54.604693+00:00 and finished at 2026-11-11T11:48:58.749725+00:00. Warm generation timings cover model invocation and answer validation, excluding retrieval, HTTP round-trip and rendering. The first Qwen smoke request took about 22.6 seconds including cold loading; the warm figures do not represent startup latency. Short repeated prompts and prefix caching affect timing.

The [raw report](live-evaluation.json) records every question, actual answer, source ID, targeted content check, usage count and source hash. Current hashes canonicalize UTF-8 text to LF line endings for reproducible Windows/Linux checks. [Agent semantic review](semantic-review.md) compares each of the 46 accepted answers with its actual cited text; the [public comparison](https://knowledge.bestdev.co.il/data/semantic-review.html) also includes the verification labels. Human review is recorded separately and cannot be supplied by an AI agent.

## Fixes and retained failure evidence

Q12 and Q13 incorrectly abstained because literal matching missed inflected words. Governed retrieval now applies standard Porter normalization to query, passage, title and synonym terms. The passage coverage threshold remains 60%. A 75% corpus-vocabulary guard prevents a matching plan name from supporting an undocumented compound topic such as storage capacity. The baseline keeps its original tokenization and results.

The original 40 questions now pass. An additional 28-question fixture was frozen in Git commit 7cae84e before the retrieval change. Its first retrieval run passed, while the same run exposed a development-set false positive that was corrected. Its first live run passed 27/28 automated cases. Agent semantic inspection also found a permission error missed by those patterns: the 3B model incorrectly allowed support staff to require MFA for others. Citation IDs had also been able to satisfy content patterns; those IDs are now excluded from answer-content checks.

The smaller model repeated the permission error after a prompt change, so it is no longer the acceptance model. Qwen3 8B with explicit guidance about permissions, obligations, conditions and source coverage passed the six-case diagnostic and two complete 68-case runs. The recorded semantic review confirms that the final permission answer names only a workspace administrator and that backup-restoration exceptions remain attached to their claims.

Historical results are retained in [before-inflection-fix](https://github.com/Simonsbs/knowledge-assistant-lab/tree/main/docs/validation/before-inflection-fix/), [the first verification live run](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/validation/verification-first-live-run.json), [the permission regression](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/validation/verification-permission-regression.json), [Qwen smoke checks](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/validation/qwen-smoke.json) and [the first complete Qwen success](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/validation/qwen-initial-success.json). Failed runs are not relabelled as passing.

## Scope and reproduction

Both sets are agent-authored synthetic fixtures. The extra set was frozen before the fix, but becomes regression coverage after inspecting its failures. It is not an independent human-labelled or statistically held-out benchmark. Passing the finite cases, exact quotations, citations and agent review does not prove general semantic reliability. Browser roles simulate access over public synthetic data, while the local service independently admits canonical passages for its server-owned role.

Run npm run evaluate:live with Ollama running and qwen3:8b installed. Use --dataset development or --dataset verification to choose a set. The default runs both and exits nonzero for a failed pipeline or admission check. The evaluator starts and stops its isolated adapters. A changed report requires renewed semantic decisions and hash bindings before npm run review and npm run ingest. A normal build contains no model calls.

The seven negative probes reject restricted, superseded, draft and unknown passages, an omitted conflicting source, a client role override and client-provided evidence text. The 19 Python tests additionally cover HTTP input validation, origin/host restrictions, concurrency and real ChatOllama transport against a mock endpoint. The 14 Node tests require all 68 governed decisions and all labelled evidence at k=3, plus exact quotations and no role/source leaks.
