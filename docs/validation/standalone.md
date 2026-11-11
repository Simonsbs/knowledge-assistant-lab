# Standalone project validation

Validated on 11 November 2026 in `D:\Projects\knowledge-assistant-lab` with its own package manifest, lockfile, entry page, frontend styles, Python environment and Git repository. The application builds without importing or running the portfolio repository.

`npm run build` passes TypeScript, generated-source checks and all 12 Node tests. `npm run test:server` passes all 18 Python tests, including the real ChatOllama client against a mock endpoint. The standalone live evaluation uses the actual local model and records 26 accepted answers, 26 targeted content checks passed and seven expected context rejections. The two false retrieval abstentions remain failed pipeline cases. See [the live report](knowledge-lab-live.md).

The browser opens the application directly at `http://127.0.0.1:5173/`, with Knowledge Lab branding and project navigation. Its links back to the portfolio are ordinary external links. Live browser checks confirmed the P1 support target, both data locations and the CSV/UTF-8 export format. A submitted new question clears the previous model draft. Conflicting evidence, missing evidence and a demo role that differs from the service role disable generation.

The [live screenshot](knowledge-lab-live.jpg) records a real locally generated answer with model-reported token counts. Earlier reports and screenshots are retained as historical evidence of the pre-extraction prototype and earlier model-output failures.
