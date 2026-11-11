import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ask, DEFAULT_SETTINGS, generationPassageIds, validateCorpus } from "../src/lab/engine.ts";
import { evaluate, scoreAnswer } from "../src/lab/evaluation.ts";

const directory = new URL("../public/data/", import.meta.url);
const corpusText = await readFile(new URL("corpus.json", directory), "utf8");
const questionsText = await readFile(new URL("questions.json", directory), "utf8");
const corpus = JSON.parse(corpusText);
const labels = JSON.parse(questionsText);
const report = JSON.parse(await readFile(new URL("evaluation.json", directory), "utf8"));
const verificationText = await readFile(new URL("verification-questions.json", directory), "utf8");
const verification = JSON.parse(verificationText);
const verificationReport = JSON.parse(await readFile(new URL("verification-evaluation.json", directory), "utf8"));

test("support role excludes restricted passages, titles and codes across profiles", () => {
  for (const profile of ["baseline", "governed"]) {
    for (const question of [...labels.map((item) => item.question), "ALDER-DEMO-042", "Restricted administrator recovery runbook"]) {
      const answer = ask(corpus, question, { ...DEFAULT_SETTINGS, profile, topK: 5 });
      assert.ok(answer.hits.every((hit) => hit.document.roles.includes("support")));
      assert.ok(!JSON.stringify(answer).includes('"id":"admin-runbook"'));
      assert.ok(answer.quotes.every((quote) => !quote.text.includes("ALDER-DEMO-042")));
    }
  }
});

test("role change exposes only the deliberately synthetic administrator evidence", () => {
  const question = "What is the emergency recovery code?";
  const support = ask(corpus, question, DEFAULT_SETTINGS);
  const admin = ask(corpus, question, { ...DEFAULT_SETTINGS, role: "admin" });
  assert.equal(support.status, "insufficient");
  assert.deepEqual(support.quotes, []);
  assert.equal(admin.status, "answered");
  assert.match(admin.quotes[0].text, /ALDER-DEMO-042/);
});

test("governed retrieval excludes stale policies and drafts before scoring", () => {
  for (const question of labels) {
    const answer = ask(corpus, question.question, { ...DEFAULT_SETTINGS, topK: 5, role: question.role });
    assert.ok(answer.hits.every((hit) => hit.document.status === "current"));
  }
  const answer = ask(corpus, "What is the initial P1 incident response target?", DEFAULT_SETTINGS);
  assert.equal(answer.status, "answered");
  assert.match(answer.quotes[0].text, /15 minutes/);
  assert.equal(answer.conflicts.length, 0, "Superseded and draft P1 values do not create a current conflict.");
});

test("labelled current contradictions remain conflicts even with one retrieved passage", () => {
  for (const topK of [1, 3, 5]) {
    const answer = ask(corpus, "How long are diagnostic logs retained?", { ...DEFAULT_SETTINGS, topK });
    assert.equal(answer.status, "conflict");
    assert.ok(answer.hits.length > 0 && answer.hits.length <= topK);
    assert.deepEqual(answer.conflicts[0].passageIds.sort(), ["logging-policy/diagnostic-logs", "operations-runbook/diagnostic-logs"]);
  }
});

test("missing information and empty vocabulary produce no evidence response", () => {
  for (const question of ["What does the Enterprise plan cost per month?", "Which payment methods are accepted for invoices?", "flibbertigibbet quux", "What is the?"]) {
    const answer = ask(corpus, question, DEFAULT_SETTINGS);
    assert.equal(answer.status, "insufficient");
    assert.deepEqual(answer.quotes, []);
  }
});

test("model context excludes a weak unrelated conflict hit while preserving export evidence", () => {
  const answer = ask(corpus, "What file format and encoding do workspace exports use?", DEFAULT_SETTINGS);
  assert.equal(answer.status, "answered");
  assert.deepEqual(generationPassageIds(answer), ["export-guide/export-format"]);
  // Keep this regression independent of rank improvements that remove the weak hit.
  const { passages, ...document } = corpus.documents.find((doc) => doc.id === "logging-policy");
  const withWeakHit = structuredClone(answer);
  withWeakHit.hits.push({ document, passage: passages[0], score: 0.1, coverage: 0.2 });
  assert.deepEqual(generationPassageIds(withWeakHit), ["export-guide/export-format"]);
  assert.deepEqual(generationPassageIds(ask(corpus, "How long are diagnostic logs retained?", DEFAULT_SETTINGS)), []);
  assert.deepEqual(generationPassageIds(ask(corpus, "What does the Enterprise plan cost per month?", DEFAULT_SETTINGS)), []);
});

test("every evidence quotation exactly matches a retrieved and authorised source", () => {
  for (const label of labels) {
    const answer = ask(corpus, label.question, { ...DEFAULT_SETTINGS, role: label.role });
    for (const quote of answer.quotes) {
      const source = answer.hits.find((hit) => hit.passage.id === quote.passageId);
      assert.ok(source);
      assert.equal(quote.text, source.passage.text);
      assert.ok(source.document.roles.includes(label.role));
    }
    assert.deepEqual(answer.tokens, { input: 0, output: 0 });
  }
});

test("malformed requests cannot bypass the role or passage limit", () => {
  assert.throws(() => ask(corpus, "", DEFAULT_SETTINGS));
  assert.throws(() => ask(corpus, "q".repeat(1001), DEFAULT_SETTINGS));
  for (const settings of [{ ...DEFAULT_SETTINGS, role: "owner" }, { ...DEFAULT_SETTINGS, topK: 100 }, { ...DEFAULT_SETTINGS, profile: "ignore-acl" }]) {
    assert.throws(() => ask(corpus, "recovery code", settings));
  }
});

test("corpus ingestion rejects ambiguous identities, invalid roles and invalid dates", () => {
  validateCorpus(corpus);
  const cases = [
    (pack) => { pack.documents.push(structuredClone(pack.documents[0])); },
    (pack) => { pack.documents[0].roles = ["everyone"]; },
    (pack) => { pack.documents[0].passages[0].id = "../foreign"; },
    (pack) => { pack.documents[0].passages[0].text = ""; },
    (pack) => { pack.documents[0].updatedAt = "2026-02-30"; },
    (pack) => { pack.documents[0].updatedAt = "2027-01-01"; },
    (pack) => { pack.asOf = "2026-99-99"; },
    (pack) => { pack.documents[0].passages[0].fact = { key: "retention" }; },
    (pack) => { pack.documents[0].passages[0].text = "x".repeat(6001); },
  ];
  for (const mutate of cases) {
    const pack = structuredClone(corpus);
    mutate(pack);
    assert.throws(() => validateCorpus(pack));
  }
});

test("evaluator detects a forged quote rather than calling it grounded", () => {
  const answer = ask(corpus, labels[0].question, DEFAULT_SETTINGS);
  answer.quotes[0].text = "The response target is definitely zero seconds.";
  const row = scoreAnswer(corpus, labels[0], answer);
  assert.ok(row.exactQuoteCount < row.quoteCount);
  const forged = structuredClone(answer);
  forged.hits[0].passage.text = forged.quotes[0].text;
  assert.equal(scoreAnswer(corpus, labels[0], forged).exactQuoteCount, 0,
    "Changing the returned passage as well cannot fool the canonical-source check.");
});

test("governed acceptance: every development and verification decision, evidence at k=3 and no source leaks", () => {
  for (const questions of [labels, verification]) {
    for (const topK of [1, 3, 5]) {
      const run = evaluate(corpus, questions, "governed", topK, "Node test");
      assert.equal(run.metrics.decisionAccuracy, 1);
      if (topK >= 3) assert.equal(run.metrics.recallAtK, 1);
      assert.equal(run.metrics.accessLeaks, 0);
      assert.equal(run.metrics.nonCurrentPassages, 0);
      assert.equal(run.metrics.quoteFidelity, 1);
      assert.equal(run.humanReview, "pending");
    }
  }
});

test("inflected verbs retrieve the same authorised evidence without rewriting quotations", () => {
  const pack = structuredClone(corpus);
  pack.documents = [{ id: "messages", title: "Message verification", owner: "Test", updatedAt: "2026-11-01", status: "current", roles: ["support"],
    passages: [{ id: "messages/signatures", heading: "Signature verification", text: "Verify messages using Ed25519 signatures. Reject timestamps older than ten minutes." }] }];
  for (const question of ["Which algorithm verifies message signatures?", "When should message timestamps be rejected?"]) {
    const answer = ask(pack, question, DEFAULT_SETTINGS);
    assert.equal(answer.status, "answered");
    assert.deepEqual(generationPassageIds(answer), ["messages/signatures"]);
    assert.equal(answer.quotes[0].text, pack.documents[0].passages[0].text);
  }
});

test("unknown compound topics do not become supported through a matching plan name", () => {
  const pack = structuredClone(corpus);
  pack.documents = [{ id: "plans", title: "Plans", owner: "Test", updatedAt: "2026-11-01", status: "current", roles: ["support"],
    passages: [{ id: "plans/starter", heading: "Starter plan", text: "The Starter plan includes one workspace." }] }];
  const answer = ask(pack, "How much storage capacity is included in the Starter plan?", DEFAULT_SETTINGS);
  assert.equal(answer.status, "insufficient");
  assert.deepEqual(generationPassageIds(answer), []);
  assert.deepEqual(answer.quotes, []);
});

test("recorded report matches the current documents, labels and deterministic results", async () => {
  assert.equal(report.corpusSha256, createHash("sha256").update(corpusText).digest("hex"));
  assert.equal(report.questionsSha256, createHash("sha256").update(questionsText).digest("hex"));
  assert.equal(verificationReport.questionsSha256, createHash("sha256").update(verificationText).digest("hex"));
  assert.equal(report.runs.length, 6);
  assert.equal(labels.length, 40);
  assert.equal(new Set(labels.map((label) => label.id)).size, labels.length);
  for (const [recordedReport, questions] of [[report, labels], [verificationReport, verification]]) {
    assert.equal(recordedReport.engineSha256, createHash("sha256").update((await readFile(new URL("../src/lab/engine.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n")).digest("hex"));
    for (const recorded of recordedReport.runs) {
      const actual = evaluate(corpus, questions, recorded.profile, recorded.topK, "Node verification");
      const withoutTiming = (rows) => rows.map(({ retrievalMs, ...row }) => row);
      assert.deepEqual(withoutTiming(recorded.rows), withoutTiming(actual.rows));
      for (const metric of ["decisionAccuracy", "recallAtK", "mrr", "quoteFidelity", "accessLeaks", "nonCurrentPassages", "inputTokens", "outputTokens"]) {
        assert.equal(recorded.metrics[metric], actual.metrics[metric]);
      }
    }
  }
});
