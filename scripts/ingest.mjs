import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateCorpus } from "../src/lab/engine.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "corpus");
const output = path.join(root, "public/data");
const documents = [];
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const name of (await readdir(path.join(source, "documents"))).filter((name) => name.endsWith(".md")).sort()) {
  const markdown = await readFile(path.join(source, "documents", name), "utf8");
  const header = markdown.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  assert.ok(header, `${name}: missing metadata.`);
  const { facts = {}, ...metadata } = JSON.parse(header[1]);
  assert.equal(name, `${metadata.id}.md`);
  const sections = markdown.slice(header[0].length).split(/^##\s+(.+)\r?$/m);
  assert.equal(sections[0].trim(), "");
  const passages = [];
  for (let index = 1; index < sections.length; index += 2) {
    const heading = sections[index].trim();
    const sectionId = slug(heading);
    passages.push({ id: `${metadata.id}/${sectionId}`, heading,
      text: sections[index + 1]?.trim().replace(/\r\n/g, "\n"),
      ...(facts[sectionId] ? { fact: facts[sectionId] } : {}),
    });
  }
  assert.ok(Object.keys(facts).every((key) => passages.some((item) => item.id === `${metadata.id}/${key}`)));
  documents.push({ ...metadata, passages });
}
const corpus = { version: 1, id: "alder-cloud-v1", title: "Alder Cloud",
  description: "A fictional software company. Every policy, support target, code and record in this pack is synthetic.",
  asOf: "2026-11-11", documents };
validateCorpus(corpus);
const questions = JSON.parse(await readFile(path.join(source, "questions.json"), "utf8"));
const ids = new Set(documents.flatMap((doc) => doc.passages.map((passage) => passage.id)));
assert.ok(questions.length >= 30 && questions.length <= 50);
assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
for (const question of questions) assert.ok(question.relevantPassageIds.every((id) => ids.has(id)));
await mkdir(output, { recursive: true });
async function emit(name, contents) {
  const target = path.join(output, name);
  if (process.argv.includes("--check")) {
    assert.equal(await readFile(target, "utf8"), contents, `${name} is stale. Run npm run ingest.`);
  } else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}
for (const [name, data] of [["corpus.json", corpus], ["questions.json", questions]]) await emit(name, `${JSON.stringify(data, null, 2)}\n`);
const frontendData = path.join(root, "src/data");
await mkdir(frontendData, { recursive: true });
for (const [name, data] of [["corpus.json", corpus], ["questions.json", questions],
  ["evaluation.json", JSON.parse(await readFile(path.join(output, "evaluation.json"), "utf8"))]]) {
  const contents = `${JSON.stringify(data, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    assert.equal(await readFile(path.join(frontendData, name), "utf8"), contents, `${name} frontend data is stale. Run npm run ingest.`);
  } else {
    await writeFile(path.join(frontendData, name), contents);
  }
}
for (const [input, name] of [["README.md", "build-notes.md"], ["docs/RUNBOOK.md", "RUNBOOK.md"],
  ["docs/decisions/001-static-evidence-and-local-inference.md", "decisions/001-static-evidence-and-local-inference.md"],
  ["docs/ROADMAP.md", "roadmap.md"], ["docs/validation/knowledge-lab-live.md", "live-validation.md"],
  ["docs/validation/knowledge-lab-live-evaluation.json", "live-evaluation.json"]]) {
  const contents = (await readFile(path.join(root, input), "utf8"))
    .replaceAll("docs/validation/knowledge-lab-live.md", "live-validation.md")
    .replaceAll("docs/validation/knowledge-lab-live-evaluation.json", "live-evaluation.json")
    .replace("](knowledge-lab-live-evaluation.json)", "](live-evaluation.json)")
    .replace("](docs/RUNBOOK.md)", "](RUNBOOK.md)")
    .replace("](docs/ROADMAP.md)", "](roadmap.md)")
    .replace("](docs/DEPLOYMENT.md)", "](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/DEPLOYMENT.md)")
    .replace("](docs/validation/standalone.md)", "](https://github.com/Simonsbs/knowledge-assistant-lab/blob/main/docs/validation/standalone.md)")
    .replace("](docs/validation/knowledge-lab-live.jpg)", "](https://raw.githubusercontent.com/Simonsbs/knowledge-assistant-lab/main/docs/validation/knowledge-lab-live.jpg)")
    .replace("](docs/decisions/", "](decisions/");
  await emit(name, contents);
}
console.log(`${process.argv.includes("--check") ? "Verified" : "Ingested"} ${documents.length} synthetic documents, ${ids.size} passages and ${questions.length} labelled questions.`);
