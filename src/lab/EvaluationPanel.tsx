import { useState } from "react";
import { ArrowUpRight, Download, FlaskConical, Play } from "lucide-react";
import { PROFILES } from "./engine";
import type { Corpus } from "./engine";
import { evaluate } from "./evaluation";
import type { EvaluationRun, LabelledQuestion } from "./evaluation";
import { downloadJson } from "./download";
import type { QuestionSet } from "./KnowledgeLab";
import validation from "../data/validation-summary.json";

const percent = (value: number | null) => value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;

export default function EvaluationPanel({ corpus, labels, custom, runs, runSource, onRuns, onInspect, onRestore, questionSet, onQuestionSet }: {
  corpus: Corpus; labels: LabelledQuestion[]; custom: boolean; runs: EvaluationRun[];
  runSource: string; onRuns: (runs: EvaluationRun[]) => void;
  onInspect: (label: LabelledQuestion, run: EvaluationRun) => void; onRestore: () => void;
  questionSet: QuestionSet; onQuestionSet: (value: QuestionSet) => void;
}) {
  const [selected, setSelected] = useState("governed-3");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const run = runs.find((item) => `${item.profile}-${item.topK}` === selected) ?? runs[0];
  const failures = run.rows.filter((row) => !row.correctDecision).length;
  const rows = run.rows.filter((row) => filter === "all" || (filter === "failed" ? !row.correctDecision : row.category === filter));

  async function rerun() {
    setBusy(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const next: EvaluationRun[] = [];
      for (const profile of ["baseline", "governed"] as const) {
        for (const topK of [1, 3, 5]) {
          next.push(evaluate(corpus, labels, profile, topK, `Browser: ${navigator.userAgent}`));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      }
      onRuns(next);
    } finally { setBusy(false); }
  }

  if (custom) return <div className="lab-empty"><FlaskConical size={28} /><h2>Evaluation labels belong to the sample pack.</h2>
    <p>Restore Alder Cloud to compare its two labelled question sets. Your imported pack has no matching ground truth.</p>
    <button className="button button-secondary" onClick={onRestore}>Restore sample pack</button></div>;

  return (
    <div className="lab-evaluation">
      <div className="lab-section-heading"><div><span className="section-kicker">RETRIEVAL QUALITY / ANSWER DECISIONS</span>
        <h2>Measure what changed.</h2><p>Two labelled question sets. Two retrieval profiles. Three passage limits. Every row comes from an actual run.</p></div>
        <div className="lab-eval-actions"><button className="button button-primary" onClick={rerun} disabled={busy}><Play size={15} />{busy ? "Evaluating..." : "Rerun in this browser"}</button>
          <button className="button button-secondary" onClick={() => downloadJson({ corpusId: corpus.id, questionSet, runSource, runs }, `alder-${questionSet}-evaluation.json`)}><Download size={15} /> Export results</button></div>
      </div>
      <div className="lab-dataset-picker"><label htmlFor="lab-question-set">Question set</label>
        <select id="lab-question-set" value={questionSet} onChange={(event) => { onQuestionSet(event.target.value as QuestionSet); setFilter("all"); }}>
          <option value="development">Development set (40)</option><option value="verification">Verification set (28)</option>
        </select>
        <p>{questionSet === "development" ? "The original questions were authored alongside the documents." : "Additional questions were frozen before the retrieval fix. Agent-authored, with expected answers and source labels; no independent human labelling is claimed."}</p>
      </div>
      <div className="lab-run-provenance"><span className="lab-mode"><span /> {runSource}</span>
        <p>{run.timestamp.replace("T", " ").slice(0, 19)} UTC · {run.questionCount} questions per configuration · No model calls</p></div>
      <div className="lab-table-scroll" role="region" aria-label="Retrieval configuration comparison" tabIndex={0}>
        <table className="lab-table"><caption className="sr-only">Select a run to inspect its individual question results.</caption>
          <thead><tr><th scope="col">Configuration</th><th scope="col">Decision accuracy</th><th scope="col">Recall at k</th><th scope="col">MRR</th><th scope="col">p95 retrieval</th><th scope="col">Access leaks</th></tr></thead>
          <tbody>{runs.map((item) => <tr key={`${item.profile}-${item.topK}`} className={selected === `${item.profile}-${item.topK}` ? "lab-selected-run" : ""}>
            <th scope="row"><button aria-pressed={selected === `${item.profile}-${item.topK}`} onClick={() => setSelected(`${item.profile}-${item.topK}`)}>{PROFILES[item.profile].name}<span>Top {item.topK} passages</span></button></th>
            <td>{percent(item.metrics.decisionAccuracy)}</td><td>{percent(item.metrics.recallAtK)}</td><td>{item.metrics.mrr.toFixed(3)}</td>
            <td>{item.metrics.p95Ms.toFixed(2)} ms</td><td>{item.metrics.accessLeaks}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="lab-metric-notes"><p><strong>Recall at k</strong> measures whether the hand-labelled evidence appears in the retrieved passages. <strong>Decision accuracy</strong> compares evidence, abstention and conflict decisions with the labels. A correct decision does not prove an answer is useful.</p>
        <p><strong>MRR</strong> measures the rank of the first labelled passage. Timing covers retrieval in one small synthetic run; it excludes network and model time. A larger passage limit can improve recall while adding irrelevant context.</p></div>
      <div className="lab-eval-summary">
        <div><span>EXACT QUOTE FIDELITY</span><strong>{percent(run.metrics.quoteFidelity)}</strong><p>Quoted text matches the cited passage.</p></div>
        <div><span>NON-CURRENT PASSAGES</span><strong>{run.metrics.nonCurrentPassages}</strong><p>Archived or draft passages retrieved.</p></div>
        <div><span>SEMANTIC ANSWER REVIEW</span><strong>{validation.agentPassed}/{validation.agentReviewed} agent-reviewed</strong><p>Human review: {validation.humanReview.status}. <a href="/data/semantic-review.html" target="_blank" rel="noopener noreferrer">Compare every answer with its sources.</a></p></div>
      </div>
      <div className="lab-question-results"><div className="lab-evidence-heading"><h3>Inspect the question set</h3><span>{failures} decisions need review in this run</span></div>
        <div className="lab-result-filter"><label htmlFor="lab-result-filter">Show</label><select id="lab-result-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All questions</option><option value="failed">Decisions needing review</option><option value="supported">Supported answers</option>
          <option value="conflict">Conflicting sources</option><option value="access">Access boundaries</option><option value="missing">Missing information</option></select>
          <span role="status">{rows.length} questions</span></div>
        <div className="lab-question-list">{rows.map((row) => <article key={row.id} className={`lab-question-row${row.correctDecision ? "" : " lab-needs-review"}`}>
          <span className="lab-question-id">{row.id}</span><div><h4>{row.question}</h4><p>{row.role} · Expected: {row.expectedStatus} · Actual: {row.actualStatus}
            {row.recall !== null && ` · Evidence recall: ${percent(row.recall)}`}</p></div>
          <button className="text-link" aria-label={`Inspect ${row.id}`} onClick={() => onInspect(labels.find((label) => label.id === row.id)!, run)}>Inspect <ArrowUpRight size={15} /></button>
        </article>)}</div>
      </div>
      <details className="lab-methodology"><summary>Methodology and limits</summary><div><p>The development questions were authored with the documents; the separate verification set was frozen before the fix and is also agent-authored. Neither is an independent human benchmark. Role filtering applies before scoring in both profiles. Governed retrieval removes draft and superseded sources, normalizes English inflections, weights titles, expands a small synonym list and checks explicitly labelled fact conflicts.</p>
        <p>The passage coverage threshold remains 60%. A 75% corpus-vocabulary coverage guard limits matches to undocumented topics. These are lexical heuristics and can still reject useful evidence or accept irrelevant text. Exact quotation checks measure copying and citation integrity, not semantic groundedness.</p>
        <p><a href={questionSet === "development" ? "/data/evaluation.json" : "/data/verification-evaluation.json"} target="_blank" rel="noopener noreferrer">Open this set's retrieval report.</a> <a href="/data/live-validation.md" target="_blank" rel="noopener noreferrer">Read the real local-model validation.</a> <a href="/data/semantic-review.html" target="_blank" rel="noopener noreferrer">Review generated answers against their sources.</a></p></div></details>
    </div>
  );
}
