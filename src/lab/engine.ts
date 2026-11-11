export type Role = "support" | "admin";
export type Profile = "baseline" | "governed";
export type Decision = "answered" | "insufficient" | "conflict";

export interface Passage {
  id: string;
  heading: string;
  text: string;
  fact?: { key: string; value: string };
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  status: "current" | "superseded" | "draft";
  roles: Role[];
  passages: Passage[];
}

export interface Corpus {
  version: 1;
  id: string;
  title: string;
  description: string;
  asOf: string;
  documents: KnowledgeDocument[];
}

export interface Settings {
  profile: Profile;
  role: Role;
  topK: number;
}

export interface Hit {
  passage: Passage;
  document: Omit<KnowledgeDocument, "passages">;
  score: number;
  coverage: number;
}

export interface Answer {
  question: string;
  settings: Settings;
  status: Decision;
  explanation: string;
  hits: Hit[];
  quotes: { passageId: string; text: string }[];
  conflicts: { key: string; passageIds: string[] }[];
  retrievalMs: number;
  eligibleDocuments: number;
  tokens: { input: 0; output: 0 };
}

export const DEFAULT_SETTINGS: Settings = {
  profile: "governed",
  role: "support",
  topK: 3,
};

const MIN_QUERY_COVERAGE = 0.6;

export function generationPassageIds(answer: Answer): string[] {
  if (answer.status !== "answered" || answer.settings.profile !== "governed") return [];
  return answer.hits.filter((hit) => hit.coverage >= MIN_QUERY_COVERAGE).map((hit) => hit.passage.id);
}

export const PROFILES = {
  governed: {
    name: "Governed retrieval",
    description: "Current sources, title weighting, synonyms and labelled conflict checks.",
  },
  baseline: {
    name: "Keyword baseline",
    description: "BM25 across current, archived and draft sources. Role filtering stays on.",
  },
};

const stopwords = new Set(
  "a an the is are was were be been being of for to in on at by from with and or it its this that these those what which who how when where why do does did can could should would will shall i we you our their please tell me about alder cloud company according documentation document policy guide current latest much many long".split(" "),
);

// Small, explicit lexical expansions, not embeddings or a semantic model.
const synonyms: Record<string, string[]> = {
  sso: ["single", "sign", "saml"],
  saml: ["sso"],
  mfa: ["multi", "factor", "authentication"],
  p1: ["priority", "one"],
  p2: ["priority", "two"],
  rpo: ["recovery", "point", "objective"],
  rto: ["recovery", "time", "objective"],
  dlq: ["dead", "letter", "queue"],
  expires: ["expiry", "expire"],
  expire: ["expiry", "expires"],
  retry: ["retries", "backoff"],
  retries: ["retry", "backoff"],
  duplicate: ["idempotency", "duplicates"],
};

export function terms(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (term) => !stopwords.has(term),
  );
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textField(value: unknown, max = 240): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateCorpus(value: unknown): asserts value is Corpus {
  if (!object(value) || value.version !== 1 || !textField(value.id) || !/^[a-z0-9-]+$/.test(value.id) ||
    !textField(value.title) || !textField(value.description, 2000) ||
    !isoDate(value.asOf) ||
    !Array.isArray(value.documents) || value.documents.length < 1 || value.documents.length > 100) {
    throw new Error("Use a version 1 knowledge pack with 1 to 100 documents and an ISO asOf date.");
  }
  const documentIds = new Set<string>();
  const passageIds = new Set<string>();
  let totalLength = 0;
  for (const doc of value.documents) {
    if (!object(doc) || !textField(doc.id) || !/^[a-z0-9-]+$/.test(doc.id) ||
      documentIds.has(doc.id) || !textField(doc.title) || !textField(doc.owner) ||
      !isoDate(doc.updatedAt) ||
      doc.updatedAt > value.asOf || !["current", "superseded", "draft"].includes(String(doc.status)) ||
      !Array.isArray(doc.roles) || doc.roles.length < 1 ||
      doc.roles.some((role) => role !== "support" && role !== "admin") ||
      !Array.isArray(doc.passages) || doc.passages.length < 1 || doc.passages.length > 100) {
      throw new Error("Every document needs a unique slug, title, owner, valid status, roles and passages. Dates cannot be after asOf.");
    }
    documentIds.add(doc.id);
    for (const passage of doc.passages) {
      if (!object(passage) || !textField(passage.id) ||
        !passage.id.startsWith(`${doc.id}/`) || !/^[a-z0-9/-]+$/.test(passage.id) ||
        passageIds.has(passage.id) || !textField(passage.heading) || !textField(passage.text, 6000)) {
        throw new Error("Passages need a unique document-prefixed ID, a heading and up to 6,000 characters of text.");
      }
      if (passage.fact !== undefined && (!object(passage.fact) ||
        !textField(passage.fact.key) || !textField(passage.fact.value))) {
        throw new Error("Labelled facts need a key and value.");
      }
      passageIds.add(passage.id);
      totalLength += passage.text.length;
    }
  }
  if (totalLength > 500_000) throw new Error("The text in a knowledge pack must stay below 500,000 characters.");
}

export function eligibleDocuments(corpus: Corpus, settings: Settings): KnowledgeDocument[] {
  return corpus.documents.filter((doc) => doc.roles.includes(settings.role) &&
    (settings.profile === "baseline" || doc.status === "current"));
}

export function ask(corpus: Corpus, question: string, settings: Settings): Answer {
  if (!question.trim() || question.length > 1000) throw new Error("Enter a question of 1 to 1,000 characters.");
  if (!["baseline", "governed"].includes(settings.profile) ||
    !["support", "admin"].includes(settings.role) || ![1, 3, 5].includes(settings.topK)) {
    throw new Error("Choose a supported role, retrieval profile and passage limit.");
  }
  const start = performance.now();
  const documents = eligibleDocuments(corpus, settings);
  const passages = documents.flatMap(({ passages, ...document }) =>
    passages.map((passage) => ({ document, passage, words: terms(passage.text) })),
  );
  const query = [...new Set(terms(question))];
  const expansion = settings.profile === "governed"
    ? [...new Set(query.flatMap((word) => synonyms[word] ?? []))].filter((word) => !query.includes(word))
    : [];
  const search = [...query, ...expansion];
  const meanLength = passages.reduce((sum, item) => sum + item.words.length, 0) / (passages.length || 1);
  const frequencies = new Map(search.map((word) => [word,
    passages.filter((item) => item.words.includes(word)).length,
  ]));
  const candidates: Hit[] = passages.map(({ document, passage, words }) => {
    let score = 0;
    const titleWords = terms(`${document.title} ${passage.heading}`);
    for (const word of search) {
      const frequency = words.filter((item) => item === word).length;
      const count = frequencies.get(word) ?? 0;
      const idf = Math.log(1 + (passages.length - count + 0.5) / (count + 0.5));
      const weight = query.includes(word) ? 1 : 0.35;
      if (frequency) score += weight * idf * (frequency * 2.2) /
        (frequency + 1.2 * (0.25 + 0.75 * words.length / meanLength));
      if (settings.profile === "governed" && titleWords.includes(word)) score += idf * weight * 0.65;
    }
    const coverage = query.length ? query.filter((word) => words.includes(word) ||
      (settings.profile === "governed" && (titleWords.includes(word) ||
        (synonyms[word] ?? []).some((synonym) => words.includes(synonym))))).length / query.length : 0;
    return { document, passage, score, coverage };
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score || a.passage.id.localeCompare(b.passage.id));

  const hits = candidates.slice(0, settings.topK);
  const best = hits[0];
  // Coverage guards are lexical heuristics. They do not establish semantic answerability.
  const supported = best && best.coverage >= MIN_QUERY_COVERAGE && best.score >= 1;
  const conflicts: Answer["conflicts"] = [];
  if (supported && settings.profile === "governed") {
    // Check the full eligible pool for labelled contradictions associated with a relevant hit.
    // This prevents topK=1 from silently resolving a known conflict.
    const relevantKeys = new Set(candidates.filter((hit) => hit.coverage >= MIN_QUERY_COVERAGE)
      .map((hit) => hit.passage.fact?.key).filter(Boolean));
    for (const key of relevantKeys) {
      const related = passages.filter((item) => item.passage.fact?.key === key);
      if (new Set(related.map((item) => item.passage.fact?.value)).size > 1) {
        conflicts.push({ key: key!, passageIds: related.map((item) => item.passage.id) });
      }
    }
  }
  const status: Decision = !supported ? "insufficient" : conflicts.length ? "conflict" : "answered";
  const quotes = status === "insufficient" ? [] : hits
    .filter((hit) => status === "conflict" ? conflicts.some((conflict) => conflict.passageIds.includes(hit.passage.id)) : hit.coverage >= MIN_QUERY_COVERAGE)
    .slice(0, status === "conflict" ? 2 : 1).map((hit) => ({ passageId: hit.passage.id, text: hit.passage.text }));
  return {
    question: question.trim(), settings: { ...settings }, status, hits, quotes, conflicts,
    explanation: status === "insufficient"
      ? "There is not enough matching evidence in the sources available to this demo role. Try a narrower question or inspect the related passages."
      : status === "conflict"
        ? "Current sources disagree on a labelled fact. Check both sources with their owners before using this information."
        : "These are exact passages from the retrieved sources. Check their context before acting on them.",
    retrievalMs: performance.now() - start,
    eligibleDocuments: documents.length,
    tokens: { input: 0, output: 0 },
  };
}
