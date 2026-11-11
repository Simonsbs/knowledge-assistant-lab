import { useState } from "react";
import { ArrowUpRight, Download, FlaskConical, Play } from "lucide-react";
import { PROFILES } from "./engine";
import type { Corpus } from "./engine";
import { evaluate } from "./evaluation";
import type { EvaluationRun, LabelledQuestion } from "./evaluation";
import { downloadJson } from "./download";

const percent = (value: number | null) => value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;

export default function EvaluationPanel({ corpus, labels, custom, runs, runSource, onRuns, onInspect, onRestore }: {
  corpus: Corpus; labels: LabelledQuestion[]; custom: boolean; runs: EvaluationRun[];
  runSource: string; onRuns: (runs: EvaluationRun[]) => void;
  onInspect: (label: LabelledQuestion, run: EvaluationRun) => void; onRestore: () => void;
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
    <p>Restore Alder Cloud to compare its 40 labelled questions. Your imported pack has no matching ground truth.</p>
    <button className="button button-secondary" onClick={onRestore}>Restore sample pack</button></div>;

  return (
    <div className="lab-evaluation">
      <div className="lab-section-heading"><div><span className="section-kicker">RETRIEVAL QUALITY / ANSWER DECISIONS</span>
        <h2>Measure what changed.</h2><p>One labelled question set. Two retrieval profiles. Three passage limits. Every row comes from an actual run.</p></div>
        <div className="lab-eval-actions"><button className="button button-primary" onClick={rerun} disabled={busy}><Play size={15} />{busy ? "Evaluating..." : "Rerun in this browser"}</button>
          <button className="button button-secondary" onClick={() => downloadJson({ corpusId: corpus.id, runSource, runs }, "alder-retrieval-evaluation.json")}><Download size={15} /> Export results</button></div>
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
        <div><span>SEMANTIC HUMAN REVIEW</span><strong>Pending</strong><p>Relevance and model groundedness remain unscored.</p></div>
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
      <details className="lab-methodology"><summary>Methodology and limits</summary><div><p>The question set was authored with the synthetic documents. It is a development fixture, not a held-out benchmark. Role filtering applies before scoring in both profiles. Governed retrieval also removes draft and superseded sources, weights titles, expands a small synonym list and checks explicitly labelled fact conflicts.</p>
        <p>The abstention threshold uses lexical query coverage. It can reject relevant evidence or accept a passage that does not answer the question. Exact quotation checks measure copying and citation integrity; they do not measure semantic groundedness. Live model evaluation requires a running local model and a separate human review.</p>
        <p>The full recorded report includes source hashes and runtime details. <a href="/data/evaluation.json" target="_blank" rel="noopener noreferrer">Open the recorded JSON report.</a></p></div></details>
    </div>
  );
}
