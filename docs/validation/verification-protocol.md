# Verification protocol

The 28 verification questions were labelled from the canonical synthetic passages before applying the retrieval fix. The fixture is frozen in Git before its first retrieval run. Its expected source IDs, decisions, concise reference answers and content checks must not be edited to conceal a failed run.

This is an additional agent-authored verification set, separate from the original 40 development questions. It includes inflection variants, negation, source qualifications, multi-part answers, near-topic missing facts, role boundaries, conflicting sources and an instruction to bypass the role filter. It is not an externally authored or human-labelled benchmark. Both the author and implementer are the same coding agent; no statistical independence is claimed.

Freeze the fixture first, apply the general retrieval change, then record its first run without inspecting intermediate results. If a defect requires a further change, retain that first result and treat the set as regression coverage from then on. Report the actual score, including any failures.

Automated checks cover retrieval decisions, evidence recall, exact quotations, role/source filtering, citation membership and targeted answer patterns. A separate semantic review must compare every accepted generated answer with its cited passages for correctness, requested detail, negation, qualifications and unsupported additions. Agent review and human sign-off must be recorded separately, bound to the exact report and corpus hashes.
