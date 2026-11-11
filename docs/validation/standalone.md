# Standalone project validation

Validated on 11 November 2026 in `D:\Projects\knowledge-assistant-lab` with its own package manifest, lockfile, entry page, frontend styles, Python environment and Git repository. The application builds without importing or running the portfolio repository.

The updated `npm run build` passes TypeScript, generated-source checks, review bindings and all 14 Node tests. `npm run test:server` passes all 19 Python tests, including the real ChatOllama client against a mock endpoint. The final Qwen3 8B run passes all 68 pipeline cases, 46 generated-answer checks and seven context rejections. All 46 accepted answers also have a recorded source-by-source agent review. Human review is separate. See [the live report](knowledge-lab-live.md) and [semantic review](semantic-review.md).

The browser opens the application directly at `http://127.0.0.1:5173/`, with Knowledge Lab branding and project navigation. Its links back to the portfolio are ordinary external links. Live browser checks confirmed the P1 support target, both data locations and the CSV/UTF-8 export format. A submitted new question clears the previous model draft. Conflicting evidence, missing evidence and a demo role that differs from the service role disable generation.

The original [live screenshot](knowledge-lab-live.jpg) records the earlier 3B model. Reports and screenshots from that stage remain historical evidence. Current validation fixes the two inflection failures and the storage-topic regression, and uses Qwen3 8B after semantic inspection found a persistent permission error in the smaller model.

## Public deployment and extraction

The independent application opened at [knowledge.bestdev.co.il](https://knowledge.bestdev.co.il/) over HTTPS without sign-in. The custom domain and TLS certificate are active. Updated browser evaluation reran all six configurations for each set: 40 development and 28 verification questions, with no governed decision failures. Browser checks confirmed that Q12 and Q13 find evidence, the unsupported storage question abstains and diagnostic-log contradictions remain conflicts.

The public layout was checked at its normal desktop viewport and at 390 by 844 pixels. At the mobile size, the document width stayed within the viewport and the application navigation remained available. Screenshots record the [desktop](standalone-public-desktop.jpg) and [mobile](standalone-public-mobile.jpg) views.

The portfolio's embedded implementation, data and service scripts were moved to an external migration archive. Its cards link to this application, and its previous lab route displays an outbound compatibility link. The portfolio builds independently and uses port 5174 for development, while this project uses 5173. Simon subsequently confirmed that the portfolio was already published; this task updates only the independent lab deployment.
