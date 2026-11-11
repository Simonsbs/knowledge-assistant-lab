import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { evaluate } from "../src/lab/evaluation.ts";
import { validateCorpus } from "../src/lab/engine.ts";

const directory = new URL("../public/data/", import.meta.url);
const corpusText = await readFile(new URL("corpus.json", directory), "utf8");
const corpus = JSON.parse(corpusText);
validateCorpus(corpus);
const sha256 = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
for (const [questionSet, questionsFile, reportFile] of [
  ["development", "questions.json", "evaluation.json"],
  ["verification", "verification-questions.json", "verification-evaluation.json"],
]) {
  const questionsText = await readFile(new URL(questionsFile, directory), "utf8");
  const questions = JSON.parse(questionsText);
  const runs = [];
  for (const profile of ["baseline", "governed"]) {
    for (const topK of [1, 3, 5]) {
      const run = evaluate(corpus, questions, profile, topK, `Node ${process.version} on ${process.platform}/${process.arch}`);
      runs.push(run);
      const { decisionAccuracy, recallAtK, accessLeaks, p95Ms } = run.metrics;
      console.log(`${questionSet}, ${profile}, k=${topK}: decision ${(decisionAccuracy * 100).toFixed(1)}%, recall ${(recallAtK * 100).toFixed(1)}%, access leaks ${accessLeaks}, p95 ${p95Ms.toFixed(2)} ms.`);
    }
  }
  const report = {
    schemaVersion: 2, questionSet, hashCanonicalization: "UTF-8 with LF line endings",
    corpusSha256: sha256(corpusText), questionsSha256: sha256(questionsText),
    engineSha256: sha256(await readFile(new URL("../src/lab/engine.ts", import.meta.url), "utf8")),
    note: "Actual single-pass lexical retrieval on synthetic data. The separate verification set was frozen before the retrieval fix and is agent-authored, not an independent human benchmark. Exact-quote checks do not prove relevance. Human semantic review is pending. No model is called by this report.",
    runs,
  };
  await writeFile(new URL(reportFile, directory), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(new URL(`../src/data/${reportFile}`, import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
}
