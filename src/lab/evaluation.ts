import { ask } from "./engine.ts";
import type { Answer, Corpus, Decision, Profile, Role } from "./engine.ts";

export interface LabelledQuestion {
  id: string;
  question: string;
  category: "supported" | "missing" | "conflict" | "access";
  role: Role;
  expectedStatus: Decision;
  relevantPassageIds: string[];
  expectedAnswer?: string;
  answerChecks?: string[];
}

export interface EvaluationRow {
  id: string;
  question: string;
  category: LabelledQuestion["category"];
  role: Role;
  expectedStatus: Decision;
  actualStatus: Decision;
  correctDecision: boolean;
  recall: number | null;
  reciprocalRank: number | null;
  retrievedIds: string[];
  quoteCount: number;
  exactQuoteCount: number;
  accessLeaks: number;
  nonCurrentPassages: number;
  retrievalMs: number;
}

export interface EvaluationRun {
  corpusId: string;
  profile: Profile;
  topK: number;
  timestamp: string;
  runtime: string;
  questionCount: number;
  metrics: {
    decisionAccuracy: number;
    recallAtK: number;
    mrr: number;
    quoteFidelity: number | null;
    accessLeaks: number;
    nonCurrentPassages: number;
    p50Ms: number;
    p95Ms: number;
    inputTokens: 0;
    outputTokens: 0;
  };
  humanReview: "pending";
  rows: EvaluationRow[];
}

export function scoreAnswer(corpus: Corpus, label: LabelledQuestion, answer: Answer): EvaluationRow {
  const retrievedIds = answer.hits.map((hit) => hit.passage.id);
  const relevant = label.relevantPassageIds;
  const firstRelevant = retrievedIds.findIndex((id) => relevant.includes(id));
  const canonical = new Map(corpus.documents.flatMap((doc) => doc.passages.map((passage) =>
    [passage.id, { document: doc, passage }] as const)));
  const accessLeaks = answer.hits.filter((hit) => !canonical.get(hit.passage.id)?.document.roles.includes(label.role)).length;
  const exactQuoteCount = answer.quotes.filter((quote) => {
    const source = canonical.get(quote.passageId);
    return source && source.document.roles.includes(label.role) && source.passage.text.includes(quote.text) &&
      answer.hits.some((hit) => hit.passage.id === quote.passageId);
  }).length;
  return {
    id: label.id, question: label.question, category: label.category, role: label.role,
    expectedStatus: label.expectedStatus, actualStatus: answer.status,
    correctDecision: answer.status === label.expectedStatus,
    recall: relevant.length ? relevant.filter((id) => retrievedIds.includes(id)).length / relevant.length : null,
    reciprocalRank: relevant.length ? firstRelevant < 0 ? 0 : 1 / (firstRelevant + 1) : null,
    retrievedIds, quoteCount: answer.quotes.length, exactQuoteCount, accessLeaks,
    nonCurrentPassages: answer.hits.filter((hit) => canonical.get(hit.passage.id)?.document.status !== "current").length,
    retrievalMs: answer.retrievalMs,
  };
}

export function evaluate(corpus: Corpus, labels: LabelledQuestion[], profile: Profile, topK: number, runtime: string): EvaluationRun {
  const rows = labels.map((label) => scoreAnswer(corpus, label,
    ask(corpus, label.question, { profile, topK, role: label.role })));
  const mean = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / (items.length || 1);
  const timings = rows.map((row) => row.retrievalMs).sort((a, b) => a - b);
  const quotes = rows.reduce((sum, row) => sum + row.quoteCount, 0);
  return {
    corpusId: corpus.id, profile, topK, runtime, timestamp: new Date().toISOString(),
    questionCount: labels.length, humanReview: "pending", rows,
    metrics: {
      decisionAccuracy: mean(rows.map((row) => Number(row.correctDecision))),
      recallAtK: mean(rows.flatMap((row) => row.recall === null ? [] : [row.recall])),
      mrr: mean(rows.flatMap((row) => row.reciprocalRank === null ? [] : [row.reciprocalRank])),
      quoteFidelity: quotes ? rows.reduce((sum, row) => sum + row.exactQuoteCount, 0) / quotes : null,
      accessLeaks: rows.reduce((sum, row) => sum + row.accessLeaks, 0),
      nonCurrentPassages: rows.reduce((sum, row) => sum + row.nonCurrentPassages, 0),
      p50Ms: timings[Math.max(0, Math.ceil(timings.length * 0.5) - 1)] ?? 0,
      p95Ms: timings[Math.max(0, Math.ceil(timings.length * 0.95) - 1)] ?? 0,
      inputTokens: 0, outputTokens: 0,
    },
  };
}
