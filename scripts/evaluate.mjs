import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { evaluate } from "../src/lab/evaluation.ts";
import { validateCorpus } from "../src/lab/engine.ts";

const directory = new URL("../public/data/", import.meta.url);
const corpusText = await readFile(new URL("corpus.json", directory), "utf8");
const questionsText = await readFile(new URL("questions.json", directory), "utf8");
const corpus = JSON.parse(corpusText);
const questions = JSON.parse(questionsText);
validateCorpus(corpus);
const runs = [];
for (const profile of ["baseline", "governed"]) {
  for (const topK of [1, 3, 5]) {
    const run = evaluate(corpus, questions, profile, topK, `Node ${process.version} on ${process.platform}/${process.arch}`);
    runs.push(run);
    const { decisionAccuracy, recallAtK, accessLeaks, p95Ms } = run.metrics;
    console.log(`${profile}, k=${topK}: decision ${(decisionAccuracy * 100).toFixed(1)}%, recall ${(recallAtK * 100).toFixed(1)}%, access leaks ${accessLeaks}, p95 ${p95Ms.toFixed(2)} ms.`);
  }
}
const report = {
  schemaVersion: 1,
  corpusSha256: createHash("sha256").update(corpusText).digest("hex"),
  questionsSha256: createHash("sha256").update(questionsText).digest("hex"),
  note: "Actual single-pass lexical retrieval runs on this synthetic pack. Exact-quote checks do not prove answer relevance. Human semantic review is pending. This retrieval report calls no model; measured live inference is recorded separately.",
  runs,
};
await writeFile(new URL("evaluation.json", directory), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL("../src/data/evaluation.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
