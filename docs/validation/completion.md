# Version 1 completion record

11 November 2026. Project 2 has not been started.

| Acceptance item | Evidence and status |
| --- | --- |
| Independent project and public deployment | Own repository, application, setup, tests and HTTPS hostname; no sign-in |
| Original retrieval failures resolved | Q12 and Q13 now answer; the unknown-storage regression abstains |
| Broader regression coverage | 28 frozen verification questions in addition to the original 40; first runs and failures retained |
| Retrieval acceptance | 68/68 governed decisions; all labelled evidence at k=3; no role or source-status leaks |
| Live model acceptance | Qwen3 8B: 68/68 pipeline cases; 46/46 generated-answer content checks; 7/7 context-rejection probes |
| Source-by-source semantic agent review | 46/46 accepted answers reviewed for correctness, completeness, source support and qualifications; bound to exact report and answer hashes |
| Automated regression checks | 14 Node and 19 Python tests, generated-source integrity and production build pass |
| CI | Windows and Linux workflow configured to check a fresh checkout without model calls |
| Browser checks | Original failure cases, missing facts, conflicts, both evaluation sets, local model integration and responsive layout |
| Actual human review | Pending confirmation from a reviewer of the public answer comparison and verification labels |

Implementation and agent validation are complete. Actual human review must not be marked complete merely because an agent reviewed the answers. The public answer comparison gives a reviewer the concrete evidence needed for that final step.

Future embeddings research and an externally authored benchmark are outside this finite demonstrator acceptance. The current data supports no general accuracy guarantee and contains only public synthetic records.
