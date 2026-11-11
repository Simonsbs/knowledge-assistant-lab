# Live Ollama validation

Completed locally on 11 November 2026 using Ollama 0.40.16 and `llama3.2:3b`. The model is installed for the Windows user and the Ollama API listens on `127.0.0.1:11434`. The application and its Python adapter remain local development services. Nothing was deployed.

The installer was installed through the `Ollama.Ollama` WinGet package, which verified its release hash. The tested model digest is `a80c4f17acd55265feec403c7aef86be0c25983ab279d83f3bcd3abbcb5b8b72`, a 3.2B GGUF model with Q4_K_M quantisation. `ollama ps` reported 100% GPU placement and a 4,096-token context window on an RTX 3070 with 8 GB of VRAM. The machine has 64 GB of RAM.

## Measured live run

The runner used the real TypeScript retrieval engine, role-specific loopback HTTP adapters, LangChain ChatOllama and the actual downloaded model. There were no mock model responses in this run. The 40 questions and synthetic documents are development fixtures authored together, not a held-out benchmark.

| Check | Result |
| --- | --- |
| Retrieval decisions matching labels | 38 / 40 |
| Generation-eligible questions | 26 |
| Accepted cited model drafts | 26 / 26 |
| Drafts passing targeted content patterns | 25 / 26 |
| Complete pipeline checks passed | 37 / 40 |
| Context-admission rejection probes passed | 7 / 7 |
| Median accepted generation time | 308 ms |
| 95th percentile accepted generation time | 808 ms |
| Reported input tokens across accepted drafts | 7,718 |
| Reported output tokens across accepted drafts | 1,380 |
| Accepted responses missing usage metadata | 0 |

Timing covers model invocation and draft validation for accepted responses in this warm-model run. It excludes browser rendering and retrieval. Prefix caching can affect these short, repeated synthetic questions. The first cold diagnostic request took approximately 78 seconds and was rejected for citation formatting; the warm timings do not describe cold startup performance.

The [raw live evaluation](knowledge-lab-live-evaluation.json) contains every question, retrieved and submitted passage IDs, answer, citation, pattern check, timing and source hash. For a repository checkout, this is `docs/validation/knowledge-lab-live-evaluation.json`.

## Recorded failures and fixes

Q12 and Q13 retrieve the expected webhook-verification passage but abstain because of lexical query coverage. The browser therefore prevents generation. These are the same two known retrieval failures as the browser-only evaluation.

Q19 receives a valid, cited answer about Dublin and Frankfurt, but adds an unrelated statement that backup data is never restored into an active workspace. The source actually allows restoration through an approved recovery process. The generated statement drops that exception. A targeted regression pattern records this failure even though the answer passes citation validation and contains both expected locations. A prompt instruction to preserve exceptions did not eliminate it. This result demonstrates a limit of the chosen model and retrieval context; general semantic human review remains pending.

Live testing also exposed two implementation faults that were fixed before the final run. The model returned source IDs separately while omitting inline citations. The adapter now accepts schema-constrained claims with per-claim source IDs and renders the citations itself, rejecting missing or unknown sources. An unrelated diagnostic-log passage also blocked Q20 through the source-conflict guard. The client now submits only passages meeting the evidence threshold, while the server still rejects a conflicting source submitted directly. Q20 then returned the correct CSV and UTF-8 answer.

Earlier diagnostic reports in `docs/validation/` preserve the rejected citation responses and the runs before context filtering and the focus prompt. The final results above do not hide the remaining failures or count citation validity as semantic correctness.

## Reproduce

With the model installed and Ollama running, from the repository root:

```powershell
.\.venv-knowledge\Scripts\python.exe labs\knowledge-assistant\evaluate_live.py
```

The runner starts and stops its own isolated HTTP adapters. It does not require the Vite server or the interactive adapter on port 8787. It returns exit code 1 while any pipeline check fails, including the three known cases above. Inspect the individual report rows to distinguish retrieval abstention, context rejection, output-format rejection and content-check failure.

For the browser, start Vite with `npm run dev`. Activate `.venv-knowledge` in another terminal, then run `npm run lab:serve`. Open `http://127.0.0.1:5173/#/labs/knowledge`, expand **Optional local inference**, check the local service and draft an answer. The browser demo keeps its extractive evidence response separate from the local model draft.

The seven negative probes cover a restricted administrator passage, a superseded passage, a draft passage, an unknown passage, an omitted contradictory source, a client-selected role and client-provided evidence text. All were rejected with the expected HTTP status and no accepted answer.
