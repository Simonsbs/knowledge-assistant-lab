# Local lab runbook

Use the browser evidence response to inspect sources when model generation is unavailable. It has no model dependency.

| Symptom | Check and recovery |
| --- | --- |
| Corpus or evaluation checks fail | Run `npm run ingest`, inspect the generated pack, then run `npm run evaluate` and `npm run check`. Review changed metrics and failures before accepting a new report. |
| Local service cannot be reached | Run `npm run dev:local`, or start Vite with `npm run dev` and the adapter separately with `npm run serve`. Port 8787 belongs to the adapter; the browser calls it through Vite on port 5173. The static production preview has no inference proxy. |
| Optional dependency missing | Create `.venv` and install `server/requirements-lock.txt`. The launch commands select that environment automatically. Browser evidence mode does not need Python packages. |
| Ollama unavailable or model missing | Check `ollama list`, the Ollama process and `LAB_MODEL`. Pull the selected model if needed. Restart the adapter after changing environment variables. |
| A restricted passage is rejected | The server uses `LAB_ROLE`, not the browser selector. Use the matching demo role. Set `LAB_ROLE=admin` only when intentionally testing the synthetic administrator scenario, then restart the adapter. |
| A source conflict blocks generation | Inspect both current sources and their owners. Resolve the document metadata or facts, ingest again, reevaluate and restart the adapter. Reducing the passage limit does not bypass conflict admission. |
| Model JSON or citation check fails | The draft is rejected. Inspect the evidence, use a model that can return structured JSON and retry. Do not present the rejected text as a grounded answer. |
| A cited draft changes a source condition | Inspect the original passage. Citation validation checks membership, not meaning. Earlier Q19 responses omitted a backup-policy exception; historical results preserve that failure. Do not treat a draft as authoritative. |
| Generation times out or another call is running | Wait for the one in-flight generation to finish. A browser cancellation does not cancel the underlying model computation. Calls have a 90-second provider timeout. Reduce the model size or inspect local memory use if it persists. |
| Imported pack fails validation | Use the downloaded JSON structure, unique document and passage IDs, valid dates and the `support` or `admin` roles. The upload limit is 2 MB; total passage text is limited to 500,000 characters. Invalid imports leave the previous pack active. |

Stop Vite and the Python adapter with Ctrl+C in their terminals. No document uploads, questions or model drafts are persisted by the adapter. The HTTP log records request paths, not POST bodies. Evaluation exports are explicit browser downloads.

`evaluate_live.py` is an explicit test tool that does persist synthetic questions, answers and measurements to its selected report file. Its default output is `docs/validation/knowledge-lab-live-evaluation.json`. An exit code of 1 reports failed checks; consult the individual rows rather than assuming the model service is unavailable.
