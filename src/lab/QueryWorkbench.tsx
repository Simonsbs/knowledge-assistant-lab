import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowRight, CheckCircle2, ChevronDown, Clock3, FileText, Search, Settings2, ShieldCheck } from "lucide-react";
import { PROFILES } from "./engine";
import type { Answer, Corpus, Profile, Role, Settings } from "./engine";
import LocalInference from "./LocalInference";

const examples = [
  { name: "Support target", question: "What is the initial P1 incident response target?" },
  { name: "Conflicting sources", question: "How long are diagnostic logs retained?" },
  { name: "Missing answer", question: "What does the Enterprise plan cost per month?" },
  { name: "Restricted record", question: "What is the emergency recovery code?" },
];
const statuses = {
  answered: { title: "Evidence found", icon: CheckCircle2 },
  conflict: { title: "Sources disagree", icon: AlertTriangle },
  insufficient: { title: "Insufficient evidence", icon: Search },
};

export default function QueryWorkbench({ corpus, custom, settings, setSettings, question,
  setQuestion, answer, onAsk }: {
  corpus: Corpus; custom: boolean; settings: Settings; setSettings: (value: Settings) => void;
  question: string; setQuestion: (value: string) => void; answer: Answer | null;
  onAsk: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(() => window.matchMedia("(min-width: 761px)").matches);
  const evidence = useRef<HTMLDivElement>(null);
  useEffect(() => setExpanded(null), [answer]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 761px)");
    const update = () => setSettingsOpen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function showCitation(id: string) {
    setExpanded(id);
    requestAnimationFrame(() => {
      const button = evidence.current?.querySelector<HTMLButtonElement>(`[data-passage="${id}"]`);
      button?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      button?.focus({ preventScroll: true });
    });
  }

  const StatusIcon = answer ? statuses[answer.status].icon : Search;
  return (
    <div className="lab-workspace">
      <aside className="lab-settings" aria-label="Retrieval settings">
        <details open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}>
        <summary className="lab-panel-title"><Settings2 size={17} /><h2>Retrieval settings</h2><ChevronDown size={14} /></summary>
        <div className="lab-settings-fields">
        <label htmlFor="lab-role">Demo role</label>
        <select id="lab-role" value={settings.role} onChange={(event) => setSettings({ ...settings, role: event.target.value as Role })}>
          <option value="support">Support analyst</option><option value="admin">Administrator</option>
        </select>
        <p className="lab-field-hint">{settings.role === "support" ? "Support sources. Administrator runbooks are excluded." : "Includes the synthetic administrator runbook."}</p>
        <label htmlFor="lab-profile">Retrieval profile</label>
        <select id="lab-profile" value={settings.profile} onChange={(event) => setSettings({ ...settings, profile: event.target.value as Profile })}>
          <option value="governed">Governed retrieval</option><option value="baseline">Keyword baseline</option>
        </select>
        <p className="lab-field-hint">{PROFILES[settings.profile].description}</p>
        <label htmlFor="lab-limit">Passage limit</label>
        <select id="lab-limit" value={settings.topK} onChange={(event) => setSettings({ ...settings, topK: Number(event.target.value) })}>
          {[1, 3, 5].map((count) => <option value={count} key={count}>Top {count} {count === 1 ? "passage" : "passages"}</option>)}
        </select>
        <div className="lab-settings-note"><ShieldCheck size={21} /><p>Role filtering is always on. Changing settings reruns the submitted question.</p></div>
        <p className="lab-field-hint">The sample pack is publicly downloadable and contains no private company data.</p>
        </div>
        </details>
      </aside>
      <div className="lab-main">
        <form className="lab-question" onSubmit={(event) => { event.preventDefault(); if (question.trim()) onAsk(question); }}>
          <div className="lab-panel-title"><MessageLabel /><label htmlFor="lab-question">Ask {corpus.title}</label></div>
          <textarea id="lab-question" value={question} maxLength={1000} rows={3}
            placeholder="Ask a question about the knowledge base..." onChange={(event) => setQuestion(event.target.value)} required />
          <div className="lab-question-actions"><span>Answers stay in this browser in evidence mode.</span>
            <button type="submit" className="button button-primary" disabled={!question.trim()}>Find evidence <ArrowRight size={17} /></button></div>
        </form>
        {!custom && <div className="lab-examples"><span>Try a scenario</span>{examples.map((example) =>
          <button key={example.name} onClick={() => onAsk(example.question)}>{example.name} <ArrowDownRight size={12} /></button>)}</div>}
        {answer ? <>
          <section className={`lab-answer lab-answer-${answer.status}`} aria-labelledby="lab-answer-title">
            <div className="lab-answer-heading"><div><StatusIcon size={21} /><h2 id="lab-answer-title">{statuses[answer.status].title}</h2></div>
              <span><Clock3 size={13} /> {answer.retrievalMs.toFixed(2)} ms retrieval</span></div>
            <p className="lab-asked">{answer.question}</p>
            <p>{answer.explanation}</p>
            {answer.quotes.map((quote) => {
              const index = answer.hits.findIndex((hit) => hit.passage.id === quote.passageId);
              const hit = answer.hits[index];
              return <blockquote key={quote.passageId}><p>{quote.text}</p>
                <button className="lab-citation" onClick={() => showCitation(quote.passageId)}>
                  <FileText size={13} /> [{index + 1}] {hit.document.title} / {hit.passage.heading} <ArrowDownRight size={13} />
                </button></blockquote>;
            })}
            {answer.status === "conflict" && <p className="lab-conflict-note">The conflict check uses fact labels in this synthetic pack and checks beyond the passage limit. It does not detect arbitrary contradictions in prose.</p>}
            <div className="lab-answer-footer"><span>{PROFILES[answer.settings.profile].name} · {answer.settings.role === "support" ? "Support analyst" : "Administrator"}</span>
              <span>{answer.eligibleDocuments} eligible documents · 0 model tokens</span></div>
          </section>
          <p className="sr-only" role="status" aria-live="polite">{statuses[answer.status].title} for {answer.question}. {answer.hits.length} passages retrieved.</p>
          <div className="lab-evidence" ref={evidence}>
            <div className="lab-evidence-heading"><h2>{answer.status === "insufficient" ? "Related passages" : "Retrieved passages"}</h2><span>{answer.hits.length} / {settings.topK}</span></div>
            {answer.hits.length === 0 && <p className="lab-empty">No matching passages for this role and retrieval profile.</p>}
            {answer.hits.map((hit, index) => <article className={`lab-hit${expanded === hit.passage.id ? " is-expanded" : ""}`} key={hit.passage.id}>
              <button className="lab-hit-toggle" data-passage={hit.passage.id} aria-expanded={expanded === hit.passage.id}
                aria-controls={`hit-${encodeURIComponent(hit.passage.id)}`} onClick={() => setExpanded(expanded === hit.passage.id ? null : hit.passage.id)}>
                <span className="lab-hit-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="lab-hit-title"><strong>{hit.passage.heading}</strong><span>{hit.document.title}</span></span>
                <span className={`lab-source-status lab-status-${hit.document.status}`}>{hit.document.status}</span><ChevronDown size={16} />
              </button>
              {expanded === hit.passage.id && <div className="lab-hit-body" id={`hit-${encodeURIComponent(hit.passage.id)}`}>
                <p>{hit.passage.text}</p><dl><div><dt>Source owner</dt><dd>{hit.document.owner}</dd></div><div><dt>Updated</dt><dd>{hit.document.updatedAt}</dd></div>
                  <div><dt>BM25 score</dt><dd>{hit.score.toFixed(3)}</dd></div><div><dt>Query term coverage</dt><dd>{Math.round(hit.coverage * 100)}%</dd></div></dl>
                <code>{hit.passage.id}</code>
              </div>}
            </article>)}
          </div>
          <LocalInference answer={answer} custom={custom} />
        </> : <div className="lab-empty"><Search size={27} /><h2>Start with a question.</h2><p>Inspect the knowledge base to see which topics your pack covers.</p></div>}
      </div>
    </div>
  );
}

function MessageLabel() { return <Search size={18} />; }
