import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ask, generationPassageIds, validateCorpus } from "../src/lab/engine.ts";

const directory = new URL("../public/data/", import.meta.url);
const corpusText = await readFile(new URL("corpus.json", directory), "utf8");
const corpus = JSON.parse(corpusText);
validateCorpus(corpus);
const sha256 = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const datasetIndex = process.argv.indexOf("--dataset");
const dataset = datasetIndex < 0 ? "all" : process.argv[datasetIndex + 1];
if (!["all", "development", "verification"].includes(dataset)) throw new Error("Choose all, development or verification.");
const questions = [];
const questionSets = [];
for (const [name, file] of [["development", "questions.json"], ["verification", "verification-questions.json"]]) {
  if (dataset !== "all" && dataset !== name) continue;
  const text = await readFile(new URL(file, directory), "utf8");
  const labels = JSON.parse(text);
  questionSets.push({ name, count: labels.length, sha256: sha256(text) });
  questions.push(...labels.map((label) => ({ ...label, questionSet: name })));
}
const cases = questions.map((label) => {
  const answer = ask(corpus, label.question, { profile: "governed", role: label.role, topK: 3 });
  return { ...label, retrievalStatus: answer.status, retrievalMs: answer.retrievalMs,
    passageIds: answer.hits.map((hit) => hit.passage.id), generationPassageIds: generationPassageIds(answer) };
});
console.log(JSON.stringify({ corpusId: corpus.id, hashCanonicalization: "UTF-8 with LF line endings", corpusSha256: sha256(corpusText),
  questionsSha256: sha256(JSON.stringify(questions)), questionSets, engineSha256: sha256(await readFile(
    new URL("../src/lab/engine.ts", import.meta.url), "utf8")), cases }));
