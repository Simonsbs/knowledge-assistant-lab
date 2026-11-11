import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8").then((text) => text.replace(/\r\n/g, "\n"));
const sha256 = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const reportText = await read("docs/validation/knowledge-lab-live-evaluation.json");
const corpusText = await read("public/data/corpus.json");
const report = JSON.parse(reportText);
const corpus = JSON.parse(corpusText);
const review = JSON.parse(await read("docs/validation/semantic-review.json"));
const verification = JSON.parse(await read("public/data/verification-questions.json"));
assert.ok(report.finishedAt && report.summary);
assert.equal(review.reportSha256, sha256(reportText), "Semantic review belongs to a different live run.");
assert.equal(review.corpusSha256, sha256(corpusText), "Semantic review belongs to a different corpus.");
for (const [field, file] of [["adapterSha256", "server/server.py"], ["evaluatorSha256", "server/evaluate_live.py"], ["engineSha256", "src/lab/engine.ts"]]) {
  assert.equal(report[field], sha256(await read(file)), `Live validation is stale for ${file}.`);
}
for (const set of report.questionSets) {
  const file = set.name === "development" ? "questions.json" : "verification-questions.json";
  assert.equal(set.sha256, sha256(await read(`public/data/${file}`)), `Live question labels changed for ${set.name}.`);
}
assert.ok(report.rows.every((row) => row.pipelineCheckPassed) && report.admissionProbes.every((probe) => probe.passed), "Live validation has failed checks.");
assert.equal(review.reviewType, "agent-semantic-review");
assert.equal(review.reviewer, "Codex");
assert.ok(review.reviewedAt);
assert.ok(["pending", "complete"].includes(review.humanReview.status));
if (review.humanReview.status === "complete") {
  assert.ok(review.humanReview.reviewer && review.humanReview.reviewedAt && review.humanReview.evidence,
    "Human review requires an actual reviewer, timestamp and confirmation evidence.");
}
const drafts = report.rows.filter((row) => row.httpStatus === 200);
assert.equal(review.rows.length, drafts.length);
assert.equal(new Set(review.rows.map((row) => row.id)).size, drafts.length);
const decisions = new Map(review.rows.map((row) => [row.id, row]));
const passages = new Map(corpus.documents.flatMap((doc) => doc.passages.map((passage) =>
  [passage.id, { ...passage, title: doc.title, roles: doc.roles }])));
const rows = drafts.map((row) => {
  const decision = decisions.get(row.id);
  assert.ok(decision, `Missing semantic review for ${row.id}`);
  assert.equal(decision.answerSha256, sha256(row.response.answer), `Reviewed answer changed for ${row.id}`);
  assert.ok(["pass", "fail"].includes(decision.verdict));
  assert.ok(decision.note);
  for (const dimension of ["correct", "complete", "supported", "qualificationsPreserved"]) {
    assert.equal(typeof decision[dimension], "boolean");
    if (decision.verdict === "pass") assert.equal(decision[dimension], true);
  }
  const sources = row.response.citations.map((id) => {
    const source = passages.get(id);
    assert.ok(source?.roles.includes(row.role));
    return { id, title: source.title, text: source.text };
  });
  return { id: row.id, questionSet: row.questionSet, role: row.role, question: row.question,
    answer: row.response.answer, sources, ...decision };
});
const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const passed = rows.filter((row) => row.verdict === "pass").length;
const human = review.humanReview.status === "complete" ? `Complete: ${review.humanReview.reviewer}` : "Pending. No human sign-off is claimed.";
const intro = `Source-by-source agent review: ${passed}/${rows.length} accepted answers passed. Human review: ${human}`;
const summary = { model: report.model, pipelinePassed: report.summary.pipelineChecksPassed,
  pipelineCount: report.summary.questionCount, agentReviewed: rows.length, agentPassed: passed,
  humanReview: review.humanReview, reportSha256: review.reportSha256 };
const md = `# Semantic answer review\n\n${intro}\n\nReviewer: Codex (AI coding agent). Reviewed ${review.reviewedAt}. This is a finite qualitative review, not independent human evaluation or proof of general model quality.\n\nRubric: answer the requested question, support each factual part with the cited text, preserve negation, permissions, obligations and exceptions, and add no unsupported facts.\n\nLive report SHA-256: ${review.reportSha256}\n\nCorpus SHA-256: ${review.corpusSha256}\n\n` + rows.map((row) =>
  `## ${row.id}: ${row.question}\n\nRole: ${row.role}. Set: ${row.questionSet}. Verdict: ${row.verdict}.\n\n**Actual answer:** ${row.answer}\n\n${row.sources.map((source) => `**${source.id}:** ${source.text}`).join("\n\n")}\n\n**Review:** ${row.note}\n`).join("\n");
const liveNotes = `# Live Ollama validation

Validated on 11 November 2026 in the independent Knowledge Lab. The public application uses browser evidence mode. Actual model inference was tested locally through the Python/LangChain adapter and Ollama ${report.ollamaVersion}.

## Current accepted run

| Check | Recorded result |
| --- | --- |
| Model | ${report.model} |
| Retrieval decisions | ${report.summary.retrievalDecisionsMatchingLabels} / ${report.summary.questionCount} |
| Development pipeline cases | ${report.summary.datasets.development.passed} / ${report.summary.datasets.development.questions} |
| Verification pipeline cases | ${report.summary.datasets.verification.passed} / ${report.summary.datasets.verification.questions} |
| Accepted cited answers and targeted content checks | ${report.summary.acceptedDrafts} / ${report.summary.generationRequests} |
| Invalid-context probes rejected | ${report.summary.admissionProbesPassed} / ${report.summary.admissionProbeCount} |
| Source-by-source agent review | ${passed} / ${rows.length} |
| Human review | ${human} |
| Median accepted generation time | ${Math.round(report.summary.generationP50Ms)} ms |
| 95th percentile accepted generation time | ${Math.round(report.summary.generationP95Ms)} ms |
| Model-reported input tokens | ${report.summary.inputTokens.toLocaleString("en-GB")} |
| Model-reported output tokens | ${report.summary.outputTokens.toLocaleString("en-GB")} |
| Responses missing usage metadata | ${report.summary.missingUsageResponses} |

The model digest is ${report.modelDigest}. The recorded run uses Q4_K_M quantisation, thinking disabled, temperature zero and a 4,096-token context on an RTX 3070 with 8 GB of VRAM. Ollama reported the loaded model entirely in GPU memory, about 5.6 GB. This machine has 64 GB of system RAM.

The complete run started at ${report.startedAt} and finished at ${report.finishedAt}. Warm generation timings cover model invocation and answer validation, excluding retrieval, HTTP round-trip and rendering. The first Qwen smoke request took about 22.6 seconds including cold loading; the warm figures do not represent startup latency. Short repeated prompts and prefix caching affect timing.

The [raw report](knowledge-lab-live-evaluation.json) records every question, actual answer, source ID, targeted content check, usage count and source hash. Current hashes canonicalize UTF-8 text to LF line endings for reproducible Windows/Linux checks. [Agent semantic review](semantic-review.md) compares each of the 46 accepted answers with its actual cited text; the [public comparison](https://knowledge.bestdev.co.il/data/semantic-review.html) also includes the verification labels. Human review is recorded separately and cannot be supplied by an AI agent.

## Fixes and retained failure evidence

Q12 and Q13 incorrectly abstained because literal matching missed inflected words. Governed retrieval now applies standard Porter normalization to query, passage, title and synonym terms. The passage coverage threshold remains 60%. A 75% corpus-vocabulary guard prevents a matching plan name from supporting an undocumented compound topic such as storage capacity. The baseline keeps its original tokenization and results.

The original 40 questions now pass. An additional 28-question fixture was frozen in Git commit 7cae84e before the retrieval change. Its first retrieval run passed, while the same run exposed a development-set false positive that was corrected. Its first live run passed 27/28 automated cases. Agent semantic inspection also found a permission error missed by those patterns: the 3B model incorrectly allowed support staff to require MFA for others. Citation IDs had also been able to satisfy content patterns; those IDs are now excluded from answer-content checks.

The smaller model repeated the permission error after a prompt change, so it is no longer the acceptance model. Qwen3 8B with explicit guidance about permissions, obligations, conditions and source coverage passed the six-case diagnostic and two complete 68-case runs. The recorded semantic review confirms that the final permission answer names only a workspace administrator and that backup-restoration exceptions remain attached to their claims.

Historical results are retained in [before-inflection-fix](before-inflection-fix/), [the first verification live run](verification-first-live-run.json), [the permission regression](verification-permission-regression.json), [Qwen smoke checks](qwen-smoke.json) and [the first complete Qwen success](qwen-initial-success.json). Failed runs are not relabelled as passing.

## Scope and reproduction

Both sets are agent-authored synthetic fixtures. The extra set was frozen before the fix, but becomes regression coverage after inspecting its failures. It is not an independent human-labelled or statistically held-out benchmark. Passing the finite cases, exact quotations, citations and agent review does not prove general semantic reliability. Browser roles simulate access over public synthetic data, while the local service independently admits canonical passages for its server-owned role.

Run npm run evaluate:live with Ollama running and qwen3:8b installed. Use --dataset development or --dataset verification to choose a set. The default runs both and exits nonzero for a failed pipeline or admission check. The evaluator starts and stops its isolated adapters. A changed report requires renewed semantic decisions and hash bindings before npm run review and npm run ingest. A normal build contains no model calls.

The seven negative probes reject restricted, superseded, draft and unknown passages, an omitted conflicting source, a client role override and client-provided evidence text. The 19 Python tests additionally cover HTTP input validation, origin/host restrictions, concurrency and real ChatOllama transport against a mock endpoint. The 14 Node tests require all 68 governed decisions and all labelled evidence at k=3, plus exact quotations and no role/source leaks.
`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Knowledge Lab: semantic answer review</title>
<style>body{margin:auto;max-width:1100px;padding:28px;font:16px/1.65 system-ui;background:#141715;color:#f0f0e7}a{color:#c7edaa}h1,h2{line-height:1.2}p{max-width:85ch}article{border:1px solid #596151;border-radius:8px;margin:24px 0;padding:22px}article:target{outline:3px solid #c7edaa}section{display:grid;grid-template-columns:1fr 1fr;gap:24px}blockquote{margin:0 0 16px;padding-left:16px;border-left:3px solid #c7edaa}small{color:#b2b9ae}code{overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:12px}@media(max-width:700px){section{grid-template-columns:1fr}body{padding:18px}article{padding:16px}}@media print{body{background:white;color:black}article{break-inside:avoid}a{color:black}}</style></head><body>
<a href="/">Back to Knowledge Lab</a><h1>Answers beside their evidence.</h1><p>${escape(intro)}</p><p>Reviewer: <strong>Codex, an AI coding agent</strong>. This is a qualitative review of this recorded run. It is not independent human evaluation or a general accuracy guarantee.</p><p>Check correctness, requested detail, source support, negation, permissions, obligations and exceptions. Earlier errors and rejected runs remain in the <a href="https://github.com/Simonsbs/knowledge-assistant-lab/tree/main/docs/validation">source archive</a>.</p><details><summary>Report provenance</summary><p>Reviewed: ${escape(review.reviewedAt)}</p><p>Report SHA-256: <code>${review.reportSha256}</code></p><p>Corpus SHA-256: <code>${review.corpusSha256}</code></p><a href="live-evaluation.json">Full live report</a> · <a href="semantic-review.json">Structured review</a></details>
<p><a href="#verification-labels">Inspect the 28 verification labels</a> · <a href="corpus.json">Download the complete synthetic corpus</a></p><nav aria-label="Answers">${rows.map((row) => `<a href="#${row.id}">${row.id}</a>`).join("")}</nav>
${rows.map((row) => `<article id="${row.id}"><small>${row.id} · ${escape(row.questionSet)} · ${row.role} · Agent verdict: ${row.verdict}</small><h2>${escape(row.question)}</h2><section><div><h3>Actual local model answer</h3><p>${escape(row.answer)}</p><h3>Agent review</h3><p>${escape(row.note)}</p></div><div><h3>Cited source text</h3>${row.sources.map((source) => `<small>${escape(source.id)}</small><blockquote>${escape(source.text)}</blockquote>`).join("")}</div></section></article>`).join("\n")}
<h2 id="verification-labels">Verification labels</h2><p>These 28 agent-authored labels were frozen before the fix. They are not an independent human benchmark. Confirm the expected decision and reference answer against the corpus as part of human review.</p>
${verification.map((label) => `<article><small>${label.id} · ${label.role} · Expected: ${label.expectedStatus}</small><h3>${escape(label.question)}</h3><p>${escape(label.expectedAnswer)}</p>${label.relevantPassageIds.map((id) => `<small>${escape(id)}</small><blockquote>${escape(passages.get(id).text)}</blockquote>`).join("")}</article>`).join("\n")}
</body></html>\n`;
for (const [name, contents] of [["docs/validation/semantic-review.md", md], ["public/data/semantic-review.html", html],
  ["docs/validation/knowledge-lab-live.md", liveNotes],
  ["public/data/semantic-review.json", `${JSON.stringify({ ...review, rows }, null, 2)}\n`],
  ["public/data/validation-summary.json", `${JSON.stringify(summary, null, 2)}\n`],
  ["src/data/validation-summary.json", `${JSON.stringify(summary, null, 2)}\n`]]) {
  if (process.argv.includes("--check")) assert.equal(await read(name), contents, `${name} is stale. Run npm run review.`);
  else await writeFile(new URL(name, root), contents);
}
console.log(`Verified agent review of ${rows.length} answers: ${passed} passed; human review ${review.humanReview.status}.`);
