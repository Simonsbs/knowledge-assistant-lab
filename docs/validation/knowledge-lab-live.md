# Live Ollama validation

Validated in the standalone project on 11 November 2026 using Ollama 0.40.16 and `llama3.2:3b`. The installed Ollama service listens on `127.0.0.1:11434`. The public application uses browser evidence mode; the Python adapter and model are local development services.

WinGet installed the official `Ollama.Ollama` package and verified its release hash. The tested model digest is `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`, a 3.2B GGUF model with Q4_K_M quantisation. `ollama ps` reported 100% GPU placement and a 4,096-token context window on an RTX 3070 with 8 GB of VRAM. The machine has 64 GB of RAM.

## Measured standalone run

The runner used this project's TypeScript retrieval engine, isolated role-specific HTTP adapters, LangChain ChatOllama and the downloaded model. No mock responses were used in this run. The questions and documents were authored together as development fixtures, not as a held-out benchmark.

| Check | Result |
| --- | --- |
| Retrieval decisions matching labels | 38 / 40 |
| Generation-eligible questions | 26 |
| Accepted cited answers | 26 / 26 |
| Answers passing targeted content checks | 26 / 26 |
| Complete pipeline checks passed | 38 / 40 |
| Invalid-context probes rejected as expected | 7 / 7 |
| Median accepted generation time | 284 ms |
| 95th percentile accepted generation time | 425 ms |
| Reported input tokens across accepted answers | 8,056 |
| Reported output tokens across accepted answers | 930 |
| Accepted responses missing usage metadata | 0 |

Timing covers model invocation and answer validation in this warm-model run. It excludes browser rendering and retrieval. Prefix caching can affect these short, repeated questions. The first cold diagnostic request in the earlier implementation took approximately 78 seconds and was rejected for citation formatting. The warm figures do not describe cold startup performance.

The [raw evaluation](knowledge-lab-live-evaluation.json) records every question, retrieved and submitted passage ID, answer, citation, content pattern, timing and source hash. Its source hashes identify the extracted standalone implementation.

## Failures retained and fixes tested

Q12 and Q13 retrieve the expected webhook-verification passage but abstain because of lexical coverage. Generation is therefore disabled for those questions. These are the two remaining failed pipeline cases, not model-generation errors.

Earlier live responses exposed citation IDs without inline references, extra claims that dropped a backup-policy exception, and a contradictory abstention appended to a correct P1 answer. The final schema permits one concise answer with supporting source IDs. The application renders its citations, rejects extra claims and retains a regression pattern for the incorrect unconditional backup-restoration statement. Q01 and Q19 pass in the current recorded run.

An unrelated diagnostic-log passage also blocked Q20 through its labelled source conflict. Model context now contains only retrieved passages meeting the evidence threshold. The server continues to reject a conflicting source submitted directly. Q20 then returned the correct CSV and UTF-8 answer.

Historical JSON reports preserve the earlier rejected and inaccurate responses. Some refer to the pre-extraction source layout. Passing citation and content-pattern checks does not prove general semantic entailment. Independent semantic human review remains pending.

## Reproduce

With Ollama running and the model installed, from this project's root:

```powershell
npm run evaluate:live
```

The evaluator starts and stops its own isolated adapters and needs no Vite server. It exits with code 1 while a case fails, including the two known retrieval abstentions. Inspect individual rows to distinguish retrieval decisions, context rejection, output-format rejection and content-check failure.

For the browser, run `npm run dev:local`, open `http://127.0.0.1:5173/`, expand **Optional local inference**, check the service and draft an answer. The browser displays extractive evidence separately from the model answer.

The seven negative probes cover a restricted administrator passage, a superseded passage, a draft passage, an unknown passage, an omitted contradictory source, a client-selected role and client-provided evidence text. Each was rejected with the expected status and no accepted answer.
