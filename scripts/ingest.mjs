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
const verification = JSON.parse(await readFile(path.join(source, "verification-questions.json"), "utf8"));
const ids = new Set(documents.flatMap((doc) => doc.passages.map((passage) => passage.id)));
assert.ok(questions.length >= 30 && questions.length <= 50);
assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
for (const question of [...questions, ...verification]) {
  assert.ok(question.relevantPassageIds.every((id) => ids.has(id)));
  assert.ok(["support", "admin"].includes(question.role));
  assert.ok(["answered", "conflict", "insufficient"].includes(question.expectedStatus));
}
assert.equal(new Set([...questions, ...verification].map((question) => question.id)).size, questions.length + verification.length);
for (const question of verification) {
  assert.ok(question.expectedAnswer);
  assert.ok(question.expectedStatus !== "answered" || question.answerChecks?.length);
}
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
for (const [name, data] of [["corpus.json", corpus], ["questions.json", questions], ["verification-questions.json", verification]]) await emit(name, `${JSON.stringify(data, null, 2)}\n`);
const frontendData = path.join(root, "src/data");
await mkdir(frontendData, { recursive: true });
const frontendFiles = [["corpus.json", corpus], ["questions.json", questions], ["verification-questions.json", verification]];
for (const name of ["evaluation.json", "verification-evaluation.json"]) {
  try { frontendFiles.push([name, JSON.parse(await readFile(path.join(output, name), "utf8"))]); }
  catch (error) {
    if (error.code !== "ENOENT" || process.argv.includes("--check")) throw error;
    console.log(`${name} has not been recorded yet. Run npm run evaluate.`);
  }
}
for (const [name, data] of frontendFiles) {
  const contents = `${JSON.stringify(data, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    assert.equal(await readFile(path.join(frontendData, name), "utf8"), contents, `${name} frontend data is stale. Run npm run ingest.`);
  } else {
    await writeFile(path.join(frontendData, name), contents);
  }
}
const documentation = [["README.md", "build-notes.md"], ["docs/RUNBOOK.md", "RUNBOOK.md"],
  ["docs/decisions/001-static-evidence-and-local-inference.md", "decisions/001-static-evidence-and-local-inference.md"],
  ["docs/ROADMAP.md", "roadmap.md"], ["docs/validation/knowledge-lab-live.md", "live-validation.md"],
  ["docs/validation/knowledge-lab-live-evaluation.json", "live-evaluation.json"],
  ["docs/validation/semantic-review.md", "semantic-review.md"]];
const publishedPaths = new Map(documentation);
for (const [input, name] of documentation) {
  let contents = await readFile(path.join(root, input), "utf8");
  if (input.endsWith(".md")) contents = contents.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (match, before, href, after) => {
    if (/^[a-z][a-z0-9+.-]*:|^[/#]/i.test(href)) return match;
    const [target, fragment] = href.split("#");
    const sourceTarget = path.posix.normalize(path.posix.join(path.posix.dirname(input), target));
    let url;
    if (publishedPaths.has(sourceTarget)) {
      url = path.posix.relative(path.posix.dirname(name), publishedPaths.get(sourceTarget));
    } else if (before.startsWith("!")) {
      url = `https://raw.githubusercontent.com/Simonsbs/knowledge-assistant-lab/main/${sourceTarget}`;
    } else {
      url = `https://github.com/Simonsbs/knowledge-assistant-lab/${target.endsWith("/") ? "tree" : "blob"}/main/${sourceTarget}`;
    }
    return `${before}${url}${fragment ? `#${fragment}` : ""}${after}`;
  });
  await emit(name, contents);
}
console.log(`${process.argv.includes("--check") ? "Verified" : "Ingested"} ${documents.length} synthetic documents, ${ids.size} passages, ${questions.length} development and ${verification.length} verification questions.`);
