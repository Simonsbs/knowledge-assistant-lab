import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ask, generationPassageIds, validateCorpus } from "../src/lab/engine.ts";

const directory = new URL("../public/data/", import.meta.url);
const corpusText = await readFile(new URL("corpus.json", directory), "utf8");
const questionText = await readFile(new URL("questions.json", directory), "utf8");
const corpus = JSON.parse(corpusText);
const questions = JSON.parse(questionText);
validateCorpus(corpus);
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const cases = questions.map((label) => {
  const answer = ask(corpus, label.question, { profile: "governed", role: label.role, topK: 3 });
  return { ...label, retrievalStatus: answer.status, retrievalMs: answer.retrievalMs,
    passageIds: answer.hits.map((hit) => hit.passage.id), generationPassageIds: generationPassageIds(answer) };
});
console.log(JSON.stringify({ corpusId: corpus.id, corpusSha256: sha256(corpusText),
  questionsSha256: sha256(questionText), engineSha256: sha256(await readFile(
    new URL("../src/lab/engine.ts", import.meta.url), "utf8")), cases }));
